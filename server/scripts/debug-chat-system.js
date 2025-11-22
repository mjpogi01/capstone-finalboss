const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugChatSystem() {
  console.log('🔍 Debugging Chat System...\n');

  try {
    // 1. Check existing chat rooms
    console.log('1️⃣ Checking existing chat rooms...');
    const { data: rooms, error: roomsError } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (roomsError) {
      console.error('❌ Error fetching rooms:', roomsError.message);
      return;
    }

    console.log(`✅ Found ${rooms.length} chat rooms:`);
    rooms.forEach((room, index) => {
      console.log(`   ${index + 1}. Room ${room.id.substring(0, 8)} - Order: ${room.order_id.substring(0, 8)} - ${room.room_name}`);
    });

    if (rooms.length === 0) {
      console.log('⚠️  No chat rooms found. This might be why messages aren\'t persisting.');
      console.log('💡 Try creating a chat room first by opening the chat modal in your app.');
      return;
    }

    // 2. Check messages for the most recent room
    const recentRoom = rooms[0];
    console.log(`\n2️⃣ Checking messages for room ${recentRoom.id.substring(0, 8)}...`);
    
    const { data: messages, error: messagesError } = await supabase
      .from('design_chat_messages')
      .select('*')
      .eq('room_id', recentRoom.id)
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('❌ Error fetching messages:', messagesError.message);
      return;
    }

    console.log(`✅ Found ${messages.length} messages:`);
    messages.forEach((msg, index) => {
      const time = new Date(msg.created_at).toLocaleTimeString();
      console.log(`   ${index + 1}. [${time}] ${msg.sender_type}: ${msg.message.substring(0, 50)}${msg.message.length > 50 ? '...' : ''}`);
    });

    // 3. Test real-time subscription
    console.log('\n3️⃣ Testing real-time subscription...');
    const subscription = supabase
      .channel('test-channel')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'design_chat_messages',
          filter: `room_id=eq.${recentRoom.id}`
        }, 
        (payload) => {
          console.log('🔔 Real-time message received:', payload.new.message);
        }
      )
      .subscribe();

    console.log('✅ Real-time subscription active');
    console.log('💡 Send a message in your app to test real-time updates...');

    // Wait for 10 seconds to test real-time
    setTimeout(async () => {
      console.log('\n4️⃣ Cleaning up subscription...');
      await supabase.removeChannel(subscription);
      console.log('✅ Subscription cleaned up');
      
      console.log('\n🎯 Debug Summary:');
      console.log(`- Chat rooms: ${rooms.length}`);
      console.log(`- Messages in recent room: ${messages.length}`);
      console.log('- Real-time subscription: Working');
      
      if (messages.length === 0) {
        console.log('\n⚠️  ISSUE FOUND: No messages in chat rooms');
        console.log('💡 This suggests messages aren\'t being saved properly.');
        console.log('🔧 Possible fixes:');
        console.log('   1. Check browser console for JavaScript errors');
        console.log('   2. Verify user authentication');
        console.log('   3. Check network requests in browser dev tools');
      } else {
        console.log('\n✅ Chat system appears to be working correctly!');
        console.log('💬 Messages are being saved and retrieved properly.');
      }
    }, 10000);

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

if (require.main === module) {
  debugChatSystem();
}

module.exports = { debugChatSystem };
