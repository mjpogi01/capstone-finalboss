INSERT INTO design_chat_rooms (order_id, customer_id, artist_id, room_name) VALUES
('1ba61cbc-d34b-43c8-859a-6def23d1bb17', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test Order Chat');

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17'), '00000000-0000-0000-0000-000000000002', 'artist', 'Hello! I am working on your custom design. Do you have any specific requirements?');

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17'), '00000000-0000-0000-0000-000000000001', 'customer', 'Hi! I would like the design to include our team logo and use blue and white colors.');

INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
((SELECT id FROM design_chat_rooms WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17'), '00000000-0000-0000-0000-000000000002', 'artist', 'Perfect! I will create a design with those specifications. I will send you a preview within 24 hours.');
