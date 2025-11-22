const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const router = express.Router();
const { authenticateSupabaseToken } = require('../middleware/supabaseAuth');
require('dotenv').config();

// Create Supabase client with service role key to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Create chat room
router.post('/create-room', async (req, res) => {
  try {
    const { order_id, customer_id, artist_id, room_name } = req.body;

    // Check if room already exists
    const { data: existingRoom, error: checkError } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .eq('order_id', order_id)
      .single();

    if (existingRoom) {
      return res.json({ room_id: existingRoom.id });
    }

    // Create new room
    const { data, error } = await supabase
      .from('design_chat_rooms')
      .insert({
        order_id,
        customer_id,
        artist_id,
        room_name
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chat room:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ room_id: data.id });
  } catch (error) {
    console.error('Error in create-room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Send message
router.post('/send-message', async (req, res) => {
  try {
    const { room_id, sender_id, sender_type, message, message_type, attachments } = req.body;

    const { data, error } = await supabase
      .from('design_chat_messages')
      .insert({
        room_id,
        sender_id,
        sender_type,
        message,
        message_type: message_type || 'text',
        attachments: attachments || []
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ message_id: data.id });
  } catch (error) {
    console.error('Error in send-message:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat room messages
router.get('/messages/:roomId', async (req, res) => {
  try {
    const { roomId } = req.params;

    const { data, error } = await supabase
      .from('design_chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error getting messages:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ messages: data || [] });
  } catch (error) {
    console.error('Error in get-messages:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer chat rooms
router.get('/customer-rooms/:customerId', async (req, res) => {
  try {
    const { customerId } = req.params;

    const { data, error } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('customer_id', customerId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error getting customer rooms:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ rooms: data || [] });
  } catch (error) {
    console.error('Error in get-customer-rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get artist chat rooms
router.get('/artist-rooms/:artistId', async (req, res) => {
  try {
    const { artistId } = req.params;

    const { data, error } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('artist_id', artistId)
      .order('last_message_at', { ascending: false });

    if (error) {
      console.error('Error getting artist rooms:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ rooms: data || [] });
  } catch (error) {
    console.error('Error in get-artist-rooms:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark messages as read
router.post('/mark-read', async (req, res) => {
  try {
    const { room_id, user_id } = req.body;

    const { error } = await supabase
      .from('design_chat_messages')
      .update({ is_read: true })
      .eq('room_id', room_id)
      .neq('sender_id', user_id);

    if (error) {
      console.error('Error marking messages as read:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in mark-read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get customer information for a chat room
router.get('/customer-info/:roomId', authenticateSupabaseToken, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get chat room to find customer_id and order_id
    const { data: room, error: roomError } = await supabase
      .from('design_chat_rooms')
      .select('customer_id, order_id')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return res.status(404).json({ error: 'Chat room not found' });
    }

    let customerName = 'Customer';
    let customerPhone = null;

    // Try 1: Get from user_profiles
    const { data: customerData } = await supabase
      .from('user_profiles')
      .select('full_name, phone')
      .eq('user_id', room.customer_id)
      .single();

    if (customerData?.full_name) {
      customerName = customerData.full_name;
      customerPhone = customerData.phone;
    } else {
      // Try 2: Get from auth.users metadata
      try {
        const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(room.customer_id);
        if (!userError && user) {
          const fullName = user.user_metadata?.full_name || 
                          (user.user_metadata?.first_name && user.user_metadata?.last_name 
                            ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
                            : user.user_metadata?.first_name || user.user_metadata?.last_name || null);
          if (fullName) {
            customerName = fullName;
          }
        }
      } catch (authError) {
        console.warn('Could not fetch user from auth:', authError);
      }

      // Try 3: Get from order delivery details
      if (room.order_id && customerName === 'Customer') {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('delivery_address, order_items')
          .eq('id', room.order_id)
          .single();

        if (!orderError && orderData) {
          // Check delivery_address.receiver
          if (orderData.delivery_address?.receiver) {
            customerName = orderData.delivery_address.receiver;
          }
          // Check order_items for custom design client_name
          else if (orderData.order_items && Array.isArray(orderData.order_items) && orderData.order_items.length > 0) {
            const firstItem = orderData.order_items[0];
            if (firstItem.client_name) {
              customerName = firstItem.client_name;
            }
          }
        }
      }
    }

    res.json({
      full_name: customerName,
      phone: customerPhone
    });
  } catch (error) {
    console.error('Error in get-customer-info:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get chat room by order ID
router.get('/room-by-order/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;

    const { data, error } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Room not found' });
      }
      console.error('Error getting room by order:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ room: data });
  } catch (error) {
    console.error('Error in get-room-by-order:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update room
router.post('/update-room', async (req, res) => {
  try {
    const { room_id, last_message_at } = req.body;

    const { error } = await supabase
      .from('design_chat_rooms')
      .update({ last_message_at })
      .eq('id', room_id);

    if (error) {
      console.error('Error updating room:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in update-room:', error);
    res.status(500).json({ error: error.message });
  }
});

// Close chat room
router.post('/close-room', async (req, res) => {
  try {
    const { room_id } = req.body;

    const { error } = await supabase
      .from('design_chat_rooms')
      .update({ status: 'closed' })
      .eq('id', room_id);

    if (error) {
      console.error('Error closing room:', error);
      return res.status(500).json({ error: error.message });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in close-room:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
