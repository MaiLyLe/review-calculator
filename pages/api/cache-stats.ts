import type { NextApiRequest, NextApiResponse } from "next";
import { serverCache } from "@/utils/cache";

interface CacheStats {
  size: number;
  keys: string[];
  geoKeys: string[];
  businessKeys: string[];
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CacheStats>
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const stats = serverCache.getStats();

    // Categorize keys
    const geoKeys = stats.keys.filter((key) => key.startsWith("geo:"));
    const businessKeys = stats.keys.filter((key) => key.startsWith("biz:"));

    res.status(200).json({
      size: stats.size,
      keys: stats.keys,
      geoKeys,
      businessKeys,
    });
  } catch (error) {
    console.error("Error getting cache stats:", error);
    res.status(500).json({
      size: 0,
      keys: [],
      geoKeys: [],
      businessKeys: [],
    });
  }
}
