-- ============================================
-- DELETE ALL CHATROOMS AND MESSAGES
-- ============================================
-- WARNING: This will permanently delete ALL chatrooms and messages
-- Use with caution!

-- First, delete all messages
DELETE FROM design_chat_messages;

-- Then, delete all chatrooms
-- (Messages should already be deleted, but CASCADE will handle any remaining)
DELETE FROM design_chat_rooms;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM design_chat_rooms) AS remaining_rooms,
  (SELECT COUNT(*) FROM design_chat_messages) AS remaining_messages;

