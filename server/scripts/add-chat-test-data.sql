-- ============================================
-- ADD TEST DATA TO CHAT SYSTEM
-- ============================================

-- Insert test chat room
INSERT INTO design_chat_rooms (order_id, customer_id, artist_id, room_name) VALUES
('1ba61cbc-d34b-43c8-859a-6def23d1bb17', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test Order Chat');

-- Insert test messages
INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) 
SELECT 
  id as room_id,
  '00000000-0000-0000-0000-000000000002' as sender_id,
  'artist' as sender_type,
  'Hello! I''m working on your custom design. Do you have any specific requirements?' as message
FROM design_chat_rooms 
WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) 
SELECT 
  id as room_id,
  '00000000-0000-0000-0000-000000000001' as sender_id,
  'customer' as sender_type,
  'Hi! I''d like the design to include our team logo and use blue and white colors.' as message
FROM design_chat_rooms 
WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) 
SELECT 
  id as room_id,
  '00000000-0000-0000-0000-000000000002' as sender_id,
  'artist' as sender_type,
  'Perfect! I''ll create a design with those specifications. I''ll send you a preview within 24 hours.' as message
FROM design_chat_rooms 
WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';

-- Verify data
SELECT 'Test data added successfully!' as status;
SELECT COUNT(*) as room_count FROM design_chat_rooms;
SELECT COUNT(*) as message_count FROM design_chat_messages;
