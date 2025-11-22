-- ============================================
-- DESIGN CHAT SYSTEM - SIMPLIFIED VERSION
-- ============================================

-- Create design_chat_rooms table
CREATE TABLE IF NOT EXISTS design_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  customer_id UUID,
  artist_id UUID,
  task_id UUID,
  room_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Create design_chat_messages table
CREATE TABLE IF NOT EXISTS design_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES design_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID,
  sender_type VARCHAR(20) NOT NULL,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text',
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_order_id ON design_chat_rooms(order_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_customer_id ON design_chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_artist_id ON design_chat_rooms(artist_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_messages_room_id ON design_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_messages_sender_id ON design_chat_messages(sender_id);

-- Enable RLS
ALTER TABLE design_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies
CREATE POLICY "Users can view their own chat rooms" ON design_chat_rooms
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create chat rooms" ON design_chat_rooms
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can view messages in their chat rooms" ON design_chat_messages
  FOR SELECT USING (
    room_id IN (
      SELECT id FROM design_chat_rooms 
      WHERE customer_id = auth.uid() OR 
            artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages to their chat rooms" ON design_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    room_id IN (
      SELECT id FROM design_chat_rooms 
      WHERE customer_id = auth.uid() OR 
            artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
    )
  );
