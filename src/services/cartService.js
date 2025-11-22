import { supabase } from '../lib/supabase';

class CartService {
  // Get user's cart items from database
  async getUserCart(userId, forceRefresh = false) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      console.log('🔍 CartService: Fetching cart for user ID:', userId);

      // Ensure user exists in database first
      await this.ensureUserExists(userId);

      const { data, error } = await supabase
        .from('user_carts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }) // Last added item appears first
        .abortSignal(AbortSignal.timeout(15000)); // Increased timeout to 15 seconds

      if (error) {
        // Handle timeout/abort errors gracefully - return empty array
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          console.warn('⚠️ Timeout fetching cart (non-critical)');
          return []; // Return empty array for graceful fallback
        }
        
        console.error('Supabase error fetching cart:', error);
        
        // Check for network errors
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('network') ||
            error.name === 'AuthRetryableFetchError') {
          const networkError = new Error('Network error: Unable to connect to database. Please check your internet connection.');
          networkError.isNetworkError = true;
          throw networkError;
        }
        
        // Check for auth errors
        if (error.code === 'PGRST116' || error.message?.includes('JWT') || error.message?.includes('expired')) {
          const authError = new Error('Session expired. Please refresh your browser and log in again.');
          authError.isAuthError = true;
          throw authError;
        }
        
