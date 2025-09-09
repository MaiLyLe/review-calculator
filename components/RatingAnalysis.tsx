import React, { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Typography } from "@/components/Typography";
import { BusinessInfoColumn } from "@/components/BusinessInfoColumn";
import { RatingControlsColumn } from "@/components/RatingControlsColumn";
import { BusinessSearchResult, ReviewStats } from "@/types";
import styles from "./RatingAnalysis.module.css";

interface RatingAnalysisProps {
  selectedBusiness: BusinessSearchResult;
  onBackToSearch: () => void;
}

export const RatingAnalysis: React.FC<RatingAnalysisProps> = ({
  selectedBusiness,
  onBackToSearch,
}) => {
  const router = useRouter();
  const [ratingData, setRatingData] = useState<ReviewStats | null>(null);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [refreshingRatings, setRefreshingRatings] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshThrottled, setIsRefreshThrottled] = useState(false);

  // Check for employee mode query parameter
  useEffect(() => {
    if (router.isReady) {
      const forEmployees = router.query["for-employees"] === "true";
      setIsEmployeeMode(forEmployees);
    }
  }, [router.isReady, router.query]);

  // Initialize rating data when component mounts or business changes
  useEffect(() => {
    if (
      selectedBusiness.rating &&
      selectedBusiness.reviews_count &&
      selectedBusiness.rating_distribution
    ) {
      const newRatingData: ReviewStats = {
        place_id: selectedBusiness.place_id,
        rating: selectedBusiness.rating,
        reviews_count: selectedBusiness.reviews_count,
        rating_distribution: selectedBusiness.rating_distribution,
        votes_count: selectedBusiness.reviews_count,
      };
      setRatingData(newRatingData);
    } else {
      setRatingData(null);
    }
  }, [selectedBusiness]);

  const handleRefreshRatings = async () => {
    if (!selectedBusiness) return;

    // Throttle: minimum 5 seconds between refresh requests
    const now = Date.now();
    const minInterval = 5000; // 5 seconds
    const timeSinceLastRefresh = now - lastRefreshTime;

    if (timeSinceLastRefresh < minInterval && lastRefreshTime > 0) {
      setIsRefreshThrottled(true);

      // Clear throttle message after remaining time
      setTimeout(() => {
        setIsRefreshThrottled(false);
      }, minInterval - timeSinceLastRefresh);

      return;
    }

    setLastRefreshTime(now);
    setRefreshingRatings(true);
    setIsRefreshThrottled(false);

    try {
      // Call search API with bypass cache flag for fresh data
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: selectedBusiness.title,
          postalCode: "", // We'll extract from address if needed
          bypassCache: true, // Force fresh data
        }),
      });

      const result = await response.json();

      if (result.success && result.data.length > 0) {
        // Find the same business in fresh results
        const freshBusiness =
          result.data.find(
            (b: BusinessSearchResult) =>
              b.place_id === selectedBusiness.place_id
          ) || result.data[0]; // Fallback to first result

        // Update with fresh data
        if (
          freshBusiness.rating &&
          freshBusiness.reviews_count &&
          freshBusiness.rating_distribution
        ) {
          const freshRatingData: ReviewStats = {
            place_id: freshBusiness.place_id,
            rating: freshBusiness.rating,
            reviews_count: freshBusiness.reviews_count,
            rating_distribution: freshBusiness.rating_distribution,
            votes_count: freshBusiness.votes_count,
          };
          setRatingData(freshRatingData);

          // The sliders will be reset automatically by the RatingControlsColumn component
          // when ratingData is updated
        }
      } else {
        // Error handling is now done in RatingControlsColumn if needed
        console.warn("Keine aktuellen Bewertungsdaten verfügbar.");
      }
    } catch (error) {
      console.error("Fehler beim Laden der aktuellen Bewertungen:", error);
    } finally {
      setRefreshingRatings(false);
    }
  };

  return (
    <>
      {!ratingData && (
        <Typography variant="description" className={styles.error}>
          Keine Bewertungsdaten verfügbar für dieses Unternehmen.
        </Typography>
      )}
      {ratingData && (
        <div className={styles.analysisContent}>
          <div className={styles.analysisGrid}>
            {/* Left Column - Business Info and Star Distribution */}
            <BusinessInfoColumn
              selectedBusiness={selectedBusiness}
              ratingData={ratingData}
              onBackToSearch={onBackToSearch}
              isEmployeeMode={isEmployeeMode}
              refreshingRatings={refreshingRatings}
              isRefreshThrottled={isRefreshThrottled}
              onRefreshRatings={handleRefreshRatings}
            />

            {/* Right Column - Interactive Controls and Results */}
            <RatingControlsColumn
              selectedBusiness={selectedBusiness}
              ratingData={ratingData}
            />
          </div>
        </div>
      )}
    </>
  );
};
