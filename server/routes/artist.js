const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const STATUS_ORDER = [
  'pending',
  'confirmed',
  'layout',
  'sizing',
  'printing',
  'press',
  'prod',
  'packing_completing',
  'picked_up_delivered',
  'cancelled'
];

const STATUS_PRIORITY = STATUS_ORDER.reduce((map, status, index) => {
  map[status] = index;
  return map;
}, {});

const TARGET_STATUS = 'sizing';

const router = express.Router();

// Middleware to authenticate artist
const authenticateArtist = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const userRole = user.user_metadata?.role || 'customer';
    
    if (userRole !== 'artist') {
      return res.status(403).json({ error: 'Access denied. Artist role required.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Get artist profile
router.get('/profile', authenticateArtist, async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('artist_profiles')
      .select('*')
      .eq('user_id', req.user.id)
      .single();

    if (error) {
      console.error('Error fetching artist profile:', error);
      return res.status(500).json({ error: 'Failed to fetch artist profile' });
    }

    if (!profile) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    res.json(profile);
  } catch (error) {
    console.error('Error fetching artist profile:', error);
    res.status(500).json({ error: 'Failed to fetch artist profile' });
  }
});

// Update artist profile
router.put('/profile', authenticateArtist, async (req, res) => {
  try {
    const { artist_name, bio, specialties, commission_rate } = req.body;
    
    const { data, error } = await supabase
      .from('artist_profiles')
      .update({
        artist_name,
        bio,
        specialties,
        commission_rate,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating artist profile:', error);
      return res.status(500).json({ error: 'Failed to update artist profile' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error updating artist profile:', error);
    res.status(500).json({ error: 'Failed to update artist profile' });
  }
});

// Get artist metrics (dashboard cards)
router.get('/metrics', authenticateArtist, async (req, res) => {
  try {
    // Get artist profile first
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    // Get total tasks
    const { count: totalTasks, error: totalError } = await supabase
      .from('artist_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', profile.id);

    if (totalError) {
      console.error('Error fetching total tasks:', totalError);
    }

    // Get pending tasks
    const { count: pendingTasks, error: pendingError } = await supabase
      .from('artist_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', profile.id)
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending tasks:', pendingError);
    }

    // Get completed tasks (including submitted tasks)
    const { count: completedTasks, error: completedError } = await supabase
      .from('artist_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('artist_id', profile.id)
      .in('status', ['completed', 'submitted']);

    if (completedError) {
      console.error('Error fetching completed tasks:', completedError);
    }

    // Calculate average completion time (in hours) - including submitted tasks
    const { data: completedTasksData, error: avgTimeError } = await supabase
      .from('artist_tasks')
      .select('started_at, completed_at, assigned_at')
      .eq('artist_id', profile.id)
      .in('status', ['completed', 'submitted'])
      .not('completed_at', 'is', null);

    let averageCompletionTime = 0;
    if (!avgTimeError && completedTasksData && completedTasksData.length > 0) {
      const validTimes = completedTasksData
        .map(task => {
          const startTime = task.started_at || task.assigned_at;
          const endTime = task.completed_at;
          if (startTime && endTime) {
            const diffMs = new Date(endTime) - new Date(startTime);
            return diffMs / (1000 * 60 * 60); // Convert to hours
          }
          return null;
        })
        .filter(time => time !== null && time > 0);

      if (validTimes.length > 0) {
        const sum = validTimes.reduce((acc, time) => acc + time, 0);
        averageCompletionTime = Math.round((sum / validTimes.length) * 10) / 10; // Round to 1 decimal
      }
    }

    const metrics = {
      totalTasks: totalTasks || 0,
      pendingTasks: pendingTasks || 0,
      completedTasks: completedTasks || 0,
      averageCompletionTime
    };

    res.json(metrics);
  } catch (error) {
    console.error('Error fetching artist metrics:', error);
    res.status(500).json({ error: 'Failed to fetch artist metrics' });
  }
});

// Get artist workload data (for charts)
router.get('/workload', authenticateArtist, async (req, res) => {
  try {
    const { period = 'week' } = req.query;
    
    // Get artist profile first
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    // Calculate date range based on period
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get tasks grouped by date and status
    // Get all tasks for the artist, then filter in JavaScript to include:
    // - Tasks created in the period, OR
    // - Tasks submitted in the period (even if created earlier)
    const { data: allTasks, error: tasksError } = await supabase
      .from('artist_tasks')
      .select('created_at, status, submitted_at, updated_at')
      .eq('artist_id', profile.id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      console.error('Error fetching workload data:', tasksError);
      return res.status(500).json({ error: 'Failed to fetch workload data' });
    }

    // Filter and group tasks by date
    const workloadData = {};
    
    console.log(`[Workload] Processing ${allTasks.length} tasks for period: ${period}, startDate: ${startDate.toISOString()}`);
    
    allTasks.forEach(task => {
      // Determine which date to use for grouping
      let dateToUse;
      let dateToCheck;
      
      if (task.status === 'submitted' || task.status === 'completed') {
        // For submitted/completed tasks, prefer submitted_at, then updated_at, then created_at
        dateToUse = task.submitted_at || task.updated_at || task.created_at;
        dateToCheck = new Date(dateToUse);
        
        // Debug logging for submitted tasks
        if (task.status === 'submitted') {
          console.log(`[Workload] Submitted task found:`, {
            id: task.id || 'unknown',
            status: task.status,
            submitted_at: task.submitted_at,
            updated_at: task.updated_at,
            created_at: task.created_at,
            dateToUse: dateToUse,
            dateToCheck: dateToCheck.toISOString(),
            startDate: startDate.toISOString(),
            inRange: dateToCheck >= startDate
          });
        }
      } else {
        // For other statuses, use created_at
        dateToUse = task.created_at;
        dateToCheck = new Date(task.created_at);
      }
      
      // Only include if the relevant date is within the selected period
      if (dateToCheck >= startDate) {
        const date = dateToUse.split('T')[0];
        
        if (!workloadData[date]) {
          workloadData[date] = { pending: 0, in_progress: 0, completed: 0 };
        }
        
        // Map 'submitted' status to 'completed' for workload chart
        const status = task.status === 'submitted' ? 'completed' : task.status;
        
        // Only increment if status is valid
        if (status === 'pending' || status === 'in_progress' || status === 'completed') {
          workloadData[date][status]++;
        }
      }
    });
    
    console.log(`[Workload] Workload data:`, JSON.stringify(workloadData, null, 2));

    // Convert to array format
    const result = Object.entries(workloadData).map(([date, counts]) => ({
      date,
      ...counts
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching workload data:', error);
    res.status(500).json({ error: 'Failed to fetch workload data' });
  }
});

// Get artist tasks
router.get('/tasks', authenticateArtist, async (req, res) => {
  try {
    const { limit, status } = req.query;
    
    // Get artist profile first
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    let query = supabase
      .from('artist_tasks')
      .select(`
        *,
        started_at,
        orders (
          order_number,
          total_amount,
          order_items
        ),
        products (
          id,
          name,
          main_image,
          additional_images,
          category,
          price
        )
      `)
      .eq('artist_id', profile.id)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: tasks, error: tasksError } = await query;

    if (tasksError) {
      console.error('Error fetching artist tasks:', tasksError);
      return res.status(500).json({ error: 'Failed to fetch artist tasks' });
    }

    res.json(tasks || []);
  } catch (error) {
    console.error('Error fetching artist tasks:', error);
    res.status(500).json({ error: 'Failed to fetch artist tasks' });
  }
});

// Get order number for an order (artist can only access orders they're assigned to)
router.get('/order/:orderId/number', authenticateArtist, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get artist profile first
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: 'Artist profile not found' });
    }

    // Verify artist has access to this order (either through a task or chat room)
    const { data: task, error: taskError } = await supabase
      .from('artist_tasks')
      .select('order_id')
      .eq('artist_id', profile.id)
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle();

    const { data: chatRoom, error: chatError } = await supabase
      .from('design_chat_rooms')
      .select('order_id')
      .eq('artist_id', profile.id)
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle();

    // If artist has neither a task nor a chat room for this order, deny access
    if ((taskError && chatError) || (!task && !chatRoom)) {
      return res.status(403).json({ error: 'Access denied. You do not have access to this order.' });
    }

    // Fetch order number
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, status, total_amount, created_at')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      order_number: order.order_number || null,
      status: order.status || 'pending',
      total_amount: order.total_amount || 0,
      created_at: order.created_at || null
    });
  } catch (error) {
    console.error('Error fetching order number:', error);
    res.status(500).json({ error: 'Failed to fetch order number' });
  }
});

