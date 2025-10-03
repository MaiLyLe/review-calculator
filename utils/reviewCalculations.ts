import { ReviewBreakdown, CalculationResult } from "@/types";

// More accurate rounding function that handles floating-point precision issues
const preciseRound = (num: number, decimals: number): number => {
  // Use Number.EPSILON to handle floating-point precision issues
  const factor = Math.pow(10, decimals);
  return Math.round((num + Number.EPSILON) * factor) / factor;
};

// Google-style rounding function - rounds to 1 decimal place like Google does
const googleRound = (rating: number): number => {
  return preciseRound(rating, 2);
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

  // Calculate the actual score from the breakdown for accuracy
  const currentScore =
    breakdown.five_star * 5 +
    breakdown.four_star * 4 +
    breakdown.three_star * 3 +
    breakdown.two_star * 2 +
    breakdown.one_star * 1;

  // Calculate minimum removals needed (greedy approach - remove worst reviews first)
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

    // Remove reviews one by one, starting with the worst, until we reach the target
    // Use precise calculation to avoid floating-point issues
    while (
      tempTotal > 0 &&
      preciseRound(tempScore / tempTotal, 3) < targetRating
    ) {
      // Remove worst reviews first (1-star, then 2-star, etc.)
      // NEVER remove 5-star reviews - they help achieve higher targets
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
      } else {
        // No more reviews below 5-star to remove
        break;
      }
    }

    const finalRating =
      tempTotal > 0 ? preciseRound(tempScore / tempTotal, 3) : 0;

    return {
      targetRating,
      reviewsToRemove: removed,
      reviewsToAdd: { fiveStar: 0 },
      projectedRating: googleRound(finalRating),
      strategy: "remove",
    };
  };

  // We only do removals, not additions
  return calculateMinimalRemovals();
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
