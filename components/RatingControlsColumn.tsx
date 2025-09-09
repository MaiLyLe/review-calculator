import React, { useState, useEffect } from "react";
import { Typography } from "@/components/Typography";
import { Slider } from "@/components/Slider";
import { BusinessSearchResult, CalculationResult, ReviewStats } from "@/types";
import { calculateReviewsToRemove } from "@/utils/reviewCalculations";
import { validateTargetRating, isValidTargetRating } from "@/utils/validate";
import styles from "./RatingControlsColumn.module.css";

interface RatingControlsColumnProps {
  selectedBusiness: BusinessSearchResult;
  ratingData: ReviewStats;
}

const targetRatingOptions = [4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5.0];

export const RatingControlsColumn: React.FC<RatingControlsColumnProps> = ({
  selectedBusiness,
  ratingData,
}) => {
  const [targetRating, setTargetRating] = useState("");
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [validationError, setValidationError] = useState("");
  const [showTooltip, setShowTooltip] = useState(false);

  // Slider states for review distribution
  const [fiveStarSlider, setFiveStarSlider] = useState([0]);
  const [fourStarSlider, setFourStarSlider] = useState([0]);
  const [threeStarSlider, setThreeStarSlider] = useState([0]);
  const [twoStarSlider, setTwoStarSlider] = useState([0]);
  const [oneStarSlider, setOneStarSlider] = useState([0]);

  // Initialize sliders when rating data loads
  useEffect(() => {
    if (ratingData) {
      setFiveStarSlider([ratingData.rating_distribution.five_star]);
      setFourStarSlider([ratingData.rating_distribution.four_star]);
      setThreeStarSlider([ratingData.rating_distribution.three_star]);
      setTwoStarSlider([ratingData.rating_distribution.two_star]);
      setOneStarSlider([ratingData.rating_distribution.one_star]);
    }
  }, [ratingData]);

  // Close tooltip when clicking/touching outside
  useEffect(() => {
    const handleOutsideInteraction = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Element;
      if (showTooltip && !target.closest(`.${styles.infoIconContainer}`)) {
        setShowTooltip(false);
      }
    };

    if (showTooltip) {
      document.addEventListener("click", handleOutsideInteraction);
      document.addEventListener("touchstart", handleOutsideInteraction);
      return () => {
        document.removeEventListener("click", handleOutsideInteraction);
        document.removeEventListener("touchstart", handleOutsideInteraction);
      };
    }
  }, [showTooltip]);

  // Sync target rating selection with slider-calculated rating
  useEffect(() => {
    if (!ratingData) return;

    const sliderRating = calculateRatingFromSliders();
    if (sliderRating !== null) {
      // Check if the slider-calculated rating matches one of the target options
      const matchingOption = targetRatingOptions.find(
        (option) => Math.abs(option - sliderRating) < 0.01
      );

      if (matchingOption && targetRating !== matchingOption.toString()) {
        setTargetRating(matchingOption.toString());
      }
    }
  }, [
    fiveStarSlider,
    fourStarSlider,
    threeStarSlider,
    twoStarSlider,
    oneStarSlider,
    ratingData,
    targetRating,
  ]);

  const handleTargetRatingChange = (value: string) => {
    setTargetRating(value);
    setValidationError("");

    // Calculate and show expected final distribution after achieving target
    if (value && ratingData) {
      const target = parseFloat(value);
      if (isValidTargetRating(target)) {
        // Try to calculate what needs to be removed using the greedy algorithm
        const result = calculateReviewsToRemove(
          ratingData.rating,
          target,
          ratingData.rating_distribution
        );

        // Check if the greedy algorithm achieved the exact target
        const achievedRating = result.projectedRating;
        const targetDifference = Math.abs(achievedRating - target);

        if (targetDifference < 0.01) {
          // Greedy algorithm worked - use its result
          const finalDistribution = {
            five_star:
              ratingData.rating_distribution.five_star -
              result.reviewsToRemove.fiveStar +
              (result.reviewsToAdd?.fiveStar || 0),
            four_star:
              ratingData.rating_distribution.four_star -
              result.reviewsToRemove.fourStar,
            three_star:
              ratingData.rating_distribution.three_star -
              result.reviewsToRemove.threeStar,
            two_star:
              ratingData.rating_distribution.two_star -
              result.reviewsToRemove.twoStar,
            one_star:
              ratingData.rating_distribution.one_star -
              result.reviewsToRemove.oneStar,
          };

          // Set sliders to final distribution
          setFiveStarSlider([finalDistribution.five_star]);
          setFourStarSlider([finalDistribution.four_star]);
          setThreeStarSlider([finalDistribution.three_star]);
          setTwoStarSlider([finalDistribution.two_star]);
          setOneStarSlider([finalDistribution.one_star]);

          // Set the calculation result immediately
          setCalculationResult(result);
        } else {
          // Greedy algorithm couldn't achieve exact target
          // Use a simple approximation: find the closest achievable distribution
          const totalReviews = ratingData.reviews_count;
          const targetScore = target * totalReviews;

          // Start with current distribution and make minimal adjustments
          let bestDistribution = { ...ratingData.rating_distribution };
          let currentScore =
            bestDistribution.five_star * 5 +
            bestDistribution.four_star * 4 +
            bestDistribution.three_star * 3 +
            bestDistribution.two_star * 2 +
            bestDistribution.one_star * 1;

          // Simple heuristic: remove low-star reviews until we get close to target
          while (currentScore < targetScore && bestDistribution.one_star > 0) {
            bestDistribution.one_star--;
            currentScore -= 1;
          }

          while (currentScore < targetScore && bestDistribution.two_star > 0) {
            bestDistribution.two_star--;
            currentScore -= 2;
          }

          // Set sliders to the approximated distribution
          setFiveStarSlider([bestDistribution.five_star]);
          setFourStarSlider([bestDistribution.four_star]);
          setThreeStarSlider([bestDistribution.three_star]);
          setTwoStarSlider([bestDistribution.two_star]);
          setOneStarSlider([bestDistribution.one_star]);

          // Calculate result with the new distribution
          const approximateResult = calculateRemovalsFromSliders({
            five: bestDistribution.five_star,
            four: bestDistribution.four_star,
            three: bestDistribution.three_star,
            two: bestDistribution.two_star,
            one: bestDistribution.one_star,
          });

          if (approximateResult) {
            setCalculationResult(approximateResult);
          }
        }
      } else {
        // Reset to current distribution if invalid target
        setFiveStarSlider([ratingData.rating_distribution.five_star]);
        setFourStarSlider([ratingData.rating_distribution.four_star]);
        setThreeStarSlider([ratingData.rating_distribution.three_star]);
        setTwoStarSlider([ratingData.rating_distribution.two_star]);
        setOneStarSlider([ratingData.rating_distribution.one_star]);
      }
    }
  };

  // More accurate rounding function that handles floating-point precision issues
  const preciseRound = (num: number, decimals: number): number => {
    const factor = Math.pow(10, decimals);
    return Math.round((num + Number.EPSILON) * factor) / factor;
  };

  // Helper function to calculate total reviews to remove and percentage
  const calculateRemovalStats = (reviewsToRemove: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  }) => {
    if (!reviewsToRemove || !ratingData) return { total: 0, percentage: 0 };

    const total =
      reviewsToRemove.oneStar +
      reviewsToRemove.twoStar +
      reviewsToRemove.threeStar +
      reviewsToRemove.fourStar +
      reviewsToRemove.fiveStar;

    const percentage = (total / ratingData.reviews_count) * 100;

    return {
      total,
      percentage: preciseRound(percentage, 1), // Use precise rounding
    };
  };

  // Helper function to calculate what rating the current slider values would achieve
  const calculateRatingFromSliders = () => {
    if (!ratingData) return null;

    const totalReviews =
      fiveStarSlider[0] +
      fourStarSlider[0] +
      threeStarSlider[0] +
      twoStarSlider[0] +
      oneStarSlider[0];
    if (totalReviews === 0) return null;

    const weightedSum =
      fiveStarSlider[0] * 5 +
      fourStarSlider[0] * 4 +
      threeStarSlider[0] * 3 +
      twoStarSlider[0] * 2 +
      oneStarSlider[0] * 1;

    const calculatedRating = weightedSum / totalReviews;

    // Check if sliders are at their original values (max)
    const isAtOriginalDistribution =
      fiveStarSlider[0] === ratingData.rating_distribution.five_star &&
      fourStarSlider[0] === ratingData.rating_distribution.four_star &&
      threeStarSlider[0] === ratingData.rating_distribution.three_star &&
      twoStarSlider[0] === ratingData.rating_distribution.two_star &&
      oneStarSlider[0] === ratingData.rating_distribution.one_star;

    // If sliders are at original distribution, return the actual rating to maintain consistency
    if (isAtOriginalDistribution) {
      return ratingData.rating;
    }

    return preciseRound(calculatedRating, 1); // Use precise rounding to 1 decimal place
  };

  // Helper function to test if a target rating is mathematically achievable by removing reviews
  const isTargetRatingAchievable = (targetRating: number): boolean => {
    if (!ratingData) return false;

    // Test if we can achieve this target by removing reviews using greedy algorithm
    const result = calculateReviewsToRemove(
      ratingData.rating,
      targetRating,
      ratingData.rating_distribution
    );

    // Check if we achieved the target within a small tolerance
    const achievedRating = result.projectedRating;
    return Math.abs(achievedRating - targetRating) < 0.01;
  };

  // Helper function to calculate what needs to be removed based on current slider values (target distribution)
  const calculateRemovalsFromSliders = (customSliders?: {
    five: number;
    four: number;
    three: number;
    two: number;
    one: number;
  }) => {
    if (!ratingData) return null;

    // Use provided slider values or current state
    const sliders = customSliders || {
      five: fiveStarSlider[0],
      four: fourStarSlider[0],
      three: threeStarSlider[0],
      two: twoStarSlider[0],
      one: oneStarSlider[0],
    };

    // Calculate the target rating from slider positions
    const totalReviews =
      sliders.five + sliders.four + sliders.three + sliders.two + sliders.one;
    if (totalReviews === 0) return null;

    const weightedSum =
      sliders.five * 5 +
      sliders.four * 4 +
      sliders.three * 3 +
      sliders.two * 2 +
      sliders.one * 1;
    const calculatedTarget = weightedSum / totalReviews;

    // Check if sliders are at their original values (max)
    const isAtOriginalDistribution =
      sliders.five === ratingData.rating_distribution.five_star &&
      sliders.four === ratingData.rating_distribution.four_star &&
      sliders.three === ratingData.rating_distribution.three_star &&
      sliders.two === ratingData.rating_distribution.two_star &&
      sliders.one === ratingData.rating_distribution.one_star;

    // Determine the final calculated target
    const finalCalculatedTarget = isAtOriginalDistribution
      ? ratingData.rating
      : preciseRound(calculatedTarget, 1);

    // If sliders are at original distribution, no removals are needed
    if (isAtOriginalDistribution) {
      return {
        targetRating: finalCalculatedTarget,
        reviewsToRemove: {
          oneStar: 0,
          twoStar: 0,
          threeStar: 0,
          fourStar: 0,
          fiveStar: 0,
        },
        reviewsToAdd: { fiveStar: 0 },
        projectedRating: ratingData.rating,
        strategy: "remove" as const,
      };
    }

    // Calculate how many reviews need to be removed to achieve the slider distribution
    const currentDistribution = ratingData.rating_distribution;
    const targetDistribution = {
      five_star: sliders.five,
      four_star: sliders.four,
      three_star: sliders.three,
      two_star: sliders.two,
      one_star: sliders.one,
    };

    const removals = {
      oneStar: Math.max(
        0,
        currentDistribution.one_star - targetDistribution.one_star
      ),
      twoStar: Math.max(
        0,
        currentDistribution.two_star - targetDistribution.two_star
      ),
      threeStar: Math.max(
        0,
        currentDistribution.three_star - targetDistribution.three_star
      ),
      fourStar: Math.max(
        0,
        currentDistribution.four_star - targetDistribution.four_star
      ),
      fiveStar: Math.max(
        0,
        currentDistribution.five_star - targetDistribution.five_star
      ),
    };

    // Calculate the projected rating with the target distribution
    const totalFinalReviews =
      targetDistribution.five_star +
      targetDistribution.four_star +
      targetDistribution.three_star +
      targetDistribution.two_star +
      targetDistribution.one_star;

    const finalScore =
      targetDistribution.five_star * 5 +
      targetDistribution.four_star * 4 +
      targetDistribution.three_star * 3 +
      targetDistribution.two_star * 2 +
      targetDistribution.one_star * 1;

    const projectedRating =
      totalFinalReviews > 0 ? finalScore / totalFinalReviews : 0;

    return {
      targetRating: finalCalculatedTarget,
      reviewsToRemove: removals,
      reviewsToAdd: { fiveStar: 0 },
      projectedRating: preciseRound(projectedRating, 1),
      strategy: "remove" as const,
    };
  };

  // Function to handle slider changes and update target rating
  const handleSliderChange = (
    sliderType: "five" | "four" | "three" | "two" | "one",
    value: number[]
  ) => {
    // Get current slider values and update the changed one
    const currentSliders = {
      five: fiveStarSlider[0],
      four: fourStarSlider[0],
      three: threeStarSlider[0],
      two: twoStarSlider[0],
      one: oneStarSlider[0],
    };

    // Update the specific slider value
    currentSliders[sliderType] = value[0];

    // Update the appropriate slider state
    switch (sliderType) {
      case "five":
        setFiveStarSlider(value);
        break;
      case "four":
        setFourStarSlider(value);
        break;
      case "three":
        setThreeStarSlider(value);
        break;
      case "two":
        setTwoStarSlider(value);
        break;
      case "one":
        setOneStarSlider(value);
        break;
    }

    // Calculate the new target rating based on updated slider values
    if (ratingData) {
      const totalReviews =
        currentSliders.five +
        currentSliders.four +
        currentSliders.three +
        currentSliders.two +
        currentSliders.one;
      if (totalReviews > 0) {
        const weightedSum =
          currentSliders.five * 5 +
          currentSliders.four * 4 +
          currentSliders.three * 3 +
          currentSliders.two * 2 +
          currentSliders.one * 1;

        const calculatedRating = weightedSum / totalReviews;

        // Check if sliders are at their original values (max)
        const isAtOriginalDistribution =
          currentSliders.five === ratingData.rating_distribution.five_star &&
          currentSliders.four === ratingData.rating_distribution.four_star &&
          currentSliders.three === ratingData.rating_distribution.three_star &&
          currentSliders.two === ratingData.rating_distribution.two_star &&
          currentSliders.one === ratingData.rating_distribution.one_star;

        let finalRating;
        if (isAtOriginalDistribution) {
          // If sliders are at original distribution, use the actual rating
          finalRating = ratingData.rating;
        } else {
          finalRating = preciseRound(calculatedRating, 1);
        }

        // Update target rating to match what the sliders would achieve
        setTargetRating(finalRating.toFixed(1));

        // Auto-recalculate the results immediately with current slider values
        const result = calculateRemovalsFromSliders(currentSliders);
        if (result) {
          setCalculationResult(result);
        }
      }
    }
  };

  return (
    <div className={styles.rightColumn}>
      <div className={styles.targetSection}>
        <div className={styles.sectionHeader}>
          <Typography
            variant="description"
            className={styles.ratingSectionTitle}
          >
            Welches Zielrating möchten Sie erreichen?
          </Typography>
          <div className={styles.infoIconContainer}>
            <div
              className={styles.infoIcon}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              onTouchStart={() => setShowTooltip(true)}
              onTouchEnd={(e) => {
                e.preventDefault();
                // Keep tooltip open on touch, let click outside handle closing
              }}
              role="button"
              tabIndex={0}
              aria-label="Information about available target ratings"
            >
              ℹ️
            </div>
            {showTooltip && (
              <div className={styles.tooltip}>
                Nur mathematisch erreichbare Zielratings werden angezeigt.
                Manche Bewertungen können aufgrund der aktuellen Verteilung
                nicht erreicht werden.
              </div>
            )}
          </div>
        </div>

        <div className={styles.ratingSelector}>
          {targetRatingOptions
            .filter(
              (rating) =>
                !ratingData ||
                (rating >= ratingData.rating &&
                  isTargetRatingAchievable(rating))
            )
            .map((rating, index) => (
              <label
                key={rating}
                className={`${styles.ratingOption} ${
                  targetRating === rating.toString()
                    ? styles.selectedOption
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name="targetRating"
                  value={rating.toString()}
                  checked={targetRating === rating.toString()}
                  onChange={(e) => {
                    handleTargetRatingChange(e.target.value);
                  }}
                  className={styles.ratingRadio}
                />
                <span className={styles.ratingLabel}>{rating.toFixed(1)}</span>
              </label>
            ))}
        </div>
      </div>
      <div className={styles.breakdown}>
        <Typography variant="description" className={styles.distributionTitle}>
          Zielbewertungsverteilung:
        </Typography>
        <Typography
          variant="description"
          className={styles.distributionExplanation}
        >
          Diese zeigt, wie die Bewertungsverteilung aussehen wird, nachdem die
          empfohlenen Bewertungen entfernt wurden, um das Zielrating zu
          erreichen. Passen Sie die Werte an, um verschiedene Szenarien zu
          erkunden.
        </Typography>

        <div className={styles.currentRatingDisplay}>
          <Typography
            variant="description"
            className={styles.currentRatingDisplayTitle}
          >
            Aktuelles Zielrating aus Sliders:{" "}
            <strong>{targetRating || selectedBusiness.rating}</strong>
          </Typography>
        </div>

        <div
          className={`${styles.reviewRow} ${
            ratingData.rating_distribution.five_star === 0
              ? styles.disabledRow
              : ""
          }`}
        >
          <span className={styles.reviewLabel}>5★: {fiveStarSlider[0]}</span>
          <Slider
            value={fiveStarSlider}
            onValueChange={(value) => handleSliderChange("five", value)}
            min={0}
            max={ratingData.rating_distribution.five_star}
            step={1}
            disabled={ratingData.rating_distribution.five_star === 0}
            className={styles.reviewSlider}
          />
        </div>

        <div
          className={`${styles.reviewRow} ${
            ratingData.rating_distribution.four_star === 0
              ? styles.disabledRow
              : ""
          }`}
        >
          <span className={styles.reviewLabel}>4★: {fourStarSlider[0]}</span>
          <Slider
            value={fourStarSlider}
            onValueChange={(value) => handleSliderChange("four", value)}
            min={0}
            max={ratingData.rating_distribution.four_star}
            step={1}
            disabled={ratingData.rating_distribution.four_star === 0}
            className={styles.reviewSlider}
          />
        </div>

        <div
          className={`${styles.reviewRow} ${
            ratingData.rating_distribution.three_star === 0
              ? styles.disabledRow
              : ""
          }`}
        >
          <span className={styles.reviewLabel}>3★: {threeStarSlider[0]}</span>
          <Slider
            value={threeStarSlider}
            onValueChange={(value) => handleSliderChange("three", value)}
            min={0}
            max={ratingData.rating_distribution.three_star}
            step={1}
            disabled={ratingData.rating_distribution.three_star === 0}
            className={styles.reviewSlider}
          />
        </div>

        <div
          className={`${styles.reviewRow} ${
            ratingData.rating_distribution.two_star === 0
              ? styles.disabledRow
              : ""
          }`}
        >
          <span className={styles.reviewLabel}>2★: {twoStarSlider[0]}</span>
          <Slider
            value={twoStarSlider}
            onValueChange={(value) => handleSliderChange("two", value)}
            min={0}
            max={ratingData.rating_distribution.two_star}
            step={1}
            disabled={ratingData.rating_distribution.two_star === 0}
            className={styles.reviewSlider}
          />
        </div>

        <div
          className={`${styles.reviewRow} ${
            ratingData.rating_distribution.one_star === 0
              ? styles.disabledRow
              : ""
          }`}
        >
          <span className={styles.reviewLabel}>1★: {oneStarSlider[0]}</span>
          <Slider
            value={oneStarSlider}
            onValueChange={(value) => handleSliderChange("one", value)}
            min={0}
            max={ratingData.rating_distribution.one_star}
            step={1}
            disabled={ratingData.rating_distribution.one_star === 0}
            className={styles.reviewSlider}
          />
        </div>
      </div>

      {validationError && (
        <Typography variant="description" className={styles.error}>
          {validationError}
        </Typography>
      )}

      <div className={styles.results}>
        {calculationResult ? (
          <>
            <Typography variant="description">
              <strong>
                {calculateRemovalStats(calculationResult.reviewsToRemove).total}
              </strong>{" "}
              von {ratingData.reviews_count} Bewertungen (
              {
                calculateRemovalStats(calculationResult.reviewsToRemove)
                  .percentage
              }
              % der Gesamtbewertungen) löschen, um Ziel zu erreichen
            </Typography>
            <div className={styles.removalBreakdown}>
              <div className={styles.removalSummary}></div>

              <div className={styles.removalDetails}>
                {calculateRemovalStats(calculationResult.reviewsToRemove)
                  .total === 0 ? (
                  <Typography
                    variant="description"
                    className={styles.noRemovalsMessage}
                  >
                    0 Bewertungen zu entfernen
                  </Typography>
                ) : (
                  <>
                    {calculationResult.reviewsToRemove.oneStar > 0 && (
                      <div className={styles.removalRow}>
                        <span className={styles.starRating}>1★</span>
                        <span className={styles.removalCount}>
                          {calculationResult.reviewsToRemove.oneStar}
                        </span>
                      </div>
                    )}
                    {calculationResult.reviewsToRemove.twoStar > 0 && (
                      <div className={styles.removalRow}>
                        <span className={styles.starRating}>2★</span>
                        <span className={styles.removalCount}>
                          {calculationResult.reviewsToRemove.twoStar}
                        </span>
                      </div>
                    )}
                    {calculationResult.reviewsToRemove.threeStar > 0 && (
                      <div className={styles.removalRow}>
                        <span className={styles.starRating}>3★</span>
                        <span className={styles.removalCount}>
                          {calculationResult.reviewsToRemove.threeStar}
                        </span>
                      </div>
                    )}
                    {calculationResult.reviewsToRemove.fourStar > 0 && (
                      <div className={styles.removalRow}>
                        <span className={styles.starRating}>4★</span>
                        <span className={styles.removalCount}>
                          {calculationResult.reviewsToRemove.fourStar}
                        </span>
                      </div>
                    )}
                    {calculationResult.reviewsToRemove.fiveStar > 0 && (
                      <div className={styles.removalRow}>
                        <span className={styles.starRating}>5★</span>
                        <span className={styles.removalCount}>
                          {calculationResult.reviewsToRemove.fiveStar}
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          // Show placeholder when no calculation result yet
          <>
            <Typography variant="description">
              Wählen Sie ein Zielrating oder bewegen Sie die Slider, um die
              erforderlichen Änderungen zu sehen.
            </Typography>
            <div className={styles.removalBreakdown}>
              <div className={styles.removalDetails}>
                <Typography
                  variant="description"
                  className={styles.noRemovalsMessage}
                >
                  Berechnungsergebnisse werden hier angezeigt
                </Typography>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
