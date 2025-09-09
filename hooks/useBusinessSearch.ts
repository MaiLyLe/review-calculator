import { useState, useCallback } from "react";
import { BusinessSearchResult, ApiResponse } from "@/types";

interface UseBusinessSearchReturn {
  results: BusinessSearchResult[];
  loading: boolean;
  error: string | null;
  pagination: {
    totalCount: number;
    currentOffset: number;
    currentCount: number;
    hasMore: boolean;
  } | null;
  search: (query: string, postalCode?: string, page?: number) => Promise<void>;
  clearResults: () => void;
}

export const useBusinessSearch = (): UseBusinessSearchReturn => {
  const [results, setResults] = useState<BusinessSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<{
    totalCount: number;
    currentOffset: number;
    currentCount: number;
    hasMore: boolean;
  } | null>(null);

  const search = useCallback(
    async (query: string, postalCode?: string, page: number = 1) => {
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
          body: JSON.stringify({ query, postalCode, page }),
        });

        const data: ApiResponse<BusinessSearchResult[]> = await response.json();

        if (data.success && data.data) {
          setResults(data.data);
          setPagination(data.pagination || null);
        } else {
          setError(data.error || "Fehler beim Suchen von Unternehmen");
          setResults([]);
          setPagination(null);
        }
      } catch (err) {
        console.error(err);
        setError("Netzwerkfehler beim Suchen");
        setResults([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
    setPagination(null);
  }, []);

  return {
    results,
    loading,
    error,
    pagination,
    search,
    clearResults,
  };
};
