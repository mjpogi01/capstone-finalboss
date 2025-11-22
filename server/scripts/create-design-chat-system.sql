-- ============================================
-- DESIGN CHAT SYSTEM FOR CUSTOMER-ARTIST COMMUNICATION
-- ============================================

-- Create design_chat_rooms table
CREATE TABLE IF NOT EXISTS design_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES artist_profiles(id) ON DELETE CASCADE,
  task_id UUID REFERENCES artist_tasks(id) ON DELETE CASCADE,
  room_name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Create design_chat_messages table
CREATE TABLE IF NOT EXISTS design_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES design_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'artist', 'admin')),
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file', 'design_update', 'approval_request', 'approval_response')),
  attachments JSONB DEFAULT '[]'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_order_id ON design_chat_rooms(order_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_customer_id ON design_chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_artist_id ON design_chat_rooms(artist_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_task_id ON design_chat_rooms(task_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_rooms_status ON design_chat_rooms(status);

CREATE INDEX IF NOT EXISTS idx_design_chat_messages_room_id ON design_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_messages_sender_id ON design_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_design_chat_messages_created_at ON design_chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_design_chat_messages_is_read ON design_chat_messages(is_read);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_design_chat_rooms_updated_at ON design_chat_rooms;
CREATE TRIGGER update_design_chat_rooms_updated_at
  BEFORE UPDATE ON design_chat_rooms
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_design_chat_messages_updated_at ON design_chat_messages;
CREATE TRIGGER update_design_chat_messages_updated_at
  BEFORE UPDATE ON design_chat_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a chat room for an order
CREATE OR REPLACE FUNCTION create_design_chat_room(
  p_order_id UUID,
  p_customer_id UUID,
  p_artist_id UUID,
  p_task_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_room_id UUID;
  v_order_number VARCHAR(50);
  v_artist_name VARCHAR(255);
BEGIN
  -- Get order number for room name
  SELECT order_number INTO v_order_number
  FROM orders
  WHERE id = p_order_id;

  -- Get artist name for room name
  SELECT artist_name INTO v_artist_name
  FROM artist_profiles
  WHERE id = p_artist_id;

  -- Create the chat room
  INSERT INTO design_chat_rooms (
    order_id,
    customer_id,
    artist_id,
    task_id,
    room_name
  ) VALUES (
    p_order_id,
    p_customer_id,
    p_artist_id,
    p_task_id,
    COALESCE(v_order_number, 'Design Chat') || ' - ' || COALESCE(v_artist_name, 'Artist')
  ) RETURNING id INTO v_room_id;

  RETURN v_room_id;
END;
$$ LANGUAGE plpgsql;

-- Function to send a message
CREATE OR REPLACE FUNCTION send_design_chat_message(
  p_room_id UUID,
  p_sender_id UUID,
  p_sender_type VARCHAR(20),
  p_message TEXT,
  p_message_type VARCHAR(20) DEFAULT 'text',
  p_attachments JSONB DEFAULT '[]'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  -- Insert the message
  INSERT INTO design_chat_messages (
    room_id,
    sender_id,
    sender_type,
    message,
    message_type,
    attachments
  ) VALUES (
    p_room_id,
    p_sender_id,
    p_sender_type,
    p_message,
    p_message_type,
    p_attachments
  ) RETURNING id INTO v_message_id;

  -- Update the room's last_message_at
  UPDATE design_chat_rooms
  SET last_message_at = now()
  WHERE id = p_room_id;

  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get chat room messages
CREATE OR REPLACE FUNCTION get_chat_room_messages(p_room_id UUID)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  sender_type VARCHAR(20),
  message TEXT,
  message_type VARCHAR(20),
  attachments JSONB,
  is_read BOOLEAN,
  created_at TIMESTAMPTZ,
  sender_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.sender_id,
    m.sender_type,
    m.message,
    m.message_type,
    m.attachments,
    m.is_read,
    m.created_at,
    CASE 
      WHEN m.sender_type = 'customer' THEN 
        COALESCE(cu.first_name || ' ' || cu.last_name, cu.email)
      WHEN m.sender_type = 'artist' THEN 
        ap.artist_name
      ELSE 'Admin'
    END as sender_name
  FROM design_chat_messages m
  LEFT JOIN user_profiles cu ON m.sender_id = cu.user_id AND m.sender_type = 'customer'
  LEFT JOIN artist_profiles ap ON m.sender_id = ap.user_id AND m.sender_type = 'artist'
  WHERE m.room_id = p_room_id
  ORDER BY m.created_at ASC;
END;
$$ LANGUAGE plpgsql;

-- Function to get customer's chat rooms
CREATE OR REPLACE FUNCTION get_customer_chat_rooms(p_customer_id UUID)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  artist_id UUID,
  task_id UUID,
  room_name VARCHAR(255),
  status VARCHAR(50),
  last_message_at TIMESTAMPTZ,
  artist_name VARCHAR(255),
  order_number VARCHAR(50),
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.order_id,
    r.artist_id,
    r.task_id,
    r.room_name,
    r.status,
    r.last_message_at,
    ap.artist_name,
    o.order_number,
    COALESCE(unread.unread_count, 0)::INTEGER as unread_count
  FROM design_chat_rooms r
  LEFT JOIN artist_profiles ap ON r.artist_id = ap.id
  LEFT JOIN orders o ON r.order_id = o.id
  LEFT JOIN (
    SELECT 
      room_id,
      COUNT(*) as unread_count
    FROM design_chat_messages
    WHERE sender_type != 'customer' AND is_read = false
    GROUP BY room_id
  ) unread ON r.id = unread.room_id
  WHERE r.customer_id = p_customer_id
  ORDER BY r.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get artist's chat rooms
CREATE OR REPLACE FUNCTION get_artist_chat_rooms(p_artist_id UUID)
RETURNS TABLE (
  id UUID,
  order_id UUID,
  customer_id UUID,
  task_id UUID,
  room_name VARCHAR(255),
  status VARCHAR(50),
  last_message_at TIMESTAMPTZ,
  customer_name TEXT,
  order_number VARCHAR(50),
  unread_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.order_id,
    r.customer_id,
    r.task_id,
    r.room_name,
    r.status,
    r.last_message_at,
    COALESCE(cu.first_name || ' ' || cu.last_name, cu.email) as customer_name,
    o.order_number,
    COALESCE(unread.unread_count, 0)::INTEGER as unread_count
  FROM design_chat_rooms r
  LEFT JOIN user_profiles cu ON r.customer_id = cu.user_id
  LEFT JOIN orders o ON r.order_id = o.id
  LEFT JOIN (
    SELECT 
      room_id,
      COUNT(*) as unread_count
    FROM design_chat_messages
    WHERE sender_type != 'artist' AND is_read = false
    GROUP BY room_id
  ) unread ON r.id = unread.room_id
  WHERE r.artist_id = p_artist_id
  ORDER BY r.last_message_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_design_chat_room TO authenticated;
GRANT EXECUTE ON FUNCTION send_design_chat_message TO authenticated;
GRANT EXECUTE ON FUNCTION get_chat_room_messages TO authenticated;
GRANT EXECUTE ON FUNCTION get_customer_chat_rooms TO authenticated;
GRANT EXECUTE ON FUNCTION get_artist_chat_rooms TO authenticated;

-- Enable RLS (Row Level Security)
ALTER TABLE design_chat_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE design_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for design_chat_rooms
CREATE POLICY "Users can view their own chat rooms" ON design_chat_rooms
  FOR SELECT USING (
    customer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can create chat rooms for their orders" ON design_chat_rooms
  FOR INSERT WITH CHECK (
    customer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own chat rooms" ON design_chat_rooms
  FOR UPDATE USING (
    customer_id = auth.uid() OR 
    artist_id IN (SELECT id FROM artist_profiles WHERE user_id = auth.uid())
  );

-- RLS Policies for design_chat_messages
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

CREATE POLICY "Users can update their own messages" ON design_chat_messages
  FOR UPDATE USING (sender_id = auth.uid());

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Test the functions
-- SELECT create_design_chat_room(
--   '00000000-0000-0000-0000-000000000001'::UUID,
--   '00000000-0000-0000-0000-000000000002'::UUID,
--   '00000000-0000-0000-0000-000000000003'::UUID
-- );

-- SELECT send_design_chat_message(
--   'room-uuid-here'::UUID,
--   'sender-uuid-here'::UUID,
--   'customer',
--   'Hello, I have some feedback on the design',
--   'text'
-- );

-- SELECT * FROM get_customer_chat_rooms('customer-uuid-here'::UUID);
-- SELECT * FROM get_artist_chat_rooms('artist-uuid-here'::UUID);
-- SELECT * FROM get_chat_room_messages('room-uuid-here'::UUID);
