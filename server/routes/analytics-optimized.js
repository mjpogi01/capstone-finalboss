const express = require('express');
const { supabase } = require('../lib/db');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const router = express.Router();

router.use(authenticateSupabaseToken);
router.use(requireAdminOrOwner);

// Helper to resolve branch context (reuse from analytics.js)
function resolveBranchContext(user) {
  if (!user) {
    return null;
  }

  // Branch admins are limited to their branch
  if (user.role === 'branch_admin' && user.branch_id) {
    return {
      branchId: user.branch_id,
      branchName: user.branch_name || `Branch ${user.branch_id}`,
      normalizedName: (user.branch_name || `Branch ${user.branch_id}`).toUpperCase().trim()
    };
  }

  // Owners and admins can see all branches
  return null;
}

// Optimized dashboard endpoint using RPC functions
router.get('/dashboard', async (req, res) => {
  try {
    const { branch_id } = req.query;
    console.log('📊 Fetching analytics data (RPC optimized)...');

    // Resolve branch context
    let branchContext = resolveBranchContext(req.user);
    
    // For owners: if branch_id is provided in query, use that branch
    if (req.user?.role === 'owner' && branch_id) {
      const branchId = parseInt(branch_id, 10);
      if (!Number.isNaN(branchId)) {
        try {
          const { data: branchData, error: branchError } = await supabase
            .from('branches')
            .select('id, name')
            .eq('id', branchId)
            .single();
          
          if (!branchError && branchData) {
            branchContext = {
              branchId: branchData.id,
              branchName: branchData.name,
              normalizedName: branchData.name.toUpperCase().trim()
            };
          }
        } catch (err) {
          console.warn('⚠️ Error resolving branch for owner:', err.message);
        }
      }
    }

    // Call optimized RPC function (single database call)
    const { data: analyticsData, error: rpcError } = await supabase.rpc('get_analytics_dashboard', {
      p_branch_id: branchContext?.branchId || null,
      p_branch_name: branchContext?.branchName || null,
      p_start_date: null, // Will default to start of current month
      p_end_date: null    // Will default to current timestamp
    });

    if (rpcError) {
      console.error('❌ RPC error:', rpcError);
      // Fallback to empty data structure
      const emptyData = {
        salesOverTime: { monthly: [], yearly: [] },
        salesByBranch: [],
        orderStatus: {
          completed: { count: 0, percentage: 0 },
          processing: { count: 0, percentage: 0 },
          pending: { count: 0, percentage: 0 },
          cancelled: { count: 0, percentage: 0 },
          total: 0
        },
        topProducts: [],
        topCategories: [],
        summary: {
          totalRevenue: 0,
          totalOrders: 0,
          totalCustomers: 0,
          averageOrderValue: 0
        },
        recentOrders: []
      };

      return res.json({
        success: true,
        data: emptyData,
        warning: `Analytics RPC error: ${rpcError.message}`
      });
    }

    // Transform RPC response to match expected format
    const processedData = {
      salesOverTime: {
        monthly: analyticsData.monthlySales || [],
        yearly: analyticsData.yearlySales || []
      },
      salesByBranch: analyticsData.salesByBranch || [],
      orderStatus: analyticsData.orderStatus || {
        completed: { count: 0, percentage: 0 },
        processing: { count: 0, percentage: 0 },
        pending: { count: 0, percentage: 0 },
        cancelled: { count: 0, percentage: 0 },
        total: 0
      },
      topProducts: analyticsData.topProducts || [],
      topCategories: analyticsData.topCategories || [],
      summary: analyticsData.summary || {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrderValue: 0
      },
      recentOrders: analyticsData.recentOrders || []
    };

    // Get top products and categories using separate RPCs (if not included in main RPC)
    if (!analyticsData.topProducts || analyticsData.topProducts.length === 0) {
      const { data: topProducts } = await supabase.rpc('get_top_products', {
        p_limit: 10,
        p_branch_id: branchContext?.branchId || null,
        p_branch_name: branchContext?.branchName || null
      });
      if (topProducts) {
        processedData.topProducts = topProducts;
      }
    }

    if (!analyticsData.topCategories || analyticsData.topCategories.length === 0) {
      const { data: topCategories } = await supabase.rpc('get_top_categories', {
        p_limit: 10,
        p_branch_id: branchContext?.branchId || null,
        p_branch_name: branchContext?.branchName || null
      });
      if (topCategories) {
        processedData.topCategories = topCategories;
      }
    }

    console.log('✅ Analytics data fetched using optimized RPC');
    
    return res.json({
      success: true,
      data: processedData
    });
  } catch (error) {
    console.error('❌ Dashboard analytics error:', error);
    
    // Return empty data structure to prevent dashboard crash
    const emptyData = {
      salesOverTime: { monthly: [], yearly: [] },
      salesByBranch: [],
      orderStatus: {
        completed: { count: 0, percentage: 0 },
        processing: { count: 0, percentage: 0 },
        pending: { count: 0, percentage: 0 },
        cancelled: { count: 0, percentage: 0 },
        total: 0
      },
      topProducts: [],
      topCategories: [],
      summary: {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        averageOrderValue: 0
      },
      recentOrders: []
    };
    
    return res.status(500).json({
      success: false,
      data: emptyData,
      error: 'An unexpected error occurred while fetching analytics data.'
    });
  }
});

// Paginated recent orders endpoint
router.get('/recent-orders', async (req, res) => {
  try {
    const { limit = 50, offset = 0, branch_id } = req.query;
    
    let branchContext = resolveBranchContext(req.user);
    
    if (req.user?.role === 'owner' && branch_id) {
      const branchId = parseInt(branch_id, 10);
      if (!Number.isNaN(branchId)) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('id, name')
          .eq('id', branchId)
          .single();
        
        if (branchData) {
          branchContext = {
            branchId: branchData.id,
            branchName: branchData.name
          };
        }
      }
    }

    const { data: ordersData, error } = await supabase.rpc('get_recent_orders_paginated', {
      p_limit: parseInt(limit, 10),
      p_offset: parseInt(offset, 10),
      p_branch_id: branchContext?.branchId || null,
      p_branch_name: branchContext?.branchName || null
    });

    if (error) {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }

    return res.json({
      success: true,
      data: ordersData
    });
  } catch (error) {
    console.error('❌ Recent orders error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch recent orders'
    });
  }
});

module.exports = router;







