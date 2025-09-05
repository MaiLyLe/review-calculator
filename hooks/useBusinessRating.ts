import { useState, useCallback } from "react";
import { ReviewStats, ApiResponse } from "@/types";

interface UseBusinessRatingReturn {
  data: ReviewStats | null;
  loading: boolean;
  error: string | null;
  fetchRating: (businessId: string) => Promise<void>;
  clearData: () => void;
}

export const useBusinessRating = (): UseBusinessRatingReturn => {
  const [data, setData] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRating = useCallback(async (businessId: string) => {
    if (!businessId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ place_id: businessId }),
      });

      const result: ApiResponse<ReviewStats> = await response.json();

      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || "Fehler beim Laden der Bewertungsdaten");
        setData(null);
      }
    } catch (err) {
      setError("Netzwerkfehler beim Laden der Bewertungen");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearData = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    fetchRating,
    clearData,
  };
};
