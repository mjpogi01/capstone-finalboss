const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DEFAULT_SELECT_FIELDS = `
  id,
  branch_id,
  customer_id,
  admin_id,
  subject,
  status,
  last_message_at,
  created_at,
  updated_at
`;

const enrichRoomsWithBranchInfo = async (rooms) => {
  if (!Array.isArray(rooms)) return [];
  if (rooms.length === 0) return [];

  const branchIds = [...new Set(rooms.map(room => room?.branch_id).filter(Boolean))];
  if (branchIds.length === 0) {
    return rooms.map(room => ({
      ...room,
      branch: null
    }));
  }

  try {
    const { data: branches, error } = await supabase
      .from('branches')
      .select('id, name, phone, email')
      .in('id', branchIds);

    if (error) {
      console.error('[Branch Chat] Error fetching branches:', error);
      return rooms.map(room => ({
        ...room,
        branch: null
      }));
    }

    const branchMap = new Map();
    (branches || []).forEach(branch => {
      if (branch?.id) {
        branchMap.set(branch.id, branch);
      }
    });

    return rooms.map(room => ({
      ...room,
      branch: branchMap.get(room.branch_id) || null
    }));
  } catch (error) {
    console.error('[Branch Chat] Unexpected error enriching branches:', error);
    return rooms.map(room => ({
      ...room,
      branch: null
    }));
  }
};

async function getRoomForUser(roomId, user) {
  const { data: room, error } = await supabase
    .from('branch_chat_rooms')
    .select('id, branch_id, customer_id, admin_id, status')
    .eq('id', roomId)
    .maybeSingle();

  if (error || !room) {
    const message = error?.message || 'Chat room not found';
    const status = error?.code === 'PGRST116' ? 404 : 404;
    const err = new Error(message);
    err.status = status;
    throw err;
  }

  const role = user?.role || 'customer';

  if (role === 'customer') {
    if (room.customer_id !== user.id) {
      const err = new Error('Access denied to this chat room');
      err.status = 403;
      throw err;
    }
  } else if (role === 'admin') {
    if (!user.branch_id || room.branch_id !== user.branch_id) {
      const err = new Error('Access denied to this branch chat');
      err.status = 403;
      throw err;
    }
  } else if (role === 'owner') {
    // Owners can access all rooms
  } else {
    const err = new Error('Role not permitted for branch chat');
    err.status = 403;
    throw err;
  }

  return room;
}

async function appendMessage({
  roomId,
  senderId,
  senderType,
  message,
  messageType = 'text',
  attachments = []
}) {
  const { data: inserted, error } = await supabase
    .from('branch_chat_messages')
    .insert({
      room_id: roomId,
      sender_id: senderId,
      sender_type: senderType,
      message,
      message_type: messageType,
      attachments
    })
    .select()
    .single();

  if (error) {
    const err = new Error(error.message || 'Failed to send message');
    err.status = 500;
    throw err;
  }

  const updatePayload = {
    last_message_at: inserted.created_at,
    status: 'open'
  };

  if (senderType === 'admin') {
    updatePayload.admin_id = senderId;
  }

  await supabase
    .from('branch_chat_rooms')
    .update(updatePayload)
    .eq('id', roomId);

  return inserted;
}

