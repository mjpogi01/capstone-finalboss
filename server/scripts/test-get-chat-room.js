const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testGetChatRoomByOrder() {
  console.log('🔍 Testing getChatRoomByOrder Function...\n');

  try {
    const testOrderId = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';
    console.log('📝 Testing with order ID:', testOrderId);

    // Test the exact same query that's failing in the frontend
    console.log('\n1️⃣ Testing SELECT query...');
    const { data, error } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('order_id', testOrderId)
      .single();

    if (error) {
      console.error('❌ SELECT query failed:', error);
      console.error('❌ Error code:', error.code);
      console.error('❌ Error message:', error.message);
      
      if (error.code === 'PGRST116') {
        console.log('ℹ️  No room found (this is expected if no room exists)');
      } else if (error.message.includes('406')) {
        console.log('🔒 406 Error - RLS is still blocking SELECT operations');
        console.log('💡 Run the complete-chat-fix.sql script in Supabase Dashboard');
      }
    } else {
      console.log('✅ SELECT query SUCCESS!');
      console.log('✅ Found room:', data.id);
      console.log('✅ Room name:', data.room_name);
    }

    // Test with .maybeSingle() instead of .single()
    console.log('\n2️⃣ Testing with maybeSingle()...');
    const { data: data2, error: error2 } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('order_id', testOrderId)
      .maybeSingle();

    if (error2) {
      console.error('❌ maybeSingle() failed:', error2);
    } else {
      console.log('✅ maybeSingle() SUCCESS!');
      if (data2) {
        console.log('✅ Found room:', data2.id);
      } else {
        console.log('ℹ️  No room found (this is OK)');
      }
    }

    // Check how many rooms exist for this order
    console.log('\n3️⃣ Checking all rooms for this order...');
    const { data: allRooms, error: allError } = await supabase
      .from('design_chat_rooms')
      .select('*')
      .eq('order_id', testOrderId);

    if (allError) {
      console.error('❌ Error getting all rooms:', allError);
    } else {
      console.log(`✅ Found ${allRooms.length} rooms for order ${testOrderId}:`);
      allRooms.forEach((room, index) => {
        console.log(`   ${index + 1}. ${room.id} - ${room.room_name} (${room.created_at})`);
      });
    }

    console.log('\n🎯 DIAGNOSIS:');
    if (error && error.message.includes('406')) {
      console.log('❌ RLS is still blocking SELECT operations');
      console.log('🔧 SOLUTION: Run complete-chat-fix.sql in Supabase Dashboard');
    } else if (allRooms && allRooms.length > 1) {
      console.log('⚠️  Multiple rooms exist for the same order');
      console.log('🔧 SOLUTION: The app should find existing rooms instead of creating new ones');
    } else {
      console.log('✅ SELECT operations are working correctly');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testGetChatRoomByOrder();
}

module.exports = { testGetChatRoomByOrder };
