const express = require('express');
const { supabase, query } = require('../lib/db');
const emailService = require('../lib/emailService');
const { authenticateSupabaseToken, requireAdminOrOwner } = require('../middleware/supabaseAuth');
const router = express.Router();

async function assignArtistTaskFallback({
  order,
  orderType,
  productName,
  quantity,
  requirements,
  productId,
  productImage
}) {
  const safeProductName = productName || 'Store Product';
  const safeQuantity = quantity || 1;
  let designRequirements = requirements || '';

  if (productImage && !designRequirements.includes(productImage)) {
    designRequirements = designRequirements
      ? `${designRequirements}\n\n🖼️ Product Reference Image: ${productImage}`
      : `🖼️ Product Reference Image: ${productImage}`;
  }

  try {
    const { data: artistProfile, error: artistError } = await supabase
      .from('artist_profiles')
      .select('id, artist_name')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (artistError && artistError.code !== 'PGRST116') {
      throw new Error(artistError.message || 'Failed to query active artists');
    }

    if (!artistProfile) {
      throw new Error('No active artists available for fallback assignment');
    }

    let priority = 'medium';
    let deadlineDays = 2;
    let orderSource = 'online';
    let taskTitle = `Layout Store Product: ${safeProductName}`;
    let taskDescription = `Prepare layout for store product. Quantity: ${safeQuantity}.`;
    const isCustomOrder = orderType === 'custom_design';

    if (orderType === 'custom_design') {
      deadlineDays = 3;
      taskTitle = `Custom Design: ${safeProductName}`;
      taskDescription = `Create custom design layout. Quantity: ${safeQuantity}.`;
    } else if (orderType === 'walk_in') {
      deadlineDays = 1;
      priority = 'high';
      orderSource = 'walk_in';
      taskTitle = `Walk-in Order: ${safeProductName}`;
      taskDescription = `Process walk-in order. Quantity: ${safeQuantity}.`;
    }

    const deadline = new Date(Date.now() + deadlineDays * 24 * 60 * 60 * 1000).toISOString();

    const { data: insertedTask, error: insertError } = await supabase
      .from('artist_tasks')
      .insert({
        artist_id: artistProfile.id,
        order_id: order?.id || null,
        product_id: productId || null,
        task_title: taskTitle,
        task_description: taskDescription,
        design_requirements: designRequirements || null,
        order_type: orderType || 'regular',
        is_custom_order: isCustomOrder,
        order_source: orderSource,
        priority,
        deadline,
        status: 'pending'
      })
      .select('id')
      .single();

    if (insertError) {
      throw new Error(insertError.message || 'Failed to insert fallback artist task');
    }

    return { taskId: insertedTask.id };
  } catch (error) {
    console.error('❌ Fallback artist task creation failed:', error);
    throw error;
  }
}

async function fetchArtistProfileById(artistId) {
  if (!artistId) return null;

  try {
    const { data, error } = await supabase
      .from('artist_profiles')
      .select('id, artist_name, is_active')
      .eq('id', artistId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('⚠️ Error fetching artist profile:', error);
      return null;
    }

    return data || null;
  } catch (err) {
    console.error('⚠️ Unexpected error fetching artist profile:', err);
    return null;
  }
}

// Test endpoint to verify server is working
router.get('/test', (req, res) => {
  console.log('🧪 Test endpoint called');
  res.json({ message: 'Server is working!', timestamp: new Date().toISOString() });
});