router.post('/rooms', authenticateSupabaseToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { branchId, subject, initialMessage } = req.body;

    if (!branchId) {
      return res.status(400).json({ error: 'branchId is required' });
    }

    const { data: branch, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('id', branchId)
      .maybeSingle();

    if (branchError || !branch) {
      return res.status(404).json({ error: 'Branch not found' });
    }

    const { data: existingRoom } = await supabase
      .from('branch_chat_rooms')
      .select('*')
      .eq('branch_id', branchId)
      .eq('customer_id', userId)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    let room = existingRoom;
    let isNew = false;

    if (!room) {
      const { data: createdRoom, error: createError } = await supabase
        .from('branch_chat_rooms')
        .insert({
          branch_id: branchId,
          customer_id: userId,
          subject: subject || `Support inquiry for ${branch.name}`,
          last_message_at: new Date().toISOString()
        })
        .select(DEFAULT_SELECT_FIELDS)
        .single();

      if (createError) {
        return res.status(500).json({ error: createError.message });
      }

      room = createdRoom;
      isNew = true;
    }

    let firstMessage = null;

    if (initialMessage && initialMessage.trim().length > 0) {
      firstMessage = await appendMessage({
        roomId: room.id,
        senderId: userId,
        senderType: 'customer',
        message: initialMessage.trim(),
        messageType: 'text'
      });

      const { data: refreshedRoom } = await supabase
        .from('branch_chat_rooms')
        .select(DEFAULT_SELECT_FIELDS)
        .eq('id', room.id)
        .single();

      if (refreshedRoom) {
        room = refreshedRoom;
      }
    }

    const [roomWithBranch] = await enrichRoomsWithBranchInfo([room]);

    res.json({
      room: roomWithBranch || room,
      branch,
      isNew,
      initialMessage: firstMessage
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to open chat room' });
  }
});

router.get('/rooms/customer', authenticateSupabaseToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('branch_chat_rooms')
      .select(`${DEFAULT_SELECT_FIELDS}`)
      .eq('customer_id', req.user.id)
      .order('last_message_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const roomsWithBranches = await enrichRoomsWithBranchInfo(data || []);

    res.json({ rooms: roomsWithBranches });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load branch chats' });
  }
});

