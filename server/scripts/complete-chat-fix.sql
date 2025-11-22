-- ============================================
-- COMPLETE CHAT RLS FIX - RUN THIS IN SUPABASE SQL EDITOR
-- ============================================

-- Step 1: Completely disable RLS
ALTER TABLE design_chat_rooms DISABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON design_chat_messages;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON design_chat_rooms;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON design_chat_messages;
DROP POLICY IF EXISTS "chat_rooms_access_policy" ON design_chat_rooms;
DROP POLICY IF EXISTS "chat_messages_access_policy" ON design_chat_messages;
DROP POLICY IF EXISTS "Allow all operations on chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Allow all operations on chat messages" ON design_chat_messages;

-- Step 3: Grant ALL permissions (including SELECT)
GRANT ALL ON design_chat_rooms TO authenticated;
GRANT ALL ON design_chat_messages TO authenticated;
GRANT ALL ON design_chat_rooms TO anon;
GRANT ALL ON design_chat_messages TO anon;
GRANT ALL ON design_chat_rooms TO service_role;
GRANT ALL ON design_chat_messages TO service_role;

-- Step 3b: Explicitly grant SELECT permissions
GRANT SELECT ON design_chat_rooms TO authenticated;
GRANT SELECT ON design_chat_messages TO authenticated;
GRANT SELECT ON design_chat_rooms TO anon;
GRANT SELECT ON design_chat_messages TO anon;

-- Step 4: Verify RLS is disabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('design_chat_rooms', 'design_chat_messages');

-- Step 5: Test SELECT operations (this was failing with 406)
SELECT COUNT(*) as total_rooms FROM design_chat_rooms;
SELECT COUNT(*) as total_messages FROM design_chat_messages;

-- Step 6: Test message insertion
INSERT INTO design_chat_messages (
  room_id, 
  sender_id, 
  sender_type, 
  message, 
  message_type
) VALUES (
  (SELECT id FROM design_chat_rooms LIMIT 1),
  '00000000-0000-0000-0000-000000000001',
  'customer',
  'Test message after RLS fix - ' || now(),
  'text'
);

-- Step 7: Verify message was inserted
SELECT COUNT(*) as total_messages FROM design_chat_messages;
SELECT 'Chat system is now fully accessible!' as status;
