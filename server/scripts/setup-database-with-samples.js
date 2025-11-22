const { supabase } = require('../lib/db');

async function setupDatabase() {
  try {
    console.log('📋 Setting up database tables...');
    
    // Create orders table using Supabase client
    const { error: ordersError } = await supabase.rpc('create_orders_table');
    
    if (ordersError) {
      console.log('Orders table might already exist or RPC not available');
    }
    
    console.log('✅ Database setup completed!');
    
  } catch (error) {
    console.error('❌ Failed to setup database:', error);
    throw error;
  }
}

async function addSampleOrders() {
  try {
    console.log('📋 Adding sample orders to database...');
    
    // Sample orders data
    const sampleOrders = [
      {
        user_id: '00000000-0000-0000-0000-000000000001',
        order_number: 'ORD-001',
        status: 'completed',
        shipping_method: 'pickup',
        pickup_location: 'Main Branch',
        subtotal_amount: 1500.00,
        shipping_cost: 0.00,
        total_amount: 1500.00,
        total_items: 2,
        order_items: [
          {
            name: 'Basketball Jersey',
            category: 'Jerseys',
            price: 750.00,
            quantity: 2
          }
        ],
        created_at: new Date('2024-01-15').toISOString()
      },
      {
        user_id: '00000000-0000-0000-0000-000000000002',
        order_number: 'ORD-002',
        status: 'processing',
        shipping_method: 'cod',
        pickup_location: 'Mall Branch',
        subtotal_amount: 2200.00,
        shipping_cost: 50.00,
        total_amount: 2250.00,
        total_items: 3,
        order_items: [
          {
            name: 'Football Jersey',
            category: 'Jerseys',
            price: 800.00,
            quantity: 2
          },
          {
            name: 'Sports Shorts',
            category: 'Shorts',
            price: 600.00,
            quantity: 1
          }
        ],
        created_at: new Date('2024-01-20').toISOString()
      },
      {
        user_id: '00000000-0000-0000-0000-000000000003',
        order_number: 'ORD-003',
        status: 'pending',
        shipping_method: 'pickup',
        pickup_location: 'Downtown Branch',
        subtotal_amount: 1800.00,
        shipping_cost: 0.00,
        total_amount: 1800.00,
        total_items: 4,
        order_items: [
          {
            name: 'Volleyball Jersey',
            category: 'Jerseys',
            price: 450.00,
            quantity: 4
          }
        ],
        created_at: new Date('2024-01-25').toISOString()
      },
      {
        user_id: '00000000-0000-0000-0000-000000000004',
        order_number: 'ORD-004',
        status: 'completed',
        shipping_method: 'pickup',
        pickup_location: 'University Branch',
        subtotal_amount: 3200.00,
        shipping_cost: 0.00,
        total_amount: 3200.00,
        total_items: 2,
        order_items: [
          {
            name: 'Basketball Jersey',
            category: 'Jerseys',
            price: 1600.00,
            quantity: 2
          }
        ],
        created_at: new Date('2024-02-01').toISOString()
      },
      {
        user_id: '00000000-0000-0000-0000-000000000005',
        order_number: 'ORD-005',
        status: 'completed',
        shipping_method: 'cod',
        pickup_location: 'Coastal Branch',
        subtotal_amount: 2800.00,
        shipping_cost: 100.00,
        total_amount: 2900.00,
        total_items: 3,
        order_items: [
          {
            name: 'Football Jersey',
            category: 'Jerseys',
            price: 900.00,
            quantity: 2
          },
          {
            name: 'Sports Cap',
            category: 'Accessories',
            price: 1000.00,
            quantity: 1
          }
        ],
        created_at: new Date('2024-02-05').toISOString()
      }
    ];

    // Insert sample orders
    const { data, error } = await supabase
      .from('orders')
      .insert(sampleOrders);

    if (error) {
      console.error('❌ Error inserting sample orders:', error);
      throw error;
    }

    console.log('✅ Sample orders added successfully!');
    console.log(`📊 Added ${sampleOrders.length} sample orders`);
    
  } catch (error) {
    console.error('❌ Failed to add sample orders:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase()
    .then(() => addSampleOrders())
    .then(() => {
      console.log('✅ Database setup and sample data completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupDatabase, addSampleOrders };


