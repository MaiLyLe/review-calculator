import type { NextApiRequest, NextApiResponse } from "next";
import { serverCache } from "@/utils/cache";

interface ClearResponse {
  success: boolean;
  message: string;
  clearedCount?: number;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ClearResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({
      success: false,
      message: `Method ${req.method} Not Allowed`,
    });
  }

  try {
    const statsBefore = serverCache.getStats();
    const clearedCount = statsBefore.size;

    serverCache.clear();

    res.status(200).json({
      success: true,
      message: `Cache cleared successfully`,
      clearedCount,
    });
  } catch (error) {
    console.error("Error clearing cache:", error);
    res.status(500).json({
      success: false,
      message: "Error clearing cache",
    });
  }
}
