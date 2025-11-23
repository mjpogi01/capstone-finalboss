-- Migration: Add total_sales column to branches table
-- Purpose: Track total sales per branch and overall business sales
-- Safe to run multiple times

-- Add total_sales column to branches table if it doesn't exist
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS total_sales DECIMAL(12,2) DEFAULT 0;

-- Add updated_at column if it doesn't exist (for tracking when sales were last updated)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Create index for better performance on total_sales queries
CREATE INDEX IF NOT EXISTS idx_branches_total_sales ON branches(total_sales DESC);

-- Add comment to document the column
COMMENT ON COLUMN branches.total_sales IS 'Total sales amount for this branch. Updated when orders reach picked_up_delivered or completed status.';

-- Note: To calculate overall business total sales, you can sum all branch total_sales:
-- SELECT SUM(total_sales) AS business_total_sales FROM branches;


