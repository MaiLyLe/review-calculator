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
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // Check for employee mode query parameter
  useEffect(() => {
    if (router.isReady) {
      const forEmployees = router.query["for-employees"] === "true";
      setIsEmployeeMode(forEmployees);
    }
  }, [router.isReady, router.query]);

  // Fetch fresh data immediately when component mounts or business changes
  useEffect(() => {
    const fetchFreshData = async () => {
      console.log(
        `🔍 RATING ANALYSIS - Fetching fresh data for: ${selectedBusiness.title}`
      );
      setRatingData(null); // Clear old data to show loading

      try {
        const response = await fetch("/api/rating", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            place_id: selectedBusiness.place_id,
            businessName: selectedBusiness.title,
            businessLocation: selectedBusiness.selectedCity?.name || "Germany",
            bypassCache: false, // Use cache for initial load (24h cache)
          }),
        });

        const data = await response.json();

        if (data.success && data.data) {
          console.log(`✅ RATING ANALYSIS - Fresh data received:`, data.data);
          setRatingData(data.data);
          setIsInitialLoading(false);
        } else {
          console.error(
            `❌ RATING ANALYSIS - Failed to fetch data:`,
            data.error
          );
          // Fallback to basic data from search if available
          if (selectedBusiness.rating && selectedBusiness.reviews_count) {
            const fallbackData: ReviewStats = {
              place_id: selectedBusiness.place_id,
              rating: selectedBusiness.rating,
              reviews_count: selectedBusiness.reviews_count,
              rating_distribution: {
                five_star: 0,
                four_star: 0,
                three_star: 0,
                two_star: 0,
                one_star: 0,
              },
              votes_count: selectedBusiness.reviews_count,
            };
            setRatingData(fallbackData);
            setIsInitialLoading(false);
          } else {
            setIsInitialLoading(false);
          }
        }
      } catch (error) {
        console.error(`❌ RATING ANALYSIS - Error fetching data:`, error);
        // Fallback to basic data from search if available
        if (selectedBusiness.rating && selectedBusiness.reviews_count) {
          const fallbackData: ReviewStats = {
            place_id: selectedBusiness.place_id,
            rating: selectedBusiness.rating,
            reviews_count: selectedBusiness.reviews_count,
            rating_distribution: {
              five_star: 0,
              four_star: 0,
              three_star: 0,
              two_star: 0,
              one_star: 0,
            },
            votes_count: selectedBusiness.reviews_count,
          };
          setRatingData(fallbackData);
          setIsInitialLoading(false);
        } else {
          setIsInitialLoading(false);
        }
      }
    };

    fetchFreshData();
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
      // Use the original city from input field for Google Reviews API
      const businessLocation = selectedBusiness.selectedCity?.name || "Germany";

      // Call rating API directly with bypass cache flag for fresh rating data
      const response = await fetch("/api/rating", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          place_id: selectedBusiness.place_id,
          businessName: selectedBusiness.title,
          businessLocation: businessLocation,
          bypassCache: false, // Use cache to avoid unnecessary API calls
        }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        // Update with fresh rating data from Google Reviews API
        setRatingData(result.data);

        // The sliders will be reset automatically by the RatingControlsColumn component
        // when ratingData is updated
        console.log(
          "🔥 FRESH RATING DATA: Updated with latest Google Reviews data"
        );
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
      {isInitialLoading && (
        <div className={styles.loadingContainer}>
          <Typography variant="h3" className={styles.loadingTitle}>
            Lade aktuelle Bewertungsdaten...
          </Typography>
          <Typography
            variant="description"
            className={styles.loadingDescription}
          >
            Wir holen die neuesten Daten für {selectedBusiness.title}
          </Typography>
          <div className={styles.spinner}>⏳</div>
        </div>
      )}
      {!isInitialLoading && !ratingData && (
        <Typography variant="description" className={styles.error}>
          Keine Bewertungsdaten verfügbar für dieses Unternehmen.
        </Typography>
      )}
      {!isInitialLoading && ratingData && (
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
