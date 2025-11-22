const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client with admin access
// IMPORTANT: Must use service role key for admin operations like deleteUser
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Verify Supabase client is initialized properly
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('⚠️  WARNING: SUPABASE_SERVICE_ROLE_KEY not set! Admin operations will fail.');
}

const router = express.Router();

// Get user's default address
router.get('/address', authenticateSupabaseToken, async (req, res) => {
  try {
    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Supabase error fetching address:', error);
      return res.status(500).json({ error: 'Failed to fetch address' });
    }

    if (!addresses || addresses.length === 0) {
      return res.status(404).json({ error: 'No address found' });
    }

    res.json(addresses[0]);
  } catch (error) {
    console.error('Error fetching user address:', error);
    res.status(500).json({ error: 'Failed to fetch address' });
  }
});

// Get all user addresses
router.get('/addresses', authenticateSupabaseToken, async (req, res) => {
  try {
    const { data: addresses, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', req.user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error fetching addresses:', error);
      return res.status(500).json({ error: 'Failed to fetch addresses' });
    }

    res.json(addresses || []);
  } catch (error) {
    console.error('Error fetching user addresses:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// Save user's address
router.post('/address', authenticateSupabaseToken, async (req, res) => {
  try {
    const { fullName, email, phone, streetAddress, barangay, barangay_code, city, province, postalCode, address, isDefault = true } = req.body;

    // Check if user already has an address
    const { data: existingAddresses, error: checkError } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('user_id', req.user.id);

    if (checkError) {
      console.error('Supabase error checking existing addresses:', checkError);
      return res.status(500).json({ error: 'Failed to check existing addresses' });
    }

    // Build update/insert data object
    const addressUpdateData = {
      full_name: fullName,
      phone: phone,
      street_address: streetAddress,
      barangay: barangay,
      barangay_code: barangay_code || null, // Include barangay code for coordinate lookup
      city: city,
      province: province,
      postal_code: postalCode,
      address: address,
      is_default: isDefault
    };
    
    // Include email if provided
    if (email) {
      addressUpdateData.email = email;
    }

    let result;
    if (existingAddresses && existingAddresses.length > 0) {
      // Update existing address
      addressUpdateData.updated_at = new Date().toISOString();
      const { data, error } = await supabase
        .from('user_addresses')
        .update(addressUpdateData)
        .eq('user_id', req.user.id)
        .select()
        .single();

      if (error) {
        console.error('Supabase error updating address:', error);
        return res.status(500).json({ error: 'Failed to update address' });
      }

      result = data;
    } else {
      // Create new address
      const insertData = {
        user_id: req.user.id,
        ...addressUpdateData
      };
      
      const { data, error } = await supabase
        .from('user_addresses')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating address:', error);
        return res.status(500).json({ error: 'Failed to create address' });
      }

      result = data;
    }

    res.json(result);
  } catch (error) {
    console.error('Error saving user address:', error);
    res.status(500).json({ error: 'Failed to save address' });
  }
});

// Update specific address by ID
router.put('/address/:id', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, phone, streetAddress, barangay, barangay_code, city, province, postalCode, address, isDefault } = req.body;

    // Build update data object
    const updateData = {
      full_name: fullName,
      phone: phone,
      street_address: streetAddress,
      barangay: barangay,
      barangay_code: barangay_code || null, // Include barangay code for coordinate lookup
      city: city,
      province: province,
      postal_code: postalCode,
      address: address,
      updated_at: new Date().toISOString()
    };
    
    // Include email if provided
    if (email !== undefined) {
      updateData.email = email;
    }
    
    // Include is_default if provided
    if (isDefault !== undefined) {
      updateData.is_default = isDefault;
    }

    const { data, error } = await supabase
      .from('user_addresses')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error updating address:', error);
      return res.status(500).json({ error: 'Failed to update address' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating user address:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// Delete address by ID
router.delete('/address/:id', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error deleting address:', error);
      return res.status(500).json({ error: 'Failed to delete address' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json({ message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Error deleting user address:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

// Set default address
router.patch('/address/:id/default', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;

    // First, unset all default addresses for this user
    const { error: unsetError } = await supabase
      .from('user_addresses')
      .update({ is_default: false })
      .eq('user_id', req.user.id);

    if (unsetError) {
      console.error('Supabase error unsetting default addresses:', unsetError);
      return res.status(500).json({ error: 'Failed to unset default addresses' });
    }

    // Then set the selected address as default
    const { data, error } = await supabase
      .from('user_addresses')
      .update({ is_default: true })
      .eq('id', id)
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error setting default address:', error);
      return res.status(500).json({ error: 'Failed to set default address' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Address not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error setting default address:', error);
    res.status(500).json({ error: 'Failed to set default address' });
  }
});

// Delete user's own account (safety: only allow users to delete their own account)
router.delete('/account', authenticateSupabaseToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('🗑️ User requesting account deletion:', userId);

    // Verify Supabase configuration
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY not set!');
      return res.status(500).json({ 
        error: 'Failed to delete account', 
        details: 'Server configuration error: Service role key not configured'
      });
    }

    if (!process.env.SUPABASE_URL) {
      console.error('❌ SUPABASE_URL not set!');
      return res.status(500).json({ 
        error: 'Failed to delete account', 
        details: 'Server configuration error: Supabase URL not configured'
      });
    }

    // Verify user exists
    let userData;
    try {
      const result = await supabase.auth.admin.getUserById(userId);
      if (result.error) {
        console.error('❌ Error getting user:', result.error);
        return res.status(404).json({ 
          error: 'User not found',
          details: result.error.message 
        });
      }
      userData = result.data;
    } catch (getUserException) {
      console.error('❌ Exception getting user:', getUserException);
      return res.status(500).json({ 
        error: 'Failed to verify user',
        details: getUserException.message || 'Error checking user existence'
      });
    }

    if (!userData || !userData.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('👤 User found:', { id: userData.user.id, email: userData.user.email });

    // SAFE DELETION: Delete related data in correct order to avoid constraint violations
    // Order matters: Delete child tables first, then parent tables
    // This prevents 'unexpected_failure' errors and ensures database integrity
    console.log('🗑️ Starting safe deletion of related data...');
    
    const deletionErrors = [];
    const deletionSuccess = [];

    // Step 1: Delete chat messages (references sender_id)
    try {
      const { error: chatMsgError } = await supabase
        .from('design_chat_messages')
        .delete()
        .eq('sender_id', userId);
      if (chatMsgError) {
        console.warn('⚠️ Could not delete design_chat_messages:', chatMsgError.message);
        deletionErrors.push({ table: 'design_chat_messages', error: chatMsgError.message });
      } else {
        console.log('✅ Deleted design_chat_messages');
        deletionSuccess.push('design_chat_messages');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting design_chat_messages:', e.message);
      deletionErrors.push({ table: 'design_chat_messages', error: e.message });
    }

    // Step 2: Delete chat rooms (references customer_id)
    try {
      const { error: chatRoomError } = await supabase
        .from('design_chat_rooms')
        .delete()
        .eq('customer_id', userId);
      if (chatRoomError) {
        console.warn('⚠️ Could not delete design_chat_rooms:', chatRoomError.message);
        deletionErrors.push({ table: 'design_chat_rooms', error: chatRoomError.message });
      } else {
        console.log('✅ Deleted design_chat_rooms');
        deletionSuccess.push('design_chat_rooms');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting design_chat_rooms:', e.message);
      deletionErrors.push({ table: 'design_chat_rooms', error: e.message });
    }

    // Step 3: Delete order reviews (references user_id)
    try {
      const { error: reviewError } = await supabase
        .from('order_reviews')
        .delete()
        .eq('user_id', userId);
      if (reviewError) {
        console.warn('⚠️ Could not delete order_reviews:', reviewError.message);
        deletionErrors.push({ table: 'order_reviews', error: reviewError.message });
      } else {
        console.log('✅ Deleted order_reviews');
        deletionSuccess.push('order_reviews');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting order_reviews:', e.message);
      deletionErrors.push({ table: 'order_reviews', error: e.message });
    }

    // Step 4: Delete orders (references user_id) - This will cascade delete order items
    try {
      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('user_id', userId);
      if (orderError) {
        console.warn('⚠️ Could not delete orders:', orderError.message);
        deletionErrors.push({ table: 'orders', error: orderError.message });
      } else {
        console.log('✅ Deleted orders');
        deletionSuccess.push('orders');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting orders:', e.message);
      deletionErrors.push({ table: 'orders', error: e.message });
    }

    // Step 5: Check if user is an artist and delete artist-related data
    try {
      const { data: artistProfile, error: artistCheckError } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (artistProfile && !artistCheckError) {
        const artistId = artistProfile.id;
        console.log(`👨‍🎨 User is an artist (ID: ${artistId}), deleting artist-related data...`);

        // Delete artist tasks (references artist_id)
        try {
          const { error: taskError } = await supabase
            .from('artist_tasks')
            .delete()
            .eq('artist_id', artistId);
          if (taskError) {
            console.warn('⚠️ Could not delete artist_tasks:', taskError.message);
            deletionErrors.push({ table: 'artist_tasks', error: taskError.message });
          } else {
            console.log('✅ Deleted artist_tasks');
            deletionSuccess.push('artist_tasks');
          }
        } catch (e) {
          console.warn('⚠️ Exception deleting artist_tasks:', e.message);
          deletionErrors.push({ table: 'artist_tasks', error: e.message });
        }

        // Delete artist designs (references artist_id)
        try {
          const { error: designError } = await supabase
            .from('artist_designs')
            .delete()
            .eq('artist_id', artistId);
          if (designError) {
            console.warn('⚠️ Could not delete artist_designs:', designError.message);
            deletionErrors.push({ table: 'artist_designs', error: designError.message });
          } else {
            console.log('✅ Deleted artist_designs');
            deletionSuccess.push('artist_designs');
          }
        } catch (e) {
          console.warn('⚠️ Exception deleting artist_designs:', e.message);
          deletionErrors.push({ table: 'artist_designs', error: e.message });
        }

        // Delete artist profile (references user_id)
        try {
          const { error: artistProfileError } = await supabase
            .from('artist_profiles')
            .delete()
            .eq('user_id', userId);
          if (artistProfileError) {
            console.warn('⚠️ Could not delete artist_profiles:', artistProfileError.message);
            deletionErrors.push({ table: 'artist_profiles', error: artistProfileError.message });
          } else {
            console.log('✅ Deleted artist_profiles');
            deletionSuccess.push('artist_profiles');
          }
        } catch (e) {
          console.warn('⚠️ Exception deleting artist_profiles:', e.message);
          deletionErrors.push({ table: 'artist_profiles', error: e.message });
        }
      } else {
        console.log('ℹ️ User is not an artist, skipping artist-related data');
      }
    } catch (e) {
      console.warn('⚠️ Exception checking artist profile:', e.message);
      // Continue with deletion even if artist check fails
    }

    // Step 6: Delete user profile data
    try {
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);
      if (profileError) {
        console.warn('⚠️ Could not delete user_profiles:', profileError.message);
        deletionErrors.push({ table: 'user_profiles', error: profileError.message });
      } else {
        console.log('✅ Deleted user_profiles');
        deletionSuccess.push('user_profiles');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting user_profiles:', e.message);
      deletionErrors.push({ table: 'user_profiles', error: e.message });
    }

    // Step 7: Delete user addresses
    try {
      const { error: addressError } = await supabase
        .from('user_addresses')
        .delete()
        .eq('user_id', userId);
      if (addressError) {
        console.warn('⚠️ Could not delete user_addresses:', addressError.message);
        deletionErrors.push({ table: 'user_addresses', error: addressError.message });
      } else {
        console.log('✅ Deleted user_addresses');
        deletionSuccess.push('user_addresses');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting user_addresses:', e.message);
      deletionErrors.push({ table: 'user_addresses', error: e.message });
    }

    // Step 8: Delete user cart
    try {
      const { error: cartError } = await supabase
        .from('user_carts')
        .delete()
        .eq('user_id', userId);
      if (cartError) {
        console.warn('⚠️ Could not delete user_carts:', cartError.message);
        deletionErrors.push({ table: 'user_carts', error: cartError.message });
      } else {
        console.log('✅ Deleted user_carts');
        deletionSuccess.push('user_carts');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting user_carts:', e.message);
      deletionErrors.push({ table: 'user_carts', error: e.message });
    }

    // Step 9: Delete user wishlist
    try {
      const { error: wishlistError } = await supabase
        .from('user_wishlist')
        .delete()
        .eq('user_id', userId);
      if (wishlistError) {
        console.warn('⚠️ Could not delete user_wishlist:', wishlistError.message);
        deletionErrors.push({ table: 'user_wishlist', error: wishlistError.message });
      } else {
        console.log('✅ Deleted user_wishlist');
        deletionSuccess.push('user_wishlist');
      }
    } catch (e) {
      console.warn('⚠️ Exception deleting user_wishlist:', e.message);
      deletionErrors.push({ table: 'user_wishlist', error: e.message });
    }

    // Log deletion summary
    console.log(`📊 Deletion summary: ${deletionSuccess.length} tables cleaned successfully`);
    if (deletionErrors.length > 0) {
      console.warn(`⚠️ ${deletionErrors.length} tables had errors (may be non-existent or already deleted):`);
      deletionErrors.forEach(err => {
        console.warn(`   - ${err.table}: ${err.error}`);
      });
    }

    // Try to sign out the user to clear active sessions
    console.log('🔐 Attempting to sign out user to clear sessions...');
    try {
      // Sign out user using admin API
      const { error: signOutError } = await supabase.auth.admin.signOut(userId, 'global');
      if (signOutError) {
        console.warn('⚠️ Could not sign out user (non-critical):', signOutError.message);
      } else {
        console.log('✅ User sessions cleared');
        // Wait a moment for sessions to clear
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (signOutException) {
      console.warn('⚠️ Exception signing out user (non-critical):', signOutException.message);
      // Continue with deletion attempt even if sign out fails
    }

    // Wait a moment for database operations to complete
    await new Promise(resolve => setTimeout(resolve, 500));

    // Delete user from Supabase Auth with retry logic
    // This will cascade delete related data due to ON DELETE CASCADE foreign keys:
    // - user_profiles
    // - user_addresses
    // - user_carts
    // - user_wishlist
    // - orders
    console.log('🗑️ Attempting to delete user from Supabase Auth...');
    console.log('🔐 Configuration check:', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      hasUrl: !!process.env.SUPABASE_URL
    });
    
    let deleteAttempts = 0;
    const maxAttempts = 3;
    let deleteError = null;
    let deleteSuccess = false;

    while (deleteAttempts < maxAttempts && !deleteSuccess) {
      deleteAttempts++;
      console.log(`🔄 Delete attempt ${deleteAttempts}/${maxAttempts}`);

      try {
        const { data: deleteData, error: errorResult } = await supabase.auth.admin.deleteUser(userId);

        if (errorResult) {
          deleteError = errorResult;
          console.error(`❌ Delete attempt ${deleteAttempts} failed:`, {
            message: errorResult.message,
            code: errorResult.code,
            status: errorResult.status,
            statusCode: errorResult.statusCode,
            name: errorResult.name,
            fullError: JSON.stringify(errorResult, Object.getOwnPropertyNames(errorResult))
          });

          // If it's a non-retryable error, break immediately
          if (errorResult.message?.includes('not found') || 
              errorResult.statusCode === 404 ||
              errorResult.code === 'user_not_found') {
            console.log('⚠️ User not found - may already be deleted');
            deleteSuccess = true; // Treat as success
            break;
          }

          // For unexpected_failure, log more details
          if (errorResult.code === 'unexpected_failure') {
            console.error('❌ Supabase unexpected_failure error - possible causes:');
            console.error('  1. Service role key may not have admin permissions');
            console.error('  2. User may have active sessions that need to be cleared');
            console.error('  3. Database constraint violations');
            console.error('  4. Supabase API temporary issue');
          }

          // Wait before retry (if not last attempt)
          if (deleteAttempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000 * deleteAttempts));
          }
        } else {
          console.log(`✅ Delete successful on attempt ${deleteAttempts}`);
          deleteSuccess = true;
          break;
        }
      } catch (deleteException) {
        console.error(`❌ Exception on delete attempt ${deleteAttempts}:`, deleteException);
        deleteError = {
          message: deleteException.message,
          name: deleteException.name,
          stack: deleteException.stack
        };

        // Wait before retry (if not last attempt)
        if (deleteAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000 * deleteAttempts));
        }
      }
    }

    if (!deleteSuccess && deleteError) {
      console.error('❌ All delete attempts failed');
      console.error('❌ Final error:', deleteError);
      
      // Provide detailed error message
      let errorDetails = deleteError.message || 'Unknown error occurred';
      
      // Handle specific error codes
      if (deleteError.code === 'unexpected_failure') {
        errorDetails = 'Unexpected error from Supabase. This may be due to active user sessions, database constraints, or a temporary Supabase API issue. Please try logging out and trying again, or contact support.';
      } else if (deleteError.message?.includes('permission') || deleteError.message?.includes('auth') || 
          deleteError.message?.includes('unauthorized') || deleteError.message?.includes('403')) {
        errorDetails = 'Permission denied. Please check Supabase service role key configuration.';
      } else if (deleteError.message?.includes('401') || deleteError.code === 'invalid_api_key') {
        errorDetails = 'Invalid service role key. Please verify SUPABASE_SERVICE_ROLE_KEY environment variable.';
      } else if (deleteError.message?.includes('network') || deleteError.message?.includes('fetch')) {
        errorDetails = 'Network error. Please check your connection to Supabase.';
      } else if (deleteError.message?.includes('constraint') || deleteError.message?.includes('foreign key')) {
        errorDetails = 'Database constraint violation. Please contact support.';
      } else if (deleteError.message?.includes('session') || deleteError.message?.includes('active')) {
        errorDetails = 'User has active sessions. Please try logging out first, then delete your account.';
      }
      
      return res.status(500).json({ 
        error: 'Failed to delete account', 
        details: errorDetails,
        errorCode: deleteError.code || 'unknown_error',
        attempts: deleteAttempts
      });
    }

    console.log('✅ User account deleted successfully');

    // Wait a moment for Supabase to process the deletion
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Verify deletion (optional - don't fail if verification fails)
    try {
      const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(userId);

      if (verifyError && verifyError.message?.includes('User not found')) {
        console.log('✅ CONFIRMED: User account successfully deleted');
      } else if (verifyData && verifyData.user) {
        console.log('⚠️ WARNING: User still exists after delete - may take time to propagate');
      } else {
        console.log('✅ User deletion verified');
      }
    } catch (verifyException) {
      console.warn('⚠️ Could not verify deletion (non-critical):', verifyException.message);
      // Don't fail the request if verification fails
    }

    // Always return success if we got here (deletion was attempted)
    res.json({ 
      message: 'Account deleted successfully', 
      deleted: true,
      userId: userId 
    });

  } catch (error) {
    console.error('❌ Exception caught in delete account route:', error);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: error.code,
      status: error.status
    });
    
    // Check for specific error types
    let errorDetails = error.message || 'Unknown error occurred';
    
    if (error.message?.includes('Service role key')) {
      errorDetails = 'Service role key not configured. Please check SUPABASE_SERVICE_ROLE_KEY environment variable.';
    } else if (error.message?.includes('Supabase')) {
      errorDetails = 'Supabase connection error. Please check your Supabase configuration.';
    } else if (error.message?.includes('timeout') || error.name === 'AbortError') {
      errorDetails = 'Request timed out. Please try again.';
    }
    
    res.status(500).json({ 
      error: 'Failed to delete account', 
      details: errorDetails,
      errorType: error.name
    });
  }
});

module.exports = router;
