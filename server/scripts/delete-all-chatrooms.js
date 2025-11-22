const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteAllChatrooms() {
  console.log('🧹 Starting cleanup of all chatrooms...\n');

  try {
    // First, get count of chatrooms and messages
    const { count: roomCount, error: countError } = await supabase
      .from('design_chat_rooms')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error counting chatrooms:', countError);
      return;
    }

    const { count: messageCount, error: messageCountError } = await supabase
      .from('design_chat_messages')
      .select('*', { count: 'exact', head: true });

    if (messageCountError) {
      console.error('❌ Error counting messages:', messageCountError);
      return;
    }

    console.log(`📊 Found ${roomCount || 0} chatrooms and ${messageCount || 0} messages`);

    if (roomCount === 0) {
      console.log('✅ No chatrooms to delete. Database is already clean.');
      return;
    }

    // Delete all messages first (though CASCADE should handle this)
    console.log('\n🗑️  Deleting all chat messages...');
    
    // Get all message IDs and delete in batches if needed
    let deletedMessages = 0;
    let hasMoreMessages = true;
    
    while (hasMoreMessages) {
      const { data: messages, error: fetchError } = await supabase
        .from('design_chat_messages')
        .select('id')
        .limit(1000);
      
      if (fetchError) {
        console.error('⚠️  Error fetching messages:', fetchError.message);
        break;
      }
      
      if (!messages || messages.length === 0) {
        hasMoreMessages = false;
        break;
      }
      
      const messageIds = messages.map(m => m.id);
      const { error: deleteError } = await supabase
        .from('design_chat_messages')
        .delete()
        .in('id', messageIds);
      
      if (deleteError) {
        console.error('⚠️  Error deleting messages:', deleteError.message);
        break;
      }
      
      deletedMessages += messageIds.length;
      console.log(`   Deleted ${deletedMessages} messages...`);
      
      if (messages.length < 1000) {
        hasMoreMessages = false;
      }
    }
    
    console.log(`✅ Deleted ${deletedMessages} messages`);

    // Delete all chatrooms
    console.log('\n🗑️  Deleting all chatrooms...');
    
    // Get all room IDs and delete in batches
    let deletedRooms = 0;
    let hasMoreRooms = true;
    
    while (hasMoreRooms) {
      const { data: rooms, error: fetchError } = await supabase
        .from('design_chat_rooms')
        .select('id')
        .limit(1000);
      
      if (fetchError) {
        console.error('❌ Error fetching chatrooms:', fetchError);
        return;
      }
      
      if (!rooms || rooms.length === 0) {
        hasMoreRooms = false;
        break;
      }
      
      const roomIds = rooms.map(r => r.id);
      const { error: deleteError } = await supabase
        .from('design_chat_rooms')
        .delete()
        .in('id', roomIds);
      
      if (deleteError) {
        console.error('❌ Error deleting chatrooms:', deleteError);
        return;
      }
      
      deletedRooms += roomIds.length;
      console.log(`   Deleted ${deletedRooms} chatrooms...`);
      
      if (rooms.length < 1000) {
        hasMoreRooms = false;
      }
    }

    if (roomsError) {
      console.error('❌ Error deleting chatrooms:', roomsError);
      return;
    }

    console.log('✅ All chatrooms deleted');

    // Verify deletion
    const { count: finalRoomCount } = await supabase
      .from('design_chat_rooms')
      .select('*', { count: 'exact', head: true });

    const { count: finalMessageCount } = await supabase
      .from('design_chat_messages')
      .select('*', { count: 'exact', head: true });

    console.log('\n📊 Final counts:');
    console.log(`   Chatrooms: ${finalRoomCount || 0}`);
    console.log(`   Messages: ${finalMessageCount || 0}`);

    if (finalRoomCount === 0 && finalMessageCount === 0) {
      console.log('\n🎉 Successfully cleaned all chatrooms and messages!');
    } else {
      console.log('\n⚠️  Some records may still exist. Please check manually.');
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error(error.stack);
  }
}

if (require.main === module) {
  deleteAllChatrooms()
    .then(() => {
      console.log('\n✅ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { deleteAllChatrooms };

