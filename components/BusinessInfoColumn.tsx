import React from "react";
import { Typography } from "@/components/Typography";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { BusinessSearchResult, ReviewStats } from "@/types";
import styles from "./BusinessInfoColumn.module.css";

interface BusinessInfoColumnProps {
  selectedBusiness: BusinessSearchResult;
  ratingData: ReviewStats;
  onBackToSearch: () => void;
  isEmployeeMode: boolean;
  refreshingRatings: boolean;
  isRefreshThrottled: boolean;
  onRefreshRatings: () => void;
}

export const BusinessInfoColumn: React.FC<BusinessInfoColumnProps> = ({
  selectedBusiness,
  ratingData,
  onBackToSearch,
  isEmployeeMode,
  refreshingRatings,
  isRefreshThrottled,
  onRefreshRatings,
}) => {
  return (
    <div className={styles.leftColumn}>
      <div className={styles.businessInfo}>
        <button onClick={onBackToSearch} className={styles.backButton}>
          <div className={styles.backButtonContent}>
            <span className={styles.backChevrons}>‹‹</span>
            <span className={styles.backText}>Zurück</span>
          </div>
        </button>
        <Typography variant="h2">{selectedBusiness.title}</Typography>
        <Typography variant="description">
          <strong>{selectedBusiness.address}</strong>
        </Typography>
        <div className={styles.businessHeaderActions}>
          {isEmployeeMode && (
            <button
              onClick={onRefreshRatings}
              disabled={refreshingRatings || isRefreshThrottled}
              className={styles.refreshButton}
            >
              {refreshingRatings ? (
                <>
                  <LoadingSpinner size="sm" color="#6b7280" />
                  Aktualisiere...
                </>
              ) : isRefreshThrottled ? (
                "⏱️ Warten..."
              ) : (
                "🔄 Aktuelle Ratings anfordern"
              )}
            </button>
          )}
        </div>
      </div>

      <div className={styles.currentStats}>
        <Typography variant="description" className={styles.statsText}>
          Aktuelles Rating: {ratingData.rating.toFixed(2)}
        </Typography>
        <Typography variant="description" className={styles.statsText}>
          Anzahl Bewertungen: {ratingData.reviews_count}
        </Typography>
      </div>

      <div className={styles.starDistribution}>
        <Typography variant="description" className={styles.statsText}>
          Aktuelle Bewertungsverteilung
        </Typography>

        <div className={styles.starRow}>
          <div className={styles.starLabel}>
            <span className={styles.stars}>★★★★★</span>
          </div>
          <span className={styles.starCount}>
            {ratingData.rating_distribution.five_star}
          </span>
        </div>

        <div className={styles.starRow}>
          <div className={styles.starLabel}>
            <span className={styles.stars}>★★★★</span>
          </div>
          <span className={styles.starCount}>
            {ratingData.rating_distribution.four_star}
          </span>
        </div>

        <div className={styles.starRow}>
          <div className={styles.starLabel}>
            <span className={styles.stars}>★★★</span>
          </div>
          <span className={styles.starCount}>
            {ratingData.rating_distribution.three_star}
          </span>
        </div>

        <div className={styles.starRow}>
          <div className={styles.starLabel}>
            <span className={styles.stars}>★★</span>
          </div>
          <span className={styles.starCount}>
            {ratingData.rating_distribution.two_star}
          </span>
        </div>

        <div className={styles.starRow}>
          <div className={styles.starLabel}>
            <span className={styles.stars}>★</span>
          </div>
          <span className={styles.starCount}>
            {ratingData.rating_distribution.one_star}
          </span>
        </div>
      </div>
    </div>
  );
};
