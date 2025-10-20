import type { NextApiRequest, NextApiResponse } from "next";
import { ReviewStats, ApiResponse } from "@/types";
import {
  GoogleReviewsResponse,
  MyBusinessInfo,
  BusinessListing,
} from "@/types/dataforseo";
import { serverCache } from "@/utils/cache";
import fs from "fs";
import path from "path";

// Helper function to get location code from local CSV file
async function getLocationCode(cityName: string): Promise<number | null> {
  try {
    const csvPath = path.join(process.cwd(), "dataforseo-locations.csv");

    if (!fs.existsSync(csvPath)) {
      console.log(`❌ LOCATIONS CSV NOT FOUND: ${csvPath}`);
      return 2276; // Default to Germany
    }

    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n");

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [
        locationCode,
        locationName,
        locationNameParent,
        countryIsoCode,
        locationType,
      ] = line.split(",");

      // Only look in German locations
      if (countryIsoCode !== "DE") continue;

      // Look for exact city match first
      if (
        locationName &&
        locationName.toLowerCase().includes(cityName.toLowerCase()) &&
        locationType === "City"
      ) {
        console.log(
          `✅ FOUND EXACT CITY: ${cityName} = ${locationCode} (${locationName})`
        );
        return parseInt(locationCode);
      }
    }

    // Fallback: look for any German location containing the city name
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const [
        locationCode,
        locationName,
        locationNameParent,
        countryIsoCode,
        locationType,
      ] = line.split(",");

      // Only look in German locations
      if (countryIsoCode !== "DE") continue;

      if (
        locationName &&
        locationName.toLowerCase().includes(cityName.toLowerCase())
      ) {
        console.log(
          `✅ FOUND FALLBACK LOCATION: ${cityName} = ${locationCode} (${locationName})`
        );
        return parseInt(locationCode);
      }
    }

    console.log(
      `❌ NO LOCATION CODE FOUND for: ${cityName} - using Germany default`
    );
    return 2276; // Default to Germany
  } catch (error) {
    console.log(`❌ LOCATIONS CSV ERROR: ${error} - using Germany default`);
    return 2276; // Default to Germany
  }
}

// Helper function to create reliable My Business Info request from Business Listing
function createMyBusinessInfoRequest(businessListing: BusinessListing): {
  language_name: string;
  location_name?: string;
  location_code?: number;
  location_coordinate?: string;
  keyword: string;
} {
  console.log(`\n🔄 CREATING MY BUSINESS INFO REQUEST:`);
  console.log(`📍 Business: ${businessListing.title}`);
  console.log(`📍 Address: ${businessListing.address}`);
  console.log(
    `📍 Coordinates: ${businessListing.latitude}, ${businessListing.longitude}`
  );
  console.log(`📍 CID: ${businessListing.cid}`);
  console.log(`📍 Place ID: ${businessListing.place_id}`);

  const locationCode = (businessListing as any).location_code;

  // Strategy 1: Use CID with coordinates (most reliable for individual stores)
  if (
    businessListing.cid &&
    businessListing.latitude &&
    businessListing.longitude
  ) {
    const locationCoordinate = `${businessListing.latitude},${businessListing.longitude},1000`; // 1km radius

    const requestParams = {
      language_name: "German",
      location_coordinate: locationCoordinate,
      keyword: `cid:${businessListing.cid}`,
    };

    console.log(`✅ USING CID + COORDINATES STRATEGY (INDIVIDUAL STORE)`);
    console.log(
      `🚀 MY BUSINESS INFO API PARAMS:`,
      JSON.stringify(requestParams, null, 2)
    );

    return requestParams;
  }

  // Strategy 2: Fallback to place_id if CID not available
  if (
    businessListing.place_id &&
    businessListing.latitude &&
    businessListing.longitude
  ) {
    const locationCoordinate = `${businessListing.latitude},${businessListing.longitude},1000`; // 1km radius

    const requestParams = {
      language_name: "German",
      location_coordinate: locationCoordinate,
      keyword: `place_id:${businessListing.place_id}`,
    };

    console.log(`✅ USING PLACE_ID + COORDINATES STRATEGY (FALLBACK)`);
    console.log(
      `🚀 MY BUSINESS INFO API PARAMS:`,
      JSON.stringify(requestParams, null, 2)
    );

    return requestParams;
  }

  // Strategy 3: Last resort - use business name with location
  const locationName = businessListing.address_info?.city
    ? `${businessListing.address_info.city},${
        businessListing.address_info.country_code || "Germany"
      }`
    : "Germany";

  console.log(
    `⚠️ USING NAME STRATEGY: "${businessListing.title}" with location: ${locationName}`
  );

  return {
    language_name: "German",
    location_name: locationName,
    keyword: businessListing.title,
  };
}

