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

// Philippine names
const firstNames = [
  'Maria', 'Juan', 'Jose', 'Rosa', 'Ramon', 'Ana', 'Carlos', 'Isabel',
  'Miguel', 'Mercedes', 'Luis', 'Patricia', 'Roberto', 'Victoria',
  'Alfonso', 'Stephanie', 'Gabriel', 'Angela', 'Rafael', 'Monica'
];

const lastNames = [
  'Santos', 'Cruz', 'dela Cruz', 'Reyes', 'Garcia', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Fernandez', 'Ramirez', 'Torres',
  'Rivera', 'Gomez', 'Diaz', 'Navarro', 'Morales', 'Ruiz', 'Ortiz'
];

const teamNames = [
  'Manila Dragons', 'Cavite Warriors', 'Batangas Bulls', 'Lemery Phoenix',
  'Calapan Knights', 'Muzon Tigers', 'Rosario Raptors', 'Pinamalayan Panthers',
  'Bauan Badgers', 'Calaca Crushers', 'Metro Hawks', 'Provincial Pride',
  'Thunder Strikers', 'Phoenix Rising', 'Golden Giants', 'Silver Stallions',
  'Emerald Eagles', 'Diamond Dragons', 'Ruby Rebels', 'Sapphire Stars'
];

const branches = [
  'SAN PASCUAL (MAIN BRANCH)', 'CALAPAN BRANCH', 'MUZON BRANCH',
  'LEMERY BRANCH', 'BATANGAS CITY BRANCH', 'BAUAN BRANCH',
  'CALACA BRANCH', 'PINAMALAYAN BRANCH', 'ROSARIO BRANCH'
];

const sizes = {
  kids: ['S6', 'S8', 'S10', 'S12', 'S14'],
  adult: ['S', 'M', 'L', 'XL', 'XXL']
};

const shirtPrices = {
  sublimation: { kids: 850, adult: 1050, upper_kids: 450, upper_adult: 650 },
  longsleeve: { kids: 500, adult: 650 },
  hoodie: { kids: 700, adult: 900 },
  tshirt: { kids: 300, adult: 400 }
};

function getRandomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePlayerName() {
  return `${getRandomElement(firstNames)} ${getRandomElement(lastNames)}`;
}

function isSeasonPeak(date) {
  const month = date.getMonth() + 1;
  return month >= 3 && month <= 8;
}

function calculateOrderProbability(date) {
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isPeak = isSeasonPeak(date);
  
  let baseProbability = 0.3;
  if (isPeak) baseProbability = 0.6;
  if (isWeekend) baseProbability *= 0.8;
  baseProbability += (Math.random() - 0.5) * 0.15;
  
  return Math.max(0.05, Math.min(1, baseProbability));
}

function generateOrdersForDate(date) {
  const probability = calculateOrderProbability(date);
  if (Math.random() > probability) return [];
  
  const orderCount = isSeasonPeak(date) ? getRandomInt(2, 5) : getRandomInt(0, 2);
  const orders = [];
  
  for (let i = 0; i < orderCount; i++) {
    orders.push(generateSingleOrder(date));
  }
  
  return orders;
}

