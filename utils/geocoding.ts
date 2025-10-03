import { serverCache } from "./cache";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface Coordinates {
  latitude: number;
  longitude: number;
}

// Throttling mechanism to ensure max 1 request per second
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
 * Converts a German postal code to coordinates using Nominatim API
 * Throttled to max 1 request per second to comply with usage policy
 * Results are cached server-side for 1 hour to reduce API calls
 */
export async function geocodePostalCode(
  postalCode: string
): Promise<Coordinates | null> {
  if (!postalCode || postalCode.trim().length === 0) {
    return null;
  }

  // Clean the postal code (remove spaces, ensure it's valid)
  const cleanedPostalCode = postalCode.trim().replace(/\s+/g, "");

  // Basic validation for German postal codes (5 digits)
  if (!/^\d{5}$/.test(cleanedPostalCode)) {
    throw new Error(
      "Ungültige PLZ. Bitte geben Sie eine 5-stellige deutsche Postleitzahl ein."
    );
  }

  // Check cache first
  const cacheKey = serverCache.generateGeocodingKey(cleanedPostalCode);
  const cachedResult = serverCache.get<Coordinates>(cacheKey);

  if (cachedResult) {
    console.log(
      `🟢 GEOCODING CACHE HIT: ${cleanedPostalCode} -> ${cachedResult.latitude}, ${cachedResult.longitude}`
    );
    return cachedResult;
  }

  try {
    console.log(
      `🔴 GEOCODING CACHE MISS: ${cleanedPostalCode} - calling Nominatim API`
    );
    console.log(
      `📡 NOMINATIM API CALL: Fetching coordinates for PLZ ${cleanedPostalCode}`
    );

    // Apply throttling
    await throttler.throttle();

    const url = `https://nominatim.openstreetmap.org/search?postalcode=${cleanedPostalCode}&country=Germany&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Rating-Calculator/1.0", // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      throw new Error(
        `Geocoding API error: ${response.status} ${response.statusText}`
      );
    }

    const data: NominatimResult[] = await response.json();

    if (data.length === 0) {
      throw new Error("PLZ nicht gefunden. Bitte überprüfen Sie die Eingabe.");
    }

    const result = data[0];
    const coordinates: Coordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };

    // Cache the result for 24 hours
    serverCache.set(cacheKey, coordinates, 24 * 60 * 60 * 1000);
    console.log(
      `✅ NOMINATIM SUCCESS: ${cleanedPostalCode} -> ${coordinates.latitude}, ${coordinates.longitude}`
    );
    console.log(`💾 GEOCODING CACHED: Key "${cacheKey}" for 24 hours`);

    return coordinates;
  } catch (error) {
    throw error;
  }
}

/**
 * Geocode a city name to coordinates using Nominatim API
 * This is used when user selects a city from the autocomplete
 * Results are cached server-side for 24 hours to reduce API calls
 */
export async function geocodeCity(
  cityName: string,
  country?: string
): Promise<Coordinates | null> {
  if (!cityName || cityName.trim().length === 0) {
    return null;
  }

  const cleanedCityName = cityName.trim();
  const searchQuery = country
    ? `${cleanedCityName}, ${country}`
    : cleanedCityName;

  // Check cache first
  const cacheKey = serverCache.generateGeocodingKey(
    `city:${searchQuery.toLowerCase()}`
  );
  const cachedResult = serverCache.get<Coordinates>(cacheKey);

  if (cachedResult) {
    console.log(
      `🟢 CITY GEOCODING CACHE HIT: ${searchQuery} -> ${cachedResult.latitude}, ${cachedResult.longitude}`
    );
    return cachedResult;
  }

  try {
    console.log(
      `🔴 CITY GEOCODING CACHE MISS: ${searchQuery} - calling Nominatim API`
    );
    console.log(
      `📡 NOMINATIM API CALL: Fetching coordinates for city ${searchQuery}`
    );

    // Apply throttling
    await throttler.throttle();

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
      searchQuery
    )}&class=place&type=city,town,village&format=json&limit=1`;

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Rating-Calculator/1.0", // Required by Nominatim usage policy
      },
    });

    if (!response.ok) {
      throw new Error(
        `Geocoding API error: ${response.status} ${response.statusText}`
      );
    }

    const data: NominatimResult[] = await response.json();

    if (data.length === 0) {
      throw new Error("Ort nicht gefunden. Bitte überprüfen Sie die Eingabe.");
    }

    const result = data[0];
    const coordinates: Coordinates = {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };

    // Cache the result for 24 hours
    serverCache.set(cacheKey, coordinates, 24 * 60 * 60 * 1000);
    console.log(
      `✅ NOMINATIM SUCCESS: ${searchQuery} -> ${coordinates.latitude}, ${coordinates.longitude}`
    );
    console.log(`💾 CITY GEOCODING CACHED: Key "${cacheKey}" for 24 hours`);

    return coordinates;
  } catch (error) {
    console.error(`❌ CITY GEOCODING ERROR: ${error}`);
    throw error;
  }
}

/**
 * Formats coordinates for DataForSEO API
 * Format: "latitude,longitude,radius" where radius is in kilometers
 */
export function formatCoordinatesForDataForSeo(
  coordinates: Coordinates,
  radiusKm: number = 5
): string {
  return `${coordinates.latitude},${coordinates.longitude},${radiusKm}`;
}
