import type { NextApiRequest, NextApiResponse } from "next";
import { ReviewStats, ApiResponse } from "@/types";
import { GoogleReviewsResponse, MyBusinessInfo } from "@/types/dataforseo";
import { serverCache } from "@/utils/cache";

// Helper function to make a DataForSEO My Business Info API request with fallback variations
async function getBusinessInfoFromMyBusinessAPI(
  businessName: string,
  location: string,
  apiUrl: string,
  username: string,
  password: string
): Promise<GoogleReviewsResponse | null> {
  // Clean up location - extract city name from postal code format
  let cleanLocation = location || "Germany";
  if (location && location.includes(" ")) {
    // If location is like "22041 Hamburg", extract just "Hamburg"
    const parts = location.split(" ");
    if (parts.length >= 2 && /^\d+$/.test(parts[0])) {
      // First part is numeric (postal code), use the rest as city
      cleanLocation = parts.slice(1).join(" ");
    }
  }

  // DataForSEO is being ridiculous - they reject their own location formats
  // Always use just "Germany" to avoid 40501 errors with city names
  cleanLocation = "Germany";

  const requestBody = {
    language_name: "German",
    location_name: cleanLocation,
    keyword: businessName,
  };

  console.log(
    `🚀 MY BUSINESS INFO API CALL: Getting business info for "${businessName}"`
  );
  console.log(`📍 ORIGINAL LOCATION: "${location}"`);
  console.log(`📍 CLEANED LOCATION: "${cleanLocation}"`);
  console.log(`📋 REQUEST BODY:`, JSON.stringify(requestBody, null, 2));

  const auth = Buffer.from(`${username}:${password}`).toString("base64");

  const startTime = Date.now();
  const response = await fetch(
    `${apiUrl}business_data/google/my_business_info/live`,
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
      `❌ MY BUSINESS INFO API ERROR: ${response.status} ${response.statusText} (${duration}ms)`
    );
    throw new Error(
      `My Business Info API error: ${response.status} ${response.statusText}`
    );
  }

  const data: GoogleReviewsResponse = await response.json();
  console.log(
    `✅ MY BUSINESS INFO SUCCESS: Live data received (${duration}ms)`
  );

  // 🔍 DEBUG: Log the complete API response
  console.log(
    `🔍 FULL MY BUSINESS INFO RESPONSE:`,
    JSON.stringify(data, null, 2)
  );

  if (data.status_code !== 20000) {
    throw new Error(`My Business Info API error: ${data.status_message}`);
  }

  // 🔍 DEBUG: Log task details
  if (data.tasks && data.tasks.length > 0) {
    const task = data.tasks[0];
    console.log(`📋 TASK DETAILS:`);
    console.log(`   - ID: ${task.id}`);
    console.log(`   - Status Code: ${task.status_code}`);
    console.log(`   - Status Message: ${task.status_message}`);
    console.log(`   - Has Result: ${task.result ? "YES" : "NO"}`);

    if (task.result && task.result.length > 0) {
      const result = task.result[0];
      console.log(`📊 BUSINESS INFO DETAILS:`);
      console.log(`   - Keyword: ${result.keyword}`);
    }
  }

  return data;
}

