const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client for server-side operations
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('⚠️  Missing Supabase environment variables:');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗ Missing');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗ Missing');
}

let supabase;
try {
  supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
} catch (error) {
  console.error('Failed to initialize Supabase client:', error);
  throw error;
}

// Middleware to verify Supabase JWT token
const authenticateSupabaseToken = async (req, res, next) => {
  try {
    // Skip authentication for OPTIONS preflight requests
    if (req.method === 'OPTIONS') {
      return next();
    }

    // Verify Supabase client is initialized
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Supabase not configured properly');
      return res.status(500).json({ 
        error: 'Server configuration error: Supabase credentials missing' 
      });
    }

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // Verify the JWT token with Supabase
    let getUserResult;
    try {
      getUserResult = await supabase.auth.getUser(token);
    } catch (getUserError) {
      console.error('Exception during getUser call:', getUserError);
      console.error('Exception stack:', getUserError.stack);
      const errorMsg = getUserError.message || String(getUserError) || '';
      if (errorMsg.toLowerCase().includes('tenant') || errorMsg.toLowerCase().includes('user not found')) {
        return res.status(401).json({ 
          error: 'Session expired. Please refresh your browser and log in again.' 
        });
      }
      return res.status(401).json({ 
        error: 'Authentication failed. Please refresh your session.' 
      });
    }

    const { data: { user }, error } = getUserResult || {};

    if (error) {
      console.error('Supabase getUser error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      
      // Check all possible error message properties
      const errorMessage = error.message || error.error_description || error.error || error.msg || String(error) || '';
      const errorString = errorMessage.toLowerCase();
      
      if (errorString.includes('tenant') || errorString.includes('user not found')) {
        console.error('Tenant/user error detected - this usually means SUPABASE_URL is incorrect or session expired');
        console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
        console.error('SUPABASE_URL value:', process.env.SUPABASE_URL ? process.env.SUPABASE_URL.substring(0, 30) + '...' : 'N/A');
        return res.status(401).json({ 
          error: 'Session expired. Please refresh your browser and log in again.' 
        });
      }
      
      return res.status(401).json({ 
        error: errorMessage || 'Invalid or expired token. Please refresh your session.' 
      });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get user role from user metadata
    const resolvedRole =
      user.user_metadata?.role ||
      user.raw_user_meta_data?.role ||
      (typeof user?.app_metadata?.role === 'string' ? user.app_metadata.role : null);
    const role = typeof resolvedRole === 'string' ? resolvedRole.toLowerCase() : 'customer';

    const resolvedBranchId =
      user.user_metadata?.branch_id ||
      user.raw_user_meta_data?.branch_id;
    const parsedBranchId = typeof resolvedBranchId === 'number'
      ? resolvedBranchId
      : typeof resolvedBranchId === 'string' && resolvedBranchId.trim() !== ''
        ? parseInt(resolvedBranchId, 10)
        : null;

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: role,
      branch_id: Number.isNaN(parsedBranchId) ? null : parsedBranchId,
      first_name: user.user_metadata?.first_name || null,
      last_name: user.user_metadata?.last_name || null
    };

    next();
  } catch (error) {
    console.error('Supabase auth error (catch block):', error);
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      name: error.name,
      stack: error.stack
    });
    
    // Check if it's a Supabase-specific error
    const errorMessage = error.message || '';
    if (errorMessage.includes('Tenant') || errorMessage.includes('tenant')) {
      console.error('Tenant error detected in catch - this usually means SUPABASE_URL is incorrect');
      if (!res.headersSent) {
        return res.status(401).json({ 
          error: 'Session expired. Please refresh your browser and log in again.' 
        });
      }
    }
    
    // Make sure we always send a response
    if (!res.headersSent) {
      return res.status(401).json({ 
        error: errorMessage || 'Invalid or expired token. Please refresh your session.' 
      });
    }
    
    // If headers already sent, pass to error handler
    next(error);
  }
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Middleware to check if user is admin or owner
const requireAdminOrOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin' && req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Admin or owner access required' });
  }

  next();
};

// Middleware to check if user is owner only
const requireOwner = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'owner') {
    return res.status(403).json({ error: 'Owner access required' });
  }

  next();
};

// Middleware to check admin can access specific branch
const requireBranchAccess = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Owners can access all branches
  if (req.user.role === 'owner') {
    return next();
  }

  // Admins can only access their assigned branch
  if (req.user.role === 'admin') {
    const requestedBranchId = req.params.branchId || req.body.branch_id;
    if (requestedBranchId && req.user.branch_id !== parseInt(requestedBranchId)) {
      return res.status(403).json({ error: 'Access denied to this branch' });
    }
  }

  next();
};

module.exports = {
  authenticateSupabaseToken,
  requireRole,
  requireAdminOrOwner,
  requireOwner,
  requireBranchAccess
};
