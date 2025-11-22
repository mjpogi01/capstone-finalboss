-- Check if test data exists
SELECT 'Checking existing data...' as status;

-- Check rooms
SELECT COUNT(*) as room_count FROM design_chat_rooms;

-- Check messages  
SELECT COUNT(*) as message_count FROM design_chat_messages;

-- Show all rooms
SELECT id, order_id, room_name FROM design_chat_rooms;

-- Show all messages
SELECT id, room_id, sender_type, message FROM design_chat_messages;