router.get('/rooms/admin', authenticateSupabaseToken, async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Admin or owner access required' });
    }

    const statusFilter = req.query.status;
    const branchFilter = req.query.branchId ? parseInt(req.query.branchId, 10) : null;

    console.log('[Branch Chat Admin] Request filters:', { 
      role, 
      statusFilter, 
      branchFilter, 
      queryParams: req.query 
    });

    const query = supabase
      .from('branch_chat_rooms')
      .select(`${DEFAULT_SELECT_FIELDS}`)
      .order('last_message_at', { ascending: false });

    if (role === 'admin') {
      if (!req.user.branch_id) {
        return res.status(400).json({ error: 'Admin account is not linked to a branch' });
      }
      query.eq('branch_id', req.user.branch_id);
      console.log('[Branch Chat Admin] Filtering by admin branch_id:', req.user.branch_id);
    } else if (branchFilter) {
      query.eq('branch_id', branchFilter);
      console.log('[Branch Chat Admin] Filtering by branch_id:', branchFilter);
    } else {
      console.log('[Branch Chat Admin] No branch filter (owner viewing all branches)');
    }

    if (statusFilter) {
      query.eq('status', statusFilter);
      console.log('[Branch Chat Admin] Filtering by status:', statusFilter);
    } else {
      console.log('[Branch Chat Admin] No status filter (showing all statuses)');
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Branch Chat Admin] Query error:', error);
      return res.status(500).json({ error: error.message });
    }

    const rooms = await enrichRoomsWithBranchInfo(data || []);

    console.log(`[Branch Chat Admin] Query returned ${rooms.length} rooms`);

    // Fetch customer names from user_profiles and auth.users
    // Note: customer_id in branch_chat_rooms = user_id in user_profiles = id in auth.users
    if (rooms && rooms.length > 0) {
      const customerIds = [...new Set(rooms.map(room => room.customer_id).filter(Boolean))];
      
      console.log(`[Branch Chat] Fetching names for ${customerIds.length} customers`);
      
      if (customerIds.length > 0) {
        const profileMap = new Map();
        
        // Try 1: Get from user_profiles table (where user_id = customer_id)
        try {
          const { data: profiles, error: profilesError } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .in('user_id', customerIds);

          if (profilesError) {
            console.error('[Branch Chat] Error fetching user_profiles:', profilesError);
          } else if (profiles && profiles.length > 0) {
            console.log(`[Branch Chat] Found ${profiles.length} profiles in user_profiles`);
            profiles.forEach(p => {
              if (p.full_name) {
                profileMap.set(p.user_id, p.full_name);
                console.log(`[Branch Chat] Mapped ${p.user_id} -> ${p.full_name} (from user_profiles)`);
              }
            });
          } else {
            console.log('[Branch Chat] No profiles found in user_profiles');
          }
        } catch (profileErr) {
          console.error('[Branch Chat] Exception fetching user_profiles:', profileErr);
        }
        
        // Try 1.5: Get customer names from orders.delivery_address.receiver (for customers without profiles)
        const stillMissingIds = customerIds.filter(id => !profileMap.has(id));
        if (stillMissingIds.length > 0) {
          try {
            console.log(`[Branch Chat] Checking orders for ${stillMissingIds.length} missing customer names`);
            // Get the most recent order per customer that has a delivery address
            const { data: orders, error: ordersError } = await supabase
              .from('orders')
              .select('user_id, delivery_address, created_at')
              .in('user_id', stillMissingIds)
              .not('delivery_address', 'is', null)
              .order('created_at', { ascending: false })
              .limit(1000); // Limit to avoid huge queries
            
            if (!ordersError && orders && orders.length > 0) {
              console.log(`[Branch Chat] Found ${orders.length} orders with delivery addresses`);
              // Use a Map to track which users we've already processed (to get most recent order per user)
              const processedUsers = new Set();
              orders.forEach(order => {
                if (!profileMap.has(order.user_id) && !processedUsers.has(order.user_id) && order.delivery_address) {
                  // Try multiple possible fields in delivery_address
                  const receiver = order.delivery_address?.receiver || 
                                  order.delivery_address?.receiver_name ||
                                  order.delivery_address?.name ||
                                  order.delivery_address?.full_name ||
                                  order.delivery_address?.contact_name;
                  if (receiver && typeof receiver === 'string' && receiver.trim()) {
                    profileMap.set(order.user_id, receiver.trim());
                    processedUsers.add(order.user_id);
                    console.log(`[Branch Chat] Mapped ${order.user_id} -> ${receiver.trim()} (from orders.delivery_address)`);
                  }
                }
              });
            } else if (ordersError) {
              console.error('[Branch Chat] Error fetching orders:', ordersError);
            }
          } catch (ordersErr) {
            console.error('[Branch Chat] Exception fetching orders:', ordersErr);
          }
        }

        // Try 2: For customers without names, fetch from auth.users
        // Priority: full_name > first_name + last_name > username > display_name > email (as last resort)
        const missingIds = customerIds.filter(id => !profileMap.has(id));
        console.log(`[Branch Chat] Fetching ${missingIds.length} missing names from auth.users`);
        
        if (missingIds.length > 0) {
          try {
            await Promise.all(
              missingIds.map(async (userId) => {
                try {
                  const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
                  if (userError) {
                    console.warn(`[Branch Chat] Error fetching user ${userId}:`, userError.message);
                    return;
                  }
                  
                  if (!user) {
                    console.warn(`[Branch Chat] User ${userId} not found in auth.users`);
                    return;
                  }
                  
                  const metadata = user.user_metadata || user.raw_user_meta_data || {};
                  
                  // Priority 1: full_name from metadata
                  let customerName = metadata.full_name || null;
                  
                  // Priority 2: Combine first_name + last_name
                  if (!customerName) {
                    const firstName = metadata.first_name || '';
                    const lastName = metadata.last_name || '';
                    if (firstName && lastName) {
                      customerName = `${firstName} ${lastName}`.trim();
                    } else if (firstName) {
                      customerName = firstName.trim();
                    } else if (lastName) {
                      customerName = lastName.trim();
                    }
                  }
                  
                  // Priority 3: username or display_name
                  if (!customerName) {
                    customerName = metadata.username || metadata.display_name || metadata.name || null;
                  }
                  
                  // Priority 4: Extract name from email (e.g., "john.doe@email.com" -> "John Doe")
                  if (!customerName && user.email) {
                    const emailParts = user.email.split('@')[0];
                    // Try to extract name if email format is "firstname.lastname" or "firstname_lastname"
                    if (emailParts.includes('.') || emailParts.includes('_')) {
                      const separator = emailParts.includes('.') ? '.' : '_';
                      const parts = emailParts.split(separator);
                      if (parts.length >= 2) {
                        // Capitalize first letter of each part
                        customerName = parts.map(part => 
                          part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
                        ).join(' ');
                      }
                    }
                  }
                  
                  // Last resort: Use email (but format it nicely)
                  if (!customerName && user.email) {
                    // Extract the part before @ and capitalize it
                    const emailName = user.email.split('@')[0];
                    customerName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
                  }
                  
                  if (customerName) {
                    profileMap.set(userId, customerName);
                    console.log(`[Branch Chat] Mapped ${userId} -> ${customerName} (from auth.users)`);
                  } else {
                    console.warn(`[Branch Chat] Could not extract name for user ${userId}, email: ${user.email || 'N/A'}`);
                  }
                } catch (authError) {
                  console.error(`[Branch Chat] Exception fetching user ${userId}:`, authError);
                }
              })
            );
          } catch (authErr) {
            console.error('[Branch Chat] Exception in auth.users lookup:', authErr);
          }
        }
        
        // Add customer name to each room
        rooms.forEach(room => {
          const customerName = profileMap.get(room.customer_id);
          if (customerName) {
            room.customer_name = customerName;
            console.log(`[Branch Chat] Room ${room.id}: Set customer_name to "${customerName}"`);
          } else {
            room.customer_name = 'Customer';
            console.warn(`[Branch Chat] Room ${room.id}: No name found for customer ${room.customer_id}, using fallback`);
          }
        });
        
        console.log(`[Branch Chat] Name mapping complete. ${profileMap.size} of ${customerIds.length} customers have names`);
      }
    }

    res.json({ rooms });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to load branch chats' });
  }
});

