const { query } = require('../lib/db');

async function createOrderTrackingTables() {
  try {
    console.log('📋 Creating order tracking tables...');
    
    // Create order_tracking table for location updates
    await query(`
      CREATE TABLE IF NOT EXISTS order_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(100),
        description TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_by UUID REFERENCES auth.users(id),
        metadata JSONB
      );
    `);

    // Create order_reviews table for customer reviews
    await query(`
      CREATE TABLE IF NOT EXISTS order_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE(order_id, user_id)
      );
    `);

    // Create delivery_proof table for delivery verification
    await query(`
      CREATE TABLE IF NOT EXISTS delivery_proof (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        delivery_person_name VARCHAR(100),
        delivery_person_contact VARCHAR(20),
        proof_images TEXT[],
        delivery_notes TEXT,
        delivered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        verified_by UUID REFERENCES auth.users(id),
        verified_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_order_tracking_order_id ON order_tracking(order_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_order_tracking_timestamp ON order_tracking(timestamp);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id ON order_reviews(order_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_order_reviews_user_id ON order_reviews(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_delivery_proof_order_id ON delivery_proof(order_id);`);

    // Update orders table to include more status options
    await query(`
      ALTER TABLE orders 
      DROP CONSTRAINT IF EXISTS orders_status_check;
    `);

    await query(`
      ALTER TABLE orders 
      ADD CONSTRAINT orders_status_check 
      CHECK (status IN ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'));
    `);

    console.log('✅ Order tracking tables created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create order tracking tables:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createOrderTrackingTables()
    .then(() => {
      console.log('✅ Order tracking tables setup completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createOrderTrackingTables;
