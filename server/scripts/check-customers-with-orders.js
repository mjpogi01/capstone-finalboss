const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCustomersWithOrders() {
  console.log('📊 Checking how many customer accounts have orders...\n');
  
  try {
    // Option 1: Count all customers with orders (excluding cancelled)
    const { data: customersWithOrders, error: error1 } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            COUNT(DISTINCT user_id)::int AS total_customers_with_orders
          FROM orders
          WHERE LOWER(status) NOT IN ('cancelled', 'canceled')
        `
      });
    
    if (error1) {
      // Try direct query if RPC doesn't work
      const { count, error: countError } = await supabase
        .from('orders')
        .select('user_id', { count: 'exact', head: false })
        .neq('status', 'cancelled')
        .neq('status', 'canceled');
      
      if (countError) {
        throw countError;
      }
      
      // Get unique user IDs
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('user_id')
        .neq('status', 'cancelled')
        .neq('status', 'canceled');
      
      if (ordersError) {
        throw ordersError;
      }
      
      const uniqueUserIds = new Set(orders.map(o => o.user_id).filter(Boolean));
      console.log(`✅ Total customers with orders: ${uniqueUserIds.size}`);
      
      // Get total customer accounts
      let allCustomers = [];
      let page = 1;
      const perPage = 1000;
      let hasMore = true;
      
      while (hasMore) {
        const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
          page,
          perPage
        });
        
        if (usersError) {
          console.warn('⚠️  Could not fetch all customer accounts:', usersError.message);
          break;
        }
        
        const users = usersData?.users || (Array.isArray(usersData) ? usersData : []);
        const customerUsers = users.filter(user => {
          const role = user.user_metadata?.role;
          return role === 'customer';
        });
        
        allCustomers = allCustomers.concat(customerUsers);
        
        if (users.length < perPage) {
          hasMore = false;
        } else {
          page++;
        }
      }
      
      console.log(`📋 Total customer accounts: ${allCustomers.length}`);
      console.log(`📊 Customers with orders: ${uniqueUserIds.size}`);
      console.log(`📊 Customers without orders: ${allCustomers.length - uniqueUserIds.size}`);
      
      // Get customers without orders
      const customersWithoutOrders = allCustomers.filter(customer => 
        !uniqueUserIds.has(customer.id)
      );
      
      if (customersWithoutOrders.length > 0 && customersWithoutOrders.length <= 20) {
        console.log(`\n⚠️  Customers without orders (${customersWithoutOrders.length}):`);
        customersWithoutOrders.forEach((customer, index) => {
          console.log(`   ${index + 1}. ${customer.email || customer.id}`);
        });
      } else if (customersWithoutOrders.length > 20) {
        console.log(`\n⚠️  ${customersWithoutOrders.length} customers without orders (showing first 10):`);
        customersWithoutOrders.slice(0, 10).forEach((customer, index) => {
          console.log(`   ${index + 1}. ${customer.email || customer.id}`);
        });
        console.log(`   ... and ${customersWithoutOrders.length - 10} more`);
      }
      
      return;
    }
    
    console.log('✅ Query executed successfully');
    console.log('📊 Total customers with orders:', customersWithOrders);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkCustomersWithOrders();











