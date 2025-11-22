const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFrontendSimulation() {
  console.log('🎭 Simulating Frontend Message Sending...\n');

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

    // Simulate exactly what the frontend does
    console.log('\n1️⃣ Simulating frontend message send...');
    
    // Use the same parameters as the frontend
    const messageData = {
      room_id: roomId,
      sender_id: '00000000-0000-0000-0000-000000000001', // Customer ID
      sender_type: 'customer',
      message: 'Frontend simulation test - ' + new Date().toISOString(),
      message_type: 'text',
      attachments: []
    };

    console.log('📤 Message data:', messageData);

    const { data, error } = await supabase
      .from('design_chat_messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('❌ Frontend simulation failed:', error);
      console.error('❌ Error details:', JSON.stringify(error, null, 2));
      
      // Check if it's an RLS error
      if (error.message.includes('RLS') || error.message.includes('policy') || error.message.includes('permission')) {
        console.log('\n🔒 RLS/Permission Error Detected!');
        console.log('💡 The SQL script may not have run completely.');
        console.log('🔧 Try running the complete-chat-fix.sql script again.');
      }
    } else {
      console.log('✅ Frontend simulation SUCCESS!');
      console.log('✅ Message ID:', data.id);
      console.log('✅ Message saved:', data.message);
    }

    // Check final message count
    const { data: finalMessages } = await supabase
      .from('design_chat_messages')
      .select('id')
      .eq('room_id', roomId);

    console.log(`\n📊 Final message count: ${finalMessages.length}`);

    if (finalMessages.length > 0) {
      console.log('\n🎉 SUCCESS! Messages are now being saved!');
      console.log('💬 Try sending a message in your app now.');
    } else {
      console.log('\n❌ Still no messages saved.');
      console.log('🔧 Run the complete-chat-fix.sql script in Supabase Dashboard.');
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

if (require.main === module) {
  testFrontendSimulation();
}

module.exports = { testFrontendSimulation };