// Update task status
router.patch('/tasks/:taskId/status', authenticateArtist, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    // Verify task belongs to this artist
    const { data: task, error: taskError } = await supabase
      .from('artist_tasks')
      .select('artist_id, order_id')
      .eq('id', taskId)
      .single();

    if (taskError || !task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Get artist profile to verify ownership
    const { data: profile, error: profileError } = await supabase
      .from('artist_profiles')
      .select('id')
      .eq('user_id', req.user.id)
      .single();

    if (profileError || !profile || task.artist_id !== profile.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let orderData = null;
    let orderFetchError = null;

    if (task.order_id) {
      const { data: fetchedOrder, error: fetchedOrderError } = await supabase
        .from('orders')
        .select('id, status')
        .eq('id', task.order_id)
        .single();

      if (fetchedOrderError) {
        orderFetchError = fetchedOrderError;
        console.error('Error fetching order for task update:', fetchedOrderError);
      } else {
        orderData = fetchedOrder;
      }
    }

    if (status === 'in_progress') {
      if (orderFetchError || !orderData) {
        return res.status(400).json({
          error: 'Unable to verify order status. Please try again later.'
        });
      }

      // Allow starting task when order is in 'layout' status (when tasks are assigned)
      // or 'confirmed' status (for backward compatibility)
      if (orderData.status !== 'layout' && orderData.status !== 'confirmed') {
        return res.status(400).json({
          error: 'Order must be in layout or confirmed status before starting this task.',
          currentStatus: orderData.status
        });
      }
    }

    // Prepare update data
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };

    // Set started_at when status changes to 'in_progress' and it's not already set
    if (status === 'in_progress') {
      // Check if started_at is already set
      const { data: currentTask } = await supabase
        .from('artist_tasks')
        .select('started_at')
        .eq('id', taskId)
        .single();

      if (!currentTask?.started_at) {
        updateData.started_at = new Date().toISOString();
      }
    }

    // Set submitted_at when status changes to 'submitted' and it's not already set
    if (status === 'submitted') {
      // Check if submitted_at is already set
      const { data: currentTask } = await supabase
        .from('artist_tasks')
        .select('submitted_at')
        .eq('id', taskId)
        .single();

      if (!currentTask?.submitted_at) {
        updateData.submitted_at = new Date().toISOString();
      }
    }

    // Update task status
    const { data, error } = await supabase
      .from('artist_tasks')
      .update(updateData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) {
      console.error('Error updating task status:', error);
      return res.status(500).json({ error: 'Failed to update task status' });
    }

    // Removed auto-advance to sizing on submission; admin review will drive progression

    res.json(data);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
});

module.exports = router;
