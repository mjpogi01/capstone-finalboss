-- Complete Artist System Setup for Supabase
-- Purpose: Workload management and order notifications for 20 design artists
-- Artists handle design layouting for:
-- 1. CUSTOM_DESIGN orders: Custom designs uploaded by customers (order_type = 'custom_design')
-- 2. REGULAR orders: Products from store catalog (order_type = 'regular') 
-- 3. WALK-IN orders: In-person orders placed by staff (order_number starts with 'WALKIN-')

-- Run this in Supabase SQL Editor



-- ============================================

-- 1. CREATE ARTIST_PROFILES TABLE

-- ============================================

CREATE TABLE IF NOT EXISTS artist_profiles (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  artist_name VARCHAR(255) NOT NULL,

  bio TEXT,

  portfolio_url TEXT,

  social_media JSONB,

  specialties TEXT[],

  commission_rate DECIMAL(5,2) DEFAULT 0.00,

  total_designs INTEGER DEFAULT 0,

  total_sales INTEGER DEFAULT 0,

  total_tasks_completed INTEGER DEFAULT 0,

  rating DECIMAL(3,2) DEFAULT 0.00,

  is_verified BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(user_id)

);



-- ============================================

-- 2. CREATE ARTIST_TASKS TABLE

-- ============================================

CREATE TABLE IF NOT EXISTS artist_tasks (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  artist_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,

  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,

  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  

  -- Task Details

  task_title VARCHAR(255) NOT NULL,

  task_description TEXT NOT NULL,

  design_requirements TEXT,

  reference_files JSONB,

  product_thumbnail TEXT,

  

  -- Order Type Classification

  order_type VARCHAR(50) DEFAULT 'custom_design' CHECK (order_type IN ('custom_design', 'regular', 'walk_in')),

  is_custom_order BOOLEAN DEFAULT TRUE,

  order_source VARCHAR(50) DEFAULT 'online' CHECK (order_source IN ('online', 'walk_in', 'phone')),

  

  -- Priority & Deadline

  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),

  deadline TIMESTAMPTZ NOT NULL,

  

  -- Status Management

  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'submitted', 'approved', 'revision_required', 'completed', 'cancelled')),

  

  -- File Uploads

  uploaded_files JSONB,

  preview_image TEXT,

  source_file TEXT,

  

  -- Communication

  artist_notes TEXT,

  admin_notes TEXT,

  revision_notes TEXT,

  

  -- Timestamps

  assigned_at TIMESTAMPTZ DEFAULT now(),

  started_at TIMESTAMPTZ,

  submitted_at TIMESTAMPTZ,

  approved_at TIMESTAMPTZ,

  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



-- ============================================

-- 3. CREATE ARTIST_DESIGNS TABLE

-- ============================================

CREATE TABLE IF NOT EXISTS artist_designs (

  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  artist_id UUID NOT NULL REFERENCES artist_profiles(id) ON DELETE CASCADE,

  product_id UUID REFERENCES products(id) ON DELETE SET NULL,

  task_id UUID REFERENCES artist_tasks(id) ON DELETE SET NULL,

  

  design_name VARCHAR(255) NOT NULL,

  design_description TEXT,

  design_image TEXT NOT NULL,

  design_category VARCHAR(100),

  tags TEXT[],

  price DECIMAL(10,2),

  

  is_approved BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,

  is_featured BOOLEAN DEFAULT FALSE,

  

  views_count INTEGER DEFAULT 0,

  likes_count INTEGER DEFAULT 0,

  sales_count INTEGER DEFAULT 0,

  

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()

);



-- ============================================

-- 4. CREATE INDEXES

-- ============================================



-- Artist Profiles

CREATE INDEX IF NOT EXISTS idx_artist_profiles_user_id ON artist_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_is_verified ON artist_profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_is_active ON artist_profiles(is_active);

CREATE INDEX IF NOT EXISTS idx_artist_profiles_rating ON artist_profiles(rating DESC);



-- Artist Tasks

CREATE INDEX IF NOT EXISTS idx_artist_tasks_artist_id ON artist_tasks(artist_id);

CREATE INDEX IF NOT EXISTS idx_artist_tasks_order_id ON artist_tasks(order_id);

CREATE INDEX IF NOT EXISTS idx_artist_tasks_status ON artist_tasks(status);

CREATE INDEX IF NOT EXISTS idx_artist_tasks_priority ON artist_tasks(priority);

CREATE INDEX IF NOT EXISTS idx_artist_tasks_deadline ON artist_tasks(deadline);

CREATE INDEX IF NOT EXISTS idx_artist_tasks_created_at ON artist_tasks(created_at DESC);



-- Artist Designs

