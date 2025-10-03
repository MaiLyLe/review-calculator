import type { NextApiRequest, NextApiResponse } from "next";
import { serverCache } from "@/utils/cache";

interface NominatimCityResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  class: string;
  type: string;
  place_rank: number;
  importance: number;
  addresstype: string;
  name: string;
  display_name: string;
  boundingbox: string[];
}

export interface CityOption {
  id: string;
  name: string;
  displayName: string;
  country: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

interface ApiResponse {
  success: boolean;
  data?: CityOption[];
  error?: string;
}

// Throttling mechanism to ensure max 1 request per second for Nominatim
class RequestThrottler {
  private lastRequestTime = 0;
  private readonly minInterval = 1000; // 1 second in milliseconds

  async throttle(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minInterval) {
      const waitTime = this.minInterval - timeSinceLastRequest;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }
}

const throttler = new RequestThrottler();

/**
 * Search for cities using Nominatim API
 * Returns cities with their full display names for disambiguation
 */
async function searchCities(query: string): Promise<CityOption[]> {
  if (!query || query.trim().length < 2) {
    return [];
  }

  const cleanQuery = query.trim();

  // Check cache first
  const cacheKey = `city_search:${cleanQuery.toLowerCase()}`;
  const cachedResult = serverCache.get<CityOption[]>(cacheKey);

  if (cachedResult) {
    console.log(
      `🟢 CITY SEARCH CACHE HIT: "${cleanQuery}" -> ${cachedResult.length} cities`
    );
    return cachedResult;
  }

  console.log(
    `🔴 CITY SEARCH CACHE MISS: "${cleanQuery}" - calling Nominatim API`
  );

  try {
    // Apply throttling
    await throttler.throttle();

    // Search for cities/towns/villages with the query
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      cleanQuery
    )}&class=place&type=city,town,village&format=json&limit=10&addressdetails=1&extratags=1&namedetails=1`;

    console.log(`📡 NOMINATIM CITY SEARCH: ${url}`);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Rating-Calculator/1.0", // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim API error: ${response.status} ${response.statusText}`
      );
    }

    const data: NominatimCityResult[] = await response.json();
    console.log(`📊 NOMINATIM RESPONSE: Found ${data.length} results`);

    // Transform results to our format
    const cities: CityOption[] = data.map((result) => {
      // Extract country from display_name (usually the last part)
      const parts = result.display_name.split(", ");
      const country = parts[parts.length - 1] || "Unknown";

      // Create a clean display name (City, State/Region, Country)
      const displayParts = parts.slice(0, Math.min(3, parts.length));
      const displayName = displayParts.join(", ");

      return {
        id: `nominatim_${result.place_id}`,
        name: result.name,
        displayName: displayName,
        country: country,
        coordinates: {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        },
      };
    });

    // Remove duplicates based on display name
    const uniqueCities = cities.filter(
      (city, index, self) =>
        index === self.findIndex((c) => c.displayName === city.displayName)
    );

    // Sort by importance (Nominatim returns results roughly by importance already)
    // but we can prioritize exact matches
    const sortedCities = uniqueCities.sort((a, b) => {
      const aExact = a.name.toLowerCase() === cleanQuery.toLowerCase();
      const bExact = b.name.toLowerCase() === cleanQuery.toLowerCase();

      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      return 0; // Keep original order for non-exact matches
    });

    // Cache the result for 1 hour
    serverCache.set(cacheKey, sortedCities, 60 * 60 * 1000);
    console.log(
      `💾 CITY SEARCH CACHED: "${cleanQuery}" -> ${sortedCities.length} cities for 1h`
    );

    return sortedCities;
  } catch (error) {
    console.error(`❌ CITY SEARCH ERROR: ${error}`);
    throw error;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
    });
  }

  const { q } = req.query;

  if (!q || typeof q !== "string") {
    return res.status(400).json({
      success: false,
      error: "Query parameter 'q' is required",
    });
  }

  if (q.length < 2) {
    return res.json({
      success: true,
      data: [],
    });
  }

  try {
    const cities = await searchCities(q);

    res.json({
      success: true,
      data: cities,
    });
  } catch (error) {
    console.error("City search error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal server error",
    });
  }
}
