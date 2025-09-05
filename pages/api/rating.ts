import type { NextApiRequest, NextApiResponse } from 'next';
import { ReviewStats, ApiResponse } from '@/types';

// Dummy rating data for testing
const dummyRatingData: { [key: string]: ReviewStats } = {
  'ChIJN1t_tDeuEmsRUsoyG83frY4': {
    place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
    rating: 3.8,
    reviews_count: 247,
    rating_distribution: {
      five_star: 89,
      four_star: 67,
      three_star: 45,
      two_star: 28,
      one_star: 18
    }
  },
  'ChIJdd4hrwug2EcRmSrV3Vo6llI': {
    place_id: 'ChIJdd4hrwug2EcRmSrV3Vo6llI',
    rating: 4.2,
    reviews_count: 156,
    rating_distribution: {
      five_star: 78,
      four_star: 45,
      three_star: 22,
      two_star: 8,
      one_star: 3
    }
  },
  'ChIJVVVVVVVVVVVVVVVVVVVVVVV': {
    place_id: 'ChIJVVVVVVVVVVVVVVVVVVVVVVV',
    rating: 3.5,
    reviews_count: 89,
    rating_distribution: {
      five_star: 25,
      four_star: 28,
      three_star: 18,
      two_star: 12,
      one_star: 6
    }
  },
  'ChIJXXXXXXXXXXXXXXXXXXXXXXX': {
    place_id: 'ChIJXXXXXXXXXXXXXXXXXXXXXXX',
    rating: 4.6,
    reviews_count: 312,
    rating_distribution: {
      five_star: 198,
      four_star: 87,
      three_star: 18,
      two_star: 6,
      one_star: 3
    }
  },
  'ChIJYYYYYYYYYYYYYYYYYYYYYYY': {
    place_id: 'ChIJYYYYYYYYYYYYYYYYYYYYYYY',
    rating: 3.2,
    reviews_count: 78,
    rating_distribution: {
      five_star: 15,
      four_star: 18,
      three_star: 22,
      two_star: 15,
      one_star: 8
    }
  }
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse<ReviewStats>>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { place_id } = req.body;

  if (!place_id) {
    return res.status(400).json({ success: false, error: 'Place ID is required' });
  }

  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 800));

  // Get dummy data for the place_id
  const reviewStats = dummyRatingData[place_id];

  if (!reviewStats) {
    return res.status(404).json({
      success: false,
      error: 'No rating data found for this business'
    });
  }

  res.status(200).json({ success: true, data: reviewStats });
}