// Helper function to transform My Business Info data to ReviewStats
function transformMyBusinessInfoToStats(
  reviewsData: GoogleReviewsResponse,
  place_id: string
): ReviewStats | null {
  console.log(`🔄 TRANSFORMING MY BUSINESS INFO DATA:`);

  if (!reviewsData.tasks || reviewsData.tasks.length === 0) {
    console.log(`❌ TRANSFORM ERROR: No tasks in response`);
    return null;
  }

  const task = reviewsData.tasks[0];
  if (!task.result || task.result.length === 0) {
    console.log(`⚠️ NO RESULTS: Task completed but no business data available`);
    console.log(
      `   - Task Status: ${task.status_code} - ${task.status_message}`
    );
    return null;
  }

  const result = task.result[0];
  if (!result.items || result.items.length === 0) {
    console.log(`⚠️ NO BUSINESS ITEMS: No business info items found`);
    return null;
  }

  const businessInfo = result.items[0];
  console.log(`📊 TRANSFORMING BUSINESS INFO DATA:`);
  console.log(`   - Business Title: ${businessInfo.title}`);
  console.log(`   - Place ID: ${businessInfo.place_id}`);
  console.log(`   - CID: ${businessInfo.cid}`);
  console.log(`   - Raw Rating: ${businessInfo.rating?.value}`);
  console.log(`   - Raw Votes Count: ${businessInfo.rating?.votes_count}`);
  console.log(`   - Rating Distribution:`, businessInfo.rating_distribution);

  // Transform rating distribution from Google Reviews format to our format
  let rating_distribution = {
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  };

  if (businessInfo.rating_distribution) {
    console.log(
      `📈 RAW RATING DISTRIBUTION:`,
      businessInfo.rating_distribution
    );
    rating_distribution = {
      five_star: businessInfo.rating_distribution["5"] || 0,
      four_star: businessInfo.rating_distribution["4"] || 0,
      three_star: businessInfo.rating_distribution["3"] || 0,
      two_star: businessInfo.rating_distribution["2"] || 0,
      one_star: businessInfo.rating_distribution["1"] || 0,
    };
    console.log(`📊 TRANSFORMED DISTRIBUTION:`, rating_distribution);
  } else {
    console.log(
      `⚠️ NO DISTRIBUTION DATA: My Business Info API didn't provide rating_distribution`
    );
  }

  const transformedStats = {
    place_id: place_id, // Use the original place_id from the request
    rating: businessInfo.rating?.value || 0,
    votes_count: businessInfo.rating?.votes_count || 0,
    reviews_count: businessInfo.rating?.votes_count || 0, // votes_count is the total reviews in My Business Info
    rating_distribution,
  };

  console.log(`✅ FINAL TRANSFORMED STATS:`, transformedStats);
  return transformedStats;
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

  const { place_id, businessName, businessLocation, bypassCache } = req.body;

  console.log(
    `\n🔍 RATING REQUEST: place_id = "${place_id}", business = "${businessName}", location = "${businessLocation}"${
      bypassCache ? " [BYPASS CACHE]" : ""
    }`
  );
  console.log(`⏰ REQUEST TIME: ${new Date().toISOString()}`);

  if (!place_id) {
    console.log(`❌ RATING ERROR: No place_id provided`);
    return res
      .status(400)
      .json({ success: false, error: "Place ID is required" });
  }

  if (!businessName) {
    console.log(`❌ RATING ERROR: No business name provided`);
    return res.status(400).json({
      success: false,
      error: "Business name is required for My Business Info API",
    });
  }

  // Get environment variables
  const apiUrl =
    process.env.DATAFORSEO_API_URL || "https://api.dataforseo.com/v3/";
  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;

  console.log(`🔍 DEBUG: Checking credentials...`);
  console.log(`📍 API URL: ${apiUrl ? "SET" : "NOT SET"}`);
  console.log(`👤 Username: ${username ? "SET" : "NOT SET"}`);
  console.log(`🔐 Password: ${password ? "SET" : "NOT SET"}`);

  if (!username || !password) {
    console.log("❌ RATING ERROR: API credentials not available");

    // Return mock data for development
    console.log("🔧 USING MOCK RATING DATA - API credentials not available");
    const mockReviewStats: ReviewStats = {
      place_id: place_id,
      rating: 4.2,
      votes_count: 127,
      reviews_count: 127,
      rating_distribution: {
        five_star: 68,
        four_star: 35,
        three_star: 15,
        two_star: 6,
        one_star: 3,
      },
    };

    console.log(
      `🎭 MOCK RATING DATA: Returning ${mockReviewStats.rating} stars, ${mockReviewStats.reviews_count} reviews`
    );
    return res.status(200).json({ success: true, data: mockReviewStats });
  }

  try {
    // Check cache first (unless bypassing)
    const cacheKey = serverCache.generateRatingKey(place_id);

    if (!bypassCache) {
      const cachedResult = serverCache.get<ReviewStats>(cacheKey);

      if (cachedResult) {
        console.log(`🟢 RATING CACHE HIT: place_id "${place_id}"`);
        console.log(`💾 CACHE KEY: ${cacheKey}`);
        return res.status(200).json({ success: true, data: cachedResult });
      }

      console.log(
        `🔴 RATING CACHE MISS: place_id "${place_id}" - fetching from My Business Info API`
      );
      console.log(`💾 CACHE KEY: ${cacheKey}`);
    } else {
      console.log(
        `🔄 RATING CACHE BYPASS: place_id "${place_id}" - forcing fresh data from My Business Info API`
      );
      console.log(`💾 CACHE KEY: ${cacheKey} (will be overwritten)`);
    }

    // Get My Business Info data
    const reviewsData = await getBusinessInfoFromMyBusinessAPI(
      businessName,
      businessLocation || "Germany",
      apiUrl,
      username,
      password
    );

    if (!reviewsData) {
      console.log(
        `❌ RATING ERROR: No reviews data returned for "${businessName}"`
      );
      return res.status(500).json({
        success: false,
        error: "Failed to get My Business Info data",
      });
    }

    // Transform the live results immediately - no waiting needed!
    let reviewStats = transformMyBusinessInfoToStats(reviewsData, place_id);

    if (!reviewStats) {
      console.log(
        `❌ RATING ERROR: No review data available for "${businessName}" - task still processing`
      );
      return res.status(202).json({
        success: false,
        error:
          "My Business Info data not ready yet - please try again in a moment",
      });
    }

    // Cache the result for 24 hours (fresh My Business Info data)
    serverCache.set(cacheKey, reviewStats, 24 * 60 * 60 * 1000);
    console.log(
      `💾 RATING CACHED: place_id "${place_id}" for 24h (fresh My Business Info data)`
    );

    console.log(
      `\n✅ RATING COMPLETE: Retrieved fresh My Business Info data for "${businessName}"`
    );
    console.log(
      `📊 RATING SUMMARY: ${reviewStats.rating} stars, ${reviewStats.reviews_count} reviews`
    );
    console.log(
      `🔥 FRESH DATA: Using My Business Info API for up-to-date ratings`
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
        error instanceof Error
          ? error.message
          : "Failed to fetch My Business Info data",
    });
  }
}