function generateSingleOrder(date) {
  const isTeamOrder = Math.random() > 0.2;
  const isSublimation = Math.random() < 0.7;
  const isCancelled = Math.random() < 0.1;
  
  let orderItems = [];
  let totalAmount = 0;
  let totalItems = 0;
  
  if (isSublimation) {
    const sport = Math.random() < 0.5 ? 'basketball' : 'volleyball';
    const isFullSet = Math.random() < 0.7;
    const teamSize = isTeamOrder ? getRandomInt(8, 15) : 1;
    
    const players = [];
    for (let j = 0; j < teamSize; j++) {
      const isKids = isTeamOrder ? Math.random() < 0.3 : Math.random() < 0.4;
      const playerSizes = isKids ? sizes.kids : sizes.adult;
      const size = getRandomElement(playerSizes);
      
      players.push({
        playerName: generatePlayerName(),
        jerseyNo: j + 1,
        size: size
      });
    }
    
    const isKidsSizeFirst = sizes.kids.includes(players[0].size);
    const pricePerUnit = isFullSet 
      ? (isKidsSizeFirst ? shirtPrices.sublimation.kids : shirtPrices.sublimation.adult)
      : (isKidsSizeFirst ? shirtPrices.sublimation.upper_kids : shirtPrices.sublimation.upper_adult);
    
    const itemTotal = pricePerUnit * teamSize;
    totalAmount += itemTotal;
    totalItems += teamSize;
    
    orderItems.push({
      productName: `Sublimation Jersey ${isFullSet ? '(Full Set)' : '(Upper Only)'} - ${sport}`,
      category: 'sublimation',
      sport: sport,
      quantity: teamSize,
      pricePerUnit: pricePerUnit,
      totalPrice: itemTotal,
      details: players
    });
  } else {
    const category = getRandomElement(['longsleeve', 'hoodie', 'tshirt', 'accessories']);
    const productNames = {
      longsleeve: 'Long Sleeve Jersey',
      hoodie: 'Hoodie',
      tshirt: 'T-Shirt',
      accessories: 'Accessories'
    };
    const quantity = getRandomInt(5, 15);
    
    const pricePerUnit = category === 'longsleeve' ? getRandomElement([500, 650]) :
                         category === 'hoodie' ? getRandomElement([700, 900]) :
                         category === 'tshirt' ? getRandomElement([300, 400]) :
                         getRandomElement([100, 150, 200]);
    
    const itemTotal = pricePerUnit * quantity;
    totalAmount += itemTotal;
    totalItems += quantity;
    
    orderItems.push({
      productName: productNames[category],
      category: category,
      quantity: quantity,
      pricePerUnit: pricePerUnit,
      totalPrice: itemTotal
    });
  }
  
  const orderStatus = isCancelled ? 'cancelled' : 'picked_up_delivered';
  
  return {
    teamName: getRandomElement(teamNames),
    orderDate: new Date(date),
    status: orderStatus,
    shippingMethod: 'pickup',
    pickupLocation: getRandomElement(branches),
    orderNotes: isTeamOrder ? 'Team order' : 'Single order',
    subtotalAmount: totalAmount,
    totalAmount: totalAmount,
    totalItems: totalItems,
    orderItems: orderItems
  };
}

async function generateAndInsertData() {
  console.log('🚀 Generating 5 years of mock order data...\n');
  
  const startDate = new Date(2020, 0, 1);
  const endDate = new Date(2025, 9, 31);
  
  let totalOrders = 0;
  const allOrders = [];
  
  const currentDate = new Date(startDate);
  
  while (currentDate <= endDate) {
    const ordersForDate = generateOrdersForDate(currentDate);
    allOrders.push(...ordersForDate);
    totalOrders += ordersForDate.length;
    
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  console.log(`✅ Generated ${totalOrders} orders over 5 years`);
  console.log(`📊 Average orders per month: ${Math.round(totalOrders / 60)}\n`);
  
  // Get a test user ID from auth
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError || !users || users.length === 0) {
    console.error('❌ No users found in authentication');
    process.exit(1);
  }
  
  const userId = users[0].id;
  console.log(`👤 Using user ID: ${userId}\n`);
  
  // Insert orders in batches
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < allOrders.length; i += batchSize) {
    const batch = allOrders.slice(i, i + batchSize);
    const orderRecords = batch.map((order, index) => ({
      user_id: userId,
      order_number: `ORD-${Date.now()}-${i}-${index}`.substring(0, 50),
      status: order.status,
      shipping_method: order.shippingMethod,
      pickup_location: order.pickupLocation,
      order_notes: order.orderNotes,
      subtotal_amount: order.subtotalAmount.toString(),
      shipping_cost: '0',
      total_amount: order.totalAmount.toString(),
      total_items: order.totalItems,
      order_items: order.orderItems,
      created_at: order.orderDate.toISOString(),
      updated_at: order.orderDate.toISOString(),
      design_files: []
    }));
    
    const { error } = await supabase
      .from('orders')
      .insert(orderRecords);
    
    if (error) {
      console.error(`❌ Error inserting batch ${Math.ceil(i / batchSize)}:`, error);
    } else {
      inserted += batch.length;
      console.log(`✅ Inserted ${inserted}/${allOrders.length} orders`);
    }
  }
  
  console.log(`\n🎉 Successfully inserted ${inserted} orders!`);
  console.log('📈 Data generation complete!');
}

generateAndInsertData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
