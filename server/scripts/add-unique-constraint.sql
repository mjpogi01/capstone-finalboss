-- ============================================
-- ADD UNIQUE CONSTRAINT TO PREVENT DUPLICATE CHAT ROOMS
-- Run this in Supabase Dashboard > SQL Editor
-- ============================================

-- Add unique constraint on order_id to prevent duplicate chat rooms
-- This ensures only one chat room can exist per order
ALTER TABLE design_chat_rooms 
ADD CONSTRAINT unique_chat_room_per_order 
UNIQUE (order_id);

-- Verify the constraint was added
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'design_chat_rooms'::regclass 
AND conname = 'unique_chat_room_per_order';

-- Test: Try to insert a duplicate room (should fail)
-- This will fail if the constraint is working:
-- INSERT INTO design_chat_rooms (order_id, customer_id, artist_id, room_name) 
-- VALUES ('1ba61cbc-d34b-43c8-859a-6def23d1bb17', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test Duplicate');

SELECT 'Unique constraint added successfully! Only one chat room per order allowed.' as status;
