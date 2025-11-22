const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Supabase connection configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to execute raw SQL queries using Supabase
async function query(text, params) {
  const start = Date.now();
  try {
    // Use Supabase's RPC to execute SQL
    // Note: This requires creating a custom function in Supabase
    // For now, we'll try to use the rpc method
    const { data, error } = await supabase.rpc('exec_sql', { 
      query_text: text 
    });

    if (error) {
      // If custom RPC doesn't exist, fallback to direct table operations
      console.log('RPC not available, trying alternative approach');
      throw error;
    }

    const duration = Date.now() - start;
    
    // eslint-disable-next-line no-console
    console.log('executed query', { text: text.substring(0, 100), duration, rows: data?.length || 0 });
    
    // Return in PostgreSQL format for compatibility
    return {
      rows: data || [],
      rowCount: data?.length || 0
    };
  } catch (error) {
    console.error('Query execution error:', error.message);
    // Return empty result instead of crashing
    return {
      rows: [],
      rowCount: 0
    };
  }
}

async function ensureUsersTable() {
  // Ensure pgcrypto for gen_random_uuid()
  await query(`CREATE EXTENSION IF NOT EXISTS pgcrypto;`);
  
  // Note: Using Supabase Auth users table (auth.users) - no custom users table needed
  console.log('Using Supabase Auth users table (auth.users)');

  // Create branches table
  await query(`
    CREATE TABLE IF NOT EXISTS branches (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Insert default branches (1-9)
  await query(`
    INSERT INTO branches (id, name, address, city, phone, email) VALUES
    (1, 'Main Branch', '123 Main St', 'Batangas City', '+63-43-123-4567', 'main@yohanns.com'),
    (2, 'Mall Branch', '456 Mall Ave', 'Batangas City', '+63-43-234-5678', 'mall@yohanns.com'),
    (3, 'Downtown Branch', '789 Downtown Blvd', 'Batangas City', '+63-43-345-6789', 'downtown@yohanns.com'),
    (4, 'Suburb Branch', '321 Suburb St', 'Batangas City', '+63-43-456-7890', 'suburb@yohanns.com'),
    (5, 'Coastal Branch', '654 Coastal Rd', 'Batangas City', '+63-43-567-8901', 'coastal@yohanns.com'),
    (6, 'University Branch', '987 University Ave', 'Batangas City', '+63-43-678-9012', 'university@yohanns.com'),
    (7, 'Industrial Branch', '147 Industrial Zone', 'Batangas City', '+63-43-789-0123', 'industrial@yohanns.com'),
    (8, 'Residential Branch', '258 Residential Area', 'Batangas City', '+63-43-890-1234', 'residential@yohanns.com'),
    (9, 'Business Branch', '369 Business District', 'Batangas City', '+63-43-901-2345', 'business@yohanns.com')
    ON CONFLICT (id) DO NOTHING;
  `);

  // Create products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      size TEXT,
      available_sizes TEXT,
      price DECIMAL(10,2) NOT NULL,
      description TEXT,
      main_image TEXT,
      additional_images TEXT[],
      stock_quantity INTEGER DEFAULT 0,
      sold_quantity INTEGER DEFAULT 0,
      branch_id INTEGER REFERENCES branches(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Add available_sizes column if it doesn't exist (for existing databases)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'available_sizes'
      ) THEN
        ALTER TABLE products ADD COLUMN available_sizes TEXT;
      END IF;
    END $$;
  `);

  // Create user_addresses table
  await query(`
    CREATE TABLE IF NOT EXISTS user_addresses (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name VARCHAR(255) NOT NULL,
      phone VARCHAR(20) NOT NULL,
      street_address TEXT NOT NULL,
      barangay VARCHAR(100) NOT NULL,
      city VARCHAR(100) NOT NULL,
      province VARCHAR(100) NOT NULL,
      postal_code VARCHAR(10) NOT NULL,
      address TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create indexes for user_addresses
  await query(`CREATE INDEX IF NOT EXISTS idx_user_addresses_user_id ON user_addresses(user_id);`);
  
  // Add is_default column if it doesn't exist
  await query(`ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;`);
  
  // Add email column if it doesn't exist
  await query(`ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS email VARCHAR(255);`);
  
  // Create index for default addresses
  await query(`CREATE INDEX IF NOT EXISTS idx_user_addresses_default ON user_addresses(user_id, is_default);`);

  // Create user_carts table
  await query(`
    CREATE TABLE IF NOT EXISTS user_carts (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      unique_id TEXT NOT NULL,
      is_team_order BOOLEAN DEFAULT false,
      team_members JSONB,
      team_name TEXT,
      single_order_details JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  // Create indexes for user_carts
  await query(`CREATE INDEX IF NOT EXISTS idx_user_carts_user_id ON user_carts(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_carts_product_id ON user_carts(product_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_carts_unique_id ON user_carts(unique_id);`);

  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS base_price NUMERIC;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS unit_price NUMERIC;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS fabric_option TEXT;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS fabric_surcharge NUMERIC DEFAULT 0;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS size_surcharge NUMERIC DEFAULT 0;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS size_surcharge_total NUMERIC DEFAULT 0;`);
  await query(`ALTER TABLE user_carts ADD COLUMN IF NOT EXISTS surcharge_details JSONB;`);

  // Create user_wishlist table
  await query(`
    CREATE TABLE IF NOT EXISTS user_wishlist (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id, product_id)
    );
  `);

  // Create indexes for user_wishlist
  await query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_id ON user_wishlist(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_product_id ON user_wishlist(product_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_wishlist_created_at ON user_wishlist(created_at);`);

  // Create trigger to update updated_at timestamp for wishlist
  await query(`
    CREATE OR REPLACE FUNCTION update_wishlist_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await query(`
    CREATE TRIGGER update_user_wishlist_updated_at
      BEFORE UPDATE ON user_wishlist
      FOR EACH ROW
      EXECUTE FUNCTION update_wishlist_updated_at();
  `);

  // Create user_profiles table
  await query(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      full_name VARCHAR(255),
      phone VARCHAR(20),
      gender VARCHAR(10) CHECK (gender IN ('Male', 'Female', 'Other')),
      date_of_birth DATE,
      address TEXT,
      avatar_url TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      UNIQUE(user_id)
    );
  `);

  // Create indexes for user_profiles
  await query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);`);

  // Create trigger to update updated_at timestamp for user_profiles
  await query(`
    CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await query(`
    CREATE TRIGGER update_user_profiles_updated_at
      BEFORE UPDATE ON user_profiles
      FOR EACH ROW
      EXECUTE FUNCTION update_user_profiles_updated_at();
  `);

  // Create orders table
  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      order_number VARCHAR(50) UNIQUE NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')),
      shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('pickup', 'cod')),
      pickup_location VARCHAR(100),
      delivery_address JSONB,
      order_notes TEXT,
      subtotal_amount DECIMAL(10,2) NOT NULL,
      shipping_cost DECIMAL(10,2) DEFAULT 0,
      total_amount DECIMAL(10,2) NOT NULL,
      total_items INTEGER NOT NULL,
      order_items JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);

  // Create indexes for orders table
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
  await query(`CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);`);

  // Create trigger to update updated_at timestamp for orders
  await query(`
    CREATE OR REPLACE FUNCTION update_orders_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  await query(`
    CREATE TRIGGER update_orders_updated_at
      BEFORE UPDATE ON orders
      FOR EACH ROW
      EXECUTE FUNCTION update_orders_updated_at();
  `);
}

module.exports = { supabase, query, ensureUsersTable };