CREATE INDEX IF NOT EXISTS idx_artist_designs_artist_id ON artist_designs(artist_id);

CREATE INDEX IF NOT EXISTS idx_artist_designs_product_id ON artist_designs(product_id);

CREATE INDEX IF NOT EXISTS idx_artist_designs_task_id ON artist_designs(task_id);

CREATE INDEX IF NOT EXISTS idx_artist_designs_is_approved ON artist_designs(is_approved);

CREATE INDEX IF NOT EXISTS idx_artist_designs_is_active ON artist_designs(is_active);

CREATE INDEX IF NOT EXISTS idx_artist_designs_sales_count ON artist_designs(sales_count DESC);



-- ============================================

-- 5. CREATE TRIGGER FUNCTIONS

-- ============================================



-- Update artist stats when tasks change

CREATE OR REPLACE FUNCTION update_artist_task_stats()

RETURNS TRIGGER AS $$

BEGIN

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN

    UPDATE artist_profiles

    SET 

      total_tasks_completed = (

        SELECT COUNT(*) 

        FROM artist_tasks 

        WHERE artist_id = NEW.artist_id AND status = 'completed'

      ),

      updated_at = now()

    WHERE id = NEW.artist_id;

  ELSIF TG_OP = 'DELETE' THEN

    UPDATE artist_profiles

    SET 

      total_tasks_completed = (

        SELECT COUNT(*) 

        FROM artist_tasks 

        WHERE artist_id = OLD.artist_id AND status = 'completed'

      ),

      updated_at = now()

    WHERE id = OLD.artist_id;

  END IF;

  RETURN NULL;

END;

$$ LANGUAGE plpgsql;



-- Update artist design stats

CREATE OR REPLACE FUNCTION update_artist_design_stats()

RETURNS TRIGGER AS $$

BEGIN

  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN

    UPDATE artist_profiles

    SET 

      total_designs = (

        SELECT COUNT(*) 

        FROM artist_designs 

        WHERE artist_id = NEW.artist_id AND is_active = true

      ),

      total_sales = (

        SELECT COALESCE(SUM(sales_count), 0)

        FROM artist_designs 

        WHERE artist_id = NEW.artist_id

      ),

      updated_at = now()

    WHERE id = NEW.artist_id;

  ELSIF TG_OP = 'DELETE' THEN

    UPDATE artist_profiles

    SET 

      total_designs = (

        SELECT COUNT(*) 

        FROM artist_designs 

        WHERE artist_id = OLD.artist_id AND is_active = true

      ),

      total_sales = (

        SELECT COALESCE(SUM(sales_count), 0)

        FROM artist_designs 

        WHERE artist_id = OLD.artist_id

      ),

      updated_at = now()

    WHERE id = OLD.artist_id;

  END IF;

  RETURN NULL;

END;

$$ LANGUAGE plpgsql;



-- Auto-update updated_at timestamp

CREATE OR REPLACE FUNCTION update_updated_at_column()

RETURNS TRIGGER AS $$

BEGIN

  NEW.updated_at = now();

  RETURN NEW;

END;

$$ LANGUAGE plpgsql;



-- ============================================

-- 6. CREATE TRIGGERS

-- ============================================



-- Trigger for artist task stats

DROP TRIGGER IF EXISTS trigger_update_artist_task_stats ON artist_tasks;

CREATE TRIGGER trigger_update_artist_task_stats

AFTER INSERT OR UPDATE OR DELETE ON artist_tasks

FOR EACH ROW EXECUTE FUNCTION update_artist_task_stats();



-- Trigger for artist design stats

DROP TRIGGER IF EXISTS trigger_update_artist_design_stats ON artist_designs;

CREATE TRIGGER trigger_update_artist_design_stats

AFTER INSERT OR UPDATE OR DELETE ON artist_designs

FOR EACH ROW EXECUTE FUNCTION update_artist_design_stats();



-- Trigger for updated_at on artist_profiles

DROP TRIGGER IF EXISTS update_artist_profiles_updated_at ON artist_profiles;

CREATE TRIGGER update_artist_profiles_updated_at

BEFORE UPDATE ON artist_profiles

FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Trigger for updated_at on artist_tasks

DROP TRIGGER IF EXISTS update_artist_tasks_updated_at ON artist_tasks;

CREATE TRIGGER update_artist_tasks_updated_at

BEFORE UPDATE ON artist_tasks

FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- Trigger for updated_at on artist_designs

DROP TRIGGER IF EXISTS update_artist_designs_updated_at ON artist_designs;

CREATE TRIGGER update_artist_designs_updated_at

BEFORE UPDATE ON artist_designs

FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();



-- ============================================

-- 7. CREATE 20 ARTIST PROFILES (Artist1-20)

