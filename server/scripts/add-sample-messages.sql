-- Add sample messages to the most recent chat room
INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms ORDER BY created_at DESC LIMIT 1), '00000000-0000-0000-0000-000000000002', 'artist', 'Hello! I am working on your custom design. Do you have any specific requirements?');

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms ORDER BY created_at DESC LIMIT 1), '00000000-0000-0000-0000-000000000001', 'customer', 'Hi! I would like the design to include our team logo and use blue and white colors.');

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms ORDER BY created_at DESC LIMIT 1), '00000000-0000-0000-0000-000000000002', 'artist', 'Perfect! I will create a design with those specifications. I will send you a preview within 24 hours.');

-- Verify messages were added
SELECT 'Sample messages added!' as status;
SELECT COUNT(*) as message_count FROM design_chat_messages;
