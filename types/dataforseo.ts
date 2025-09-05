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
