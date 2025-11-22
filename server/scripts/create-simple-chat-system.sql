-- ============================================
-- SUPABASE CHAT SYSTEM - SIMPLE VERSION
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

-- Create indexes
CREATE INDEX idx_design_chat_rooms_order_id ON design_chat_rooms(order_id);
CREATE INDEX idx_design_chat_rooms_customer_id ON design_chat_rooms(customer_id);
CREATE INDEX idx_design_chat_rooms_artist_id ON design_chat_rooms(artist_id);
CREATE INDEX idx_design_chat_messages_room_id ON design_chat_messages(room_id);
CREATE INDEX idx_design_chat_messages_sender_id ON design_chat_messages(sender_id);

-- Enable RLS
ALTER TABLE design_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "chat_rooms_access_policy" ON design_chat_rooms
  FOR ALL USING (
    customer_id = auth.uid() OR 
    artist_id = auth.uid()
  );

CREATE POLICY "chat_messages_access_policy" ON design_chat_messages
  FOR ALL USING (
    room_id IN (
      SELECT id FROM design_chat_rooms 
      WHERE customer_id = auth.uid() OR artist_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON design_chat_rooms TO authenticated;
GRANT ALL ON design_chat_messages TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
