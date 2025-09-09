import type { NextApiRequest, NextApiResponse } from "next";
import { ReviewStats, ApiResponse } from "@/types";
import { DataForSeoResponse, BusinessListing } from "@/types/dataforseo";
import { serverCache } from "@/utils/cache";

// Helper function to make a DataForSEO API request to get business info by place_id
async function getBusinessInfoFromDataForSeo(
  place_id: string,
  apiUrl: string,
  username: string,
  password: string
): Promise<BusinessListing | null> {
  const requestBody = {
    language_name: "German",
    place_id: place_id,
  };

  console.log(
    `🚀 DATAFORSEO API CALL: Getting business info for place_id = "${place_id}"`
  );

  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const startTime = Date.now();
  const response = await fetch(
    `${apiUrl}business_data/business_listings/search/live`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([requestBody]),
    }
  );

  const duration = Date.now() - startTime;

  if (!response.ok) {
    console.log(
      `❌ DATAFORSEO API ERROR: ${response.status} ${response.statusText} (${duration}ms)`
    );
    throw new Error(
      `DataForSeo API error: ${response.status} ${response.statusText}`
    );
  }

  const data: DataForSeoResponse = await response.json();
  console.log(`✅ DATAFORSEO SUCCESS: Retrieved business info (${duration}ms)`);

  if (data.status_code !== 20000) {
    throw new Error(`DataForSeo API error: ${data.status_message}`);
  }

  // Extract business info from response
  if (data.tasks && data.tasks.length > 0) {
    const task = data.tasks[0];
    if (task.result && task.result.length > 0) {
      const result = task.result[0];
      if (result.items && result.items.length > 0) {
        return result.items[0]; // Return the first (and should be only) business
      }
    }
  }

  return null;
}

// Helper function to transform DataForSEO business listing to ReviewStats
function transformToReviewStats(listing: BusinessListing): ReviewStats {
  // Transform rating distribution from DataForSEO format to our format
  let rating_distribution = {
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  };

  if (listing.rating_distribution) {
    rating_distribution = {
      five_star: listing.rating_distribution["5"] || 0,
      four_star: listing.rating_distribution["4"] || 0,
      three_star: listing.rating_distribution["3"] || 0,
      two_star: listing.rating_distribution["2"] || 0,
      one_star: listing.rating_distribution["1"] || 0,
    };
  }

  return {
    place_id: listing.place_id,
    rating: listing.rating?.value || 0,
    votes_count: listing.rating?.votes_count || 0,
    reviews_count: listing.rating?.votes_count || 0, // Assuming votes_count = reviews_count
    rating_distribution,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ReviewStats>>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { place_id } = req.body;

  console.log(`\n🔍 RATING REQUEST: place_id = "${place_id}"`);
  console.log(`⏰ REQUEST TIME: ${new Date().toISOString()}`);

  if (!place_id) {
    console.log(`❌ RATING ERROR: No place_id provided`);
    return res
      .status(400)
      .json({ success: false, error: "Place ID is required" });
  }

  // Get environment variables
  const apiUrl =
    process.env.DATAFORSEO_API_URL || "https://api.dataforseo.com/v3/";
  const username = process.env.DATAFORSEO_LOGIN;
  const password = process.env.DATAFORSEO_PASSWORD;

  console.log(`🔍 DEBUG: Checking credentials...`);
  console.log(`📍 API URL: ${apiUrl ? "SET" : "NOT SET"}`);
  console.log(`👤 Username: ${username ? "SET" : "NOT SET"}`);
  console.log(`🔐 Password: ${password ? "SET" : "NOT SET"}`);

  if (!username || !password) {
    console.log("❌ RATING ERROR: API credentials not available");
    return res.status(500).json({
      success: false,
      error: "DataForSEO API credentials not configured",
    });
  }

  try {
    // Check cache first
    const cacheKey = serverCache.generateRatingKey(place_id);
    const cachedResult = serverCache.get<ReviewStats>(cacheKey);

    if (cachedResult) {
      console.log(`🟢 RATING CACHE HIT: place_id "${place_id}"`);
      console.log(`💾 CACHE KEY: ${cacheKey}`);
      return res.status(200).json({ success: true, data: cachedResult });
    }

    console.log(
      `🔴 RATING CACHE MISS: place_id "${place_id}" - fetching from DataForSEO`
    );
    console.log(`💾 CACHE KEY: ${cacheKey}`);

    // Fetch business info from DataForSEO
    const businessListing = await getBusinessInfoFromDataForSeo(
      place_id,
      apiUrl,
      username,
      password
    );

    if (!businessListing) {
      console.log(
        `❌ RATING ERROR: No business found for place_id "${place_id}"`
      );
      return res.status(404).json({
        success: false,
        error: "No rating data found for this business",
      });
    }

    // Transform to our format
    const reviewStats = transformToReviewStats(businessListing);

    // Cache the result for 24 hours
    serverCache.set(cacheKey, reviewStats, 24 * 60 * 60 * 1000);
    console.log(`💾 RATING CACHED: place_id "${place_id}" for 24h`);

    console.log(
      `\n✅ RATING COMPLETE: Retrieved data for place_id "${place_id}"`
    );
    console.log(
      `📊 RATING SUMMARY: ${reviewStats.rating} stars, ${reviewStats.reviews_count} reviews`
    );
    console.log(`⏱️ RESPONSE READY\n`);

    res.status(200).json({ success: true, data: reviewStats });
  } catch (error) {
    console.log(
      `❌ RATING ERROR: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to fetch rating data",
    });
  }
}
