import { useState, useCallback } from "react";
import { BusinessSearchResult, ApiResponse } from "@/types";

interface UseBusinessSearchReturn {
  results: BusinessSearchResult[];
  loading: boolean;
  error: string | null;
  search: (query: string, postalCode?: string) => Promise<void>;
  clearResults: () => void;
}

export const useBusinessSearch = (): UseBusinessSearchReturn => {
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, postalCode?: string) => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, postalCode }),
      });

      const data: ApiResponse<BusinessSearchResult[]> = await response.json();

      if (data.success && data.data) {
        setResults(data.data);
      } else {
        setError(data.error || "Fehler beim Suchen von Unternehmen");
        setResults([]);
      }
    } catch (err) {
      console.error(err);
      setError("Netzwerkfehler beim Suchen");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    clearResults,
  };
};
