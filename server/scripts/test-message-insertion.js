const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testMessageInsertion() {
  console.log('🧪 Testing Message Insertion...\n');

  try {
    // Get the most recent chat room
    const { data: rooms } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (!rooms || rooms.length === 0) {
      console.log('❌ No chat rooms found');
      return;
    }

    const roomId = rooms[0].id;
    console.log('📝 Testing with room:', roomId);

    // Test 1: Insert with service key (should work)
    console.log('\n1️⃣ Testing with service key...');
    const { data: serviceMessage, error: serviceError } = await supabase
      .from('design_chat_messages')
      .insert({
        room_id: roomId,
        sender_id: '00000000-0000-0000-0000-000000000001',
        sender_type: 'customer',
        message: 'Test message with service key - ' + new Date().toISOString(),
        message_type: 'text'
      })
      .select()
      .single();

    if (serviceError) {
      console.error('❌ Service key test failed:', serviceError.message);
    } else {
      console.log('✅ Service key test passed:', serviceMessage.id);
    }

    // Test 2: Check RLS status
    console.log('\n2️⃣ Checking RLS status...');
    const { data: rlsStatus } = await supabase
      .rpc('get_table_rls_status', { table_name: 'design_chat_messages' })
      .single();

    if (rlsStatus) {
      console.log('🔒 RLS Status:', rlsStatus);
    } else {
      console.log('ℹ️  RLS status check not available');
    }

    // Test 3: Check current message count
    console.log('\n3️⃣ Checking message count...');
    const { data: messages, error: countError } = await supabase
      .from('design_chat_messages')
      .select('id')
      .eq('room_id', roomId);

    if (countError) {
      console.error('❌ Error counting messages:', countError.message);
    } else {
      console.log(`✅ Room has ${messages.length} messages`);
    }

    // Test 4: Try to insert with anonymous user (simulating frontend)
    console.log('\n4️⃣ Testing with anonymous user...');
    const anonSupabase = createClient(supabaseUrl, process.env.SUPABASE_ANON_KEY);
    
    const { data: anonMessage, error: anonError } = await anonSupabase
      .from('design_chat_messages')
      .insert({
        room_id: roomId,
        sender_id: '00000000-0000-0000-0000-000000000001',
        sender_type: 'customer',
        message: 'Test message with anon key - ' + new Date().toISOString(),
        message_type: 'text'
      })
      .select()
      .single();

    if (anonError) {
      console.error('❌ Anonymous user test failed:', anonError.message);
      console.error('❌ This confirms RLS is blocking frontend inserts');
    } else {
      console.log('✅ Anonymous user test passed:', anonMessage.id);
    }

    console.log('\n🎯 Test Results:');
    console.log('- Service key (backend):', serviceError ? '❌ Failed' : '✅ Works');
    console.log('- Anonymous key (frontend):', anonError ? '❌ Failed' : '✅ Works');
    
    if (anonError) {
      console.log('\n💡 SOLUTION: Run the RLS fix SQL script:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Copy contents of server/scripts/fix-chat-rls-manual.sql');
      console.log('3. Run the script');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testMessageInsertion();
}

module.exports = { testMessageInsertion };