// Helper function to make a DataForSEO My Business Info API request with a pre-built request object
async function getBusinessInfoFromMyBusinessAPIWithRequest(
  requestBody: {
    language_name: string;
    location_name?: string;
    location_code?: number;
    location_coordinate?: string;
    keyword: string;
  },
  apiUrl: string,
  username: string,
  password: string
): Promise<GoogleReviewsResponse | null> {
  console.log(`\n🚀 CALLING MY BUSINESS INFO API...`);
  console.log(
    `🔍 DEBUG: Request body being sent:`,
    JSON.stringify([requestBody], null, 2)
  );

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
  console.log(`✅ API SUCCESS (${duration}ms)`);

  // Log the business info returned
  if (data.tasks && data.tasks[0]?.result?.[0]?.items?.[0]) {
    const businessInfo = data.tasks[0].result[0].items[0];
    console.log(`\n📊 MY BUSINESS INFO API RETURNED:`);
    console.log(`📍 Business: ${businessInfo.title}`);
    console.log(`📍 Address: ${businessInfo.address}`);
    console.log(`📍 CID: ${businessInfo.cid}`);
    console.log(`📍 Place ID: ${businessInfo.place_id}`);
    console.log(
      `📍 Rating: ${businessInfo.rating?.value} (${businessInfo.rating?.votes_count} reviews)`
    );
  }

  if (data.status_code !== 20000) {
    throw new Error(`My Business Info API error: ${data.status_message}`);
  }

  return data;
}

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

  // Try to get the proper location code for the city
  let locationCode = 2276; // Default to Germany
  if (cleanLocation && cleanLocation !== "Germany") {
    const cityName = cleanLocation.replace(",Germany", "");
    const foundLocationCode = await getLocationCode(cityName);
    if (foundLocationCode) {
      locationCode = foundLocationCode;
    }
  }

  // Try location_coordinate with coordinates if available, otherwise fallback
  // Match the exact format from your working curl command
  const requestBody = {
    language_name: "German",
    location_name: "Germany", // Fallback location
    keyword: businessName,
  };

  console.log(
    `🚀 MY BUSINESS INFO API CALL: Getting business info for "${businessName}"`
  );
  console.log(`📍 ORIGINAL LOCATION: "${location}"`);
  console.log(`📍 CLEANED LOCATION: "${cleanLocation}"`);
  console.log(`📍 LOCATION CODE: ${locationCode}`);
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
  if (!reviewsData.tasks || reviewsData.tasks.length === 0) {
    return null;
  }

  const task = reviewsData.tasks[0];
  if (!task.result || task.result.length === 0) {
    return null;
  }

  const result = task.result[0];
  if (!result.items || result.items.length === 0) {
    return null;
  }

  const businessInfo = result.items[0];

  // Transform rating distribution from Google Reviews format to our format
  let rating_distribution = {
    five_star: 0,
    four_star: 0,
    three_star: 0,
    two_star: 0,
    one_star: 0,
  };

  if (businessInfo.rating_distribution) {
    rating_distribution = {
      five_star: businessInfo.rating_distribution["5"] || 0,
      four_star: businessInfo.rating_distribution["4"] || 0,
      three_star: businessInfo.rating_distribution["3"] || 0,
      two_star: businessInfo.rating_distribution["2"] || 0,
      one_star: businessInfo.rating_distribution["1"] || 0,
    };
  }

  const transformedStats = {
    place_id: place_id, // Use the original place_id from the request
    rating: businessInfo.rating?.value || 0,
    votes_count: businessInfo.rating?.votes_count || 0,
    reviews_count: businessInfo.rating?.votes_count || 0, // votes_count is the total reviews in My Business Info
    rating_distribution,
  };

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

  const {
    place_id,
    businessName,
    businessLocation,
    bypassCache,
    businessListing,
  } = req.body;

  console.log(
    `\n🔍 RATING REQUEST: place_id = "${place_id}", business = "${businessName}", location = "${businessLocation}"${
      bypassCache ? " [BYPASS CACHE]" : ""
    }${businessListing ? " [FROM BUSINESS LISTING]" : ""}`
  );
  console.log(`⏰ REQUEST TIME: ${new Date().toISOString()}`);

  // Handle new workflow: BusinessListing object passed directly
  let finalBusinessName = businessName;
  let finalBusinessLocation = businessLocation;
  let finalPlaceId = place_id;
  let myBusinessInfoRequest: any = null;

  if (businessListing) {
    console.log(`🔄 USING BUSINESS LISTING WORKFLOW`);
    console.log(
      `🔍 DEBUG: businessListing object:`,
      JSON.stringify(businessListing, null, 2)
    );
    myBusinessInfoRequest = createMyBusinessInfoRequest(businessListing);
    finalBusinessName = businessListing.title;
    finalBusinessLocation = businessListing.address;
    finalPlaceId = businessListing.place_id;

    console.log(
      `📋 GENERATED REQUEST:`,
      JSON.stringify(myBusinessInfoRequest, null, 2)
    );
  } else {
    // Legacy workflow validation
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
    const cacheKey = serverCache.generateRatingKey(finalPlaceId);

    if (!bypassCache) {
      const cachedResult = serverCache.get<ReviewStats>(cacheKey);

      if (cachedResult) {
        console.log(`🟢 RATING CACHE HIT: place_id "${finalPlaceId}"`);
        console.log(`💾 CACHE KEY: ${cacheKey}`);
        return res.status(200).json({ success: true, data: cachedResult });
      }

      console.log(
        `🔴 RATING CACHE MISS: place_id "${finalPlaceId}" - fetching from My Business Info API`
      );
      console.log(`💾 CACHE KEY: ${cacheKey}`);
    } else {
      console.log(
        `🔄 RATING CACHE BYPASS: place_id "${finalPlaceId}" - forcing fresh data from My Business Info API`
      );
      console.log(`💾 CACHE KEY: ${cacheKey} (will be overwritten)`);
    }

    // Get My Business Info data using the appropriate method
    let reviewsData;
    if (myBusinessInfoRequest) {
      // New workflow: Use the optimized request from BusinessListing
      console.log(`🚀 USING OPTIMIZED MY BUSINESS INFO REQUEST`);
      reviewsData = await getBusinessInfoFromMyBusinessAPIWithRequest(
        myBusinessInfoRequest,
        apiUrl,
        username,
        password
      );
    } else {
      // Legacy workflow: Use the old method
      console.log(`🚀 USING LEGACY MY BUSINESS INFO REQUEST`);
      reviewsData = await getBusinessInfoFromMyBusinessAPI(
        finalBusinessName,
        finalBusinessLocation || "Germany",
        apiUrl,
        username,
        password
      );
    }

    if (!reviewsData) {
      console.log(
        `❌ RATING ERROR: No reviews data returned for "${finalBusinessName}"`
      );
      return res.status(500).json({
        success: false,
        error: "Failed to get My Business Info data",
      });
    }

    // Transform the live results immediately - no waiting needed!
    let reviewStats = transformMyBusinessInfoToStats(reviewsData, finalPlaceId);

    if (!reviewStats) {
      console.log(
        `❌ RATING ERROR: No review data available for "${finalBusinessName}" - task still processing`
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
      `💾 RATING CACHED: place_id "${finalPlaceId}" for 24h (fresh My Business Info data)`
    );

    console.log(
      `\n✅ RATING COMPLETE: Retrieved fresh My Business Info data for "${finalBusinessName}"`
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
