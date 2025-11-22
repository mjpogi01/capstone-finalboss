import { supabase } from '../lib/supabase';

class OrderTrackingService {
  // Order status constants
  static ORDER_STATUS = {
    IN_STORE: 'in_store',
    ON_THE_WAY: 'on_the_way', 
    DELIVERED: 'delivered'
  };

  // Location descriptions
  static LOCATION_DESCRIPTIONS = {
    in_store: 'Your order is being prepared at our store branch',
    on_the_way: 'Your order is on the way to your location',
    delivered: 'Your order has arrived at your location'
  };

  // Get order tracking history
  async getOrderTracking(orderId) {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: true });

      if (error) {
        // Return empty array instead of throwing for missing data
        console.warn('Order tracking not available:', error.message);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching order tracking:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Get current order status
  async getCurrentOrderStatus(orderId) {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .select('*')
        .eq('order_id', orderId)
        .order('timestamp', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.warn('Current order status not available:', error.message);
        return null;
      }

      return data || null;
    } catch (error) {
      console.error('Error fetching current order status:', error);
      return null;
    }
  }

  // Update order status to specific location
  async updateOrderStatus(orderId, status, additionalInfo = {}) {
    try {
      const statusInfo = {
        [this.constructor.ORDER_STATUS.IN_STORE]: {
          location: 'Store Branch',
          description: this.constructor.LOCATION_DESCRIPTIONS.in_store,
          icon: '🏪',
          color: '#3B82F6'
        },
        [this.constructor.ORDER_STATUS.ON_THE_WAY]: {
          location: 'On The Way',
          description: this.constructor.LOCATION_DESCRIPTIONS.on_the_way,
          icon: '🚚',
          color: '#F59E0B'
        },
        [this.constructor.ORDER_STATUS.DELIVERED]: {
          location: 'Delivered',
          description: this.constructor.LOCATION_DESCRIPTIONS.delivered,
          icon: '✅',
          color: '#10B981'
        }
      };

      const statusData = statusInfo[status];
      if (!statusData) {
        throw new Error(`Invalid order status: ${status}`);
      }

      const { data, error } = await supabase
        .from('order_tracking')
        .insert([{
          order_id: orderId,
          status,
          location: statusData.location,
          description: statusData.description,
          metadata: {
            icon: statusData.icon,
            color: statusData.color,
            ...additionalInfo
          }
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      throw error;
    }
  }

  // Add tracking update
  async addTrackingUpdate(orderId, status, location, description, metadata = {}) {
    try {
      const { data, error } = await supabase
        .from('order_tracking')
        .insert([{
          order_id: orderId,
          status,
          location,
          description,
          metadata
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error adding tracking update:', error);
      throw error;
    }
  }

  // Get order review
  async getOrderReview(orderId) {
    try {
      const { data, error } = await supabase
        .from('order_reviews')
        .select('*')
        .eq('order_id', orderId)
        .limit(1);

      if (error) {
        console.warn('Order review not available:', error.message);
        return null;
      }

      // Return first review if exists, otherwise null
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('Error fetching order review:', error);
      return null;
    }
  }

  // Add order review
  async addOrderReview(orderId, userId, rating, comment) {
    try {
      const { data, error } = await supabase
        .from('order_reviews')
        .insert([{
          order_id: orderId,
          user_id: userId,
          rating,
          comment
        }])
        .select()
        .single();

      if (error) {
        throw new Error(`Supabase error: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error adding order review:', error);
      throw error;
    }
  }
}

const orderTrackingService = new OrderTrackingService();
export default orderTrackingService;