async function resolveAdminBranchContext(user) {
  if (!user || user.role !== 'admin') {
    return null;
  }

  const branchIdRaw = user.branch_id;
  if (!branchIdRaw && branchIdRaw !== 0) {
    const error = new Error('Admin account is missing branch assignment');
    error.statusCode = 403;
    throw error;
  }
 
  const branchId = parseInt(branchIdRaw, 10);
  if (Number.isNaN(branchId)) {
    const error = new Error('Admin account has invalid branch assignment');
    error.statusCode = 403;
    throw error;
  }

  let branchName = null;

  try {
    const { data: branchData, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', branchId)
      .single();

    if (!branchError && branchData?.name) {
      branchName = branchData.name;
    }
  } catch (err) {
    console.warn('⚠️ Unable to resolve branch name for admin:', err.message);
  }

  return { branchId, branchName, normalizedName: normalizeBranchValue(branchName) };
}

function orderMatchesBranch(order, branchContext) {
  if (!branchContext) {
    return true;
  }
 
  const { branchId, normalizedName } = branchContext;
  const normalizedBranchId = Number.isNaN(branchId) ? null : branchId;
  
  // Try to get branch ID from order (check multiple possible fields)
  const orderBranchId = order?.pickup_branch_id !== undefined && order?.pickup_branch_id !== null
    ? parseInt(order.pickup_branch_id, 10)
    : order?.branch_id !== undefined && order?.branch_id !== null
      ? parseInt(order.branch_id, 10)
      : null;
 
  // Match by ID if both are available
  const matchesId = normalizedBranchId !== null && orderBranchId !== null && orderBranchId === normalizedBranchId;
  
  // Match by name (this is the primary method since pickup_branch_id doesn't exist)
  const matchesName = normalizedName ? shouldMatchByName(branchContext, order) : false;
 
  // If we can't match by ID, rely on name matching
  return matchesId || matchesName;
}

function applyBranchFilter(queryBuilder, branchContext) {
  if (!branchContext || !branchContext.branchId) {
    return queryBuilder;
  }
 
  // Use pickup_location for filtering since pickup_branch_id doesn't exist in the database
  if (branchContext.branchName) {
    const escapedName = branchContext.branchName.replace(/"/g, '\\"').replace(/%/g, '\\%').replace(/_/g, '\\_');
    const pattern = `%${escapedName}%`;
    return queryBuilder.ilike('pickup_location', pattern);
  }
 
  // If we have branchId but no branchName, try to match by pickup_location
  // This is a fallback - ideally we'd have a branch_id column
  return queryBuilder;
}

function ensureOrderAccess(order, branchContext) {
  if (!orderMatchesBranch(order, branchContext)) {
    const error = new Error('Access denied for orders outside assigned branch');
    error.statusCode = 403;
    throw error;
  }
}

function normalizeBranchValue(value) {
  if (!value) {
    return null;
  }

  return value
    .toString()
    .toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/branch/g, ' ')
    .replace(/main/g, ' ')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}

function shouldMatchByName(branchContext, order) {
  if (!branchContext?.normalizedName) {
    return false;
  }

  const normalizedTargets = [
    order?.pickup_location,
    order?.branch_name,
    order?.managing_branch_name
  ]
    .filter(Boolean)
    .map(normalizeBranchValue)
    .filter(Boolean);

  if (normalizedTargets.length === 0) {
    return false;
  }

  return normalizedTargets.includes(branchContext.normalizedName);
}

// Supabase client and query helper are provided by ../lib/db

// Function to update sold_quantity for products in an order
async function updateSoldQuantityForOrder(orderItems) {
  try {
    console.log('📊 Updating sold quantity for order items:', orderItems);
    
    for (const item of orderItems) {
      if (item.id && item.quantity) {
        const quantityToAdd = parseInt(item.quantity) || 1;
        
        // Get current sold_quantity
        const { data: currentProduct, error: fetchError } = await supabase
          .from('products')
          .select('sold_quantity')
          .eq('id', item.id)
          .single();
        
        if (fetchError) {
          console.error(`Error fetching current sold quantity for product ${item.id}:`, fetchError);
          continue;
        }
        
        const currentSoldQuantity = currentProduct?.sold_quantity || 0;
        const newSoldQuantity = currentSoldQuantity + quantityToAdd;
        
        // Update sold_quantity
        const { error: updateError } = await supabase
          .from('products')
          .update({ 
            sold_quantity: newSoldQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', item.id);
        
        if (updateError) {
          console.error(`Error updating sold quantity for product ${item.id}:`, updateError);
        } else {
          console.log(`✅ Updated sold quantity for product ${item.id} from ${currentSoldQuantity} to ${newSoldQuantity}`);
        }
      }
    }
  } catch (error) {
    console.error('Error in updateSoldQuantityForOrder:', error);
    throw error;
  }
}

// Get all orders with filters
router.get('/', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const {
      dateSort,
      priceSort,
      quantitySort,
      pickupBranch,
      status,
      page = 1,
      limit = 100
    } = req.query;

    console.log(`📦 [Orders API] Fetching orders - page: ${page}, limit: ${limit}, branch: ${pickupBranch}, status: ${status}`);

    let branchContext = null;
    if (req.user.role === 'admin') {
      branchContext = await resolveAdminBranchContext(req.user);
    }

    // Check if any filter is applied
    // Build Supabase query
    let query = supabase
      .from('orders')
      .select('*');

    // Apply filters
    if (pickupBranch) {
      query = query.eq('pickup_location', pickupBranch);
    }

    if (status) {
      query = query.eq('status', status);
    }

    query = applyBranchFilter(query, branchContext);

    // Apply sorting
    if (dateSort === 'asc') {
      query = query.order('created_at', { ascending: true });
    } else if (dateSort === 'desc') {
      query = query.order('created_at', { ascending: false });
    } else if (priceSort === 'asc') {
      query = query.order('total_amount', { ascending: true });
    } else if (priceSort === 'desc') {
      query = query.order('total_amount', { ascending: false });
    } else if (quantitySort === 'asc') {
      query = query.order('total_items', { ascending: true });
    } else if (quantitySort === 'desc') {
      query = query.order('total_items', { ascending: false });
    } else {
      // Default sorting by date descending
      query = query.order('created_at', { ascending: false });
    }

    // Get total count BEFORE applying range
    let countQuery = supabase
      .from('orders')
      .select('*', { count: 'exact' });
    
    if (pickupBranch) {
      countQuery.eq('pickup_location', pickupBranch);
    }
    if (status) {
      countQuery.eq('status', status);
    }

    countQuery = applyBranchFilter(countQuery, branchContext);
    
    const { count: totalCount } = await countQuery;
    console.log(`📦 [Orders API] Total count from DB: ${totalCount}`);

    const enforcedLimit = Math.max(1, Math.min(parseInt(limit, 10) || 100, 500));
    const currentPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (currentPage - 1) * enforcedLimit;
    query = query.range(offset, offset + enforcedLimit - 1);
    console.log(`📦 [Orders API] Pagination applied - offset: ${offset}, limit: ${enforcedLimit}`);

    const { data: orders, error } = await query;

    if (error) {
      throw new Error(`Supabase error: ${error.message}`);
    }

    const filteredOrders = branchContext
      ? (orders || []).filter(order => orderMatchesBranch(order, branchContext))
      : (orders || []);

    const resolvedTotal = typeof totalCount === 'number' ? totalCount : filteredOrders.length;

    const buildStatsQuery = (applyFilters = true) => {
      let statsQuery = supabase
        .from('orders')
        .select('id', { count: 'exact', head: true });

      if (applyFilters && pickupBranch) {
        statsQuery = statsQuery.eq('pickup_location', pickupBranch);
      }

      if (applyFilters) {
        statsQuery = applyBranchFilter(statsQuery, branchContext);
      }
      return statsQuery;
    };

    const getCountForStatuses = async (statuses, applyFilters = true) => {
      let statsQuery = buildStatsQuery(applyFilters);
      if (Array.isArray(statuses) && statuses.length > 0) {
        if (statuses.length === 1) {
          statsQuery = statsQuery.eq('status', statuses[0]);
        } else {
          statsQuery = statsQuery.in('status', statuses);
        }
      }

      const { count, error: statsError } = await statsQuery;
      if (statsError) {
        throw new Error(`Supabase error: ${statsError.message}`);
      }
      return count || 0;
    };

    const [statsTotal, deliveredCount, inProgressCount, pendingCount, deliveredOverallCount] = await Promise.all([
      getCountForStatuses(),
      getCountForStatuses(['picked_up_delivered']),
      getCountForStatuses(['layout', 'sizing', 'printing', 'press', 'prod', 'packing_completing']),
      getCountForStatuses(['pending']),
      getCountForStatuses(['picked_up_delivered'], false)
    ]);

    let deliveredTotalsByBranch = {};
    try {
      const branchTotalsQuery = buildStatsQuery(false)
        .eq('status', 'picked_up_delivered')
        .select('pickup_location, count:id', { head: false })
        .group('pickup_location');

      const { data: branchTotalsData, error: branchTotalsError } = await branchTotalsQuery;
      if (!branchTotalsError && Array.isArray(branchTotalsData)) {
        deliveredTotalsByBranch = branchTotalsData.reduce((acc, row) => {
          if (row.pickup_location) {
            acc[row.pickup_location] = row.count || 0;
          }
          return acc;
        }, {});
      } else if (branchTotalsError) {
        console.warn('Unable to fetch delivered totals by branch:', branchTotalsError.message);
      }
    } catch (branchTotalsException) {
      console.warn('Failed to compute delivered totals by branch:', branchTotalsException.message);
    }

    console.log(`📦 [Orders API] Returning ${filteredOrders?.length} orders, total: ${resolvedTotal}`);

    // Get unique user IDs from orders
    const userIds = [...new Set(filteredOrders.map(order => order.user_id).filter(Boolean))];
    
    // Fetch user data for all unique user IDs with pagination
    let userData = {};
    if (userIds.length > 0) {
      try {
        // Fetch all users by paginating through all pages
        let allUsers = [];
        let page = 1;
        const perPage = 1000;
        let hasMore = true;
        
        while (hasMore) {
          const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
            page,
            perPage
          });
          
          if (usersError) {
            console.error(`Supabase error fetching users (page ${page}):`, usersError);
            break;
          }
          
          const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);
          
          if (users && Array.isArray(users) && users.length > 0) {
            allUsers = allUsers.concat(users);
            hasMore = users.length === perPage;
            page++;
          } else {
            hasMore = false;
          }
        }
        
        console.log(`📧 Fetched ${allUsers.length} total users for order email lookup`);
        
        // Build userData map from all fetched users
        allUsers.forEach(user => {
          const firstName = user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || '';
          const lastName = user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || '';
          const fullName = user.user_metadata?.full_name || user.raw_user_meta_data?.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
          
          userData[user.id] = {
            email: user.email,
            full_name: fullName || null
          };
        });
        
        console.log(`📧 Found user data for ${Object.keys(userData).length} users`);
      } catch (error) {
        console.warn('Could not fetch user data:', error.message);
      }
    }

    // Transform data to match expected format
    const transformedOrders = (filteredOrders || []).map(order => {
      // Extract customer info from user data or delivery address
      let customerName = 'Unknown Customer';
      let customerEmail = 'N/A';
      
      // For all orders, prioritize user account information
      const user = userData[order.user_id];
      if (user?.email) {
        customerEmail = user.email;
      }
      if (user?.full_name) {
        customerName = user.full_name;
      } else if (order.delivery_address?.receiver) {
        customerName = order.delivery_address.receiver;
      }
      
      // For custom design orders, if no user name is available, fall back to client info
      if (order.order_type === 'custom_design' && order.order_items && order.order_items.length > 0 && !user?.full_name) {
        const firstItem = order.order_items[0];
        if (firstItem.client_name) {
          customerName = firstItem.client_name;
        }
        if (firstItem.client_email) {
          customerEmail = firstItem.client_email;
        }
      }
      
      return {
        ...order,
        customer_email: customerEmail,
        customer_name: customerName
      };
    });

    res.json({
      orders: transformedOrders,
      pagination: {
        page: currentPage,
        limit: enforcedLimit,
        total: resolvedTotal || 0,
        totalPages: Math.max(1, Math.ceil((resolvedTotal || 0) / enforcedLimit))
      },
      stats: {
        total: statsTotal || 0,
        delivered: deliveredCount || 0,
        deliveredOverall: deliveredOverallCount || deliveredCount || 0,
        deliveredTotalsByBranch,
        inProgress: inProgressCount || 0,
        pending: pendingCount || 0
      }
    });

  } catch (error) {
    console.error('Error fetching orders:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: status === 403 ? error.message : 'Failed to fetch orders' });
  }
});

