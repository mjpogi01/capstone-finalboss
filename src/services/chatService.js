import { supabase } from '../lib/supabase';

class ChatService {
  // Create a chat room for an order
  async createChatRoom(orderId, customerId, artistId) {
    try {
      console.log('🔧 Creating chat room for order:', orderId);
      
      // First check if room already exists (get the most recent one)
      const { data: existingRoom, error: checkError } = await supabase
        .from('design_chat_rooms')
        .select('id')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingRoom && !checkError) {
        console.log('✅ Found existing room:', existingRoom.id);
        return existingRoom.id;
      }

      // Create new room only if none exists
      const { data, error } = await supabase
        .from('design_chat_rooms')
        .insert({
          order_id: orderId,
          customer_id: customerId,
          artist_id: artistId,
          room_name: `Order ${orderId.substring(0, 8)} Chat`
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating chat room:', error);
        throw new Error(`Failed to create chat room: ${error.message}`);
      }

      console.log('✅ Chat room created successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('❌ Error in createChatRoom:', error);
      throw error;
    }
  }

  // Send a message
  async sendMessage(roomId, senderId, senderType, message, messageType = 'text', attachments = []) {
    try {
      console.log('📤 Sending message to room:', roomId);
      console.log('📤 Message details:', { senderId, senderType, message, messageType, attachments });
      
      const { data, error } = await supabase
        .from('design_chat_messages')
        .insert({
          room_id: roomId,
          sender_id: senderId,
          sender_type: senderType,
          message: message,
          message_type: messageType,
          attachments: attachments
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error sending message:', error);
        console.error('❌ Error details:', JSON.stringify(error, null, 2));
        throw new Error(`Failed to send message: ${error.message}`);
      }

      // Update room's last_message_at
      await supabase
        .from('design_chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', roomId);

      console.log('✅ Message sent successfully:', data.id);
      console.log('✅ Message data:', data);
      return data; // Return full message object instead of just ID
    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      throw error;
    }
  }

  // Get chat room messages
  async getChatRoomMessages(roomId) {
    try {
      console.log('📥 Fetching messages for room:', roomId);
      
      const { data, error } = await supabase
        .from('design_chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error getting messages:', error);
        throw new Error(`Failed to get messages: ${error.message}`);
      }

      console.log(`✅ Retrieved ${data?.length || 0} messages for room ${roomId}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getChatRoomMessages:', error);
      throw error;
    }
  }

  // Get customer's chat rooms
  async getCustomerChatRooms(customerId) {
    try {
      console.log('📋 Fetching chat rooms for customer:', customerId);
      
      const { data, error } = await supabase
        .from('design_chat_rooms')
        .select('*')
        .eq('customer_id', customerId)
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('❌ Error getting customer rooms:', error);
        throw new Error(`Failed to get customer rooms: ${error.message}`);
      }

      console.log(`✅ Retrieved ${data?.length || 0} rooms for customer ${customerId}`);
      return data || [];
    } catch (error) {
      console.error('❌ Error in getCustomerChatRooms:', error);
      throw error;
    }
  }

  // Get artist's chat rooms
  async getArtistChatRooms(artistId) {
    try {
      console.log('🎨 Fetching chat rooms for artist:', artistId);
      
      // Try using the database function first (includes order_number via JOIN)
      try {
        const { data: functionData, error: functionError } = await supabase
          .rpc('get_artist_chat_rooms', { p_artist_id: artistId });
        
        if (!functionError && functionData && functionData.length > 0) {
          console.log(`✅ Retrieved ${functionData?.length || 0} rooms via function for artist ${artistId}`);
          // Map the function result to match expected format
          return functionData.map(room => ({
            id: room.id,
            order_id: room.order_id,
            customer_id: room.customer_id,
            task_id: room.task_id,
            room_name: room.room_name,
            status: room.status,
            last_message_at: room.last_message_at,
            created_at: room.created_at,
            updated_at: room.updated_at,
            // Include order_number from the function result
            order_number: room.order_number,
            // Include customer_name if available
            customer_name: room.customer_name
          }));
        } else if (functionError) {
          console.warn('⚠️ Database function error:', functionError);
        }
      } catch (functionErr) {
        console.warn('⚠️ Database function failed, falling back to direct query:', functionErr);
      }
      
      // Fallback: direct query - try with join first
      let data = null;
      let error = null;
      
      try {
        const { data: joinData, error: joinError } = await supabase
          .from('design_chat_rooms')
          .select(`
            *,
            orders(order_number)
          `)
          .eq('artist_id', artistId)
          .order('last_message_at', { ascending: false });
        
        if (!joinError && joinData) {
          data = joinData;
          error = null;
        } else {
          error = joinError;
        }
      } catch (joinErr) {
        console.warn('⚠️ Join query failed, trying simple query:', joinErr);
      }
      
      // If join failed, try simple query without join
      if (error || !data) {
        console.log('🔄 Trying simple query without join...');
        const { data: simpleData, error: simpleError } = await supabase
          .from('design_chat_rooms')
          .select('*')
          .eq('artist_id', artistId)
          .order('last_message_at', { ascending: false });
        
        if (simpleError) {
          console.error('❌ Error getting artist rooms:', simpleError);
          throw new Error(`Failed to get artist rooms: ${simpleError.message}`);
        }
        
        data = simpleData;
        error = null;
      }

      if (error) {
        console.error('❌ Error getting artist rooms:', error);
        throw new Error(`Failed to get artist rooms: ${error.message}`);
      }

      // Map the result to include order_number if available
      const mappedData = (data || []).map(room => ({
        ...room,
        order_number: room.orders?.order_number || room.order_number || null
      }));

      console.log(`✅ Retrieved ${mappedData?.length || 0} rooms for artist ${artistId}`);
      return mappedData || [];
    } catch (error) {
      console.error('❌ Error in getArtistChatRooms:', error);
      throw error;
    }
  }

  // Mark messages as read
  async markMessagesAsRead(roomId, userId) {
    try {
      console.log('👁️ Marking messages as read for room:', roomId);
      
      const { error } = await supabase
        .from('design_chat_messages')
        .update({ is_read: true })
        .eq('room_id', roomId)
        .neq('sender_id', userId);

      if (error) {
        console.error('❌ Error marking messages as read:', error);
        throw new Error(`Failed to mark messages as read: ${error.message}`);
      }

      console.log('✅ Messages marked as read for room:', roomId);
      return true;
    } catch (error) {
      console.error('❌ Error in markMessagesAsRead:', error);
      throw error;
    }
  }

  // Subscribe to chat room messages
  subscribeToChatRoom(roomId, callback) {
    console.log('🔔 Subscribing to real-time updates for room:', roomId);
    
    return supabase
      .channel(`chat-room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'design_chat_messages',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('📨 New message received:', payload);
          callback(payload);
        }
      )
      .subscribe();
  }

  // Get chat room by order ID
  async getChatRoomByOrder(orderId) {
    try {
      console.log('🔍 Looking for chat room for order:', orderId);
      
      // Use .limit(1) instead of .single() to handle multiple rooms
      const { data, error } = await supabase
        .from('design_chat_rooms')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }) // Get the most recent room
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No chat room found for order:', orderId);
          return null;
        }
        console.error('❌ Error getting room by order:', error);
        throw new Error(`Failed to get room by order: ${error.message}`);
      }

      console.log('✅ Found chat room for order:', orderId, 'Room ID:', data.id);
      return data;
    } catch (error) {
      console.error('❌ Error in getChatRoomByOrder:', error);
      throw error;
    }
  }

  // Close chat room
  async closeChatRoom(roomId) {
    try {
      console.log('🔒 Closing chat room:', roomId);
      
      const { error } = await supabase
        .from('design_chat_rooms')
        .update({ status: 'closed' })
        .eq('id', roomId);

      if (error) {
        console.error('❌ Error closing room:', error);
        throw new Error(`Failed to close room: ${error.message}`);
      }

      console.log('✅ Chat room closed:', roomId);
      return true;
    } catch (error) {
      console.error('❌ Error in closeChatRoom:', error);
      throw error;
    }
  }

  // Get assigned artist for an order
  async getAssignedArtist(orderId) {
    try {
      console.log('🎨 Getting assigned artist for order:', orderId);
      
      const { data, error } = await supabase
        .from('artist_tasks')
        .select('artist_id, created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ No artist assigned to order:', orderId);
          return null;
        }
        console.error('❌ Error getting assigned artist:', error);
        throw new Error(`Failed to get assigned artist: ${error.message}`);
      }

      const artistId = data?.artist_id;

      if (!artistId) {
        console.log('⚠️ Task found for order but no artist assigned:', orderId);
        return null;
      }

      let artistName = 'Assigned Artist';

      const { data: profileData, error: profileError } = await supabase
        .from('artist_profiles')
        .select('id, artist_name, is_active')
        .eq('id', artistId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.warn('⚠️ Could not load artist profile:', profileError.message);
      }

      if (profileData?.artist_name) {
        artistName = profileData.artist_name;
      }

      if (!artistName) {
        const { data: userProfile, error: userError } = await supabase
          .rpc('get_artist_display_name', { p_artist_id: artistId });

        if (!userError && userProfile && typeof userProfile === 'string' && userProfile.trim().length > 0) {
          artistName = userProfile.trim();
        } else if (userError) {
          console.warn('⚠️ Could not load artist display name:', userError.message);
        }
      }

      if (profileData?.is_active === false) {
        console.warn('⚠️ Assigned artist profile is inactive for order:', orderId);
      }

      const artistInfo = {
        id: profileData?.id || artistId,
        artist_name: artistName || 'Assigned Artist'
      };

      console.log('✅ Found assigned artist:', artistInfo.artist_name);
      return artistInfo;
    } catch (error) {
      console.error('❌ Error in getAssignedArtist:', error);
      throw error;
    }
  }

  // Get customer information for a chat room
  async getCustomerInfo(roomId) {
    try {
      console.log('👤 Getting customer info for room:', roomId);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/customer-info/${roomId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      // Check if response is HTML (usually means route not found or wrong server)
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await response.text();
        console.error('❌ Received non-JSON response:', text.substring(0, 200));
        throw new Error(`Server returned HTML instead of JSON. Is the backend running on port 3000? Status: ${response.status}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || 'Failed to get customer info');
      }

      const data = await response.json();
      console.log('✅ Customer info retrieved:', data);
      return data;
    } catch (error) {
      console.error('❌ Error in getCustomerInfo:', error);
      throw error;
    }
  }

  // Get unread message count for a user
  async getUnreadMessageCount(userId) {
    try {
      console.log('🔢 Getting unread message count for user:', userId);
      
      const { data, error } = await supabase
        .from('design_chat_messages')
        .select('id')
        .eq('is_read', false)
        .neq('sender_id', userId)
        .in('room_id', 
          supabase
            .from('design_chat_rooms')
            .select('id')
            .or(`customer_id.eq.${userId},artist_id.eq.${userId}`)
        );

      if (error) {
        console.error('❌ Error getting unread count:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`✅ Unread message count for user ${userId}:`, count);
      return count;
    } catch (error) {
      console.error('❌ Error in getUnreadMessageCount:', error);
      return 0;
    }
  }

  // Upload attachment file
  async uploadAttachment(file, roomId) {
    try {
      console.log('📎 Uploading attachment:', file.name, 'for room:', roomId);
      
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('User not authenticated');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}: ${response.statusText}` }));
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      
      // Return attachment object in the format expected by the chat
      const attachment = {
        name: file.name,
        filename: file.name,
        url: data.url || data.imageUrl,
        type: file.type,
        size: file.size
      };

      console.log('✅ Attachment uploaded successfully:', attachment);
      return attachment;
    } catch (error) {
      console.error('❌ Error uploading attachment:', error);
      throw error;
    }
  }
}

export default new ChatService();
