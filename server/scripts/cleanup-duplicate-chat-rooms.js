const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function cleanupDuplicateChatRooms() {
  console.log('🧹 Cleaning up duplicate chat rooms...\n');

  try {
    // Get all orders that have multiple chat rooms
    const { data: duplicateOrders, error: ordersError } = await supabase
      .from('design_chat_rooms')
      .select('order_id')
      .then(result => {
        // Group by order_id and find duplicates
        const orderCounts = {};
        result.data.forEach(room => {
          orderCounts[room.order_id] = (orderCounts[room.order_id] || 0) + 1;
        });
        
        return {
          data: Object.keys(orderCounts).filter(orderId => orderCounts[orderId] > 1),
          error: result.error
        };
      });

    if (ordersError) {
      console.error('❌ Error finding duplicate orders:', ordersError);
      return;
    }

    console.log(`📊 Found ${duplicateOrders.length} orders with duplicate chat rooms`);

    for (const orderId of duplicateOrders) {
      console.log(`\n🔍 Processing order: ${orderId}`);
      
      // Get all rooms for this order, ordered by creation date
      const { data: rooms, error: roomsError } = await supabase
        .from('design_chat_rooms')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (roomsError) {
        console.error(`❌ Error getting rooms for order ${orderId}:`, roomsError);
        continue;
      }

      console.log(`   Found ${rooms.length} rooms for this order`);

      if (rooms.length > 1) {
        // Keep the most recent room (first in the list)
        const keepRoom = rooms[0];
        const deleteRooms = rooms.slice(1);

        console.log(`   ✅ Keeping room: ${keepRoom.id} (${keepRoom.created_at})`);
        console.log(`   🗑️  Deleting ${deleteRooms.length} duplicate rooms`);

        // Delete duplicate rooms
        for (const room of deleteRooms) {
          // First delete all messages in the room
          const { error: messagesError } = await supabase
            .from('design_chat_messages')
            .delete()
            .eq('room_id', room.id);

          if (messagesError) {
            console.error(`   ⚠️  Error deleting messages for room ${room.id}:`, messagesError.message);
          }

          // Then delete the room
          const { error: roomError } = await supabase
            .from('design_chat_rooms')
            .delete()
            .eq('id', room.id);

          if (roomError) {
            console.error(`   ❌ Error deleting room ${room.id}:`, roomError.message);
          } else {
            console.log(`   ✅ Deleted room: ${room.id}`);
          }
        }
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('💬 Each order now has only one chat room (the most recent one)');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

if (require.main === module) {
  cleanupDuplicateChatRooms();
}

module.exports = { cleanupDuplicateChatRooms };
