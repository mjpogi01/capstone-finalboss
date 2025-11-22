-- ============================================
-- COMPLETE SUPABASE CHAT SYSTEM - WORKING VERSION
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS design_chat_messages CASCADE;
DROP TABLE IF EXISTS design_chat_rooms CASCADE;

-- Create design_chat_rooms table
CREATE TABLE design_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL,
  customer_id UUID NOT NULL,
  artist_id UUID NOT NULL,
  room_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Create design_chat_messages table
CREATE TABLE design_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES design_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'artist', 'admin')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_design_chat_rooms_order_id ON design_chat_rooms(order_id);
CREATE INDEX idx_design_chat_rooms_customer_id ON design_chat_rooms(customer_id);
CREATE INDEX idx_design_chat_rooms_artist_id ON design_chat_rooms(artist_id);
CREATE INDEX idx_design_chat_rooms_status ON design_chat_rooms(status);
CREATE INDEX idx_design_chat_messages_room_id ON design_chat_messages(room_id);
CREATE INDEX idx_design_chat_messages_sender_id ON design_chat_messages(sender_id);
CREATE INDEX idx_design_chat_messages_created_at ON design_chat_messages(created_at);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_design_chat_rooms_updated_at 
    BEFORE UPDATE ON design_chat_rooms 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_design_chat_messages_updated_at 
    BEFORE UPDATE ON design_chat_messages 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE design_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies that actually work
-- Policy for chat rooms - users can access rooms they participate in
CREATE POLICY "chat_rooms_access_policy" ON design_chat_rooms
  FOR ALL USING (
    customer_id = auth.uid() OR 
    artist_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner')
    )
  );

-- Policy for messages - users can access messages in rooms they participate in
CREATE POLICY "chat_messages_access_policy" ON design_chat_messages
  FOR ALL USING (
    room_id IN (
      SELECT id FROM design_chat_rooms 
      WHERE customer_id = auth.uid() OR 
            artist_id = auth.uid() OR
            EXISTS (
              SELECT 1 FROM auth.users 
              WHERE id = auth.uid() 
              AND raw_user_meta_data->>'role' IN ('admin', 'owner')
            )
    )
  );

-- Grant permissions
GRANT ALL ON design_chat_rooms TO authenticated;
GRANT ALL ON design_chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Insert some test data
INSERT INTO design_chat_rooms (order_id, customer_id, artist_id, room_name) VALUES
('1ba61cbc-d34b-43c8-859a-6def23d1bb17', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Test Order Chat');

-- Get the room ID for test messages
DO $$
DECLARE
    room_uuid UUID;
BEGIN
    SELECT id INTO room_uuid FROM design_chat_rooms WHERE order_id = '1ba61cbc-d34b-43c8-859a-6def23d1bb17';
    
    -- Insert test messages
    INSERT INTO design_chat_messages (room_id, sender_id, sender_type, message) VALUES
    (room_uuid, '00000000-0000-0000-0000-000000000002', 'artist', 'Hello! I''m working on your custom design. Do you have any specific requirements?'),
    (room_uuid, '00000000-0000-0000-0000-000000000001', 'customer', 'Hi! I''d like the design to include our team logo and use blue and white colors.'),
    (room_uuid, '00000000-0000-0000-0000-000000000002', 'artist', 'Perfect! I''ll create a design with those specifications. I''ll send you a preview within 24 hours.');
END $$;

-- Test query to verify everything works
SELECT 'Chat system created successfully!' as status;
SELECT COUNT(*) as room_count FROM design_chat_rooms;
SELECT COUNT(*) as message_count FROM design_chat_messages;
