-- ====================================================
-- Branch Support Chat Schema
-- ====================================================
-- Creates tables to support customer ↔ branch admin chats
-- ====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS branch_chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL,
  admin_id UUID,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branch_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES branch_chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'admin')),
  message TEXT,
  message_type TEXT NOT NULL DEFAULT 'text',
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branch_chat_rooms_branch ON branch_chat_rooms(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_chat_rooms_customer ON branch_chat_rooms(customer_id);
CREATE INDEX IF NOT EXISTS idx_branch_chat_rooms_status ON branch_chat_rooms(status);
CREATE INDEX IF NOT EXISTS idx_branch_chat_rooms_last_message ON branch_chat_rooms(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_branch_chat_messages_room ON branch_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_branch_chat_messages_sender ON branch_chat_messages(sender_id);

CREATE OR REPLACE FUNCTION update_branch_chat_rooms_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_chat_rooms_updated_at ON branch_chat_rooms;
CREATE TRIGGER trg_branch_chat_rooms_updated_at
  BEFORE UPDATE ON branch_chat_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_branch_chat_rooms_updated_at();