-- ============================================

-- NOTE: Artists will have their own user accounts with role = 'artist'
-- Artist profiles will be created when artists register/log in
-- This creates placeholder profiles that can be linked to actual user accounts later

-- Example: Create artist profile for existing user with artist role
-- INSERT INTO artist_profiles (
--   user_id,
--   artist_name,
--   bio,
--   specialties,
--   commission_rate,
--   rating,
--   is_verified,
--   is_active
-- ) VALUES (
--   'actual-user-uuid-here', -- Replace with real user ID who has artist role
--   'Artist Name',
--   'Professional design layout specialist',
--   ARRAY['Layout Design', 'Custom Graphics', 'Team Jerseys'],
--   12.00,
--   0.00,
--   false,
--   true
-- ) ON CONFLICT (user_id) DO NOTHING;



-- ============================================

-- 8. WORKLOAD BALANCING FUNCTIONS

-- ============================================

-- Function to assign tasks to least busy artist
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
  -- Find artist with least pending tasks
  SELECT ap.id INTO v_artist_id
  FROM artist_profiles ap
  LEFT JOIN artist_tasks at ON ap.id = at.artist_id 
    AND at.status IN ('pending', 'in_progress')
  WHERE ap.is_active = true
  GROUP BY ap.id, ap.artist_name
  ORDER BY COUNT(at.id) ASC, ap.artist_name ASC
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