// Get single order by ID
// Access rules:
// - Admin/Owner: can view any order (with branch restrictions for admins)
// - Artist: can view orders they are assigned to
router.get('/:id', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user.role;

    // Check if user has required role
    if (!['admin', 'owner', 'artist'].includes(userRole)) {
      return res.status(403).json({ error: 'Access denied. Admin, owner, or artist role required.' });
    }

    let branchContext = null;
    if (userRole === 'admin') {
      branchContext = await resolveAdminBranchContext(req.user);
    }

    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw new Error(`Supabase error: ${error.message}`);
    }

    // If artist, verify they are assigned to this order
    if (userRole === 'artist') {
      // Get artist profile id for this user
      const { data: profile, error: profileError } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', req.user.id)
        .single();

      if (profileError || !profile) {
        return res.status(403).json({ error: 'Artist profile not found' });
      }

      // Verify there is at least one task linking this artist to the order
      const { data: task, error: taskError } = await supabase
        .from('artist_tasks')
        .select('id')
        .eq('artist_id', profile.id)
        .eq('order_id', id)
        .limit(1)
        .maybeSingle();

      if (taskError || !task) {
        return res.status(403).json({ error: 'Access denied. You are not assigned to this order.' });
      }
    } else {
      // For admin/owner, apply branch restrictions
      ensureOrderAccess(order, branchContext);
    }

    // Fetch user data for this order - use getUserById for single order (more efficient)
    let userData = null;
    if (order.user_id) {
      try {
        // Use getUserById for single user lookup (more efficient than listing all users)
        const { data: user, error: userError } = await supabase.auth.admin.getUserById(order.user_id);
        if (!userError && user?.user) {
          const userObj = user.user;
          const firstName = userObj.user_metadata?.first_name || userObj.raw_user_meta_data?.first_name || '';
          const lastName = userObj.user_metadata?.last_name || userObj.raw_user_meta_data?.last_name || '';
          const fullName = userObj.user_metadata?.full_name || userObj.raw_user_meta_data?.full_name || (firstName && lastName ? `${firstName} ${lastName}` : firstName || lastName);
          
          userData = {
            email: userObj.email,
            full_name: fullName || null
          };
        } else if (userError) {
          console.warn('Could not fetch user data for order:', userError.message);
        }
      } catch (error) {
        console.warn('Could not fetch user data:', error.message);
      }
    }

    // Transform data to match expected format
    let customerName = 'Unknown Customer';
    let customerEmail = 'N/A';
    
    // For all orders, prioritize user account information
    if (userData?.email) {
      customerEmail = userData.email;
    }
    if (userData?.full_name) {
      customerName = userData.full_name;
    } else if (order.delivery_address?.receiver) {
      customerName = order.delivery_address.receiver;
    }
    
    // For custom design orders, if no user name is available, fall back to client info
    if (order.order_type === 'custom_design' && order.order_items && order.order_items.length > 0 && !userData?.full_name) {
      const firstItem = order.order_items[0];
      if (firstItem.client_name) {
        customerName = firstItem.client_name;
      }
      if (firstItem.client_email) {
        customerEmail = firstItem.client_email;
      }
    }
    
    const transformedOrder = {
      ...order,
      customer_email: customerEmail,
      customer_name: customerName
    };

    res.json(transformedOrder);

  } catch (error) {
    console.error('Error fetching order:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: status === 403 ? error.message : 'Failed to fetch order' });
  }
});

