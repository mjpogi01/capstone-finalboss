const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function testCartFiltering() {
  try {
    console.log('🧪 Testing Cart Filtering by User ID...\n');

    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('auth.users')
      .select('id, email')
      .limit(5);

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log('👥 Available Users:');
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    console.log('\n🛒 Cart Items by User:');
    
    for (const user of users) {
      const { data: cartItems, error: cartError } = await supabase
        .from('user_carts')
        .select(`
          *,
          products (
            id,
            name,
            price
          )
        `)
        .eq('user_id', user.id);

      if (cartError) {
        console.error(`Error fetching cart for ${user.email}:`, cartError);
        continue;
      }

      console.log(`\n📦 ${user.email} (${user.id}):`);
      if (cartItems.length === 0) {
        console.log('  No cart items');
      } else {
        cartItems.forEach(item => {
          console.log(`  - ${item.products?.name || 'Unknown Product'} (Qty: ${item.quantity})`);
        });
      }
    }

    console.log('\n✅ Cart filtering test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testCartFiltering();
