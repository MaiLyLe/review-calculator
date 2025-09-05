import { ReviewBreakdown, CalculationResult } from "@/types";

// Google-style rounding function - rounds to 1 decimal place like Google does
const googleRound = (rating: number): number => {
  return Math.round(rating * 10) / 10;
};

export const calculateReviewsToRemove = (
  currentRating: number,
  targetRating: number,
  breakdown: ReviewBreakdown
): CalculationResult => {
  const totalReviews =
    breakdown.one_star +
    breakdown.two_star +
    breakdown.three_star +
    breakdown.four_star +
    breakdown.five_star;

  // Calculate current weighted score
  const currentScore =
    breakdown.one_star * 1 +
    breakdown.two_star * 2 +
    breakdown.three_star * 3 +
    breakdown.four_star * 4 +
    breakdown.five_star * 5;

  // Calculate minimum removals needed (greedy approach - remove worst reviews first)
  // Apply 94% success rate buffer to account for realistic removal expectations
  const calculateMinimalRemovals = (): CalculationResult => {
    let tempBreakdown = { ...breakdown };
    let tempScore = currentScore;
    let tempTotal = totalReviews;
    let removed = {
      oneStar: 0,
      twoStar: 0,
      threeStar: 0,
      fourStar: 0,
      fiveStar: 0,
    };

    while (tempTotal > 0 && tempScore / tempTotal < targetRating) {
      // Remove worst reviews first (1-star, then 2-star, etc.)
      if (tempBreakdown.one_star > 0) {
        tempBreakdown.one_star--;
        removed.oneStar++;
        tempScore -= 1;
        tempTotal--;
      } else if (tempBreakdown.two_star > 0) {
        tempBreakdown.two_star--;
        removed.twoStar++;
        tempScore -= 2;
        tempTotal--;
      } else if (tempBreakdown.three_star > 0) {
        tempBreakdown.three_star--;
        removed.threeStar++;
        tempScore -= 3;
        tempTotal--;
      } else if (tempBreakdown.four_star > 0) {
        tempBreakdown.four_star--;
        removed.fourStar++;
        tempScore -= 4;
        tempTotal--;
      } else if (tempBreakdown.five_star > 0) {
        tempBreakdown.five_star--;
        removed.fiveStar++;
        tempScore -= 5;
        tempTotal--;
      } else {
        break; // No more reviews to remove
      }
    }

    // Apply 94% success rate buffer - calculate additional removals needed
    const totalRemovals = Object.values(removed).reduce(
      (sum, val) => sum + val,
      0
    );
    const bufferedRemovals = Math.ceil(totalRemovals / 0.94); // Increase by ~6.4% to account for 94% success rate
    const additionalRemovals = bufferedRemovals - totalRemovals;

    // Add buffer removals (prioritize worst reviews)
    let additionalRemoved = 0;
    while (additionalRemoved < additionalRemovals && tempTotal > 0) {
      if (tempBreakdown.one_star > 0) {
        tempBreakdown.one_star--;
        removed.oneStar++;
        tempScore -= 1;
        tempTotal--;
        additionalRemoved++;
      } else if (tempBreakdown.two_star > 0) {
        tempBreakdown.two_star--;
        removed.twoStar++;
        tempScore -= 2;
        tempTotal--;
        additionalRemoved++;
      } else if (tempBreakdown.three_star > 0) {
        tempBreakdown.three_star--;
        removed.threeStar++;
        tempScore -= 3;
        tempTotal--;
        additionalRemoved++;
      } else if (tempBreakdown.four_star > 0) {
        tempBreakdown.four_star--;
        removed.fourStar++;
        tempScore -= 4;
        tempTotal--;
        additionalRemoved++;
      } else if (tempBreakdown.five_star > 0) {
        tempBreakdown.five_star--;
        removed.fiveStar++;
        tempScore -= 5;
        tempTotal--;
        additionalRemoved++;
      } else {
        break; // No more reviews to remove
      }
    }

    const finalRating = tempTotal > 0 ? tempScore / tempTotal : 0;

    return {
      targetRating,
      reviewsToRemove: removed,
      reviewsToAdd: { fiveStar: 0 },
      projectedRating: googleRound(finalRating),
      strategy: "remove",
    };
  };

  // Calculate how many 5-star reviews needed to be added
  const calculateAdditions = (): CalculationResult => {
    let neededFiveStars = 0;
    let tempScore = currentScore;
    let tempTotal = totalReviews;

    while (
      (tempScore + neededFiveStars * 5) / (tempTotal + neededFiveStars) <
      targetRating
    ) {
      neededFiveStars++;
      if (neededFiveStars > 1000) break; // Safety limit
    }

    const finalRating =
      (tempScore + neededFiveStars * 5) / (tempTotal + neededFiveStars);

    return {
      targetRating,
      reviewsToRemove: {
        oneStar: 0,
        twoStar: 0,
        threeStar: 0,
        fourStar: 0,
        fiveStar: 0,
      },
      reviewsToAdd: { fiveStar: neededFiveStars },
      projectedRating: googleRound(finalRating),
      strategy: "add",
    };
  };

  const removalResult = calculateMinimalRemovals();
  const additionResult = calculateAdditions();

  // Return the strategy that requires fewer total actions
  const totalRemovals = Object.values(removalResult.reviewsToRemove).reduce(
    (sum, val) => sum + val,
    0
  );
  const totalAdditions = additionResult.reviewsToAdd.fiveStar;

  if (
    totalRemovals <= totalAdditions &&
    removalResult.projectedRating >= targetRating
  ) {
    return removalResult;
  } else {
    return additionResult;
  }
};

export const formatInstructions = (result: CalculationResult): string => {
  if (result.strategy === "remove") {
    const instructions: string[] = [];

    if (result.reviewsToRemove.oneStar > 0) {
      instructions.push(
        `${result.reviewsToRemove.oneStar} Ein-Stern-Bewertungen`
      );
    }
    if (result.reviewsToRemove.twoStar > 0) {
      instructions.push(
        `${result.reviewsToRemove.twoStar} Zwei-Stern-Bewertungen`
      );
    }
    if (result.reviewsToRemove.threeStar > 0) {
      instructions.push(
        `${result.reviewsToRemove.threeStar} Drei-Stern-Bewertungen`
      );
    }
    if (result.reviewsToRemove.fourStar > 0) {
      instructions.push(
        `${result.reviewsToRemove.fourStar} Vier-Stern-Bewertungen`
      );
    }
    if (result.reviewsToRemove.fiveStar > 0) {
      instructions.push(
        `${result.reviewsToRemove.fiveStar} Fünf-Stern-Bewertungen`
      );
    }

    if (instructions.length === 0) {
      return "Keine Bewertungen müssen entfernt werden.";
    }

    return `Entfernen Sie ${instructions.join(" und ")}.`;
  } else if (result.strategy === "add") {
    return `Fügen Sie ${result.reviewsToAdd.fiveStar} neue Fünf-Stern-Bewertungen hinzu.`;
  }

  return "Keine Aktion erforderlich.";
};

// Keep the old function for backward compatibility
export const formatRemovalInstructions = formatInstructions;
