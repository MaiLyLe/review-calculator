// DataForSeo API Types
export interface DataForSeoResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result: Array<{
      total_count: number;
      count: number;
      offset: number;
      offset_token: string;
      items: BusinessListing[];
    }>;
  }>;
}

export interface BusinessListing {
  type: string;
  title: string;
  original_title?: string;
  description?: string;
  category: string;
  category_ids: string[];
  additional_categories?: string[];
  cid: string;
  feature_id: string;
  address: string;
  address_info: {
    borough?: string;
    address: string;
    city: string;
    zip: string;
    region?: string;
    country_code: string;
  };
  place_id: string;
  phone?: string;
  url?: string;
  domain?: string;
  logo?: string;
  main_image?: string;
  total_photos: number;
  snippet: string;
  latitude: number;
  longitude: number;
  is_claimed: boolean;
  rating?: {
    rating_type: string;
    value: number;
    votes_count: number;
    rating_max?: number;
  };
  hotel_rating?: any;
  price_level?: string;
  rating_distribution?: {
    [key: string]: number;
  };
  work_time?: any;
  popular_times?: any;
  local_business_links?: any;
  contact_info?: any[];
  check_url: string;
  last_updated_time: string;
  first_seen: string;
}

// Google Reviews API Types (keeping for backwards compatibility)
export interface GoogleReviewsResponse {
  version: string;
  status_code: number;
  status_message: string;
  time: string;
  cost: number;
  tasks_count: number;
  tasks_error: number;
  tasks: Array<{
    id: string;
    status_code: number;
    status_message: string;
    result: Array<{
      keyword: string;
      se_domain: string;
      location_code: number;
      language_code: string;
      check_url: string;
      datetime: string;
      item_types: string[];
      items_count: number;
      items: MyBusinessInfo[];
    }>;
  }>;
}

// My Business Info API Types
export interface MyBusinessInfo {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  title: string;
  original_title?: string;
  description?: string;
  category?: string;
  category_ids?: string[];
  additional_categories?: string[];
  cid: string;
  feature_id: string;
  address: string;
  address_info: {
    borough?: string;
    address: string;
    city: string;
    zip: string;
    region?: string;
    country_code: string;
  };
  place_id: string;
  phone?: string;
  url?: string;
  contact_url?: string;
  contributor_url?: string;
  book_online_url?: string;
  domain?: string;
  logo?: string;
  main_image?: string;
  total_photos?: number;
  snippet?: string;
  latitude: number;
  longitude: number;
  is_claimed: boolean;
  attributes?: any;
  place_topics?: any;
  rating?: {
    rating_type: string;
    value: number;
    votes_count: number;
    rating_max?: number;
  };
  rating_distribution?: {
    [key: string]: number; // "1", "2", "3", "4", "5" -> count
  };
  people_also_search?: any;
  work_time?: any;
  popular_times?: any;
  local_business_links?: any;
  is_directory_item: boolean;
  directory?: any;
  price_level?: string;
  hotel_rating?: any;
}

export interface GoogleReview {
  type: string;
  rank_group: number;
  rank_absolute: number;
  position: string;
  xpath: string;
  review_text: string;
  original_review_text?: string;
  time_ago: string;
  timestamp: string;
  rating: {
    rating_type: string;
    value: number;
    votes_count: number;
    rating_max: number;
  };
  reviews_count: number;
  photos_count: number;
  local_guide: boolean;
  profile_name: string;
  profile_url: string;
  review_url: string;
  profile_image_url: string;
  owner_answer?: {
    type: string;
    text: string;
    original_text?: string;
    time_ago: string;
    timestamp: string;
  };
  original_review_text_language?: string;
  review_text_language?: string;
}