        throw new Error(`Database error: ${error.message || 'Unknown error'}`);
      }

      console.log('🔍 CartService: Found', data?.length || 0, 'cart items for user:', userId);

      const productIds = [...new Set((data || []).map(item => item.product_id).filter(Boolean))];
      const productsMap = await this.fetchProductsMap(productIds);

      // Transform the data to match the cart item format
      const transformedData = data.map(item => {
        const product = productsMap.get(item.product_id);
        if (!product) {
          console.warn('Cart item missing product data for product_id:', item.product_id);
          return null;
        }
        
        // Extract teamName from team_members if available
        const teamName = item.is_team_order && item.team_members && item.team_members.length > 0
          ? (item.team_members[0]?.teamName || item.team_members[0]?.team_name || null)
          : null;

        const basePrice = parseFloat(item.base_price ?? product.price) || 0;
        const unitPrice = parseFloat(item.unit_price ?? product.price) || 0;

        return {
          id: product.id,
          name: product.name,
          category: product.category,
          price: unitPrice,
          image: product.main_image,
          additional_images: product.additional_images,
          quantity: item.quantity,
          size: item.size,
          isTeamOrder: item.is_team_order,
          teamMembers: item.team_members,
          teamName: teamName, // Extract team name from first team member
          singleOrderDetails: item.single_order_details,
          sizeType: item.single_order_details?.sizingType ||
            (Array.isArray(item.team_members) && item.team_members.length > 0
              ? item.team_members[0]?.sizingType
              : null),
          jerseyType: item.single_order_details?.jerseyType ||
            (Array.isArray(item.team_members) && item.team_members.length > 0
              ? item.team_members[0]?.jerseyType
              : null),
          ballDetails: item.ball_details, // Include ball details
          trophyDetails: item.trophy_details, // Include trophy details
          basePrice,
          fabricOption: item.fabric_option || null,
          fabricSurcharge: parseFloat(item.fabric_surcharge ?? 0) || 0,
          sizeSurcharge: parseFloat(item.size_surcharge ?? 0) || 0,
          sizeSurchargeTotal: parseFloat(item.size_surcharge_total ?? item.size_surcharge ?? 0) || 0,
          surchargeDetails: item.surcharge_details || null,
          uniqueId: item.id, // Use database ID as unique identifier
          createdAt: item.created_at,
          updatedAt: item.updated_at
        };
      }).filter(item => item !== null);

      return transformedData;
    } catch (error) {
      console.error('Error fetching user cart:', error);
      throw error;
    }
  }

  // Check if user exists in Supabase Auth
  async ensureUserExists(userId) {
    try {
      // Get current user from Supabase Auth with better error handling
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Error getting current user:', error);
        
        // Check if it's a network error
        if (error.message?.includes('Failed to fetch') || 
            error.message?.includes('network') ||
            error.name === 'AuthRetryableFetchError') {
          const networkError = new Error('Network error: Unable to connect to authentication service. Please check your internet connection and try again.');
          networkError.isNetworkError = true;
          throw networkError;
        }
        
        // Check if it's an auth error (expired session)
        if (error.message?.includes('expired') || error.message?.includes('invalid')) {
          const authError = new Error('Session expired. Please refresh your browser and log in again.');
          authError.isAuthError = true;
          throw authError;
        }
        
        throw error;
      }

      if (!user || user.id !== userId) {
        const authError = new Error('User not authenticated or ID mismatch. Please log in again.');
        authError.isAuthError = true;
        throw authError;
      }

      return true;
    } catch (error) {
      console.error('Error ensuring user exists:', error);
      throw error;
    }
  }

  // Add item to user's cart (with duplicate detection and quantity increase)
  async addToCart(userId, cartItem) {
    try {
      // Ensure user exists in database first
      await this.ensureUserExists(userId);
      
      // Validate that product_id is a proper UUID
      if (!cartItem.id || typeof cartItem.id !== 'string') {
        throw new Error('Invalid product ID');
      }

      // Check if exact same item already exists in cart (same product, size, team order status)
      const { data: existingItems, error: checkError } = await supabase
        .from('user_carts')
        .select('*')
        .eq('user_id', userId)
        .eq('product_id', cartItem.id)
        .eq('size', cartItem.size)
        .eq('is_team_order', cartItem.isTeamOrder || false);

      if (checkError) {
        console.error('Error checking for existing cart item:', checkError);
        throw checkError;
      }

      // If exact same item exists, check if customization details also match
      if (existingItems && existingItems.length > 0) {
        // Further check: compare team_members and single_order_details
        // Only treat as duplicate if EVERYTHING is the same
        let foundExactMatch = null;
        
        for (const existingItem of existingItems) {
          const isSameTeamDetails = JSON.stringify(existingItem.team_members) === JSON.stringify(cartItem.teamMembers);
          const isSameSingleDetails = JSON.stringify(existingItem.single_order_details) === JSON.stringify(cartItem.singleOrderDetails);
          const isSameBallDetails = JSON.stringify(existingItem.ball_details) === JSON.stringify(cartItem.ballDetails);
          const isSameTrophyDetails = JSON.stringify(existingItem.trophy_details) === JSON.stringify(cartItem.trophyDetails);
          const isSameFabricOption = (existingItem.fabric_option || null) === (cartItem.fabricOption || null);
          const isSameFabricSurcharge = parseFloat(existingItem.fabric_surcharge ?? 0) === parseFloat(cartItem.fabricSurcharge ?? 0);
          const isSameSizeSurcharge = parseFloat(existingItem.size_surcharge ?? 0) === parseFloat(cartItem.sizeSurcharge ?? 0);
          const isSameSizeSurchargeTotal = parseFloat(existingItem.size_surcharge_total ?? 0) === parseFloat(cartItem.sizeSurchargeTotal ?? cartItem.sizeSurcharge ?? 0);
          const isSameBasePrice = parseFloat(existingItem.base_price ?? 0) === parseFloat(cartItem.basePrice ?? cartItem.price ?? 0);
          const isSameSurchargeDetails = JSON.stringify(existingItem.surcharge_details) === JSON.stringify(cartItem.surchargeDetails);
          
          // If EVERYTHING matches (including customization), it's a true duplicate
          if (
            isSameTeamDetails &&
            isSameSingleDetails &&
            isSameBallDetails &&
            isSameTrophyDetails &&
            isSameFabricOption &&
            isSameFabricSurcharge &&
            isSameSizeSurcharge &&
            isSameSizeSurchargeTotal &&
            isSameBasePrice &&
            isSameSurchargeDetails
          ) {
            foundExactMatch = existingItem;
            break;
          }
        }
        
        // Only increase quantity if found EXACT match (including customization)
        if (foundExactMatch) {
          const newQuantity = foundExactMatch.quantity + cartItem.quantity;
          
          console.log('🔄 EXACT same item found (same size, same customization), increasing quantity from', foundExactMatch.quantity, 'to', newQuantity);
          
          const { data: updatedData, error: updateError } = await supabase
            .from('user_carts')
            .update({ 
              quantity: newQuantity,
              updated_at: new Date().toISOString()
            })
            .eq('id', foundExactMatch.id)
            .select()
            .single();

          if (updateError) {
            console.error('Error updating cart item quantity:', updateError);
            throw updateError;
          }

          return {
            ...cartItem,
            uniqueId: updatedData.id,
            quantity: newQuantity,
            createdAt: updatedData.created_at,
            updatedAt: updatedData.updated_at
          };
        } else {
          // Same product/size but different customization = create new entry
          console.log('✅ Same product but different customization details, creating separate entry');
        }
      }

      // If item doesn't exist, insert new item
      console.log('📦 [CartService] Adding to cart:', {
        name: cartItem.name,
        size: cartItem.size,
        trophyDetails: cartItem.trophyDetails,
        ballDetails: cartItem.ballDetails
      });
      
      const insertData = {
        user_id: userId,
        product_id: cartItem.id,
        quantity: cartItem.quantity,
        size: cartItem.size,
        is_team_order: cartItem.isTeamOrder,
        team_members: cartItem.teamMembers,
        single_order_details: cartItem.singleOrderDetails,
        base_price: cartItem.basePrice ?? cartItem.price ?? null,
        unit_price: cartItem.price ?? null,
        fabric_option: cartItem.fabricOption || null,
        fabric_surcharge: cartItem.fabricSurcharge ?? 0,
        size_surcharge: cartItem.sizeSurcharge ?? 0,
        size_surcharge_total: cartItem.sizeSurchargeTotal ?? cartItem.sizeSurcharge ?? 0,
        surcharge_details: cartItem.surchargeDetails || null
      };
      
      if (cartItem.jerseyType) {
        if (insertData.single_order_details) {
          insertData.single_order_details = {
            ...insertData.single_order_details,
            jerseyType: cartItem.jerseyType
          };
        }
        if (Array.isArray(insertData.team_members)) {
          insertData.team_members = insertData.team_members.map(member => ({
            ...member,
            jerseyType: member?.jerseyType || cartItem.jerseyType
          }));
        }
      }
      
      // Add trophy_details and ball_details if they exist
      if (cartItem.trophyDetails) {
        insertData.trophy_details = cartItem.trophyDetails;
      }
      if (cartItem.ballDetails) {
        insertData.ball_details = cartItem.ballDetails;
      }
      
      const { data, error } = await supabase
        .from('user_carts')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        throw error;
      }

      console.log('✅ New item added to cart:', cartItem.name);

      return {
        ...cartItem,
        uniqueId: data.id,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  }

  // Update cart item quantity
  async updateCartItem(userId, uniqueId, newQuantity) {
    try {
      if (newQuantity <= 0) {
        // Remove item if quantity is 0 or less
        return await this.removeFromCart(userId, uniqueId);
      }

      const { data, error } = await supabase
        .from('user_carts')
        .update({ 
          quantity: newQuantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', uniqueId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw error;
    }
  }

  // Remove item from cart
  async removeFromCart(userId, uniqueId) {
    try {
      const { error } = await supabase
        .from('user_carts')
        .delete()
        .eq('id', uniqueId)
        .eq('user_id', userId);

      if (error) {
        console.error('CartService: Supabase delete error:', error);
        throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  }

  // Clear user's entire cart
  async clearCart(userId) {
    try {
      const { error } = await supabase
        .from('user_carts')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  }

  // Sync cart with database (for when user logs in)
  async syncCartWithDatabase(userId, localCartItems) {
    try {
      // Ensure user exists in database first
      await this.ensureUserExists(userId);
      
      // Clear existing cart in database
      await this.clearCart(userId);

      // Filter out items with invalid IDs and add valid ones to database
      const validItems = localCartItems.filter(item => {
        // Check if the ID is a valid UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return item.id && uuidRegex.test(item.id);
      });

      if (validItems.length === 0) {
        return [];
      }

      // Add all valid cart items to database
      const promises = validItems.map(item => 
        this.addToCart(userId, item)
      );

      const results = await Promise.all(promises);
      return results;
    } catch (error) {
      console.error('Error syncing cart with database:', error);
      throw error;
    }
  }

  // Get cart item count for a user
  async getCartItemCount(userId) {
    try {
      const { count, error } = await supabase
        .from('user_carts')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Error getting cart item count:', error);
      throw error;
    }
  }

  // Get cart total for a user
  async getCartTotal(userId) {
    try {
      const { data, error } = await supabase
        .from('user_carts')
        .select('product_id, quantity, unit_price, base_price')
        .eq('user_id', userId);

      if (error) throw error;

      const productIds = [...new Set((data || []).map(item => item.product_id).filter(Boolean))];
      const productsMap = await this.fetchProductsMap(productIds);

      const total = (data || []).reduce((sum, item) => {
        const product = productsMap.get(item.product_id);
        const price = parseFloat(item.unit_price ?? item.base_price ?? product?.price ?? 0) || 0;
        const quantity = parseInt(item.quantity, 10) || 0;
        return sum + (price * quantity);
      }, 0);

      return total;
    } catch (error) {
      console.error('Error getting cart total:', error);
      throw error;
    }
  }

  async fetchProductsMap(productIds) {
    const map = new Map();

    if (!Array.isArray(productIds) || productIds.length === 0) {
      return map;
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, category, price, main_image, additional_images')
        .in('id', productIds);

      if (error) {
        console.error('Error fetching products for cart items:', error);
        return map;
      }

      (data || []).forEach(product => {
        if (product?.id) {
          map.set(product.id, product);
        }
      });
    } catch (err) {
      console.error('Unexpected error fetching products for cart items:', err);
    }

    return map;
  }
}

const cartService = new CartService();
export default cartService;
