const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { authenticateSupabaseToken, requireAdminOrOwner, requireOwner } = require('../middleware/supabaseAuth');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Apply authentication to all delete routes
router.use(authenticateSupabaseToken);

// Delete user account (admin or customer)
router.delete('/user/:id', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ NEW DELETE API - Attempting to delete user with ID:', id);
    
    // First, check if user exists
    const { data: userData, error: getUserError } = await supabase.auth.admin.getUserById(id);
    if (getUserError) {
      console.log('❌ User not found or error getting user:', getUserError);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('👤 User found:', { id: userData.user.id, email: userData.user.email });
    
    // Delete the user
    const { data: deleteData, error: deleteError } = await supabase.auth.admin.deleteUser(id);
    
    console.log('🔍 Delete response:', { deleteData, deleteError });
    
    if (deleteError) {
      console.error('❌ Supabase delete error:', deleteError);
      return res.status(500).json({ error: 'Failed to delete user', details: deleteError.message });
    }
    
    console.log('✅ User deleted successfully');
    
    // Wait a moment for Supabase to process the deletion
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Verify deletion by checking if user still exists
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(id);
    
    if (verifyError && verifyError.message.includes('User not found')) {
      console.log('✅ CONFIRMED: User successfully deleted and verified');
      res.json({ 
        message: 'User deleted successfully', 
        deleted: true,
        userId: id 
      });
    } else if (verifyData && verifyData.user) {
      console.log('❌ PROBLEM: User still exists after delete attempt');
      res.status(500).json({ 
        error: 'User still exists after delete attempt',
        stillExists: true 
      });
    } else {
      console.log('✅ User deleted (verification inconclusive)');
      res.json({ 
        message: 'User deleted successfully', 
        deleted: true,
        userId: id 
      });
    }
    
  } catch (error) {
    console.error('❌ Error in delete API:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Force delete user (more aggressive approach)
router.delete('/user/:id/force', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💥 FORCE DELETE - Attempting to force delete user with ID:', id);
    
    // Try multiple delete attempts
    let deleteAttempts = 0;
    const maxAttempts = 3;
    let lastError = null;
    
    while (deleteAttempts < maxAttempts) {
      deleteAttempts++;
      console.log(`🔄 Delete attempt ${deleteAttempts}/${maxAttempts}`);
      
      const { data, error } = await supabase.auth.admin.deleteUser(id);
      
      if (!error) {
        console.log(`✅ Delete successful on attempt ${deleteAttempts}`);
        break;
      } else {
        console.log(`❌ Delete failed on attempt ${deleteAttempts}:`, error.message);
        lastError = error;
        
        // Wait before retry
        if (deleteAttempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    if (lastError && deleteAttempts >= maxAttempts) {
      console.log('❌ All delete attempts failed');
      return res.status(500).json({ 
        error: 'Failed to delete user after multiple attempts', 
        details: lastError.message,
        attempts: deleteAttempts 
      });
    }
    
    // Wait for propagation
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Final verification
    const { data: verifyData, error: verifyError } = await supabase.auth.admin.getUserById(id);
    
    if (verifyError && verifyError.message.includes('User not found')) {
      console.log('✅ FORCE DELETE CONFIRMED: User successfully deleted');
      res.json({ 
        message: 'User force deleted successfully', 
        deleted: true,
        userId: id,
        attempts: deleteAttempts
      });
    } else {
      console.log('❌ FORCE DELETE FAILED: User still exists');
      res.status(500).json({ 
        error: 'Force delete failed - user still exists',
        stillExists: true,
        attempts: deleteAttempts
      });
    }
    
  } catch (error) {
    console.error('❌ Error in force delete API:', error);
    res.status(500).json({ error: 'Force delete failed', details: error.message });
  }
});

module.exports = router;
