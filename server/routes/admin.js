const express = require('express');
const { authenticateSupabaseToken, requireAdminOrOwner, requireOwner, requireBranchAccess } = require('../middleware/supabaseAuth');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { executeSql } = require('../lib/sqlClient');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Initialize Supabase client for admin operations
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const router = express.Router();

// Apply authentication to all admin routes
router.use(authenticateSupabaseToken);

// Get dashboard metrics (admin or owner)
router.get('/dashboard', requireAdminOrOwner, async (req, res) => {
  try {
    // Get basic metrics
    const metrics = {
      totalSales: 24810,
      totalCustomers: 105,
      totalOrders: 1500,
      // Add more metrics based on your business logic
    };

    res.json({ metrics });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get all branches (owner only)
router.get('/branches', requireOwner, async (req, res) => {
  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Supabase error fetching branches:', error);
      return res.status(500).json({ error: 'Failed to fetch branches' });
    }
    
    res.json({ branches });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Test endpoint to debug user structure (temporary)
router.get('/users/debug', requireOwner, async (req, res) => {
  try {
    const { data: users, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 10
    });
    
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    // Find an admin user
    const adminUser = users.users.find(u => {
      const role = u.user_metadata?.role || u.raw_user_meta_data?.role;
      return role === 'admin';
    });
    
    return res.json({
      total_users: users.users.length,
      sample_user_structure: users.users[0] ? {
        email: users.users[0].email,
        all_keys: Object.keys(users.users[0]),
        user_metadata: users.users[0].user_metadata,
        raw_user_meta_data: users.users[0].raw_user_meta_data,
        app_metadata: users.users[0].app_metadata
      } : null,
      admin_user_found: !!adminUser,
      admin_user_structure: adminUser ? {
        email: adminUser.email,
        all_keys: Object.keys(adminUser),
        user_metadata: adminUser.user_metadata,
        raw_user_meta_data: adminUser.raw_user_meta_data,
        app_metadata: adminUser.app_metadata
      } : null,
      all_users_roles: users.users.map(u => ({
        email: u.email,
        role: u.user_metadata?.role || u.raw_user_meta_data?.role || 'no-role',
        has_user_metadata: !!u.user_metadata,
        has_raw_metadata: !!u.raw_user_meta_data
      }))
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get all admin users (owner only)
router.get('/users', requireOwner, async (req, res) => {
  try {
    const admins = await fetchAdminUsersWithFallback();

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(admins);
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

async function fetchAdminUsersWithFallback() {
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  let hasMore = true;
  let fallbackNeeded = false;

  while (hasMore) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.error(`Supabase error fetching users (page ${page}):`, error);
      if (error.code === 'unexpected_failure' || error.message?.includes('Database error')) {
        fallbackNeeded = true;
      }
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

  if (fallbackNeeded || allUsers.length === 0) {
    console.log('⚠️ Falling back to direct SQL query for admin users');
    return fetchAdminUsersViaSql();
  }

  const adminUsers = allUsers.filter((user) => {
    const role = user.user_metadata?.role
      || user.raw_user_meta_data?.role
      || (user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata.role : null);
    return role === 'admin' || role === 'owner';
  });

  return Promise.all(
    adminUsers.map(async (user) => {
      let branchName = null;
      const branchId = user.user_metadata?.branch_id || user.raw_user_meta_data?.branch_id;
      if (branchId) {
        const { data: branchData } = await supabase
          .from('branches')
          .select('name')
          .eq('id', branchId)
          .maybeSingle();

        if (branchData?.name) {
          branchName = branchData.name;
        }
      }

      return {
        id: user.id,
        email: user.email,
        first_name: user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || null,
        last_name: user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || null,
        name: `${user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || ''} ${user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || ''}`.trim() || user.email,
        role: user.user_metadata?.role || user.raw_user_meta_data?.role || 'customer',
        branch_id: branchId || null,
        contact_number: user.user_metadata?.contact_number || user.raw_user_meta_data?.contact_number || null,
        branch_name: branchName,
        created_at: user.created_at
      };
    })
  );
}

async function fetchAdminUsersViaSql() {
  const result = await executeSql(`
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.raw_user_meta_data,
      (u.raw_user_meta_data->>'branch_id')::INT AS branch_id,
      b.name AS branch_name
    FROM auth.users u
    LEFT JOIN branches b ON (u.raw_user_meta_data->>'branch_id')::INT = b.id
    WHERE (u.raw_user_meta_data->>'role') IN ('admin', 'owner')
    ORDER BY u.created_at ASC;
  `);

  return result.rows.map((row) => {
    const metadata = row.raw_user_meta_data || {};
    const firstName = metadata.first_name || metadata.firstName || null;
    const lastName = metadata.last_name || metadata.lastName || null;

    return {
      id: row.id,
      email: row.email,
      first_name: firstName,
      last_name: lastName,
      name: `${firstName || ''} ${lastName || ''}`.trim() || row.email,
      role: metadata.role || 'customer',
      branch_id: row.branch_id || null,
      contact_number: metadata.contact_number || null,
      branch_name: row.branch_name || metadata.branch_name || null,
      created_at: row.created_at
    };
  });
}

async function fetchArtistUsersWithFallback() {
  let allUsers = [];
  let page = 1;
  const perPage = 1000;
  let hasMore = true;
  let fallbackNeeded = false;

  while (hasMore) {
    const { data: usersData, error } = await supabase.auth.admin.listUsers({
      page,
      perPage
    });

    if (error) {
      console.error(`Supabase error fetching artist users (page ${page}):`, error);
      if (error.code === 'unexpected_failure' || error.message?.includes('Database error')) {
        fallbackNeeded = true;
      }
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

  // Filter for artists from collected users
  const artistUsers = allUsers.filter((user) => {
    const role = user.user_metadata?.role
      || user.raw_user_meta_data?.role
      || (user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata.role : null);
    return role === 'artist';
  });

  if (fallbackNeeded || artistUsers.length === 0) {
    console.log('⚠️ Falling back to direct SQL query for artist users');
    return fetchArtistUsersViaSql();
  }

  return Promise.all(
    artistUsers.map(async (user) => {
      let artistProfile = null;
      let totalTasksAssigned = 0;
      try {
        const { data: profileData } = await supabase
          .from('artist_profiles')
          .select('id, artist_name, is_active, is_verified, total_tasks_completed, rating, commission_rate')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profileData) {
          artistProfile = profileData;

          const { count } = await supabase
            .from('artist_tasks')
            .select('*', { count: 'exact', head: true })
            .eq('artist_id', profileData.id);

          if (count !== null) {
            totalTasksAssigned = count;
          }
        }
      } catch (err) {
        console.error('Error fetching artist profile:', err);
      }

      return {
        id: user.id,
        email: user.email,
        artist_name: user.user_metadata?.artist_name || user.raw_user_meta_data?.artist_name || artistProfile?.artist_name || 'N/A',
        full_name: user.user_metadata?.full_name || user.raw_user_meta_data?.full_name || user.user_metadata?.artist_name || user.raw_user_meta_data?.artist_name || 'N/A',
        is_active: artistProfile?.is_active !== undefined ? artistProfile.is_active : true,
        is_verified: artistProfile?.is_verified || false,
        total_tasks_completed: artistProfile?.total_tasks_completed || 0,
        total_tasks_assigned: totalTasksAssigned,
        rating: artistProfile?.rating || 0,
        commission_rate: artistProfile?.commission_rate || 0,
        created_at: user.created_at
      };
    })
  );
}

async function fetchArtistUsersViaSql() {
  const result = await executeSql(`
    WITH task_counts AS (
      SELECT artist_id, COUNT(*) AS total_tasks
      FROM artist_tasks
      GROUP BY artist_id
    )
    SELECT
      u.id,
      u.email,
      u.created_at,
      u.raw_user_meta_data,
      ap.id AS profile_id,
      ap.artist_name,
      ap.is_active,
      ap.is_verified,
      ap.total_tasks_completed,
      ap.rating,
      ap.commission_rate,
      COALESCE(task_counts.total_tasks, 0) AS total_tasks_assigned
    FROM auth.users u
    LEFT JOIN artist_profiles ap ON ap.user_id = u.id
    LEFT JOIN task_counts ON task_counts.artist_id = ap.id
    WHERE (u.raw_user_meta_data->>'role') = 'artist'
    ORDER BY u.created_at ASC;
  `);

  return result.rows.map((row) => {
    const metadata = row.raw_user_meta_data || {};
    const fullName = metadata.full_name || metadata.artist_name || row.artist_name || 'N/A';

    return {
      id: row.id,
      email: row.email,
      artist_name: row.artist_name || metadata.artist_name || fullName,
      full_name: fullName,
      is_active: row.is_active !== null ? row.is_active : true,
      is_verified: row.is_verified || false,
      total_tasks_completed: row.total_tasks_completed || 0,
      total_tasks_assigned: row.total_tasks_assigned || 0,
      rating: row.rating || 0,
      commission_rate: row.commission_rate || 0,
      created_at: row.created_at
    };
  });
}

async function ensureArtistProfileRecord(userId) {
  const { data, error } = await supabase
    .from('artist_profiles')
    .select('id, user_id, artist_name, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching artist profile via Supabase:', error);
  }

  if (data) {
    return data;
  }

  console.log('⚠️ Artist profile missing, creating default profile for user:', userId);

  const userResult = await executeSql(
    'SELECT email, raw_user_meta_data FROM auth.users WHERE id = $1 LIMIT 1;',
    [userId]
  );

  if (!userResult.rows.length) {
    throw new Error('Artist user not found in auth.users');
  }

  const userRow = userResult.rows[0];
  const metadata = userRow.raw_user_meta_data || {};
  const fallbackName =
    metadata.artist_name ||
    metadata.full_name ||
    metadata.first_name ||
    (userRow.email ? userRow.email.split('@')[0] : 'Artist');

  const { data: insertedProfile, error: insertError } = await supabase
    .from('artist_profiles')
    .insert({
      user_id: userId,
      artist_name: fallbackName,
      bio: 'Professional design layout specialist',
      specialties: ['Layout Design', 'Custom Graphics', 'Team Jerseys'],
      commission_rate: 12.0,
      rating: 0,
      is_verified: false,
      is_active: true
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Failed to create missing artist profile:', insertError);
    throw new Error('Failed to create artist profile');
  }

  console.log('✅ Created missing artist profile for user:', userId);
  return insertedProfile;
}

// Create new admin user (owner only)
router.post('/users', requireOwner, async (req, res) => {
  try {
    const { name, password, contact_number, branch_id } = req.body;
    
    // This would typically use Supabase Admin API to create user
    // For now, return a mock response
    res.json({ 
      message: 'Admin user created successfully',
      user: { name, contact_number, branch_id }
    });
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// Delete admin user (owner only)
router.delete('/users/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Attempting to delete user with ID:', id);
    
    // Use Supabase Admin API to delete user
    const { data, error } = await supabase.auth.admin.deleteUser(id);
    
    if (error) {
      console.error('❌ Supabase error deleting user:', error);
      return res.status(500).json({ error: 'Failed to delete admin user' });
    }
    
    console.log('✅ User deleted successfully from Supabase');
    res.json({ message: 'Admin user deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting admin user:', error);
    res.status(500).json({ error: 'Failed to delete admin user' });
  }
});

// Get all customer accounts (admin or owner)
router.get('/customers', requireAdminOrOwner, async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const perPage = parseInt(req.query.perPage) || 50; // Default 50 per page
    const searchTerm = req.query.search || '';
    
    // Fetch all users to get accurate total count
    // We need to fetch all pages to get accurate count, but we'll optimize by:
    // 1. Fetching in batches
    // 2. Only processing what we need for display
    let allUsers = [];
    let currentPage = 1;
    const fetchPerPage = 1000;
    let hasMore = true;
    
    // Fetch all users (needed for accurate total count)
    while (hasMore) {
      const { data: usersData, error } = await supabase.auth.admin.listUsers({
        page: currentPage,
        perPage: fetchPerPage
      });
      
      if (error) {
        console.error(`Supabase error fetching users (page ${currentPage}):`, error);
        break;
      }
      
      const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);
      
      if (users && Array.isArray(users) && users.length > 0) {
        allUsers = allUsers.concat(users);
        hasMore = users.length === fetchPerPage;
        currentPage++;
      } else {
        hasMore = false;
      }
    }

    // Filter for customer users
    const customerUsers = allUsers.filter(user => {
      const role = user.user_metadata?.role
        || user.raw_user_meta_data?.role
        || (user.user_metadata && typeof user.user_metadata === 'object' ? user.user_metadata.role : null)
        || (user.raw_user_meta_data && typeof user.raw_user_meta_data === 'object' ? user.raw_user_meta_data.role : null);
      return role === 'customer';
    });
    
    console.log(`👥 Fetched ${allUsers.length} total users, found ${customerUsers.length} customers`);
    
    // Apply search filter if provided
    let filteredCustomers = customerUsers;
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filteredCustomers = customerUsers.filter(user => {
        const email = user.email?.toLowerCase() || '';
        const firstName = (
          user.user_metadata?.first_name ||
          user.raw_user_meta_data?.first_name ||
          user.user_metadata?.firstName ||
          user.raw_user_meta_data?.firstName
        );
        const lastName = (
          user.user_metadata?.last_name ||
          user.raw_user_meta_data?.last_name ||
          user.user_metadata?.lastName ||
          user.raw_user_meta_data?.lastName
        );
        const metaFullName = (
          user.user_metadata?.full_name ||
          user.raw_user_meta_data?.full_name ||
          user.user_metadata?.fullName ||
          user.raw_user_meta_data?.fullName
        );

        const normalizedFirst = firstName?.toLowerCase() || '';
        const normalizedLast = lastName?.toLowerCase() || '';
        const fullName = `${normalizedFirst} ${normalizedLast}`.trim();
        const normalizedFullName = metaFullName?.toLowerCase() || '';

        return (
          email.includes(searchLower) ||
          fullName.includes(searchLower) ||
          normalizedFullName.includes(searchLower)
        );
      });
    }
    
    // Get accurate total count from filtered customers
    const totalCustomers = filteredCustomers.length;

    // Get user IDs for batch profile lookup (only for customers we're displaying)
    // Note: We use filteredCustomers (before pagination) to get addresses for all customers on current page
    const userIds = filteredCustomers.map(user => user.id);
    console.log(`👥 Processing ${userIds.length} customers for address lookup`);
    
    // Fetch user profiles from user_profiles table (only for customers on current page)
    let userProfilesMap = {};
    if (userIds.length > 0) {
      // Supabase has a limit on IN clause, so batch if needed
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        const { data: profiles, error: profilesError } = await supabase
          .from('user_profiles')
          .select('user_id, full_name, phone, address')
          .in('user_id', batch);
        
        if (!profilesError && profiles) {
          profiles.forEach(profile => {
            userProfilesMap[profile.user_id] = profile;
          });
        } else if (profilesError) {
          console.warn(`⚠️ Error fetching user profiles batch ${Math.floor(i / batchSize) + 1}:`, profilesError.message);
        }
      }
      console.log(`✅ Fetched ${Object.keys(userProfilesMap).length} user profiles`);
    }
    
    // Fetch user addresses from user_addresses table (prefer default, fallback to any address)
    let userAddressesMap = {};
    if (userIds.length > 0) {
      const batchSize = 100;
      for (let i = 0; i < userIds.length; i += batchSize) {
        const batch = userIds.slice(i, i + batchSize);
        // First try to get default addresses
        const { data: defaultAddresses, error: defaultError } = await supabase
          .from('user_addresses')
          .select('user_id, address, is_default')
          .in('user_id', batch)
          .eq('is_default', true);
        
        if (!defaultError && defaultAddresses) {
          defaultAddresses.forEach(addr => {
            if (addr.address && addr.address.trim() !== '') {
              userAddressesMap[addr.user_id] = addr;
            }
          });
        }
        
        // For users without default addresses, get any address
        const usersWithoutDefault = batch.filter(id => !userAddressesMap[id]);
        if (usersWithoutDefault.length > 0) {
          const { data: anyAddresses, error: anyError } = await supabase
            .from('user_addresses')
            .select('user_id, address, is_default')
            .in('user_id', usersWithoutDefault)
            .order('is_default', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(usersWithoutDefault.length);
          
          if (!anyError && anyAddresses) {
            anyAddresses.forEach(addr => {
              // Only add if we don't have an address for this user yet and address is not empty
              if (!userAddressesMap[addr.user_id] && addr.address && addr.address.trim() !== '') {
                userAddressesMap[addr.user_id] = addr;
              }
            });
          }
        }
      }
      console.log(`✅ Fetched ${Object.keys(userAddressesMap).length} user addresses`);
    }
    
    // Fetch addresses from most recent orders (for customers without addresses in user_addresses)
    let orderAddressesMap = {};
    let orderCustomerNamesMap = {};
    const usersWithoutAddress = userIds.filter(id => !userAddressesMap[id]);
    if (usersWithoutAddress.length > 0) {
      console.log(`🔍 Looking for addresses in orders for ${usersWithoutAddress.length} users without addresses`);
      const batchSize = 50; // Smaller batch for orders query
      for (let i = 0; i < usersWithoutAddress.length; i += batchSize) {
        const batch = usersWithoutAddress.slice(i, i + batchSize);
        // Get most recent order with delivery address for each user
        // Use a different approach to filter out null delivery_address
        const { data: orders, error: ordersError } = await supabase
          .from('orders')
          .select('user_id, delivery_address, order_items, created_at')
          .in('user_id', batch)
          .order('created_at', { ascending: false });
        
        if (!ordersError && orders) {
          // Filter out orders with null delivery_address
          const ordersWithAddress = orders.filter(order => order.delivery_address != null);
          console.log(`📦 Found ${ordersWithAddress.length} orders with delivery_address (out of ${orders.length} total) for batch ${Math.floor(i / batchSize) + 1}`);
          // Group by user_id and take the most recent order for each user
          const userOrderMap = {};
          ordersWithAddress.forEach(order => {
            if (!userOrderMap[order.user_id]) {
              userOrderMap[order.user_id] = order;
            }
          });
          
          // Extract addresses from delivery_address
          Object.keys(userOrderMap).forEach(userId => {
            const order = userOrderMap[userId];
            let deliveryAddr = order.delivery_address;
            
            // Debug: log the structure
            if (i === 0 && Object.keys(userOrderMap).indexOf(userId) === 0) {
              console.log('🔍 Sample delivery_address structure:', JSON.stringify(deliveryAddr, null, 2));
            }
            
            // Parse if delivery address is a JSON string
            if (typeof deliveryAddr === 'string') {
              try {
                deliveryAddr = JSON.parse(deliveryAddr);
              } catch (e) {
                // If parsing fails, use as string
                if (deliveryAddr && deliveryAddr.trim() !== '') {
                  orderAddressesMap[userId] = { address: deliveryAddr.trim() };
                }
                return;
              }
            }
            
            // Extract address from delivery_address object
            if (deliveryAddr && typeof deliveryAddr === 'object') {
              // Check for address field first (this is what generate script uses)
              if (deliveryAddr.address && typeof deliveryAddr.address === 'string' && deliveryAddr.address.trim() !== '') {
                orderAddressesMap[userId] = { address: deliveryAddr.address.trim() };
              } 
              // Check for streetAddress (camelCase) or street_address (snake_case) or street
              else if ((deliveryAddr.streetAddress || deliveryAddr.street_address || deliveryAddr.street) && deliveryAddr.city) {
                // Build address from components - check both camelCase and snake_case
                const street = deliveryAddr.streetAddress || deliveryAddr.street_address || deliveryAddr.street || '';
                const barangay = deliveryAddr.barangay || '';
                const city = deliveryAddr.city || '';
                const province = deliveryAddr.province || '';
                const postalCode = deliveryAddr.postalCode || deliveryAddr.postal_code || '';
                
                const parts = [street, barangay, city, province, postalCode].filter(Boolean);
                if (parts.length > 0) {
                  orderAddressesMap[userId] = { address: parts.join(', ') };
                }
              }
              // If we still don't have an address, log it for debugging (only for first user in first batch)
              else if (i === 0 && Object.keys(userOrderMap).indexOf(userId) === 0) {
                console.log('⚠️ Could not extract address from delivery_address. Keys:', Object.keys(deliveryAddr));
                console.log('⚠️ Sample delivery_address:', JSON.stringify(deliveryAddr, null, 2));
              }
            } else if (deliveryAddr && typeof deliveryAddr !== 'string') {
              // If it's not a string and not an object, log it
              if (i === 0 && Object.keys(userOrderMap).indexOf(userId) === 0) {
                console.log('⚠️ Unexpected delivery_address type:', typeof deliveryAddr, deliveryAddr);
              }
            }

            // Capture customer name from delivery address or order items
            let derivedCustomerName = null;
            if (deliveryAddr && typeof deliveryAddr === 'object') {
              if (deliveryAddr.receiver && typeof deliveryAddr.receiver === 'string') {
                derivedCustomerName = deliveryAddr.receiver.trim();
              }
            }
            if (!derivedCustomerName && Array.isArray(order.order_items) && order.order_items.length > 0) {
              const firstItem = order.order_items[0];
              if (firstItem?.client_name && typeof firstItem.client_name === 'string') {
                derivedCustomerName = firstItem.client_name.trim();
              }
            }
            if (derivedCustomerName) {
              orderCustomerNamesMap[userId] = derivedCustomerName;
            }
          });
        } else if (ordersError) {
          console.warn(`⚠️ Error fetching order addresses batch ${Math.floor(i / batchSize) + 1}:`, ordersError.message);
        } else {
          console.log(`ℹ️ No orders found for batch ${Math.floor(i / batchSize) + 1}`);
        }
      }
      console.log(`✅ Fetched ${Object.keys(orderAddressesMap).length} addresses from orders`);
    }

    // Format customer data with priority: user_profiles > user_metadata
    // Process all customers first, then filter and paginate
    const allFormattedCustomers = filteredCustomers.map(user => {
      const profile = userProfilesMap[user.id];
      const userAddress = userAddressesMap[user.id];
      const orderAddress = orderAddressesMap[user.id];
      const orderCustomerName = orderCustomerNamesMap[user.id];
      
      // Get name: priority is profile full name > metadata full name > combined first/last > order-derived name > email
      const metaFullName = user.user_metadata?.full_name || user.raw_user_meta_data?.full_name;
      const firstName = profile?.first_name || user.user_metadata?.first_name || user.raw_user_meta_data?.first_name || '';
      const lastName = profile?.last_name || user.user_metadata?.last_name || user.raw_user_meta_data?.last_name || '';
      let name = profile?.full_name
        || metaFullName
        || `${firstName} ${lastName}`.trim()
        || orderCustomerName
        || null;

      if (!name || name.trim() === '') {
        name = user.email || 'N/A';
      }
      
      // Get contact number: priority is user_profiles.phone > user_metadata.phone > user_metadata.contact_number
      // Check if phone is not null, not undefined, and not empty string
      let contact_number = null;
      if (profile?.phone && profile.phone.trim() !== '') {
        contact_number = profile.phone.trim();
      } else if (user.user_metadata?.phone && user.user_metadata.phone.trim() !== '') {
        contact_number = user.user_metadata.phone.trim();
      } else if (user.raw_user_meta_data?.phone && user.raw_user_meta_data.phone.trim() !== '') {
        contact_number = user.raw_user_meta_data.phone.trim();
      } else if (user.user_metadata?.contact_number && user.user_metadata.contact_number.trim() !== '') {
        contact_number = user.user_metadata.contact_number.trim();
      } else if (user.raw_user_meta_data?.contact_number && user.raw_user_meta_data.contact_number.trim() !== '') {
        contact_number = user.raw_user_meta_data.contact_number.trim();
      }
      
      // Get address: priority is user_addresses.address > orders.delivery_address > user_profiles.address > user_metadata.address
      let address = null;
      if (userAddress?.address && userAddress.address.trim() !== '') {
        address = userAddress.address.trim();
      } else if (orderAddress?.address && orderAddress.address.trim() !== '') {
        address = orderAddress.address.trim();
      } else if (profile?.address && profile.address.trim() !== '') {
        address = profile.address.trim();
      } else if (user.user_metadata?.address && user.user_metadata.address.trim() !== '') {
        address = user.user_metadata.address.trim();
      } else if (user.raw_user_meta_data?.address && user.raw_user_meta_data.address.trim() !== '') {
        address = user.raw_user_meta_data.address.trim();
      }
      
      // Debug: Log first customer's address sources (only for first customer)
      if (filteredCustomers.indexOf(user) === 0) {
        console.log('🔍 Address lookup for user:', user.id);
        console.log('  - userAddress:', userAddress?.address || 'N/A');
        console.log('  - orderAddress:', orderAddress?.address || 'N/A');
        console.log('  - profile.address:', profile?.address || 'N/A');
        console.log('  - Final address:', address || 'N/A');
      }
      
      return {
        id: user.id,
        email: user.email,
        name: name,
        contact_number: contact_number,
        address: address,
        created_at: user.created_at
      };
    });

    // Apply pagination
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedCustomers = allFormattedCustomers.slice(startIndex, endIndex);
    const totalPages = Math.ceil(totalCustomers / perPage);

    console.log(`📤 Sending paginated customers: Page ${page}/${totalPages}, Showing ${paginatedCustomers.length} of ${totalCustomers} customers`);
    
    // Debug: Log sample customers to see contact numbers
    if (paginatedCustomers.length > 0) {
      const customersWithPhone = paginatedCustomers.filter(c => c.contact_number);
      const customersWithoutPhone = paginatedCustomers.filter(c => !c.contact_number);
      console.log(`📞 Customers with phone: ${customersWithPhone.length}, without phone: ${customersWithoutPhone.length}`);
    }
    
    // Add cache-busting headers
    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    
    // Return paginated results with metadata
    res.json({
      customers: paginatedCustomers,
      pagination: {
        page,
        perPage,
        total: totalCustomers,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('❌ Error fetching customers:', error);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Failed to fetch customers', details: error.message });
  }
});

// Delete customer account (admin or owner)
router.delete('/customers/:id', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Attempting to delete customer with ID:', id);
    
    // Use Supabase Admin API to delete user
    const { data, error } = await supabase.auth.admin.deleteUser(id);
    
    console.log('🔍 Supabase delete response:', { data, error });
    
    if (error) {
      console.error('❌ Supabase error deleting customer:', error);
      return res.status(500).json({ error: 'Failed to delete customer account' });
    }
    
    console.log('✅ Customer deleted successfully from Supabase');
    
    // Verify the user is actually deleted
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('❌ Error listing users after delete:', listError);
    } else {
      const userStillExists = users.users.find(u => u.id === id);
      console.log('🔍 User still exists after delete:', !!userStillExists);
      if (userStillExists) {
        console.log('❌ PROBLEM: User still exists after delete!');
      } else {
        console.log('✅ CONFIRMED: User successfully deleted');
      }
    }
    
    res.json({ message: 'Customer account deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting customer:', error);
    res.status(500).json({ error: 'Failed to delete customer account' });
  }
});

// Get all artist accounts (admin or owner)
router.get('/artists', requireAdminOrOwner, async (req, res) => {
  try {
    const artists = await fetchArtistUsersWithFallback();

    res.set({
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });

    res.json(artists);
  } catch (error) {
    console.error('Error fetching artists:', error);
    res.status(500).json({ error: 'Failed to fetch artists' });
  }
});

// Update artist information (owner only)
router.put('/artists/:id', requireOwner, async (req, res) => {
  try {
    const { id } = req.params;
    const { artist_name, email } = req.body;
    
    console.log('🔄 Updating artist with ID:', id);
    console.log('📝 New data:', { artist_name, email });
    
    // Validate required fields
    if (!artist_name || !email) {
      return res.status(400).json({ error: 'Artist name and email are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email is already taken by another user
    const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('Error checking existing users:', listError);
      return res.status(500).json({ error: 'Failed to check existing users' });
    }
    
    const emailTaken = existingUsers.users.find(user => 
      user.email === email && user.id !== id
    );
    
    if (emailTaken) {
      return res.status(400).json({ error: 'Email is already taken by another user' });
    }
    
    // Update user email in Supabase Auth
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(id, {
      email: email
    });
    
    if (updateError) {
      console.error('Error updating user email:', updateError);
      return res.status(500).json({ error: 'Failed to update user email' });
    }
    
    // Update artist profile in database
    const { data: profileData, error: profileError } = await supabase
      .from('artist_profiles')
      .update({ artist_name: artist_name })
      .eq('user_id', id)
      .select()
      .single();
    
    if (profileError) {
      console.error('Error updating artist profile:', profileError);
      return res.status(500).json({ error: 'Failed to update artist profile' });
    }
    
    console.log('✅ Artist updated successfully');
    res.json({ 
      message: 'Artist information updated successfully',
      data: {
        id: id,
        artist_name: artist_name,
        email: email
      }
    });
    
  } catch (error) {
    console.error('Error updating artist:', error);
    res.status(500).json({ error: 'Failed to update artist information' });
  }
});

// Toggle artist active status (owner or artist themselves)
router.patch('/artists/:id/toggle-status', authenticateSupabaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;
    const user = req.user;
    const userRole = user?.user_metadata?.role || user?.raw_user_meta_data?.role;
    const isOwner = userRole === 'owner';
    const isAdmin = userRole === 'admin';
    
    console.log('🔄 Toggling artist status:', { id, is_active, userRole, userId: user?.id });
    
    if (typeof is_active !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean value' });
    }
    
    // Ensure artist profile exists (create if missing)
    const profileData = await ensureArtistProfileRecord(id);
    
    // Check permissions: owner/admin can toggle any artist, artist can only toggle themselves
    if (!isOwner && !isAdmin) {
      if (user?.id !== id) {
        return res.status(403).json({ error: 'You can only toggle your own status' });
      }
    }
    
    // Update is_active status
    const { data: updatedProfile, error: updateError } = await supabase
      .from('artist_profiles')
      .update({ is_active: is_active })
      .eq('id', profileData.id)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error updating artist status:', updateError);
      return res.status(500).json({ error: 'Failed to update artist status' });
    }
    
    console.log('✅ Artist status updated successfully');
    res.json({ 
      message: `Artist status updated to ${is_active ? 'active' : 'inactive'}`,
      data: {
        id: id,
        artist_name: updatedProfile.artist_name,
        is_active: is_active
      }
    });
    
  } catch (error) {
    console.error('Error toggling artist status:', error);
    res.status(500).json({ error: 'Failed to toggle artist status' });
  }
});

// Delete artist account (admin or owner)
router.delete('/artists/:id', requireAdminOrOwner, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🗑️ Attempting to delete artist with ID:', id);
    
    // Use Supabase Admin API to delete user
    const { data, error } = await supabase.auth.admin.deleteUser(id);
    
    console.log('🔍 Supabase delete response:', { data, error });
    
    if (error) {
      console.error('❌ Supabase error deleting artist:', error);
      return res.status(500).json({ error: 'Failed to delete artist account' });
    }
    
    console.log('✅ Artist deleted successfully from Supabase');
    
    res.json({ message: 'Artist account deleted successfully' });
  } catch (error) {
    console.error('❌ Error deleting artist:', error);
    res.status(500).json({ error: 'Failed to delete artist account' });
  }
});


// Get current user info
router.get('/me', (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
