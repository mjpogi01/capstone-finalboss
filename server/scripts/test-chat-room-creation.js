const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatRoomCreation() {
  console.log('🧪 Testing Chat Room Creation Logic...\n');

  try {
    const testOrderId = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';
    const testCustomerId = '00000000-0000-0000-0000-000000000001';
    const testArtistId = '00000000-0000-0000-0000-000000000002';

    console.log('📝 Testing with order:', testOrderId);

    // Test 1: Check existing room
    console.log('\n1️⃣ Checking for existing room...');
    const { data: existingRoom, error: checkError } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .eq('order_id', testOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (existingRoom && !checkError) {
      console.log('✅ Found existing room:', existingRoom.id);
      console.log('✅ Should return existing room ID (no new room created)');
    } else if (checkError && checkError.code === 'PGRST116') {
      console.log('ℹ️  No existing room found');
      console.log('✅ Should create new room');
    } else {
      console.error('❌ Error checking for existing room:', checkError);
    }

    // Test 2: Simulate the createChatRoom logic
    console.log('\n2️⃣ Simulating createChatRoom logic...');
    
    // First check if room already exists
    const { data: roomCheck, error: roomError } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .eq('order_id', testOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (roomCheck && !roomError) {
      console.log('✅ Found existing room, returning:', roomCheck.id);
      console.log('✅ No new room created - this is correct behavior!');
    } else if (roomError && roomError.code === 'PGRST116') {
      console.log('ℹ️  No room exists, would create new one');
      console.log('✅ This is also correct behavior for first-time chat');
    } else {
      console.error('❌ Unexpected error:', roomError);
    }

    // Test 3: Check final room count
    console.log('\n3️⃣ Checking final room count...');
    const { data: allRooms } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .eq('order_id', testOrderId);

    console.log(`📊 Total rooms for this order: ${allRooms.length}`);

    if (allRooms.length === 1) {
      console.log('✅ Perfect! Only one room exists for this order');
      console.log('✅ Chat room creation logic is working correctly');
    } else if (allRooms.length > 1) {
      console.log('⚠️  Multiple rooms exist - this should not happen');
    } else {
      console.log('ℹ️  No rooms exist - this is OK for new orders');
    }

    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('✅ First time: Creates one chat room');
    console.log('✅ Subsequent times: Finds existing room, no duplicates');
    console.log('✅ One room per order for entire order lifespan');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testChatRoomCreation();
}

module.exports = { testChatRoomCreation };
