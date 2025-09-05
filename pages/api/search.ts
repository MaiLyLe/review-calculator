import type { NextApiRequest, NextApiResponse } from "next";
import { BusinessSearchResult, ApiResponse } from "@/types";
import { DataForSeoResponse, BusinessListing } from "@/types/dataforseo";
import {
  geocodePostalCode,
  formatCoordinatesForDataForSeo,
} from "@/utils/geocoding";
import { serverCache } from "@/utils/cache";

// Helper function to make a DataForSEO API request with specific search parameters
async function makeDataForSeoRequest(
  requestBody: any,
  apiUrl: string,
  username: string,
  password: string
): Promise<DataForSeoResponse> {
  const searchType = requestBody.title
    ? "title"
    : requestBody.description
    ? "description"
    : requestBody.categories
    ? "category"
    : "unknown";
  const searchValue =
    requestBody.title ||
    requestBody.description ||
    (requestBody.categories && requestBody.categories[0]) ||
    "unknown";

  console.log(
    `🚀 DATAFORSEO API CALL: Searching by ${searchType} = "${searchValue}"`
  );
  console.log(
    `📍 LOCATION: ${
      requestBody.location_coordinate || requestBody.location_name || "unknown"
    }`
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
  const businessCount = data.tasks?.[0]?.result?.[0]?.items?.length || 0;
  console.log(
    `✅ DATAFORSEO SUCCESS: Found ${businessCount} businesses (${duration}ms)`
  );

  if (data.status_code !== 20000) {
    throw new Error(`DataForSeo API error: ${data.status_message}`);
  }

  return data;
}

// Helper function to extract businesses from DataForSEO response
function extractBusinesses(data: DataForSeoResponse): BusinessListing[] {
  if (data.tasks && data.tasks.length > 0) {
    const task = data.tasks[0];
    if (task.result && task.result.length > 0) {
      const result = task.result[0];
      if (result.items && result.items.length > 0) {
        return result.items;
      }
    }
  }
  return [];
}

// Helper function to perform cascading search (title -> description -> category)
async function performCascadingSearch(
  query: string,
  baseRequestBody: any,
  apiUrl: string,
  username: string,
  password: string,
  bypassCache: boolean = false
): Promise<{ businesses: BusinessListing[]; searchType: string }> {
  // Generate cache key based on search query and postal code
  // Extract postal code from the request (we'll need to pass this through)
  const postalCode = baseRequestBody.postalCode || "unknown";
  const cacheKey = serverCache.generateBusinessSearchKey(query, postalCode);

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cachedResult = serverCache.get<{
      businesses: BusinessListing[];
      searchType: string;
    }>(cacheKey);

    if (cachedResult) {
      console.log(
        `🟢 BUSINESS CACHE HIT: "${query}" in ${postalCode} -> ${cachedResult.businesses.length} businesses (${cachedResult.searchType})`
      );
      console.log(`💾 CACHE KEY: ${cacheKey}`);
      return cachedResult;
    }

    console.log(
      `🔴 BUSINESS CACHE MISS: "${query}" in ${postalCode} - performing cascading search`
    );
    console.log(`💾 CACHE KEY: ${cacheKey}`);
  } else {
    console.log(
      `🔄 BUSINESS CACHE BYPASS: "${query}" in ${postalCode} - forcing fresh data`
    );
    console.log(`💾 CACHE KEY: ${cacheKey} (will be overwritten)`);
  }
  // Try 1: Search by title
  try {
    const titleRequest = { ...baseRequestBody, title: query };
    const titleData = await makeDataForSeoRequest(
      titleRequest,
      apiUrl,
      username,
      password
    );
    const titleBusinesses = extractBusinesses(titleData);

    if (titleBusinesses.length > 0) {
      const result = { businesses: titleBusinesses, searchType: "title" };
      // Cache the result for 24 hours
      serverCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
      console.log(
        `💾 BUSINESS CACHED (title): "${query}" in ${postalCode} -> ${titleBusinesses.length} businesses for 24h`
      );
      console.log(`✅ CASCADING SEARCH SUCCESS: Found results by title search`);
      return result;
    }
  } catch (error) {
    // Continue to next search type if title search fails
  }

  // Try 2: Search by description
  try {
    const descriptionRequest = { ...baseRequestBody, description: query };
    const descriptionData = await makeDataForSeoRequest(
      descriptionRequest,
      apiUrl,
      username,
      password
    );
    const descriptionBusinesses = extractBusinesses(descriptionData);

    if (descriptionBusinesses.length > 0) {
      const result = {
        businesses: descriptionBusinesses,
        searchType: "description",
      };
      // Cache the result for 24 hours
      serverCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
      console.log(
        `💾 BUSINESS CACHED (description): "${query}" in ${postalCode} -> ${descriptionBusinesses.length} businesses for 24h`
      );
      console.log(
        `✅ CASCADING SEARCH SUCCESS: Found results by description search`
      );
      return result;
    }
  } catch (error) {
    // Continue to next search type if description search fails
  }

  // Try 3: Search by category (this is trickier - we need to map common terms to categories)
  const categoryMappings: { [key: string]: string[] } = {
    pizza: ["pizza_restaurant"],
    restaurant: ["restaurant"],
    cafe: ["cafe"],
    coffee: ["coffee_shop", "cafe"],
    hotel: ["hotel"],
    bar: ["bar"],
    shop: ["store"],
    bakery: ["bakery"],
    pharmacy: ["pharmacy"],
    bank: ["bank"],
    gym: ["gym"],
    fitness: ["gym"],
    // Add more mappings as needed
  };

  const searchTermLower = query.toLowerCase();
  for (const [term, categories] of Object.entries(categoryMappings)) {
    if (searchTermLower.includes(term)) {
      try {
        const categoryRequest = { ...baseRequestBody, categories };
        const categoryData = await makeDataForSeoRequest(
          categoryRequest,
          apiUrl,
          username,
          password
        );
        const categoryBusinesses = extractBusinesses(categoryData);

        if (categoryBusinesses.length > 0) {
          const result = {
            businesses: categoryBusinesses,
            searchType: "category",
          };
          // Cache the result for 24 hours
          serverCache.set(cacheKey, result, 24 * 60 * 60 * 1000);
          console.log(
            `💾 BUSINESS CACHED (category): "${query}" in ${postalCode} -> ${categoryBusinesses.length} businesses for 24h`
          );
          console.log(
            `✅ CASCADING SEARCH SUCCESS: Found results by category search`
          );
          return result;
        }
      } catch (error) {
        // Continue if category search fails
      }
    }
  }

  // No results found in any search type
  const result = { businesses: [], searchType: "none" };
  // Cache empty results for 1 hour to prevent repeated API calls
  serverCache.set(cacheKey, result, 60 * 60 * 1000);
  console.log(
    `💾 BUSINESS CACHED (empty): "${query}" in ${postalCode} -> 0 businesses for 1h`
  );
  console.log(
    `❌ CASCADING SEARCH FAILED: No results found after trying title, description, and category`
  );
  return result;
}

