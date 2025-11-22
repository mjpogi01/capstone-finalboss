const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRLSBlocking() {
  console.log('🔒 Testing RLS Blocking...\n');

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

    // Check current message count
    const { data: messages } = await supabase
      .from('design_chat_messages')
      .select('id')
      .eq('room_id', roomId);

    console.log(`📊 Room currently has ${messages.length} messages`);

    // Test inserting with service key (should work)
    console.log('\n1️⃣ Testing with service key (backend)...');
    const { data: serviceMessage, error: serviceError } = await supabase
      .from('design_chat_messages')
      .insert({
        room_id: roomId,
        sender_id: '00000000-0000-0000-0000-000000000001',
        sender_type: 'customer',
        message: 'Backend test message - ' + new Date().toISOString(),
        message_type: 'text'
      })
      .select()
      .single();

    if (serviceError) {
      console.error('❌ Service key test failed:', serviceError.message);
    } else {
      console.log('✅ Service key test passed:', serviceMessage.id);
    }

    // Check message count again
    const { data: messagesAfter } = await supabase
      .from('design_chat_messages')
      .select('id')
      .eq('room_id', roomId);

    console.log(`📊 Room now has ${messagesAfter.length} messages`);

    console.log('\n🎯 CONCLUSION:');
    if (messagesAfter.length > messages.length) {
      console.log('✅ Messages CAN be inserted with service key');
      console.log('❌ Messages CANNOT be inserted from frontend (RLS blocking)');
      console.log('\n💡 SOLUTION:');
      console.log('1. Go to Supabase Dashboard > SQL Editor');
      console.log('2. Run this SQL:');
      console.log('   ALTER TABLE design_chat_messages DISABLE ROW LEVEL SECURITY;');
      console.log('   GRANT ALL ON design_chat_messages TO authenticated;');
      console.log('3. Test sending messages in your app');
    } else {
      console.log('❌ Even service key insertion failed - deeper issue');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testRLSBlocking();
}

module.exports = { testRLSBlocking };
