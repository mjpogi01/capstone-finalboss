import { supabase } from '../lib/supabase';
import API_URL from '../config/api';
import { authFetch, authJsonFetch } from './apiClient';

class OrderService {
  async getAllOrders(filters = {}) {
    try {
      // Build query parameters
      const params = new URLSearchParams();
      
      if (filters.dateSort) params.append('dateSort', filters.dateSort);
      if (filters.priceSort) params.append('priceSort', filters.priceSort);
      if (filters.quantitySort) params.append('quantitySort', filters.quantitySort);
      if (filters.pickupBranch) params.append('pickupBranch', filters.pickupBranch);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) {
        params.append('limit', filters.limit);
      } else {
        params.append('limit', 100);
      }

      const response = await authFetch(`${API_URL}/api/orders?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 [OrderService.getAllOrders] Backend response:', data);
      console.log('📦 [OrderService.getAllOrders] Orders returned:', data.orders?.length);
      console.log('📦 [OrderService.getAllOrders] Pagination:', data.pagination);
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error fetching orders:', error);
      
      // Check for network/connection errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const errorMessage = isProduction 
          ? `Network error: Unable to connect to backend server at ${API_URL}. Please check if the backend service is running.`
          : 'Network error: Unable to connect to backend server. Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat';
        const networkError = new Error(errorMessage);
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      // Fallback to mock data if API fails (only for non-network errors)
      console.warn('⚠️ Backend unavailable, using fallback data');
      return {
        orders: this.getMockOrders(),
        pagination: {
          page: 1,
          limit: 50,
          total: 0,
          totalPages: 1
        }
      };
    }
  }

  async getOrderById(orderId) {
    try {
      const response = await authFetch(`${API_URL}/api/orders/${orderId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      return data;
    } catch (error) {
      console.error('Error fetching order:', error);
      
      // Check for network/connection errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const errorMessage = isProduction 
          ? `Network error: Unable to connect to backend server at ${API_URL}. Please check if the backend service is running.`
          : 'Network error: Unable to connect to backend server. Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat';
        const networkError = new Error(errorMessage);
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }

  async getUserOrders(userId, excludeCancelled = true) {
    try {
      console.log('📦 [OrderService] ========== FETCHING ORDERS ==========');
      console.log('📦 [OrderService] Searching for user_id:', userId);
      console.log('📦 [OrderService] User ID type:', typeof userId);
      console.log('📦 [OrderService] Exclude cancelled:', excludeCancelled);
      
      // First, let's see ALL orders to debug
      const { data: allOrders } = await supabase
        .from('orders')
        .select('id, order_number, user_id, status, created_at')
        .limit(10)
        .order('created_at', { ascending: false })
        .abortSignal(AbortSignal.timeout(15000)); // Increased timeout to 15 seconds
      
      console.log('📦 [OrderService] Recent orders in database (last 10):');
      if (allOrders && allOrders.length > 0) {
        allOrders.forEach(order => {
          console.log(`  - Order ${order.order_number}: user_id=${order.user_id} (type: ${typeof order.user_id}), status=${order.status}`);
          console.log(`    Match? ${order.user_id === userId} (strict), ${order.user_id == userId} (loose)`);
        });
      } else {
        console.log('  No orders found in database at all!');
      }
      
      // Now fetch orders for this specific user
      let query = supabase
        .from('orders')
        .select('*')
        .eq('user_id', userId)
        .abortSignal(AbortSignal.timeout(15000)); // Increased timeout to 15 seconds

      // Exclude cancelled orders by default
      if (excludeCancelled) {
        query = query.neq('status', 'cancelled');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        // Handle timeout errors gracefully - return empty array instead of throwing
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          console.warn('⚠️ [OrderService] Timeout fetching orders (non-critical):', error);
          return []; // Return empty array for graceful fallback
        }
        console.error('❌ [OrderService] Supabase error:', error);
        throw new Error(`Supabase error: ${error.message}`);
      }

      console.log('📦 [OrderService] Orders for this user:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('📦 [OrderService] User\'s orders:', data.map(o => o.order_number).join(', '));
      }
      
      const formattedOrders = (data || []).map(order => this.formatOrderForDisplay(order));
      console.log('📦 [OrderService] ========== END FETCH ==========');
      
      return formattedOrders;
    } catch (error) {
      // Handle timeout errors gracefully - return empty array instead of throwing
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.warn('⚠️ [OrderService] Timeout fetching user orders (non-critical):', error);
        return []; // Return empty array for graceful fallback
      }
      console.error('❌ [OrderService] Error fetching user orders:', error);
      throw error;
    }
  }

  // Get order with assigned artist information
  async getOrderWithArtist(orderId) {
    try {
      console.log('🎨 Getting order with artist info:', orderId);
      
      // Get order details
      const order = await this.getOrderById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      // Get assigned artist - first check if task exists
      const { data: artistTask, error: taskError } = await supabase
        .from('artist_tasks')
        .select('artist_id')
        .eq('order_id', orderId)
        .maybeSingle();

      console.log('🎨 Raw artist task query result for order', orderId, ':', { artistTask, taskError });

      if (taskError) {
        console.error('❌ Error getting artist task:', taskError);
        // Don't throw error, just return order without artist info
      }

      // Check if artist profile exists and is active
      let assignedArtist = null;
      if (artistTask?.artist_id) {
        const profile = await this.getArtistProfileById(artistTask.artist_id);
        
        if (profile && profile.is_active) {
          assignedArtist = profile;
        } else {
          console.log('⚠️ Artist profile not active or not found for order', orderId);
        }
      } else {
        console.log('⚠️ No artist task found for order', orderId);
      }

      console.log('🎨 Final assigned artist for order', orderId, ':', assignedArtist);

      return {
        ...order,
        assignedArtist: assignedArtist
      };
    } catch (error) {
      console.error('❌ Error getting order with artist:', error);
      throw error;
    }
  }

  async updateOrderStatus(orderId, status) {
    try {
      console.log('🔐 Updating order status with authenticated request');

      const data = await authJsonFetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          status,
          skipEmail: false // Ensure email is sent
        })
      });
 
      // Check for artist assignment errors in response
      if (data.artistAssignmentError) {
        const assignmentError = new Error(data.error || data.assignmentError?.message || 'Artist assignment failed');
        assignmentError.artistAssignmentError = true;
        assignmentError.assignmentError = data.assignmentError;
        assignmentError.response = { data };
        throw assignmentError;
      }

      // Log email status
      if (data.emailSent) {
        console.log('✅ Email notification sent successfully');
      } else if (data.emailError) {
        console.warn('⚠️ Email notification failed:', data.emailError);
      }

      // Log artist assignment success if present
      if (data.artistAssignmentSuccess) {
        console.log('✅ Artist task assigned successfully');
      }
      if (data.artistAssignmentWarning) {
        console.warn('⚠️ Artist assignment warning:', data.artistAssignmentWarning);
      }

      return data;
    } catch (error) {
      console.error('Error updating order status:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        payload: error.payload,
        artistAssignmentError: error.artistAssignmentError,
        assignmentError: error.assignmentError
      });
      
      // Check if error has payload (from authJsonFetch) and if it contains artist assignment error
      if (error.payload && error.payload.artistAssignmentError) {
        console.error('🎨 Artist assignment error detected in payload:', error.payload);
        const assignmentError = new Error(
          error.payload.error || 
          error.payload.assignmentError?.message || 
          error.payload.details ||
          'Artist assignment failed'
        );
        assignmentError.artistAssignmentError = true;
        assignmentError.assignmentError = error.payload.assignmentError;
        assignmentError.response = { data: error.payload };
        assignmentError.status = error.status;
        throw assignmentError;
      }
      
      // Check for network/connection errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const errorMessage = isProduction 
          ? `Network error: Unable to connect to backend server at ${API_URL}. Please check if the backend service is running.`
          : 'Network error: Unable to connect to backend server. Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat';
        const networkError = new Error(errorMessage);
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }

  async createOrder(orderData) {
    try {
      // Use backend API to trigger email automation
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData)
      });

      // Handle network errors before checking response
      if (!response) {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const errorMessage = isProduction 
          ? `Network error: Unable to connect to backend server at ${API_URL}. Please check if the backend service is running.`
          : 'Network error: Unable to connect to backend server. Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat';
        throw new Error(errorMessage);
      }

      if (!response.ok) {
        let errorMessage = 'Failed to create order';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          errorMessage = response.statusText || `Server error (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // Log email status
      if (data.emailSent) {
        console.log('✅ Order confirmation email sent successfully');
      } else if (data.emailError) {
        console.warn('⚠️ Order confirmation email failed:', data.emailError);
      }

      return data;
    } catch (error) {
      console.error('Error creating order:', error);
      
      // Check for network/connection errors
      if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message.includes('network'))) {
        const isProduction = typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
        const errorMessage = isProduction 
          ? `Network error: Unable to connect to backend server at ${API_URL}. Please check if the backend service is running.`
          : 'Network error: Unable to connect to backend server. Please ensure the backend server is running on port 4000. Start it with: npm run server:dev or double-click start-backend.bat';
        const networkError = new Error(errorMessage);
        networkError.isNetworkError = true;
        throw networkError;
      }
      
      throw error;
    }
  }

  async getArtistProfileById(artistId) {
    if (!artistId) return null;

    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, is_active')
        .eq('id', artistId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('⚠️ Error fetching artist profile:', error);
        return null;
      }

      return data || null;
    } catch (err) {
      console.error('⚠️ Unexpected error fetching artist profile:', err);
      return null;
    }
  }

  // Helper method to format order data for display
  formatOrderForDisplay(order) {
    // Use customer info from API response (now populated by backend)
    const customerName = order.customer_name || 'Customer';
    const customerEmail = order.customer_email || 'N/A';
    
    return {
      id: order.id,
      orderNumber: order.order_number,
      customerEmail: customerEmail,
      customerName: customerName,
      status: order.status,
      shippingMethod: order.shipping_method,
      pickupLocation: order.pickup_location,
      subtotalAmount: parseFloat(order.subtotal_amount) || 0,
      shippingCost: parseFloat(order.shipping_cost) || 0,
      totalAmount: parseFloat(order.total_amount) || 0,
      totalItems: order.total_items,
      orderDate: order.created_at,
      orderItems: order.order_items,
      deliveryAddress: order.delivery_address,
      orderNotes: order.order_notes,
      designFiles: order.design_files || []
    };
  }

  getMockOrders() {
    return [
      {
        id: 1,
        orderNumber: 'ORD-001',
        customerName: 'John Doe',
        customerEmail: 'john@example.com',
        status: 'processing',
        shippingMethod: 'pickup',
        pickupLocation: 'Main Branch',
        subtotalAmount: 1500.00,
        shippingCost: 0.00,
        totalAmount: 1500.00,
        totalItems: 2,
        orderDate: new Date().toISOString(),
        orderItems: [
          { name: 'Basketball Jersey', quantity: 1, price: 750.00 },
          { name: 'Football Jersey', quantity: 1, price: 750.00 }
        ],
        deliveryAddress: null,
        orderNotes: 'Please make sure the jerseys are high quality',
        designFiles: []
      },
      {
        id: 2,
        orderNumber: 'ORD-002',
        customerName: 'Jane Smith',
        customerEmail: 'jane@example.com',
        status: 'completed',
        shippingMethod: 'delivery',
        pickupLocation: 'Mall Branch',
        subtotalAmount: 2000.00,
        shippingCost: 100.00,
        totalAmount: 2100.00,
        totalItems: 3,
        orderDate: new Date(Date.now() - 86400000).toISOString(),
        orderItems: [
          { name: 'Volleyball Jersey', quantity: 2, price: 800.00 },
          { name: 'Soccer Jersey', quantity: 1, price: 400.00 }
        ],
        deliveryAddress: {
          fullName: 'Jane Smith',
          street: '123 Main St',
          city: 'Batangas City',
          province: 'Batangas',
          postalCode: '4200'
        },
        orderNotes: 'Rush order needed',
        designFiles: []
      },
      {
        id: 3,
        orderNumber: 'ORD-003',
        customerName: 'Mike Johnson',
        customerEmail: 'mike@example.com',
        status: 'pending',
        shippingMethod: 'pickup',
        pickupLocation: 'Downtown Branch',
        subtotalAmount: 3000.00,
        shippingCost: 0.00,
        totalAmount: 3000.00,
        totalItems: 4,
        orderDate: new Date(Date.now() - 172800000).toISOString(),
        orderItems: [
          { name: 'Basketball Jersey', quantity: 2, price: 1500.00 },
          { name: 'Football Jersey', quantity: 2, price: 1500.00 }
        ],
        deliveryAddress: null,
        orderNotes: 'Team uniforms for basketball tournament',
        designFiles: []
      }
    ];
  }

  // Fetch reviews for a specific product via backend aggregation
  async getProductReviews(productId) {
    if (!productId) return [];

    try {
      const response = await fetch(`${API_URL}/api/order-tracking/product-reviews/${productId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch product reviews (status ${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        return [];
      }

      return data.reviews || [];
    } catch (error) {
      console.error('Error in getProductReviews:', error);
      return [];
    }
  }

  // Fetch all orders with their reviews from completed deliveries
  async getAllOrdersWithReviews() {
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*')
        .eq('status', 'picked_up_delivered');

      if (error) {
        console.error('Error fetching completed orders:', error);
        return [];
      }

      // For each order, fetch the reviews
      const ordersWithReviews = await Promise.all(
        (orders || []).map(async (order) => {
          try {
            const { data: reviews } = await supabase
              .from('order_reviews')
              .select('*')
              .eq('order_id', order.id);

            return {
              ...order,
              reviews: reviews || []
            };
          } catch (err) {
            console.error('Error fetching reviews for order', order.id, err);
            return {
              ...order,
              reviews: []
            };
          }
        })
      );

      return ordersWithReviews;
    } catch (error) {
      console.error('Error in getAllOrdersWithReviews:', error);
      return [];
    }
  }
}

const orderService = new OrderService();

export default orderService;