-- Function to assign custom design order tasks (custom designs)
CREATE OR REPLACE FUNCTION assign_custom_design_task(
  p_order_id UUID,
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'medium',
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '3 days',
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with custom design order type
  SELECT assign_task_to_least_busy_artist(
    'Custom Design: ' || p_product_name,
    'Create custom design layout. Quantity: ' || p_quantity || ' units' || 
    CASE WHEN p_customer_requirements IS NOT NULL THEN '. Requirements: ' || p_customer_requirements ELSE '' END,
    'Custom design creation. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '3 days'),
    p_order_id,
    p_product_id,
    'custom_design',
    true,
    'online'
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign regular order tasks (products from store catalog)
CREATE OR REPLACE FUNCTION assign_regular_order_task(
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'medium',
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '2 days',
  p_order_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL,
  p_order_source VARCHAR(50) DEFAULT 'online'
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with regular order type
  SELECT assign_task_to_least_busy_artist(
    'Layout Store Product: ' || p_product_name,
    'Prepare layout for store product.' ||
    CASE WHEN p_customer_requirements IS NOT NULL THEN E'\n' || p_customer_requirements ELSE '' END,
    'Store product layout. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '2 days'),
    p_order_id,
    p_product_id,
    'regular',
    false,
    p_order_source
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to assign walk-in order tasks (in-person orders)
CREATE OR REPLACE FUNCTION assign_walk_in_order_task(
  p_product_name VARCHAR(255),
  p_quantity INTEGER,
  p_customer_requirements TEXT DEFAULT NULL,
  p_priority VARCHAR(20) DEFAULT 'high', -- Walk-ins usually higher priority
  p_deadline TIMESTAMPTZ DEFAULT now() + INTERVAL '1 day', -- Faster turnaround
  p_order_id UUID DEFAULT NULL,
  p_product_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_task_id UUID;
BEGIN
  -- Assign to least busy artist with walk-in order type
  SELECT assign_task_to_least_busy_artist(
    'Walk-in Order: ' || p_product_name,
    'Process walk-in order. Quantity: ' || p_quantity || ' units' || 
    CASE WHEN p_customer_requirements IS NOT NULL THEN '. Customer notes: ' || p_customer_requirements ELSE '' END,
    'Walk-in order processing. Quantity: ' || p_quantity || '. Product: ' || p_product_name,
    p_priority,
    COALESCE(p_deadline, now() + INTERVAL '1 day'),
    p_order_id,
    p_product_id,
    'walk_in',
    false,
    'walk_in'
  ) INTO v_task_id;
  
  RETURN v_task_id;
END;
$$ LANGUAGE plpgsql;

-- Function to create artist profile when user registers with artist role
CREATE OR REPLACE FUNCTION create_artist_profile_on_registration()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user has artist role
  IF NEW.raw_user_meta_data->>'role' = 'artist' THEN
    -- Create artist profile
    INSERT INTO artist_profiles (
      user_id,
      artist_name,
      bio,
      specialties,
      commission_rate,
      rating,
      is_verified,
      is_active
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'artist_name', 'Artist ' || NEW.id::text),
      'Professional design layout specialist',
      ARRAY['Layout Design', 'Custom Graphics', 'Team Jerseys'],
      12.00,
      0.00,
      false,
      true
    ) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-create artist profiles
DROP TRIGGER IF EXISTS trigger_create_artist_profile ON auth.users;
CREATE TRIGGER trigger_create_artist_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_artist_profile_on_registration();

-- Function to get artist workload summary
CREATE OR REPLACE FUNCTION get_artist_workload_summary()
RETURNS TABLE (
  artist_name VARCHAR(255),
  pending_tasks INTEGER,
  in_progress_tasks INTEGER,
  completed_tasks INTEGER,
  total_tasks INTEGER,
  custom_design_orders INTEGER,
  regular_orders INTEGER,
  walk_in_orders INTEGER,
  avg_completion_time INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.artist_name,
    COUNT(CASE WHEN at.status = 'pending' THEN 1 END)::INTEGER as pending_tasks,
    COUNT(CASE WHEN at.status = 'in_progress' THEN 1 END)::INTEGER as in_progress_tasks,
    COUNT(CASE WHEN at.status = 'completed' THEN 1 END)::INTEGER as completed_tasks,
    COUNT(at.id)::INTEGER as total_tasks,
    COUNT(CASE WHEN at.order_type = 'custom_design' THEN 1 END)::INTEGER as custom_design_orders,
    COUNT(CASE WHEN at.order_type = 'regular' THEN 1 END)::INTEGER as regular_orders,
    COUNT(CASE WHEN at.order_type = 'walk_in' THEN 1 END)::INTEGER as walk_in_orders,
    AVG(CASE 
      WHEN at.status = 'completed' AND at.completed_at IS NOT NULL 
      THEN at.completed_at - at.assigned_at 
    END) as avg_completion_time
  FROM artist_profiles ap
  LEFT JOIN artist_tasks at ON ap.id = at.artist_id
  WHERE ap.is_active = true
  GROUP BY ap.id, ap.artist_name
  ORDER BY pending_tasks + in_progress_tasks DESC, ap.artist_name ASC;
END;
$$ LANGUAGE plpgsql;



-- ============================================

-- 9. GRANT PERMISSIONS

-- ============================================

-- Grant access to authenticated users
GRANT ALL ON artist_profiles TO authenticated;
GRANT ALL ON artist_tasks TO authenticated;
GRANT ALL ON artist_designs TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION assign_task_to_least_busy_artist TO authenticated;
GRANT EXECUTE ON FUNCTION assign_custom_design_task TO authenticated;
GRANT EXECUTE ON FUNCTION assign_regular_order_task TO authenticated;
GRANT EXECUTE ON FUNCTION assign_walk_in_order_task TO authenticated;
GRANT EXECUTE ON FUNCTION get_artist_workload_summary TO authenticated;



-- ============================================

-- COMPLETE! ✅

-- ============================================

-- Verify setup was successful
SELECT 
  'artist_profiles' as table_name,
  COUNT(*) as record_count
FROM artist_profiles
UNION ALL
SELECT 
  'artist_tasks',
  COUNT(*)
FROM artist_tasks
UNION ALL
SELECT 
  'artist_designs',
  COUNT(*)
FROM artist_designs;

-- Show all 20 artists created
SELECT 
  artist_name,
  is_active,
  total_tasks_completed,
  rating
FROM artist_profiles 
ORDER BY artist_name;

-- Test workload balancing functions
SELECT * FROM get_artist_workload_summary();

-- NOTE: 
-- CUSTOM_DESIGN orders = Custom designs uploaded by customers (order_type = 'custom_design')
-- REGULAR orders = Products from store catalog (order_type = 'regular') 
-- WALK_IN orders = In-person orders placed by staff (order_type = 'walk_in')

-- Example: Assign a custom design order task
-- SELECT assign_task_to_least_busy_artist(
--   'Custom Basketball Jersey Design',
--   'Create custom design for Team Phoenix basketball jersey',
--   'Colors: Red/Black, Include team logo and player numbers',
--   'high',
--   now() + INTERVAL '3 days',
--   'order-uuid-here',
--   'product-uuid-here',
--   'custom_design',
--   true,
--   'online'
-- );

-- Example: Assign a regular order task (store product)
-- SELECT assign_regular_order_task(
--   'Basketball Jersey - Team Phoenix',
--   25,
--   'Customer wants size M-L only',
--   'medium',
--   now() + INTERVAL '2 days',
--   'order-uuid-here',
--   'product-uuid-here',
--   'online'
-- );

-- Example: Assign a walk-in order task
-- SELECT assign_walk_in_order_task(
--   'T-Shirt - Company Logo',
--   10,
--   'Customer wants rush order',
--   'urgent',
--   now() + INTERVAL '4 hours',
--   'order-uuid-here',
--   'product-uuid-here'
-- );
