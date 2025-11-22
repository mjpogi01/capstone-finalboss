import { supabase } from '../lib/supabase';
import { API_URL } from '../config/api';

class UserService {
  async saveUserAddress(addressData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, unset any existing default addresses
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Build insert data object
      const insertData = {
        user_id: user.id,
        full_name: addressData.fullName,
        phone: addressData.phone,
        street_address: addressData.streetAddress,
        barangay: addressData.barangay,
        barangay_code: addressData.barangay_code || null, // Include barangay code for coordinate lookup
        city: addressData.city,
        province: addressData.province,
        postal_code: addressData.postalCode,
        address: addressData.address,
        is_default: true
      };
      
      // Include email if provided (column may exist in some databases)
      if (addressData.email) {
        insertData.email = addressData.email;
      }
      
      // Insert new address as default
      const { data, error } = await supabase
        .from('user_addresses')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save address: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async getUserAddress() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_default', true)
        .single()
        .abortSignal(AbortSignal.timeout(15000)); // Increased timeout to 15 seconds

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // Check if it's a timeout/abort error
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          console.warn('⚠️ Timeout fetching user address (non-critical)');
          return null; // Return null instead of throwing for graceful handling
        }
        throw new Error(`Failed to get address: ${error.message}`);
      }

      return data || null;
    } catch (error) {
      // Handle timeout errors gracefully - return null instead of throwing
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.warn('⚠️ Timeout fetching user address (non-critical):', error);
        return null; // Return null for graceful fallback
      }
      // Only throw non-timeout errors
      if (error.code !== 'PGRST116') {
        throw new Error(error.message || 'Network error occurred');
      }
      return null; // PGRST116 means no rows - return null
    }
  }

  async getUserAddresses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get addresses: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async updateUserAddress(addressId, addressData) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, verify the address exists and belongs to the user
      const { data: existingAddress, error: checkError } = await supabase
        .from('user_addresses')
        .select('id')
        .eq('id', addressId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) {
        throw new Error(`Failed to verify address: ${checkError.message}`);
      }

      if (!existingAddress) {
        throw new Error('Address not found or does not belong to user');
      }

      // Build update data object
      const updateData = {
        full_name: addressData.fullName,
        phone: addressData.phone,
        street_address: addressData.streetAddress,
        barangay: addressData.barangay,
        barangay_code: addressData.barangay_code || null, // Include barangay code for coordinate lookup
        city: addressData.city,
        province: addressData.province,
        postal_code: addressData.postalCode,
        address: addressData.address,
        updated_at: new Date().toISOString()
      };
      
      // Include email if provided (column may exist in some databases)
      if (addressData.email) {
        updateData.email = addressData.email;
      }
      
      // Update the address - first update without select to avoid coercion issues
      const { error: updateError } = await supabase
        .from('user_addresses')
        .update(updateData)
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error(`Failed to update address: ${updateError.message}`);
      }

      // Fetch the updated address separately to avoid coercion issues
      const { data, error: fetchError } = await supabase
        .from('user_addresses')
        .select('*')
        .eq('id', addressId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        throw new Error(`Failed to fetch updated address: ${fetchError.message}`);
      }

      if (!data) {
        throw new Error('Address update completed but address not found');
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async deleteUserAddress(addressId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('id', addressId)
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to delete address: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async clearAllUserAddresses() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('user_addresses')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        throw new Error(`Failed to clear addresses: ${error.message}`);
      }

      return { success: true };
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async setDefaultAddress(addressId) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // First, unset all default addresses for this user
      await supabase
        .from('user_addresses')
        .update({ is_default: false })
        .eq('user_id', user.id);

      // Set the selected address as default
      const { data, error } = await supabase
        .from('user_addresses')
        .update({ is_default: true })
        .eq('id', addressId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to set default address: ${error.message}`);
      }

      return data;
    } catch (error) {
      throw new Error(error.message || 'Network error occurred');
    }
  }

  async deleteAccount() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const token = session.access_token;
      
      // Use API_URL from config to ensure consistency
      const apiUrl = API_URL || 'http://localhost:4000';

      console.log('🗑️ [UserService] Attempting to delete account...');
      console.log('🔗 [UserService] API URL:', apiUrl);
      console.log('🔐 [UserService] Has token:', !!token);

      const response = await fetch(`${apiUrl}/api/user/account`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      console.log('📥 [UserService] Response status:', response.status);
      console.log('📥 [UserService] Response ok:', response.ok);
      console.log('📥 [UserService] Response headers:', Object.fromEntries(response.headers.entries()));

      // Get response text first to handle non-JSON responses
      const responseText = await response.text();
      console.log('📥 [UserService] Response text:', responseText);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log('📦 [UserService] Response data:', data);
      } catch (parseError) {
        console.error('❌ [UserService] Failed to parse JSON:', parseError);
        console.error('❌ [UserService] Response text was:', responseText);
        throw new Error(`Server returned invalid response: ${responseText.substring(0, 100)}`);
      }

      if (!response.ok) {
        console.error('❌ [UserService] Delete failed:', data);
        const errorMessage = data?.error || data?.details || data?.message || 'Failed to delete account';
        throw new Error(errorMessage);
      }

      console.log('✅ [UserService] Account deleted successfully');
      return data;
    } catch (error) {
      console.error('❌ [UserService] Delete account error:', error);
      
      // Provide more specific error messages
      if (error.message?.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server. Please ensure the backend server is running on port 4000.');
      }
      
      throw new Error(error.message || 'Network error occurred');
    }
  }
}

export default new UserService();
