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
  page: number = 1,
  bypassCache: boolean = false
): Promise<{
  businesses: BusinessListing[];
  searchType: string;
  totalCount: number;
  currentOffset: number;
  currentCount: number;
}> {
  // Generate cache key based on search query, postal code, and page
  const postalCode = baseRequestBody.postalCode || "unknown";
  const cacheKey = `${serverCache.generateBusinessSearchKey(
    query,
    postalCode
  )}:page${page}`;

  // Check cache first (unless bypassing)
  if (!bypassCache) {
    const cachedResult = serverCache.get<{
      businesses: BusinessListing[];
      searchType: string;
      totalCount: number;
      currentOffset: number;
      currentCount: number;
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
    const titleRequest = {
      ...baseRequestBody,
      title: query,
      offset: (page - 1) * baseRequestBody.limit, // Calculate offset for pagination
    };
    const titleData = await makeDataForSeoRequest(
      titleRequest,
      apiUrl,
      username,
      password
    );
    const titleBusinesses = extractBusinesses(titleData);

    if (titleBusinesses.length > 0) {
      // Extract pagination info from DataForSEO response
      const paginationInfo = titleData.tasks?.[0]?.result?.[0];
      const totalCount = paginationInfo?.total_count || 0;
      const currentOffset = paginationInfo?.offset || 0;
      const currentCount = paginationInfo?.count || titleBusinesses.length;

      const result = {
        businesses: titleBusinesses,
        searchType: "title",
        totalCount,
        currentOffset,
        currentCount,
      };
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
    const descriptionRequest = {
      ...baseRequestBody,
      description: query,
      offset: (page - 1) * baseRequestBody.limit,
    };
    const descriptionData = await makeDataForSeoRequest(
      descriptionRequest,
      apiUrl,
      username,
      password
    );
    const descriptionBusinesses = extractBusinesses(descriptionData);

    if (descriptionBusinesses.length > 0) {
      // Extract pagination info from DataForSEO response
      const paginationInfo = descriptionData.tasks?.[0]?.result?.[0];
      const totalCount = paginationInfo?.total_count || 0;
      const currentOffset = paginationInfo?.offset || 0;
      const currentCount =
        paginationInfo?.count || descriptionBusinesses.length;

      const result = {
        businesses: descriptionBusinesses,
        searchType: "description",
        totalCount,
        currentOffset,
        currentCount,
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
        const categoryRequest = {
          ...baseRequestBody,
          categories,
          offset: (page - 1) * baseRequestBody.limit,
        };
        const categoryData = await makeDataForSeoRequest(
          categoryRequest,
          apiUrl,
          username,
          password
        );
        const categoryBusinesses = extractBusinesses(categoryData);

        if (categoryBusinesses.length > 0) {
          // Extract pagination info from DataForSEO response
          const paginationInfo = categoryData.tasks?.[0]?.result?.[0];
          const totalCount = paginationInfo?.total_count || 0;
          const currentOffset = paginationInfo?.offset || 0;
          const currentCount =
            paginationInfo?.count || categoryBusinesses.length;

          const result = {
            businesses: categoryBusinesses,
            searchType: "category",
            totalCount,
            currentOffset,
            currentCount,
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
  const result = {
    businesses: [],
    searchType: "none",
    totalCount: 0,
    currentOffset: 0,
    currentCount: 0,
  };
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

  const { query, postalCode, bypassCache, page = 1 } = req.body;

  console.log(
    `\n🔍 SEARCH REQUEST: "${query}" ${
      postalCode ? `in PLZ ${postalCode}` : "(no PLZ)"
    } [Page ${page}]${bypassCache ? " [BYPASS CACHE]" : ""}`
  );
  console.log(`⏰ REQUEST TIME: ${new Date().toISOString()}`);

  if (!query) {
    console.log(`❌ SEARCH ERROR: No query provided`);
    return res.status(400).json({ success: false, error: "Query is required" });
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

  // Check if API credentials are available (apiUrl has default, so only check username/password)
  if (!username || !password) {
    console.log("🔧 USING MOCK DATA - API credentials not available");
    console.log(
      `🔍 Mock search: "${query}" in PLZ "${postalCode}" (Page ${page})`
    );

    // Generate mock pizza restaurants for PLZ 10963
    const mockBusinesses: BusinessSearchResult[] = [
      {
        place_id: "mock_pizza_1",
        title: "Pizzeria Roma",
        address: "Hauptstraße 123, 10963 Berlin",
        rating: 4.5,
        reviews_count: 127,
        rating_distribution: {
          five_star: 68,
          four_star: 35,
          three_star: 15,
          two_star: 6,
          one_star: 3,
        },
      },
      {
        place_id: "mock_pizza_2",
        title: "Pizza Express Berlin",
        address: "Bergmannstraße 45, 10963 Berlin",
        rating: 4.2,
        reviews_count: 89,
        rating_distribution: {
          five_star: 45,
          four_star: 28,
          three_star: 12,
          two_star: 3,
          one_star: 1,
        },
      },
      {
        place_id: "mock_pizza_3",
        title: "Da Luigi Pizzeria",
        address: "Gneisenaustraße 67, 10963 Berlin",
        rating: 4.7,
        reviews_count: 203,
        rating_distribution: {
          five_star: 145,
          four_star: 38,
          three_star: 12,
          two_star: 5,
          one_star: 3,
        },
      },
      {
        place_id: "mock_pizza_4",
        title: "Pizza Napoli",
        address: "Yorckstraße 12, 10963 Berlin",
        rating: 3.9,
        reviews_count: 67,
        rating_distribution: {
          five_star: 25,
          four_star: 22,
          three_star: 15,
          two_star: 3,
          one_star: 2,
        },
      },
      {
        place_id: "mock_pizza_5",
        title: "Bella Italia",
        address: "Mehringdamm 89, 10963 Berlin",
        rating: 4.8,
        reviews_count: 156,
        rating_distribution: {
          five_star: 125,
          four_star: 23,
          three_star: 5,
          two_star: 2,
          one_star: 1,
        },
      },
    ];

    // Simulate pagination - return different results based on page
    const itemsPerPage = 5;
    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;

    // For demo, create more mock data for additional pages
    const allMockData = [...mockBusinesses];
    if (page > 1) {
      // Generate additional mock data for page 2+
      for (let i = 0; i < itemsPerPage; i++) {
        const mockId = `mock_pizza_page${page}_${i + 1}`;
        allMockData.push({
          place_id: mockId,
          title: `Pizza House ${page}.${i + 1}`,
          address: `Teststraße ${10 + i}, 10963 Berlin`,
          rating: 3.8 + Math.random() * 1.0,
          reviews_count: 30 + Math.floor(Math.random() * 100),
          rating_distribution: {
            five_star: 20 + Math.floor(Math.random() * 50),
            four_star: 15 + Math.floor(Math.random() * 25),
            three_star: 5 + Math.floor(Math.random() * 15),
            two_star: 2 + Math.floor(Math.random() * 8),
            one_star: 1 + Math.floor(Math.random() * 5),
          },
        });
      }
    }

    const paginatedResults = allMockData.slice(startIndex, endIndex);

    // Mock pagination data
    const totalMockResults = 25; // Simulate having 25 total results across 5 pages
    const mockOffset = (page - 1) * itemsPerPage;
    const mockHasMore = mockOffset + paginatedResults.length < totalMockResults;

    console.log(
      `🎭 MOCK DATA: Returning ${paginatedResults.length} businesses for page ${page}`
    );
    console.log(
      `📄 MOCK PAGINATION: Total ${totalMockResults}, Offset ${mockOffset}, Count ${paginatedResults.length}, HasMore: ${mockHasMore}`
    );

    return res.status(200).json({
      success: true,
      data: paginatedResults,
      pagination: {
        totalCount: totalMockResults,
        currentOffset: mockOffset,
        currentCount: paginatedResults.length,
        hasMore: mockHasMore,
      },
    });
  }
  // END TEMPORARY MOCK DATA SECTION

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
      limit: 5, // Reduced from 20 to 5 to reduce API costs
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
    const {
      businesses: foundBusinesses,
      searchType,
      totalCount,
      currentOffset,
      currentCount,
    } = await performCascadingSearch(
      query,
      baseRequestBody,
      apiUrl,
      username,
      password,
      page,
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

    // Calculate if there are more pages available
    const itemsPerPage = baseRequestBody.limit;
    const hasMore = currentOffset + currentCount < totalCount;

    console.log(
      `\n✅ SEARCH COMPLETE: Returning ${businesses.length} businesses`
    );
    console.log(
      `📊 SEARCH SUMMARY: Query "${query}", PLZ ${
        postalCode || "none"
      }, Found via ${searchType}`
    );
    console.log(
      `📄 PAGINATION: Total ${totalCount}, Offset ${currentOffset}, Count ${currentCount}, HasMore: ${hasMore}`
    );
    console.log(`⏱️ RESPONSE READY\n`);

    res.status(200).json({
      success: true,
      data: businesses,
      pagination: {
        totalCount,
        currentOffset,
        currentCount,
        hasMore,
      },
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
