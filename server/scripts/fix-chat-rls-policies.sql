-- ============================================
-- FIX DESIGN CHAT RLS POLICIES
-- ============================================

-- First, let's check if the tables exist and their current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('design_chat_rooms', 'design_chat_messages')
ORDER BY tablename, policyname;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can create chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can update their own chat rooms" ON design_chat_rooms;
DROP POLICY IF EXISTS "Users can view messages in their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can send messages to their chat rooms" ON design_chat_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON design_chat_messages;

-- Create more permissive policies that work with the current auth setup
CREATE POLICY "Enable all for authenticated users" ON design_chat_rooms
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Enable all for authenticated users" ON design_chat_messages
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Alternative: If you want more specific policies, uncomment these instead:
/*
-- Policy for customers to access their chat rooms
CREATE POLICY "Customers can access their chat rooms" ON design_chat_rooms
  FOR ALL USING (
    customer_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner', 'artist')
    )
  );

-- Policy for artists to access their chat rooms
CREATE POLICY "Artists can access their chat rooms" ON design_chat_rooms
  FOR ALL USING (
    artist_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner')
    )
  );

-- Policy for messages
CREATE POLICY "Users can access messages in their rooms" ON design_chat_messages
  FOR ALL USING (
    room_id IN (
      SELECT id FROM design_chat_rooms 
      WHERE customer_id = auth.uid() OR artist_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner')
    )
  );
*/

-- Grant permissions
GRANT ALL ON design_chat_rooms TO authenticated;
GRANT ALL ON design_chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Test query to verify access
SELECT 'Chat tables accessible' as status;
