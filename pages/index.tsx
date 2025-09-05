import React, { useState, useEffect } from "react";
import { NextPage } from "next";
import { useRouter } from "next/router";
import Head from "next/head";
import styles from "../styles/Home.module.css";
import { Button } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Slider } from "@/components/Slider";
import { SearchForm } from "@/components/SearchForm";
import { BusinessSearchResult, CalculationResult, ReviewStats } from "@/types";
import {
  calculateReviewsToRemove,
  formatRemovalInstructions,
} from "@/utils/reviewCalculations";
import { validateTargetRating, isValidTargetRating } from "@/utils/validate";
const targetRatingOptions = [4.0, 4.2, 4.5, 4.7, 4.8, 4.9, 5.0];

const Home: NextPage = () => {
  const router = useRouter();
  const [selectedBusiness, setSelectedBusiness] =
    useState<BusinessSearchResult | null>(null);
  const [targetRating, setTargetRating] = useState("");
  const [calculationResult, setCalculationResult] =
    useState<CalculationResult | null>(null);
  const [validationError, setValidationError] = useState("");
  const [currentStep, setCurrentStep] = useState<
    "search" | "analysis" | "results"
  >("search");
  const [ratingData, setRatingData] = useState<ReviewStats | null>(null);
  const [isEmployeeMode, setIsEmployeeMode] = useState(false);
  const [refreshingRatings, setRefreshingRatings] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState(0);
  const [isRefreshThrottled, setIsRefreshThrottled] = useState(false);

  // Slider states for review distribution
  const [fiveStarSlider, setFiveStarSlider] = useState([0]);
  const [fourStarSlider, setFourStarSlider] = useState([0]);
  const [threeStarSlider, setThreeStarSlider] = useState([0]);
  const [twoStarSlider, setTwoStarSlider] = useState([0]);
  const [oneStarSlider, setOneStarSlider] = useState([0]);

  // Check for employee mode query parameter
  useEffect(() => {
    if (router.isReady) {
      const forEmployees = router.query["for-employees"] === "true";
      setIsEmployeeMode(forEmployees);
    }
  }, [router.isReady, router.query]);

  const handleBusinessSelect = (business: BusinessSearchResult) => {
    setSelectedBusiness(business);
    setCurrentStep("analysis");

    // Create rating data from business search result
    if (
      business.rating &&
      business.reviews_count &&
      business.rating_distribution
    ) {
      const newRatingData: ReviewStats = {
        place_id: business.place_id,
        rating: business.rating,
        reviews_count: business.reviews_count,
        rating_distribution: business.rating_distribution,
        votes_count: business.reviews_count,
      };
      setRatingData(newRatingData);
    } else {
      // Fallback if rating distribution is not available
      setRatingData(null);
    }
  };

  // Initialize sliders when rating data loads
  useEffect(() => {
    if (ratingData) {
      const total = ratingData.reviews_count;
      setFiveStarSlider([ratingData.rating_distribution.five_star]);
      setFourStarSlider([ratingData.rating_distribution.four_star]);
      setThreeStarSlider([ratingData.rating_distribution.three_star]);
      setTwoStarSlider([ratingData.rating_distribution.two_star]);
      setOneStarSlider([ratingData.rating_distribution.one_star]);
    }
  }, [ratingData]);

  const handleTargetRatingChange = (value: string) => {
    setTargetRating(value);
    setCalculationResult(null);
    setValidationError("");
  };

  const handleCalculate = () => {
    if (!ratingData) return;

    const target = parseFloat(targetRating);
    if (!isValidTargetRating(target)) {
      setValidationError("Bitte wählen Sie ein gültiges Zielrating aus.");
      return;
    }

    const error = validateTargetRating(target, ratingData.rating);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError("");
    // Use slider values for calculation
    const modifiedBreakdown = {
      five_star: fiveStarSlider[0],
      four_star: fourStarSlider[0],
      three_star: threeStarSlider[0],
      two_star: twoStarSlider[0],
      one_star: oneStarSlider[0],
    };

    const result = calculateReviewsToRemove(
      ratingData.rating,
      target,
      modifiedBreakdown
    );
    if (result) {
      setCalculationResult(result);
    }
  };

  const handleRefreshRatings = async () => {
    if (!selectedBusiness) return;

    // Throttle: minimum 5 seconds between refresh requests
    const now = Date.now();
    const minInterval = 5000; // 5 seconds
    const timeSinceLastRefresh = now - lastRefreshTime;

    if (timeSinceLastRefresh < minInterval && lastRefreshTime > 0) {
      const remainingTime = Math.ceil(
        (minInterval - timeSinceLastRefresh) / 1000
      );
      setValidationError(
        `Bitte warten Sie ${remainingTime} Sekunde(n) vor der nächsten Aktualisierung.`
      );
      setIsRefreshThrottled(true);

      // Clear throttle message after remaining time
      setTimeout(() => {
        setIsRefreshThrottled(false);
        setValidationError("");
      }, minInterval - timeSinceLastRefresh);

      return;
    }

    setLastRefreshTime(now);
    setRefreshingRatings(true);
    setValidationError("");
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
          setSelectedBusiness(freshBusiness);

          // Reset sliders to new values
          setFiveStarSlider([freshBusiness.rating_distribution.five_star]);
          setFourStarSlider([freshBusiness.rating_distribution.four_star]);
          setThreeStarSlider([freshBusiness.rating_distribution.three_star]);
          setTwoStarSlider([freshBusiness.rating_distribution.two_star]);
          setOneStarSlider([freshBusiness.rating_distribution.one_star]);
        }
      } else {
        setValidationError("Keine aktuellen Bewertungsdaten verfügbar.");
      }
    } catch (error) {
      setValidationError("Fehler beim Laden der aktuellen Bewertungen.");
    } finally {
      setRefreshingRatings(false);
    }
  };

  const handleBackToSearch = () => {
    setCurrentStep("search");
    setSelectedBusiness(null);
    setTargetRating("");
    setCalculationResult(null);
    setValidationError("");
    setRatingData(null);
  };

  return (
    <>
      <Head>
        <title>Rating Calculator</title>
        <meta
          name="description"
          content="Berechnen Sie, wie viele Bewertungen entfernt werden müssen"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className={styles.main}>
        <div className={styles.container}>
          <Typography variant="h3">Rating Calculator</Typography>

          {currentStep === "search" && (
            <SearchForm onBusinessSelect={handleBusinessSelect} />
          )}

          {currentStep === "analysis" && selectedBusiness && (
            <>
              <div className={styles.businessHeader}>
                <Typography variant="h2">{selectedBusiness.title}</Typography>
                <Typography variant="description">
                  {selectedBusiness.address}
                </Typography>
                <div className={styles.businessHeaderActions}>
                  <Button onClick={handleBackToSearch} size="sm">
                    ← Zurück zur Suche
                  </Button>
                  {isEmployeeMode && (
                    <Button
                      onClick={handleRefreshRatings}
                      size="sm"
                      disabled={refreshingRatings || isRefreshThrottled}
                      className={styles.refreshButton}
                    >
                      {refreshingRatings ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          Aktualisiere...
                        </>
                      ) : isRefreshThrottled ? (
                        "⏱️ Warten..."
                      ) : (
                        "🔄 Aktuelle Ratings anfordern"
                      )}
                    </Button>
                  )}
                </div>
                {isEmployeeMode && !refreshingRatings && (
                  <Typography
                    variant="description"
                    className={styles.employeeNote}
                  >
                    💼 Mitarbeiter-Modus: Ratings nicht aktuell? Aktuelle
                    Ratings anfordern für Live-Daten
                  </Typography>
                )}
              </div>

              {!ratingData && (
                <Typography variant="description" className={styles.error}>
                  Keine Bewertungsdaten verfügbar für dieses Unternehmen.
                </Typography>
              )}

              {ratingData && (
                <div className={styles.analysisContent}>
                  <Typography variant="h2">
                    Schritt 2: Aktuelle Bewertungsanalyse
                  </Typography>

                  <div className={styles.currentStats}>
                    <Typography variant="description">
                      <strong>Aktuelles Rating:</strong>{" "}
                      {ratingData.rating.toFixed(2)}/5.00
                    </Typography>
                    <Typography variant="description">
                      <strong>Anzahl Bewertungen:</strong>{" "}
                      {ratingData.reviews_count}
                    </Typography>

                    <div className={styles.breakdown}>
                      <div className={styles.reviewRow}>
                        <Typography variant="description">
                          <strong>5 Sterne:</strong>{" "}
                          {ratingData.rating_distribution.five_star}
                        </Typography>
                        <Slider
                          value={fiveStarSlider}
                          onValueChange={setFiveStarSlider}
                          min={0}
                          max={ratingData.reviews_count}
                          step={1}
                          className={styles.reviewSlider}
                        />
                      </div>

                      <div className={styles.reviewRow}>
                        <Typography variant="description">
                          <strong>4 Sterne:</strong>{" "}
                          {ratingData.rating_distribution.four_star}
                        </Typography>
                        <Slider
                          value={fourStarSlider}
                          onValueChange={setFourStarSlider}
                          min={0}
                          max={ratingData.reviews_count}
                          step={1}
                          className={styles.reviewSlider}
                        />
                      </div>

                      <div className={styles.reviewRow}>
                        <Typography variant="description">
                          <strong>3 Sterne:</strong>{" "}
                          {ratingData.rating_distribution.three_star}
                        </Typography>
                        <Slider
                          value={threeStarSlider}
                          onValueChange={setThreeStarSlider}
                          min={0}
                          max={ratingData.reviews_count}
                          step={1}
                          className={styles.reviewSlider}
                        />
                      </div>

                      <div className={styles.reviewRow}>
                        <Typography variant="description">
                          <strong>2 Sterne:</strong>{" "}
                          {ratingData.rating_distribution.two_star}
                        </Typography>
                        <Slider
                          value={twoStarSlider}
                          onValueChange={setTwoStarSlider}
                          min={0}
                          max={ratingData.reviews_count}
                          step={1}
                          className={styles.reviewSlider}
                        />
                      </div>

                      <div className={styles.reviewRow}>
                        <Typography variant="description">
                          <strong>1 Stern:</strong>{" "}
                          {ratingData.rating_distribution.one_star}
                        </Typography>
                        <Slider
                          value={oneStarSlider}
                          onValueChange={setOneStarSlider}
                          min={0}
                          max={ratingData.reviews_count}
                          step={1}
                          className={styles.reviewSlider}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.targetSection}>
                    <Typography variant="h2">
                      Schritt 3: Zielrating eingeben
                    </Typography>
                    <Typography variant="description">
                      Welches Zielrating möchten Sie erreichen?
                    </Typography>

                    <div className={styles.ratingOptions}>
                      {targetRatingOptions
                        .filter(
                          (rating) => !ratingData || rating > ratingData.rating
                        )
                        .map((rating) => (
                          <Button
                            key={rating}
                            onClick={() =>
                              handleTargetRatingChange(rating.toString())
                            }
                            size="sm"
                            className={
                              targetRating === rating.toString()
                                ? styles.selected
                                : ""
                            }
                          >
                            {rating.toFixed(2)}
                          </Button>
                        ))}
                    </div>

                    {targetRating && (
                      <Button
                        onClick={handleCalculate}
                        className={styles.calculateButton}
                      >
                        Berechnen
                      </Button>
                    )}
                  </div>

                  {validationError && (
                    <Typography variant="description" className={styles.error}>
                      {validationError}
                    </Typography>
                  )}

                  {calculationResult && (
                    <div className={styles.results}>
                      <Typography variant="h2">
                        Schritt 4: Verbesserungsberechnung
                      </Typography>

                      <Typography variant="description">
                        <strong>
                          Um {calculationResult.targetRating} zu erreichen,
                          müssen{" "}
                          {calculationResult.reviewsToRemove.oneStar +
                            calculationResult.reviewsToRemove.twoStar +
                            calculationResult.reviewsToRemove.threeStar +
                            calculationResult.reviewsToRemove.fourStar +
                            calculationResult.reviewsToRemove.fiveStar}
                          negative Bewertungen entfernt werden.
                        </strong>
                      </Typography>

                      <Typography variant="description">
                        {formatRemovalInstructions(calculationResult)}
                      </Typography>

                      <Typography variant="description">
                        <strong>Neues Rating nach Entfernung:</strong>{" "}
                        {calculationResult.projectedRating.toFixed(2)}
                      </Typography>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
};

export default Home;
