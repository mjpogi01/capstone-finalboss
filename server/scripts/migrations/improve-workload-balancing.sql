-- Migration: Improve artist workload balancing
-- Purpose: Ensure workload balancing works correctly and handles edge cases
-- Safe to run multiple times

-- Update the assign_task_to_least_busy_artist function to improve workload balancing
CREATE OR REPLACE FUNCTION assign_task_to_least_busy_artist(
  p_task_title VARCHAR(255),
  p_task_description TEXT,
  p_design_requirements TEXT,
  p_priority VARCHAR(20),
  p_deadline TIMESTAMPTZ,
  p_order_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_order_type VARCHAR(50) DEFAULT 'custom_design',
  p_is_custom_order BOOLEAN DEFAULT TRUE,
  p_order_source VARCHAR(50) DEFAULT 'online'
)
RETURNS UUID AS $$
DECLARE
  v_artist_id UUID;
  v_task_id UUID;
BEGIN
  -- Find artist with least pending/in_progress tasks
  -- Uses COALESCE to ensure artists with 0 tasks are counted as 0, not NULL
  -- Orders by workload count first, then by random() to distribute evenly when counts are equal
  SELECT ap.id INTO v_artist_id
  FROM artist_profiles ap
  LEFT JOIN artist_tasks at ON ap.id = at.artist_id 
    AND at.status IN ('pending', 'in_progress')
  WHERE ap.is_active = true
  GROUP BY ap.id, ap.artist_name
  ORDER BY COUNT(at.id) ASC, RANDOM() ASC
  LIMIT 1;

  -- Check if an artist was found
  IF v_artist_id IS NULL THEN
    RAISE EXCEPTION 'No active artist available to assign task';
  END IF;

  -- Create the task
  INSERT INTO artist_tasks (
    artist_id,
    order_id,
    product_id,
    task_title,
    task_description,
    design_requirements,
    order_type,
    is_custom_order,
    order_source,
    priority,
    deadline,
    status
  ) VALUES (
    v_artist_id,
    p_order_id,
    p_product_id,
    p_task_title,
    p_task_description,
    p_design_requirements,
    p_order_type,
    p_is_custom_order,
    p_order_source,
    p_priority,
    p_deadline,
    'pending'
  ) RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION assign_task_to_least_busy_artist TO authenticated;

-- Note: The improvement uses RANDOM() instead of artist_name for tie-breaking
-- This ensures that when multiple artists have the same workload count,
-- tasks are distributed more evenly rather than always going to the same artist