// Helper function to transform DataForSeo data to our format
function transformBusinessListing(
  listing: BusinessListing
): BusinessSearchResult {
  // Transform rating distribution from DataForSEO format to our format
  let rating_distribution = undefined;
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
    title: listing.title,
    address:
      listing.address ||
      `${listing.address_info.address}, ${listing.address_info.city} ${listing.address_info.zip}`,
    rating: listing.rating?.value,
    reviews_count: listing.rating?.votes_count,
    rating_distribution,
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<BusinessSearchResult[]>>
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ success: false, error: "Method not allowed" });
  }

  const { query, postalCode, bypassCache } = req.body;

  console.log(
    `\n🔍 SEARCH REQUEST: "${query}" ${
      postalCode ? `in PLZ ${postalCode}` : "(no PLZ)"
    }${bypassCache ? " [BYPASS CACHE]" : ""}`
  );
  console.log(`⏰ REQUEST TIME: ${new Date().toISOString()}`);

  if (!query) {
    console.log(`❌ SEARCH ERROR: No query provided`);
    return res.status(400).json({ success: false, error: "Query is required" });
  }

  // Get environment variables
  const apiUrl = process.env.API_URL;
  const username = process.env.API_USERNAME;
  const password = process.env.API_PASSWORD;

  if (!apiUrl || !username || !password) {
    return res.status(500).json({
      success: false,
      error: "API credentials not configured",
    });
  }

  try {
    // Handle postal code geocoding if provided
    let coordinates = null;
    if (postalCode && postalCode.trim()) {
      try {
        coordinates = await geocodePostalCode(postalCode.trim());
      } catch (geocodingError) {
        return res.status(400).json({
          success: false,
          error:
            geocodingError instanceof Error
              ? geocodingError.message
              : "Fehler bei der PLZ-Verarbeitung",
        });
      }
    }

    // Prepare base request body
    const baseRequestBody: any = {
      language_name: "German",
      limit: 20,
      order_by: ["rating.value,desc"], // Sort by rating
      postalCode, // Add postal code for cache key generation
    };

    // Use coordinates if available, otherwise default to Germany
    if (coordinates) {
      baseRequestBody.location_coordinate = formatCoordinatesForDataForSeo(
        coordinates,
        1
      );
    } else {
      baseRequestBody.location_name = "Germany";
    }

    // Perform cascading search
    const { businesses: foundBusinesses, searchType } =
      await performCascadingSearch(
        query,
        baseRequestBody,
        apiUrl,
        username,
        password,
        bypassCache
      );

    // If no businesses found, return error message
    if (foundBusinesses.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Keine Unternehmen mit dem Namen "${query}" gefunden.`,
      });
    }

    // Transform businesses to our format
    const businesses: BusinessSearchResult[] = foundBusinesses.map(
      transformBusinessListing
    );

    console.log(
      `\n✅ SEARCH COMPLETE: Returning ${businesses.length} businesses`
    );
    console.log(
      `📊 SEARCH SUMMARY: Query "${query}", PLZ ${
        postalCode || "none"
      }, Found via ${searchType}`
    );
    console.log(`⏱️ RESPONSE READY\n`);

    res.status(200).json({
      success: true,
      data: businesses,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch business data",
    });
  }
}
