const { query } = require('../lib/db');

async function createOrdersTable() {
  try {
    console.log('📋 Creating orders table...');
    
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

    // Create indexes for better performance
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_orders_order_number ON orders(order_number);`);

    console.log('✅ Orders table created successfully!');
    
  } catch (error) {
    console.error('❌ Failed to create orders table:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createOrdersTable()
    .then(() => {
      console.log('✅ Orders table setup completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Orders table setup failed:', error);
      process.exit(1);
    });
}

module.exports = { createOrdersTable };
