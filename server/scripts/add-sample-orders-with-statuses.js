const { pool, query } = require('../lib/db');

const sampleOrders = [
  {
    order_number: 'ORD-001',
    user_id: '00000000-0000-0000-0000-000000000001', // Sample user ID
    status: 'pending',
    shipping_method: 'pickup',
    pickup_location: 'Main Branch',
    subtotal_amount: 150.00,
    shipping_cost: 0.00,
    total_amount: 150.00,
    total_items: 2,
    order_items: [
      {
        product_id: 'prod-1',
        product_name: 'Basketball Jersey',
        quantity: 2,
        unit_price: 75.00,
        total_price: 150.00,
        customization: {
          team_name: 'Lakers',
          player_name: 'James',
          number: '23',
          size: 'L'
        }
      }
    ],
    delivery_address: {
      receiver: 'John Doe',
      phone: '+1234567890',
      address: '123 Main St, City, State 12345'
    },
    order_notes: 'Please make sure the jersey is high quality'
  },
  {
    order_number: 'ORD-002',
    user_id: '00000000-0000-0000-0000-000000000002',
    status: 'processing',
    shipping_method: 'pickup',
    pickup_location: 'Main Branch',
    subtotal_amount: 200.00,
    shipping_cost: 0.00,
    total_amount: 200.00,
    total_items: 1,
    design_files: [
      {
        filename: 'design-1.pdf',
        url: 'https://example.com/design-1.pdf',
        publicId: 'design-1',
        uploadedAt: new Date().toISOString()
      }
    ],
    order_items: [
      {
        product_id: 'prod-2',
        product_name: 'Football Jersey',
        quantity: 1,
        unit_price: 200.00,
        total_price: 200.00,
        customization: {
          team_name: 'Patriots',
          player_name: 'Brady',
          number: '12',
          size: 'XL'
        }
      }
    ],
    delivery_address: {
      receiver: 'Jane Smith',
      phone: '+1234567891',
      address: '456 Oak Ave, City, State 12345'
    },
    order_notes: 'Rush order - needed by Friday'
  },
  {
    order_number: 'ORD-003',
    user_id: '00000000-0000-0000-0000-000000000003',
    status: 'completed',
    shipping_method: 'pickup',
    pickup_location: 'Main Branch',
    subtotal_amount: 300.00,
    shipping_cost: 0.00,
    total_amount: 300.00,
    total_items: 3,
    order_items: [
      {
        product_id: 'prod-3',
        product_name: 'Volleyball Jersey',
        quantity: 3,
        unit_price: 100.00,
        total_price: 300.00,
        customization: {
          team_name: 'Eagles',
          player_name: 'Johnson',
          number: '7',
          size: 'M'
        }
      }
    ],
    delivery_address: {
      receiver: 'Mike Johnson',
      phone: '+1234567892',
      address: '789 Pine St, City, State 12345'
    },
    order_notes: 'Standard order'
  },
  {
    order_number: 'ORD-004',
    user_id: '00000000-0000-0000-0000-000000000004',
    status: 'delivered',
    shipping_method: 'pickup',
    pickup_location: 'Main Branch',
    subtotal_amount: 120.00,
    shipping_cost: 0.00,
    total_amount: 120.00,
    total_items: 1,
    order_items: [
      {
        product_id: 'prod-4',
        product_name: 'Basketball Jersey',
        quantity: 1,
        unit_price: 120.00,
        total_price: 120.00,
        customization: {
          team_name: 'Warriors',
          player_name: 'Curry',
          number: '30',
          size: 'L'
        }
      }
    ],
    delivery_address: {
      receiver: 'Sarah Wilson',
      phone: '+1234567893',
      address: '321 Elm St, City, State 12345'
    },
    order_notes: 'Delivered successfully'
  },
  {
    order_number: 'ORD-005',
    user_id: '00000000-0000-0000-0000-000000000005',
    status: 'cancelled',
    shipping_method: 'pickup',
    pickup_location: 'Main Branch',
    subtotal_amount: 180.00,
    shipping_cost: 0.00,
    total_amount: 180.00,
    total_items: 2,
    order_items: [
      {
        product_id: 'prod-5',
        product_name: 'Football Jersey',
        quantity: 2,
        unit_price: 90.00,
        total_price: 180.00,
        customization: {
          team_name: 'Cowboys',
          player_name: 'Prescott',
          number: '4',
          size: 'L'
        }
      }
    ],
    delivery_address: {
      receiver: 'Tom Brown',
      phone: '+1234567894',
      address: '654 Maple Ave, City, State 12345'
    },
    order_notes: 'Customer requested cancellation'
  }
];

async function addSampleOrders() {
  try {
    console.log('Adding sample orders with different statuses...');
    
    for (const order of sampleOrders) {
      const insertQuery = `
        INSERT INTO orders (
          order_number, user_id, status, shipping_method, pickup_location,
          subtotal_amount, shipping_cost, total_amount, total_items,
          order_items, delivery_address, order_notes, design_files
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, order_number, status
      `;
      
      const values = [
        order.order_number,
        order.user_id,
        order.status,
        order.shipping_method,
        order.pickup_location,
        order.subtotal_amount,
        order.shipping_cost,
        order.total_amount,
        order.total_items,
        JSON.stringify(order.order_items),
        JSON.stringify(order.delivery_address),
        order.order_notes,
        order.design_files ? JSON.stringify(order.design_files) : null
      ];
      
      try {
        const result = await query(insertQuery, values);
        console.log(`✅ Added order ${order.order_number} with status: ${order.status}`);
      } catch (error) {
        console.error(`Error adding order ${order.order_number}:`, error.message);
      }
    }
    
    console.log('Sample orders added successfully!');
  } catch (error) {
    console.error('Error adding sample orders:', error);
  } finally {
    await pool.end();
  }
}

addSampleOrders();
