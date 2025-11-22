import { supabase } from '../lib/supabase';
import { API_URL } from '../config/api';

class ProductService {
  parseAvailableSizes(sizeValue) {
    if (!sizeValue || typeof sizeValue !== 'string') {
      return [];
    }

    const trimmed = sizeValue.trim();

    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          const allSizes = [];
          if (parsed.shirts) {
            if (Array.isArray(parsed.shirts.adults)) allSizes.push(...parsed.shirts.adults);
            if (Array.isArray(parsed.shirts.kids)) allSizes.push(...parsed.shirts.kids);
          }
          if (parsed.shorts) {
            if (Array.isArray(parsed.shorts.adults)) allSizes.push(...parsed.shorts.adults);
            if (Array.isArray(parsed.shorts.kids)) allSizes.push(...parsed.shorts.kids);
          }
          return allSizes
            .filter(item => typeof item === 'string' && item.trim().length > 0)
            .map(item => item.trim());
        }
      } catch (error) {
        console.warn('Failed to parse jersey sizes in productService:', error.message);
      }
    }

    if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .filter(item => typeof item === 'string' && item.trim().length > 0)
          .map(item => item.trim());
      }
    } catch (error) {
      console.warn('Failed to parse available sizes from productService:', error.message);
    }

    return [];
  }

  async getAllProducts() {
    try {
      // Use backend API endpoint which includes public access and review calculations
      const response = await fetch(`${API_URL}/api/products`);
      
      if (!response.ok) {
        // Check for specific error codes
        if (response.status === 502) {
          throw new Error(`502 Bad Gateway: Backend server is down or starting up`);
        } else if (response.status === 503) {
          throw new Error(`503 Service Unavailable: Backend server is temporarily unavailable`);
        } else if (response.status === 504) {
          throw new Error(`504 Gateway Timeout: Backend server took too long to respond`);
        }
        throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        return [];
      }

      // Backend API already includes review_count, average_rating, and sold_quantity
      // Just need to parse surcharges and sizes
      return data.map(product => {
        let sizeSurcharges = product.size_surcharges;
        if (typeof sizeSurcharges === 'string') {
          try {
            sizeSurcharges = JSON.parse(sizeSurcharges);
          } catch (error) {
            console.warn('Failed to parse size_surcharges from productService:', error?.message);
            sizeSurcharges = null;
          }
        }

        let fabricSurcharges = product.fabric_surcharges;
        if (typeof fabricSurcharges === 'string') {
          try {
            fabricSurcharges = JSON.parse(fabricSurcharges);
          } catch (error) {
            console.warn('Failed to parse fabric_surcharges from productService:', error?.message);
            fabricSurcharges = null;
          }
        }

        return {
          ...product,
          // Ensure review_count and average_rating are always present (default to 0 if missing)
          review_count: product.review_count || 0,
          average_rating: product.average_rating || 0,
          sold_quantity: product.sold_quantity || 0,
          available_sizes: this.parseAvailableSizes(product.size),
          size_surcharges: sizeSurcharges,
          fabric_surcharges: fabricSurcharges
        };
      });
    } catch (error) {
      console.error('Error fetching products from API:', error);
      
      // Check if it's a 502 Bad Gateway error (server down/unavailable)
      if (error.message && error.message.includes('502')) {
        console.warn('Backend server returned 502 (Bad Gateway). Server may be down or starting up.');
        console.warn('Falling back to direct Supabase access...');
      } else {
        console.warn('API request failed. Falling back to direct Supabase access...');
      }
      
      // Fallback to Supabase direct access if API fails (for backwards compatibility)
      try {
        return await this.getAllProductsFromSupabase();
      } catch (fallbackError) {
        console.error('Fallback to Supabase also failed:', fallbackError);
        // Return empty array as last resort to prevent app crash
        return [];
      }
    }
  }

  // Fallback method using Supabase direct access
  async getAllProductsFromSupabase() {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch products: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        return [];
      }

      const productIds = data
        .map(product => product.id)
        .filter(Boolean);
      const productIdSet = new Set(productIds);

      let productSpecificReviews = [];
      if (productIds.length > 0) {
        const { data: reviewsData, error: reviewsError } = await supabase
          .from('order_reviews')
          .select('product_id, rating')
          .in('product_id', productIds);

        if (reviewsError) {
          console.error('Error fetching product-specific reviews:', reviewsError);
        } else {
          productSpecificReviews = reviewsData || [];
        }
      }

      // Fetch order-level reviews (where product_id is null)
      // Fetch all reviews and filter in JavaScript to avoid CORS/null filtering issues
      let orderLevelReviews = [];
      try {
        const { data: allReviews, error: orderLevelError } = await supabase
          .from('order_reviews')
          .select('order_id, rating, product_id');

        if (orderLevelError) {
          console.error('Error fetching order-level reviews:', orderLevelError);
          // Continue without order-level reviews - product-specific reviews will still work
        } else if (allReviews) {
          // Filter for reviews where product_id is null/undefined
          orderLevelReviews = allReviews
            .filter(review => review.product_id === null || review.product_id === undefined)
            .map(({ order_id, rating }) => ({ order_id, rating }));
        }
      } catch (error) {
        console.error('Error fetching order-level reviews:', error);
        // Continue without order-level reviews - product-specific reviews will still work
      }

      const relevantOrderIds = (orderLevelReviews || [])
        .map(review => review.order_id)
        .filter(Boolean);

      let deliveredOrders = [];
      if (relevantOrderIds.length > 0) {
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select('id, order_items')
          .eq('status', 'picked_up_delivered')
          .in('id', Array.from(new Set(relevantOrderIds)));

        if (ordersError) {
          console.error('Error fetching delivered orders:', ordersError);
        } else {
          deliveredOrders = ordersData || [];
        }
      }

      const ratingsByProduct = new Map();

      const normalizeOrderItems = (orderItems) => {
        if (!orderItems) {
          return [];
        }
        if (Array.isArray(orderItems)) {
          return orderItems;
        }
        try {
          const parsed = JSON.parse(orderItems);
          return Array.isArray(parsed) ? parsed : [];
        } catch (parseError) {
          console.warn('Failed to parse order_items in productService:', parseError?.message);
          return [];
        }
      };

      const addRating = (productId, rating) => {
        if (!productId || rating === null || rating === undefined) {
          return;
        }
        if (!ratingsByProduct.has(productId)) {
          ratingsByProduct.set(productId, []);
        }
        ratingsByProduct.get(productId).push(rating);
      };

      for (const review of productSpecificReviews) {
        addRating(review.product_id, review.rating);
      }

      if (orderLevelReviews && orderLevelReviews.length > 0 && deliveredOrders.length > 0) {
        const orderMap = deliveredOrders.reduce((acc, order) => {
          acc.set(order.id, normalizeOrderItems(order.order_items));
          return acc;
        }, new Map());

        for (const review of orderLevelReviews) {
          const items = orderMap.get(review.order_id) || [];
          for (const item of items) {
            if (item && productIdSet.has(item.id)) {
              addRating(item.id, review.rating);
            }
          }
        }
      }

      return data.map(product => {
        const ratings = ratingsByProduct.get(product.id) || [];
        const count = ratings.length;
        const average = count === 0
          ? 0
          : Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / count) * 10) / 10;

        let sizeSurcharges = product.size_surcharges;
        if (typeof sizeSurcharges === 'string') {
          try {
            sizeSurcharges = JSON.parse(sizeSurcharges);
          } catch (error) {
            console.warn('Failed to parse size_surcharges from productService:', error?.message);
            sizeSurcharges = null;
          }
        }

        let fabricSurcharges = product.fabric_surcharges;
        if (typeof fabricSurcharges === 'string') {
          try {
            fabricSurcharges = JSON.parse(fabricSurcharges);
          } catch (error) {
            console.warn('Failed to parse fabric_surcharges from productService:', error?.message);
            fabricSurcharges = null;
          }
        }

        return {
          ...product,
          average_rating: average,
          review_count: count,
          sold_quantity: product.sold_quantity || 0,
          available_sizes: this.parseAvailableSizes(product.size),
          size_surcharges: sizeSurcharges,
          fabric_surcharges: fabricSurcharges
        };
      });
    } catch (error) {
      console.error('Error fetching products from Supabase:', error);
      throw error;
    }
  }

  async getProductById(id) {
    try {
      // Use backend API endpoint which includes public access and review calculations
      const response = await fetch(`${API_URL}/api/products/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error(`Failed to fetch product: ${response.statusText}`);
      }
      
      const data = await response.json();

      let sizeSurcharges = data?.size_surcharges;
      if (typeof sizeSurcharges === 'string') {
        try {
          sizeSurcharges = JSON.parse(sizeSurcharges);
        } catch (parseError) {
          console.warn('Failed to parse size_surcharges in getProductById:', parseError?.message);
          sizeSurcharges = null;
        }
      }

      let fabricSurcharges = data?.fabric_surcharges;
      if (typeof fabricSurcharges === 'string') {
        try {
          fabricSurcharges = JSON.parse(fabricSurcharges);
        } catch (parseError) {
          console.warn('Failed to parse fabric_surcharges in getProductById:', parseError?.message);
          fabricSurcharges = null;
        }
      }

      return {
        ...data,
        // Ensure review_count and average_rating are always present (default to 0 if missing)
        review_count: data.review_count || 0,
        average_rating: data.average_rating || 0,
        sold_quantity: data.sold_quantity || 0,
        size_surcharges: sizeSurcharges,
        fabric_surcharges: fabricSurcharges
      };
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  }

  async getProductsByBranch(branchId) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch products by branch: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching products by branch:', error);
      throw error;
    }
  }

  async getProductsByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(`Failed to fetch products by category: ${error.message}`);
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching products by category:', error);
      throw error;
    }
  }
}

export default new ProductService();
