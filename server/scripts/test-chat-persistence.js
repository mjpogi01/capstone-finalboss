const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testChatPersistence() {
  console.log('🧪 Testing Chat Message Persistence...\n');

  try {
    // 1. Check if chat tables exist
    console.log('1️⃣ Checking if chat tables exist...');
    
    const { data: roomsData, error: roomsError } = await supabase
      .from('design_chat_rooms')
      .select('id')
      .limit(1);

    if (roomsError) {
      console.error('❌ design_chat_rooms table error:', roomsError.message);
      console.log('💡 The chat tables might not exist. Run the create-working-chat-system.sql script first.');
      return;
    }

    const { data: messagesData, error: messagesError } = await supabase
      .from('design_chat_messages')
      .select('id')
      .limit(1);

    if (messagesError) {
      console.error('❌ design_chat_messages table error:', messagesError.message);
      console.log('💡 The chat tables might not exist. Run the create-working-chat-system.sql script first.');
      return;
    }

    console.log('✅ Chat tables exist');

    // 2. Test creating a chat room
    console.log('\n2️⃣ Testing chat room creation...');
    const testOrderId = '00000000-0000-0000-0000-000000000003';
    const testCustomerId = '00000000-0000-0000-0000-000000000001';
    const testArtistId = '00000000-0000-0000-0000-000000000002';

    const { data: roomData, error: roomError } = await supabase
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
      console.error('❌ Error creating chat room:', roomError.message);
      return;
    }

    console.log('✅ Chat room created:', roomData.id);

    // 3. Test sending a message
    console.log('\n3️⃣ Testing message sending...');
    const { data: messageData, error: messageError } = await supabase
      .from('design_chat_messages')
      .insert({
        room_id: roomData.id,
        sender_id: testCustomerId,
        sender_type: 'customer',
        message: 'Test message - ' + new Date().toISOString(),
        message_type: 'text'
      })
      .select()
      .single();

    if (messageError) {
      console.error('❌ Error sending message:', messageError.message);
      return;
    }

    console.log('✅ Message sent:', messageData.id);

    // 4. Test retrieving messages
    console.log('\n4️⃣ Testing message retrieval...');
    const { data: retrievedMessages, error: retrieveError } = await supabase
      .from('design_chat_messages')
      .select('*')
      .eq('room_id', roomData.id)
      .order('created_at', { ascending: true });

    if (retrieveError) {
      console.error('❌ Error retrieving messages:', retrieveError.message);
      return;
    }

    console.log(`✅ Retrieved ${retrievedMessages.length} messages`);
    retrievedMessages.forEach((msg, index) => {
      console.log(`   ${index + 1}. ${msg.message} (${msg.sender_type})`);
    });

    // 5. Clean up test data
    console.log('\n5️⃣ Cleaning up test data...');
    await supabase
      .from('design_chat_messages')
      .delete()
      .eq('room_id', roomData.id);

    await supabase
      .from('design_chat_rooms')
      .delete()
      .eq('id', roomData.id);

    console.log('✅ Test data cleaned up');

    console.log('\n🎉 Chat persistence test completed successfully!');
    console.log('💬 Messages should be saved permanently in the database.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testChatPersistence();
}

module.exports = { testChatPersistence };
