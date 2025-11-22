const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatTables() {
  console.log('🧪 Testing Design Chat Tables Access...\n');

  try {
    // Test 1: Check if tables exist
    console.log('1️⃣ Checking if tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .limit(1);

    if (tablesError) {
      console.error('❌ design_chat_rooms table error:', tablesError.message);
      return;
    }
    console.log('✅ design_chat_rooms table exists');

    const { data: messages, error: messagesError } = await supabase
      .from('design_chat_messages')
      .select('id')
      .limit(1);

    if (messagesError) {
      console.error('❌ design_chat_messages table error:', messagesError.message);
      return;
    }
    console.log('✅ design_chat_messages table exists');

    // Test 2: Try to create a test chat room
    console.log('\n2️⃣ Testing chat room creation...');
    const testOrderId = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';
    const testCustomerId = '00000000-0000-0000-0000-000000000001';
    const testArtistId = '00000000-0000-0000-0000-000000000002';

    const { data: room, error: roomError } = await supabase
      .from('design_chat_rooms')
      .insert({
        order_id: testOrderId,
        customer_id: testCustomerId,
        artist_id: testArtistId,
        room_name: 'Test Chat Room'
      })
      .select()
      .single();

    if (roomError) {
      console.error('❌ Error creating test room:', roomError.message);
    } else {
      console.log('✅ Test chat room created:', room.id);
    }

    // Test 3: Try to query existing rooms
    console.log('\n3️⃣ Testing room queries...');
    const { data: existingRooms, error: queryError } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('order_id', testOrderId);

    if (queryError) {
      console.error('❌ Error querying rooms:', queryError.message);
    } else {
      console.log(`✅ Found ${existingRooms.length} existing rooms for order ${testOrderId}`);
    }

    console.log('\n🎉 Chat table tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

if (require.main === module) {
  testChatTables();
}
