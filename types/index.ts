export interface BusinessSearchResult {
  place_id: string;
  title: string;
  address: string;
  rating?: number;
  reviews_count?: number;
  rating_distribution?: ReviewBreakdown;
}

export interface ReviewBreakdown {
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}

export interface ReviewStats {
  place_id: string;
  rating: number;
  votes_count: number;
  reviews_count: number;
  rating_distribution: ReviewBreakdown;
}

export interface CalculationResult {
  targetRating: number;
  reviewsToRemove: {
    oneStar: number;
    twoStar: number;
    threeStar: number;
    fourStar: number;
    fiveStar: number;
  };
  reviewsToAdd: {
    fiveStar: number;
  };
  projectedRating: number;
  strategy: "remove" | "add" | "both";
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type ButtonSize = "sm" | "md" | "lg";
export type TypographyVariant =
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "description";
