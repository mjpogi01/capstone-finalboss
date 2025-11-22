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

async function checkCustomerCountDiscrepancy() {
  console.log('🔍 Checking customer count discrepancy...\n');
  
  try {
    // 1. Get total customers with orders (no branch filtering)
    const { data: allOrders, error: allOrdersError } = await supabase
      .from('orders')
      .select('user_id, pickup_branch_id, pickup_location')
      .neq('status', 'cancelled')
      .neq('status', 'canceled');
    
    if (allOrdersError) {
      throw new Error(`Failed to fetch all orders: ${allOrdersError.message}`);
    }
    
    const allCustomerIds = new Set(allOrders.map(order => order.user_id).filter(Boolean));
    console.log(`📊 Total customers with orders (all branches): ${allCustomerIds.size}`);
    
    // 2. Get orders grouped by branch
    const ordersByBranch = {};
    allOrders.forEach(order => {
      const branchId = order.pickup_branch_id;
      const branchName = order.pickup_location;
      const branchKey = branchId ? `ID:${branchId}` : (branchName || 'No Branch');
      
      if (!ordersByBranch[branchKey]) {
        ordersByBranch[branchKey] = {
          branchId,
          branchName,
          orders: [],
          customerIds: new Set()
        };
      }
      
      ordersByBranch[branchKey].orders.push(order);
      if (order.user_id) {
        ordersByBranch[branchKey].customerIds.add(order.user_id);
      }
    });
    
    console.log('\n📊 Customers by branch:');
    Object.entries(ordersByBranch).forEach(([key, data]) => {
      console.log(`  ${data.branchName || key}: ${data.customerIds.size} customers (${data.orders.length} orders)`);
    });
    
    // 3. Get all branches from branches table
    const { data: branches, error: branchesError } = await supabase
      .from('branches')
      .select('id, name')
      .order('id');
    
    if (branchesError) {
      throw new Error(`Failed to fetch branches: ${branchesError.message}`);
    }
    
    console.log('\n🏢 Branches in database:');
    branches.forEach(branch => {
      const branchOrders = allOrders.filter(order => 
        (order.pickup_branch_id && parseInt(order.pickup_branch_id) === branch.id) ||
        (order.pickup_location && order.pickup_location.toLowerCase().includes(branch.name.toLowerCase()))
      );
      const branchCustomerIds = new Set(branchOrders.map(order => order.user_id).filter(Boolean));
      console.log(`  ${branch.name} (ID: ${branch.id}): ${branchCustomerIds.size} customers (${branchOrders.length} orders)`);
    });
    
    // 4. Check for orders without branch assignment
    const ordersWithoutBranch = allOrders.filter(order => 
      !order.pickup_branch_id && !order.pickup_location
    );
    const customersWithoutBranch = new Set(ordersWithoutBranch.map(order => order.user_id).filter(Boolean));
    
    if (customersWithoutBranch.size > 0) {
      console.log(`\n⚠️  Orders without branch assignment: ${ordersWithoutBranch.length} orders (${customersWithoutBranch.size} customers)`);
    }
    
    // 5. Summary
    console.log('\n📋 Summary:');
    console.log(`  Total customers (all branches): ${allCustomerIds.size}`);
    console.log(`  If you're an admin, you should see only your branch's customers`);
    console.log(`  If you're an owner, you should see all ${allCustomerIds.size} customers`);
    
  } catch (error) {
    console.error('❌ Error checking customer count discrepancy:', error.message);
    throw error;
  }
}

checkCustomerCountDiscrepancy().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});











