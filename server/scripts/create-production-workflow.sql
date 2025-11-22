-- ====================================================
-- Production Workflow System
-- ====================================================
-- This creates a comprehensive production tracking system
-- Stages: Layout → Sizing → Printing → Press → Prod → Packing/Completing → Picked Up/Delivered
-- ====================================================

-- Add production_status column to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) DEFAULT 'pending';

-- Create production_workflow table to track each stage
CREATE TABLE IF NOT EXISTS production_workflow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  updated_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create production_workflow_history for audit trail
CREATE TABLE IF NOT EXISTS production_workflow_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  stage VARCHAR(50) NOT NULL,
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  changed_by VARCHAR(100),
  change_notes TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_production_workflow_order_id 
ON production_workflow(order_id);

CREATE INDEX IF NOT EXISTS idx_production_workflow_stage 
ON production_workflow(stage);

CREATE INDEX IF NOT EXISTS idx_production_workflow_status 
ON production_workflow(status);

CREATE INDEX IF NOT EXISTS idx_production_workflow_history_order_id 
ON production_workflow_history(order_id);

-- ====================================================
-- Functions and Triggers
-- ====================================================

-- Function to initialize workflow stages for new orders
CREATE OR REPLACE FUNCTION initialize_production_workflow()
RETURNS TRIGGER AS $$
BEGIN
  -- Create workflow stages for the new order
  INSERT INTO production_workflow (order_id, stage, status)
  VALUES 
    (NEW.id, 'layout', 'pending'),
    (NEW.id, 'sizing', 'pending'),
    (NEW.id, 'printing', 'pending'),
    (NEW.id, 'press', 'pending'),
    (NEW.id, 'prod', 'pending'),
    (NEW.id, 'packing_completing', 'pending'),
    (NEW.id, 'picked_up_delivered', 'pending');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically initialize workflow for new orders
DROP TRIGGER IF EXISTS trigger_initialize_production_workflow ON orders;
CREATE TRIGGER trigger_initialize_production_workflow
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION initialize_production_workflow();

-- Function to update production_workflow updated_at and track history
CREATE OR REPLACE FUNCTION update_production_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  
  -- Record history when status changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO production_workflow_history (
      order_id, stage, previous_status, new_status, changed_by, change_notes
    )
    VALUES (
      NEW.order_id, 
      NEW.stage, 
      OLD.status, 
      NEW.status, 
      NEW.updated_by,
      NEW.notes
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for production_workflow timestamp and history
DROP TRIGGER IF EXISTS trigger_update_production_workflow_timestamp ON production_workflow;
CREATE TRIGGER trigger_update_production_workflow_timestamp
  BEFORE UPDATE ON production_workflow
  FOR EACH ROW
  EXECUTE FUNCTION update_production_workflow_timestamp();

-- ====================================================
-- Initialize workflow for existing orders
-- ====================================================

-- Initialize workflow stages for all existing orders that don't have workflow entries
INSERT INTO production_workflow (order_id, stage, status)
SELECT 
  o.id,
  stage,
  'pending'
FROM orders o
CROSS JOIN (
  VALUES 
    ('layout'),
    ('sizing'),
    ('printing'),
    ('press'),
    ('prod'),
    ('packing_completing'),
    ('picked_up_delivered')
) AS stages(stage)
WHERE NOT EXISTS (
  SELECT 1 FROM production_workflow pw 
  WHERE pw.order_id = o.id AND pw.stage = stages.stage
);

-- ====================================================
-- Row Level Security (RLS) Policies
-- ====================================================

-- Enable RLS on production tables
ALTER TABLE production_workflow ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_workflow_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view workflow for their own orders
CREATE POLICY "Users can view their own order workflow" ON production_workflow
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins and owners can manage all workflows
CREATE POLICY "Admins can manage all production workflows" ON production_workflow
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner')
    )
  );

-- Policy: Users can view workflow history for their own orders
CREATE POLICY "Users can view their own workflow history" ON production_workflow_history
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins and owners can view all workflow history
CREATE POLICY "Admins can view all workflow history" ON production_workflow_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' IN ('admin', 'owner')
    )
  );

-- ====================================================
-- Verification Query
-- ====================================================
-- Run this to verify the setup worked correctly:
-- 
-- SELECT 
--   o.order_number,
--   pw.stage,
--   pw.status,
--   pw.created_at
-- FROM orders o
-- LEFT JOIN production_workflow pw ON o.id = pw.order_id
-- ORDER BY o.created_at DESC, 
--   CASE pw.stage
--     WHEN 'layout' THEN 1
--     WHEN 'sizing' THEN 2
--     WHEN 'printing' THEN 3
--     WHEN 'press' THEN 4
--     WHEN 'prod' THEN 5
--     WHEN 'packing_completing' THEN 6
--     WHEN 'picked_up_delivered' THEN 7
--     ELSE 99
--   END;
-- ====================================================

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Production workflow system created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Workflow stages:';
  RAISE NOTICE '  1. Layout';
  RAISE NOTICE '  2. Sizing';
  RAISE NOTICE '  3. Printing';
  RAISE NOTICE '  4. Press';
  RAISE NOTICE '  5. Prod';
  RAISE NOTICE '  6. Packing/Completing';
  RAISE NOTICE '  7. Picked Up/Delivered';
END $$;

