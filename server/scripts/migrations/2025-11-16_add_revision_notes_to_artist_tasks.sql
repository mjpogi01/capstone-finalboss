-- Migration: Ensure artist_tasks has a revision_notes column
-- Safe to run multiple times

ALTER TABLE IF EXISTS artist_tasks
  ADD COLUMN IF NOT EXISTS revision_notes TEXT;

-- Helpful index if filtering/ordering by order_id frequently
CREATE INDEX IF NOT EXISTS idx_artist_tasks_order_id ON artist_tasks(order_id);