// Admin/Owner design review for custom design orders
router.patch('/:id/design-review', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body || {};

    if (!['approve', 'revision_required'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Use approve or revision_required.' });
    }

    // Load order by ID or order_number without causing UUID cast errors
    let order = null;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

    if (isUuid) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, order_items, order_number')
        .eq('id', id)
        .maybeSingle();
      if (error) {
        console.warn('Design review: error fetching by UUID id:', id, 'error:', error);
      }
      order = data || null;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('id, status, order_items, order_number')
        .eq('order_number', id)
        .maybeSingle();
      if (error) {
        console.warn('Design review: error fetching by order_number:', id, 'error:', error);
      }
      order = data || null;
    }

    if (!order) {
      console.warn('Design review: order not found for identifier:', id);
      return res.status(404).json({ error: 'Order not found' });
    }

    // Find latest artist task for this order
    const { data: task, error: taskError } = await supabase
      .from('artist_tasks')
      .select('*')
    .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (taskError) {
      console.error('Error fetching artist task for review:', taskError);
    }

    if (!task) {
      return res.status(404).json({ error: 'No artist task found for this order' });
    }

    // Action handling
    if (action === 'revision_required') {
      // Send task back to in_progress, clear submitted_at, set revision notes
      const updates = [];
      updates.push(
        supabase
          .from('artist_tasks')
          .update({
            status: 'in_progress',
            revision_notes: notes || 'Revisions required by admin.',
            submitted_at: null,
            // preserve existing started_at to resume the original timer
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id)
      );

      // Move order back to layout stage
      updates.push(
        supabase
          .from('orders')
          .update({
            status: 'layout',
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id)
      );

      // Ensure any related design chat rooms are open for revision discussion
      updates.push(
        supabase
          .from('design_chat_rooms')
          .update({ status: 'open', updated_at: new Date().toISOString() })
          .eq('order_id', order.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed) {
        console.error('Error updating state for revision:', failed.error);
        return res.status(500).json({ error: 'Failed to set task to revision required' });
      }

      return res.json({ ok: true, task_status: 'in_progress', order_status: 'layout', chats_opened: true });
    }

    if (action === 'approve') {
      // Approve and proceed: mark artist task as completed and move order to sizing
      const updates = [];

      updates.push(
        supabase
          .from('artist_tasks')
          .update({
            status: 'completed',
            approved_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            admin_notes: notes || null,
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id)
      );

      updates.push(
        supabase
          .from('orders')
          .update({
            status: 'sizing',
            updated_at: new Date().toISOString()
          })
      .eq('id', order.id)
      );

      // Close all related design chat rooms for this order
      updates.push(
        supabase
          .from('design_chat_rooms')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('order_id', order.id)
      );

      const results = await Promise.all(updates);
      const failed = results.find(r => r.error);
      if (failed) {
        console.error('Error during approve flow:', failed.error);
        return res.status(500).json({ error: 'Failed to finalize approval' });
      }

      return res.json({ ok: true, task_status: 'completed', order_status: 'sizing', chats_closed: true });
    }
  } catch (error) {
    console.error('Design review error:', error);
    res.status(500).json({ error: 'Failed to process design review' });
  }
});

// Get revision notes for the latest artist task of an order (by UUID id or order_number)
router.get('/:id/revision-notes', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let order = null;
    if (isUuid) {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      order = data || null;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('id, order_number')
        .eq('order_number', id)
        .maybeSingle();
      if (error) throw error;
      order = data || null;
    }
    if (!order) {
      return res.status(404).json({ notes: [] });
    }
    const { data: task, error: taskError } = await supabase
      .from('artist_tasks')
      .select('id, revision_notes, updated_at')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (taskError) throw taskError;
    const notes = task?.revision_notes
      ? [{ message: task.revision_notes, createdAt: task.updated_at, taskId: task.id }]
      : [];
    return res.json({ notes });
  } catch (error) {
    console.error('Error fetching revision notes:', error);
    return res.status(500).json({ notes: [] });
  }
});

// Set/replace revision notes for the latest artist task on an order
router.post('/:id/revision-notes', authenticateSupabaseToken, requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'message is required' });
    }
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
    let order = null;
    if (isUuid) {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      order = data || null;
    } else {
      const { data, error } = await supabase
        .from('orders')
        .select('id')
        .eq('order_number', id)
        .maybeSingle();
      if (error) throw error;
      order = data || null;
    }
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const { data: task, error: taskError } = await supabase
      .from('artist_tasks')
      .select('id')
      .eq('order_id', order.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (taskError) throw taskError;
    if (!task) {
      return res.status(404).json({ error: 'No artist task found for this order' });
    }
    const { error: updateError } = await supabase
      .from('artist_tasks')
      .update({ revision_notes: message.trim(), updated_at: new Date().toISOString() })
      .eq('id', task.id);
    if (updateError) throw updateError;
    return res.json({
      note: { message: message.trim(), taskId: task.id, createdAt: new Date().toISOString() }
    });
  } catch (error) {
    console.error('Error updating revision notes:', error);
    return res.status(500).json({ error: 'Failed to update revision notes' });
  }
});