router.get('/rooms/:roomId/messages', authenticateSupabaseToken, async (req, res) => {
  try {
    await getRoomForUser(req.params.roomId, req.user);

    const { data, error } = await supabase
      .from('branch_chat_messages')
      .select('*')
      .eq('room_id', req.params.roomId)
      .order('created_at', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json({ messages: data || [] });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to load messages' });
  }
});

router.post('/rooms/:roomId/messages', authenticateSupabaseToken, async (req, res) => {
  try {
    const { message, messageType, attachments } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message text is required' });
    }

    const room = await getRoomForUser(req.params.roomId, req.user);
    const role = req.user.role;
    const senderType = role === 'customer' ? 'customer' : 'admin';

    const inserted = await appendMessage({
      roomId: room.id,
      senderId: req.user.id,
      senderType,
      message: message.trim(),
      messageType: messageType || 'text',
      attachments: Array.isArray(attachments) ? attachments : []
    });

    res.json({ message: inserted });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to send message' });
  }
});

router.post('/rooms/:roomId/mark-read', authenticateSupabaseToken, async (req, res) => {
  try {
    await getRoomForUser(req.params.roomId, req.user);

    await supabase
      .from('branch_chat_messages')
      .update({ is_read: true })
      .eq('room_id', req.params.roomId)
      .neq('sender_id', req.user.id);

    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to mark messages as read' });
  }
});

router.post('/rooms/:roomId/close', authenticateSupabaseToken, async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== 'admin' && role !== 'owner') {
      return res.status(403).json({ error: 'Admin or owner access required' });
    }

    const room = await getRoomForUser(req.params.roomId, req.user);

    await supabase
      .from('branch_chat_rooms')
      .update({ status: 'closed' })
      .eq('id', room.id);

    res.json({ success: true });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ error: error.message || 'Failed to close chat room' });
  }
});

module.exports = router;


