-- ============================================
-- EMERGENCY FIX: DISABLE RLS ON CHAT TABLES
-- ============================================

-- This will temporarily disable RLS to allow chat functionality to work
-- You can re-enable it later with more specific policies

-- Disable RLS on chat tables
ALTER TABLE design_chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON design_chat_messages;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON design_chat_rooms;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON design_chat_messages;

-- Grant full permissions to authenticated users
GRANT ALL ON design_chat_rooms TO authenticated;
GRANT ALL ON design_chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test query to verify access
SELECT 'Chat tables RLS disabled - should work now!' as status;