// Update order status
router.patch('/:id/status', authenticateSupabaseToken, async (req, res) => {
  console.log('🚀 STATUS UPDATE ROUTE CALLED');
  console.log('🚀 Request params:', req.params);
  console.log('🚀 Request body:', req.body);
  
  try {
    const { id } = req.params;
    const { status, skipEmail = false } = req.body;

    // Updated to support new production stage statuses
    const validStatuses = [
      'pending', 'confirmed', 'layout', 'sizing', 'printing', 
      'press', 'prod', 'packing_completing', 'picked_up_delivered', 
      'cancelled'
    ];
    
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses: validStatuses
      });
    }

    const userRole = req.user.role;
    const isAdminOrOwner = ['admin', 'owner'].includes(userRole);
    const branchContext = userRole === 'admin' ? await resolveAdminBranchContext(req.user) : null;

    console.log('👤 User making request:', { id: req.user.id, role: userRole });

    // Get current order data before update
    const { data: currentOrderData, error: currentError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    if (currentError || !currentOrderData) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Authorization check: Allow customers to cancel their own pending orders
    // Admin/Owner can change any status, customers can only cancel pending orders
    if (!isAdminOrOwner) {
      // Customer trying to update order status
      const isOrderOwner = currentOrderData.user_id === req.user.id;
      const isCancellingPending = status === 'cancelled' && currentOrderData.status === 'pending';
      
      if (!isOrderOwner || !isCancellingPending) {
        console.log('❌ Customer unauthorized status update attempt:', {
          isOrderOwner,
          isCancellingPending,
          currentStatus: currentOrderData.status,
          requestedStatus: status
        });
        return res.status(403).json({ 
          error: 'Admin or owner access required. Customers can only cancel their own pending orders.' 
        });
      }
      
      console.log('✅ Customer authorized to cancel their pending order');
    } else {
      // Admin/Owner: apply branch restrictions
      ensureOrderAccess(currentOrderData, branchContext);
    }

    // Get user data separately
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(currentOrderData.user_id);
    
    const currentOrder = {
      ...currentOrderData,
      customer_email: userData?.user?.email || null,
      customer_name: userData?.user?.user_metadata?.full_name || null
    };
    const previousStatus = currentOrder.status;

    // ADMIN/OWNER-ONLY LAYOUT CONTROL
    if (status === 'layout' && !isAdminOrOwner) {
      console.log('❌ Non-admin attempting to move to layout:', userRole);
      return res.status(403).json({
        error: 'Only admins or owners can move orders to layout status',
        requiredRole: 'admin or owner',
        currentRole: userRole
      });
    }

    // ARTIST-ONLY SIZING CONTROL
    if (status === 'sizing') {
      console.log('📏 SIZING STATUS VALIDATION');
      
      // Check if user is an artist
      if (userRole !== 'artist') {
        console.log('❌ Non-artist trying to move to sizing:', userRole);
        return res.status(403).json({ 
          error: 'Only artists can move orders to sizing status',
          requiredRole: 'artist',
          currentRole: userRole
        });
      }

      // Check if design files have been uploaded
      const hasDesignFiles = currentOrder.design_files && 
                            Array.isArray(currentOrder.design_files) && 
                            currentOrder.design_files.length > 0;
      
      if (!hasDesignFiles) {
        console.log('❌ No design files uploaded for sizing');
        return res.status(400).json({ 
          error: 'Design files must be uploaded before moving to sizing status',
          currentStatus: previousStatus,
          requiredAction: 'Upload design files first'
        });
      }

      // Check if order is in layout status (prerequisite)
      if (previousStatus !== 'layout') {
        console.log('❌ Order not in layout status:', previousStatus);
        return res.status(400).json({ 
          error: 'Order must be in layout status before moving to sizing',
          currentStatus: previousStatus,
          requiredStatus: 'layout'
        });
      }

      console.log('✅ Artist sizing validation passed');
    }

    // Update order status
    const { data: updatedOrderData, error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: status, 
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError || !updatedOrderData) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updatedOrder = updatedOrderData;

    // Debug: Log all status changes
    console.log(`🔄 Order ${updatedOrder.order_number} status changed: ${previousStatus} → ${status}`);

    // If moving back from sizing to layout => treat as admin-requested revisions
    if (previousStatus === 'sizing' && status === 'layout') {
      try {
        // Find latest artist task for this order
        const { data: latestTask, error: latestTaskError } = await supabase
          .from('artist_tasks')
          .select('id')
          .eq('order_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!latestTaskError && latestTask?.id) {
          const { error: taskUpdateErr } = await supabase
            .from('artist_tasks')
            .update({
              status: 'in_progress',
              revision_notes: 'Admin requested revisions (order moved back to layout).',
              submitted_at: null,
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', latestTask.id);

          if (taskUpdateErr) {
            console.warn('⚠️ Failed to update artist task for revisions:', taskUpdateErr.message);
          }
        }

        // Re-open related design chat rooms for collaboration
        const { error: chatUpdateErr } = await supabase
          .from('design_chat_rooms')
          .update({ status: 'active', updated_at: new Date().toISOString() })
          .eq('order_id', id);
        if (chatUpdateErr) {
          console.warn('⚠️ Failed to reopen chat rooms on revision:', chatUpdateErr.message);
        }
      } catch (e) {
        console.warn('⚠️ Revision handling error (sizing -> layout):', e.message);
      }
    }

    // Assign artist task when order moves to 'layout' status
    if (status === 'layout' && previousStatus !== 'layout') {
      // Enforce admin/owner control at this point as well (defensive)
      if (!isAdminOrOwner) {
        console.log('❌ Non-admin attempting to trigger layout assignment logic:', userRole);
        return res.status(403).json({
          error: 'Only admins or owners can initiate layout stage',
          requiredRole: 'admin or owner',
          currentRole: userRole
        });
      }

      // Validation: Check if at least one active artist exists
      try {
        const { data: activeArtists, error: artistCheckError } = await supabase
          .from('artist_profiles')
          .select('id')
          .eq('is_active', true)
          .limit(1);

        if (artistCheckError) {
          console.error('❌ Error checking for active artists:', artistCheckError);
          return res.status(500).json({
            error: 'Failed to validate artist availability',
            details: artistCheckError.message,
            artistAssignmentError: true
          });
        }

        if (!activeArtists || activeArtists.length === 0) {
          console.error('❌ No active artists available for assignment');
          return res.status(400).json({
            error: 'Cannot assign task: No active artists available',
            details: 'Please ensure at least one artist profile is active before moving orders to layout status',
            artistAssignmentError: true
          });
        }
      } catch (validationError) {
        console.error('❌ Error validating artist availability:', validationError);
        return res.status(500).json({
          error: 'Failed to validate artist availability',
          details: validationError.message,
          artistAssignmentError: true
        });
      }

      // Check for duplicate task assignment
      let existingTask = null;
      try {
        const { data: existingTasks, error: duplicateCheckError } = await supabase
          .from('artist_tasks')
          .select('id, artist_id, status, created_at')
          .eq('order_id', currentOrder.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (duplicateCheckError && duplicateCheckError.code !== 'PGRST116') {
          console.error('❌ Error checking for existing tasks:', duplicateCheckError);
        } else if (existingTasks) {
          existingTask = existingTasks;
          console.log(`⚠️ Existing task found for order ${updatedOrder.order_number}: ${existingTask.id}`);
        }
      } catch (duplicateError) {
        console.error('❌ Error checking for duplicate tasks:', duplicateError);
      }

      // If task already exists, return it instead of creating a new one
      if (existingTask) {
        console.log(`✅ Using existing task ${existingTask.id} for order ${updatedOrder.order_number}`);
        
        // Still create chat room if it doesn't exist
        try {
          const { data: existingRoom } = await supabase
            .from('design_chat_rooms')
            .select('id')
            .eq('order_id', currentOrder.id)
            .limit(1)
            .maybeSingle();

          if (!existingRoom && existingTask.artist_id) {
            const { data: chatRoom, error: roomError } = await supabase
              .from('design_chat_rooms')
              .insert({
                order_id: currentOrder.id,
                customer_id: currentOrder.user_id,
                artist_id: existingTask.artist_id,
                task_id: existingTask.id,
                room_name: `Order ${updatedOrder.order_number} Chat`
              })
              .select()
              .single();

            if (roomError) {
              console.error('❌ Error creating chat room:', roomError);
            } else {
              console.log(`✅ Chat room created for existing task: ${chatRoom.id}`);
            }
          }
        } catch (chatError) {
          console.error('❌ Error in chat room creation:', chatError);
        }

        // Return success with existing task info
        return res.json({
          ...updatedOrder,
          artistTask: {
            id: existingTask.id,
            artist_id: existingTask.artist_id,
            status: existingTask.status,
            isExisting: true
          },
          artistAssignmentWarning: 'Task already exists for this order'
        });
      }

      try {
        console.log(`🎨 Assigning artist task for order ${updatedOrder.order_number}`);
        console.log(`🎨 Order ID: ${currentOrder.id}`);
        console.log(`🎨 Order Type: ${currentOrder.order_type || 'regular'}`);
        console.log(`🎨 Order Items:`, JSON.stringify(currentOrder.order_items, null, 2));
        
        // Determine order type and assign appropriate task
        // Use order_type field instead of parsing order_number
        const orderType = currentOrder.order_type || 'regular';
        let taskId = null;
        let assignmentError = null;
        
        const firstItem = Array.isArray(currentOrder.order_items) && currentOrder.order_items.length > 0
          ? currentOrder.order_items[0]
          : null;
        const defaultProductName = firstItem?.name || firstItem?.product_name || 'Store Product';
        const defaultProductId = firstItem?.id || firstItem?.product_id || null;
        const defaultQuantity = currentOrder.total_items || firstItem?.quantity || 1;
        const productImage = firstItem?.image || firstItem?.main_image || null;
        let fallbackContext = {
          productName: defaultProductName,
          quantity: defaultQuantity,
          requirements: currentOrder.order_notes || null,
          productId: defaultProductId,
          productImage
        };

        if (orderType === 'custom_design') {
          // Custom design order
          const { data: customTaskData, error: customError } = await supabase.rpc('assign_custom_design_task', {
            p_order_id: currentOrder.id,
            p_product_name: currentOrder.order_items?.[0]?.name || 'Custom Design',
            p_quantity: currentOrder.total_items || 1,
            p_customer_requirements: currentOrder.order_notes || null,
            p_priority: 'medium',
            p_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
            p_product_id: currentOrder.order_items?.[0]?.id || null
          });
          
          if (customError) {
            console.error('❌ Error assigning custom design task:', customError);
            console.error('❌ Custom task error details:', JSON.stringify(customError, null, 2));
            assignmentError = {
              type: 'custom_design',
              message: customError.message || 'Failed to assign custom design task',
              details: customError
            };
          } else {
            taskId = customTaskData;
            console.log(`✅ Custom design task assigned: ${taskId}`);
          }

          fallbackContext = {
            productName: currentOrder.order_items?.[0]?.name || 'Custom Design',
            quantity: currentOrder.total_items || 1,
            requirements: currentOrder.order_notes || null,
            productId: currentOrder.order_items?.[0]?.id || null,
            productImage
          };
        } else if (orderType === 'walk_in') {
          // Walk-in order (using order_type field instead of parsing order_number)
          const { data: walkInTaskData, error: walkInError } = await supabase.rpc('assign_walk_in_order_task', {
            p_product_name: currentOrder.order_items?.[0]?.name || 'Walk-in Product',
            p_quantity: currentOrder.total_items || 1,
            p_customer_requirements: currentOrder.order_notes || null,
            p_priority: 'high',
            p_deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day from now
            p_order_id: currentOrder.id,
            p_product_id: currentOrder.order_items?.[0]?.id || null
          });
          
          if (walkInError) {
            console.error('❌ Error assigning walk-in order task:', walkInError);
            console.error('❌ Walk-in task error details:', JSON.stringify(walkInError, null, 2));
            assignmentError = {
              type: 'walk_in',
              message: walkInError.message || 'Failed to assign walk-in order task',
              details: walkInError
            };
          } else {
            taskId = walkInTaskData;
            console.log(`✅ Walk-in order task assigned: ${taskId}`);
          }

          fallbackContext = {
            productName: firstItem?.name || 'Walk-in Product',
            quantity: currentOrder.total_items || 1,
            requirements: currentOrder.order_notes || null,
            productId: firstItem?.id || null,
            productImage
          };
        } else {
          // Regular order (store products)
          let customerRequirements = currentOrder.order_notes || '';
          
          // Add product image to requirements if available
          if (productImage) {
            customerRequirements = customerRequirements 
              ? `${customerRequirements}\n\n📸 Product Image: ${productImage}`
              : `📸 Product Image: ${productImage}`;
          }
          
          const { data: regularTaskData, error: regularError } = await supabase.rpc('assign_regular_order_task', {
            p_product_name: firstItem?.name || 'Store Product',
            p_quantity: currentOrder.total_items || 1,
            p_customer_requirements: customerRequirements || null,
            p_priority: 'medium',
            p_deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
            p_order_id: currentOrder.id,
            p_product_id: firstItem?.id || null,
            p_order_source: 'online'
          });
          
          if (regularError) {
            console.error('❌ Error assigning regular order task:', regularError);
            console.error('❌ Regular task error details:', JSON.stringify(regularError, null, 2));
            assignmentError = {
              type: 'regular',
              message: regularError.message || 'Failed to assign regular order task',
              details: regularError
            };
          } else {
            taskId = regularTaskData;
            console.log(`✅ Regular order task assigned: ${taskId}`);
            
            // If task was created successfully and we have an image, update the task with image reference
            if (taskId && productImage) {
              try {
                // Update the task's design_requirements and product_thumbnail to include the image
                const { data: existingTask } = await supabase
                  .from('artist_tasks')
                  .select('design_requirements')
                  .eq('id', taskId)
                  .single();
                
                if (existingTask) {
                  const updatedRequirements = existingTask.design_requirements 
                    ? `${existingTask.design_requirements}\n\n🖼️ Product Reference Image: ${productImage}`
                    : `🖼️ Product Reference Image: ${productImage}`;
                  
                  // Update both design_requirements and product_thumbnail
                  await supabase
                    .from('artist_tasks')
                    .update({ 
                      design_requirements: updatedRequirements,
                      product_thumbnail: productImage
                    })
                    .eq('id', taskId);
                  
                  console.log(`✅ Added product image to task ${taskId}`);
                }
              } catch (updateError) {
                console.error('⚠️ Could not update task with image (non-critical):', updateError);
              }
            }
          }

          fallbackContext = {
            productName: firstItem?.name || 'Store Product',
            quantity: currentOrder.total_items || 1,
            requirements: customerRequirements || null,
            productId: firstItem?.id || null,
            productImage
          };
        }

        if (!taskId) {
          try {
            console.log('⚠️ Primary artist assignment failed, attempting fallback assignment...');
            const fallbackResult = await assignArtistTaskFallback({
              order: currentOrder,
              orderType,
              productName: fallbackContext.productName,
              quantity: fallbackContext.quantity,
              requirements: fallbackContext.requirements,
              productId: fallbackContext.productId,
              productImage: fallbackContext.productImage
            });

            if (fallbackResult?.taskId) {
              taskId = fallbackResult.taskId;
              assignmentError = null;
              console.log(`✅ Fallback artist task assigned: ${taskId}`);
            }
          } catch (fallbackError) {
            console.error('❌ Fallback artist assignment error:', fallbackError);
            if (!assignmentError) {
              assignmentError = {
                type: 'fallback',
                message: fallbackError.message || 'Fallback artist assignment failed',
                details: fallbackError
              };
            }
          }
        }
        
        // Handle assignment result
        if (taskId) {
          console.log(`🎨 Artist task successfully assigned for order ${updatedOrder.order_number}`);

          // Fetch artist information for the response
          let artistInfo = null;
          try {
            const { data: assignedTask, error: taskFetchError } = await supabase
              .from('artist_tasks')
              .select('artist_id')
              .eq('id', taskId)
              .single();

            if (!taskFetchError && assignedTask?.artist_id) {
              const profile = await fetchArtistProfileById(assignedTask.artist_id);
              
              if (profile) {
                artistInfo = {
                  id: profile.id || assignedTask.artist_id,
                  artist_name: profile.artist_name || 'Assigned Artist',
                  is_active: profile.is_active
                };
                console.log(`✅ Artist found: ${artistInfo.artist_name}`);
              }

              // Create chat room automatically when task is assigned (admin/owner initiated)
              const { data: existingRoom, error: existingRoomError } = await supabase
                .from('design_chat_rooms')
                .select('id')
                .eq('order_id', currentOrder.id)
                .limit(1)
                .maybeSingle();

              if (existingRoomError && existingRoomError.code === 'PGRST116') {
                console.warn(`⚠️ Multiple chat rooms already exist for order ${currentOrder.id}. Skipping creation.`);
              } else if (!existingRoom) {
                const { data: chatRoom, error: roomError } = await supabase
                  .from('design_chat_rooms')
                  .insert({
                    order_id: currentOrder.id,
                    customer_id: currentOrder.user_id,
                    artist_id: assignedTask.artist_id,
                    task_id: taskId,
                    room_name: `Order ${updatedOrder.order_number} Chat`
                  })
                  .select()
                  .single();

                if (roomError) {
                  console.error('❌ Error creating chat room:', roomError);
                } else {
                  console.log(`✅ Chat room created automatically: ${chatRoom.id}`);
                }
              } else {
                console.log(`✅ Chat room already exists: ${existingRoom.id}`);
              }
            }
          } catch (chatError) {
            console.error('❌ Error in chat room creation after layout assignment:', chatError);
          }

          // Return success with task info, artist info, and any chat room errors (non-critical)
          return res.json({
            ...updatedOrder,
            artistTask: {
              id: taskId,
              orderType: orderType
            },
            artistInfo: artistInfo,
            chatRoomError: null,
            artistAssignmentSuccess: true
          });
        } else {
          // Assignment failed - return error to frontend
          console.warn(`⚠️ Failed to assign artist task for order ${updatedOrder.order_number}`);
          
          const errorMessage = assignmentError?.message || 'Failed to assign artist task. No active artists may be available.';
          
          return res.status(400).json({
            ...updatedOrder,
            error: 'Artist task assignment failed',
            artistAssignmentError: true,
            assignmentError: assignmentError || {
              message: errorMessage,
              type: 'unknown'
            },
            details: assignmentError?.details || 'Please ensure at least one active artist is available.'
          });
        }
        
      } catch (error) {
        console.error('❌ Error in artist task assignment:', error);
        // Return error to frontend instead of silently failing
        return res.status(500).json({
          ...updatedOrder,
          error: 'Artist task assignment failed',
          artistAssignmentError: true,
          assignmentError: {
            message: error.message || 'An unexpected error occurred during artist assignment',
            type: 'exception',
            details: error
          }
        });
      }
    }

    // Update sold_quantity when order is completed (picked_up_delivered)
    if (status === 'picked_up_delivered' && previousStatus !== 'picked_up_delivered') {
      try {
        await updateSoldQuantityForOrder(currentOrder.order_items || []);
        console.log(`📊 Updated sold quantity for completed order ${updatedOrder.order_number}`);
      } catch (error) {
        console.error('Error updating sold quantity for completed order:', error);
        // Don't fail the status update if sold quantity update fails
      }
    }

    // Send email notification if not skipped and email is configured
    let emailResult = null;
    const canSendEmail = typeof emailService?._isClientReady === 'function'
      ? emailService._isClientReady()
      : false;

    if (!skipEmail && currentOrder.customer_email && canSendEmail) {
      try {
        emailResult = await emailService.sendOrderStatusUpdate(
          updatedOrder,
          currentOrder.customer_email,
          currentOrder.customer_name,
          status,
          previousStatus
        );
        console.log(`📧 Email sent for order ${updatedOrder.order_number} status update: ${status}`);
      } catch (emailError) {
        console.error('❌ Failed to send status update email:', emailError);
        // Don't fail the entire request if email fails
        emailResult = { success: false, error: emailError.message };
      }
    } else if (!skipEmail && currentOrder.customer_email && !canSendEmail) {
      console.warn('⚠️ Email service not ready, skipping status email for order:', updatedOrder.order_number);
    }

    res.json({
      ...updatedOrder,
      emailSent: emailResult ? emailResult.success : false,
      emailError: emailResult && !emailResult.success ? emailResult.error : null
    });

  } catch (error) {
    console.error('Error updating order status:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ error: status === 403 ? error.message : 'Failed to update order status' });
  }
});

// Create new order (for testing purposes)
router.post('/', async (req, res) => {
  try {
    const body = req.body || {};
    const userId = body.userId || body.user_id;
    const orderNumber = body.orderNumber || body.order_number;
    const shippingMethod = body.shippingMethod || body.shipping_method;
    const pickupLocation = body.pickupLocation || body.pickup_location;
    const pickupBranchId = body.pickupBranchId || body.pickup_branch_id || null;
    let deliveryAddress = body.deliveryAddress || body.delivery_address;
    // Parse delivery address if it's a string
    if (deliveryAddress && typeof deliveryAddress === 'string') {
      try {
        deliveryAddress = JSON.parse(deliveryAddress);
      } catch (e) {
        // If parsing fails, keep as is
      }
    }
    // Ensure delivery address has proper structure for analytics
    if (deliveryAddress && typeof deliveryAddress === 'object' && shippingMethod === 'cod') {
      deliveryAddress = {
        address: deliveryAddress.address || '',
        receiver: deliveryAddress.receiver || deliveryAddress.full_name || '',
        phone: deliveryAddress.phone || '',
        province: deliveryAddress.province || '',
        city: deliveryAddress.city || '',
        barangay: deliveryAddress.barangay || '',
        postalCode: deliveryAddress.postalCode || deliveryAddress.postal_code || '',
        streetAddress: deliveryAddress.streetAddress || deliveryAddress.street_address || ''
      };
    }
    
    const orderNotes = body.orderNotes || body.order_notes || null;
    const subtotalAmount = body.subtotalAmount || body.subtotal_amount || 0;
    const shippingCost = body.shippingCost || body.shipping_cost || 0;
    const totalAmount = body.totalAmount || body.total_amount || 0;
    const totalItems = body.totalItems || body.total_items || 0;
    let orderItems = body.orderItems || body.order_items || [];
    
    // Ensure order items have category field for analytics
    if (Array.isArray(orderItems) && orderItems.length > 0) {
      orderItems = await Promise.all(orderItems.map(async (item) => {
        // If category is missing, try to fetch it from product
        if (!item.category && item.id) {
          try {
            const { data: product } = await supabase
              .from('products')
              .select('category')
              .eq('id', item.id)
              .single();
            
            if (product?.category) {
              item.category = product.category;
            }
          } catch (err) {
            // If product not found or error, keep item as is
            console.warn('Could not fetch category for product:', item.id);
          }
        }
        return item;
      }));
    }

    // Generate order number if not provided
    const finalOrderNumber = orderNumber || `ORD-${Date.now()}`;

    let resolvedPickupLocation = pickupLocation;

    // Resolve pickup location from branch ID if not provided
    // This is needed for both pickup and COD orders (nearest branch for fulfillment)
    // For COD orders, pickup_location represents the branch where products will be prepared before shipping
    if (pickupBranchId && !resolvedPickupLocation) {
      try {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', pickupBranchId)
          .single();

        if (branchData?.name) {
          resolvedPickupLocation = branchData.name;
        }
      } catch (branchLookupError) {
        console.warn('⚠️ Could not resolve branch name:', branchLookupError.message);
      }
    }

    // Insert using Supabase client
    const { data: inserted, error: insertError } = await supabase
      .from('orders')
      .insert([
        {
          user_id: userId,
          order_number: finalOrderNumber,
          status: body.status || 'pending',
          shipping_method: shippingMethod,
          pickup_location: resolvedPickupLocation,
          // Note: pickup_branch_id column doesn't exist in the database, so we only use pickup_location
          delivery_address: deliveryAddress || null,
          order_notes: orderNotes,
          subtotal_amount: subtotalAmount,
          shipping_cost: shippingCost,
          total_amount: totalAmount,
          total_items: totalItems,
          order_items: orderItems
        }
      ])
      .select()
      .single();

    if (insertError || !inserted) {
      // Provide more details for debugging
      console.error('Insert order failed:', insertError);
      return res.status(500).json({ error: 'Failed to create order' });
    }

    const newOrder = inserted;

    // Note: sold_quantity will be updated when order status changes to 'picked_up_delivered'
    // This prevents double-counting when orders are created and then completed

    // Send order confirmation email if email is configured (non-blocking)
    // Don't await - let it run in background so it doesn't delay order response
    let emailPromise = null;
    if (process.env.EMAIL_USER && userId) {
      emailPromise = (async () => {
      try {
        // Get customer email via Supabase Auth Admin API
        const { data: userResp, error: userLookupError } = await supabase.auth.admin.getUserById(userId);
        if (!userLookupError && userResp?.user?.email) {
            const emailResult = await emailService.sendOrderConfirmation(
            newOrder,
            userResp.user.email,
            userResp.user.user_metadata?.full_name || null
          );
            if (emailResult.success) {
          console.log(`📧 Order confirmation email sent for order ${newOrder.order_number}`);
            } else {
              console.warn(`⚠️ Order confirmation email failed for order ${newOrder.order_number}:`, emailResult.error);
            }
        }
      } catch (emailError) {
          // Log error but don't throw - email failures shouldn't block orders
          const errorMsg = emailError.message || emailError.code || 'Unknown error';
          console.error(`❌ Failed to send order confirmation email for order ${newOrder.order_number}:`, errorMsg);
          // Log full error details only in development for debugging
          if (process.env.NODE_ENV === 'development') {
            console.error('Full email error:', emailError);
      }
    }
      })();
    }

    // Respond immediately with order - don't wait for email
    res.status(201).json({
      ...newOrder,
      emailSent: false, // Will be sent in background
      emailError: null
    });

  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

module.exports = router;
