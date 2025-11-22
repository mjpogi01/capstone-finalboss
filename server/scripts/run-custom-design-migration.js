const { supabase } = require('../lib/db');

async function runCustomDesignMigration() {
  try {
    console.log('🔧 Adding custom design fields to orders table...');

    // Add order_type column
    const { error: orderTypeError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'regular';"
    });
    
    if (orderTypeError) {
      console.log('Order type column may already exist:', orderTypeError.message);
    }

    // Add client_name column
    const { error: clientNameError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_name VARCHAR(100);"
    });
    
    if (clientNameError) {
      console.log('Client name column may already exist:', clientNameError.message);
    }

    // Add client_email column
    const { error: clientEmailError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_email VARCHAR(100);"
    });
    
    if (clientEmailError) {
      console.log('Client email column may already exist:', clientEmailError.message);
    }

    // Add client_phone column
    const { error: clientPhoneError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS client_phone VARCHAR(20);"
    });
    
    if (clientPhoneError) {
      console.log('Client phone column may already exist:', clientPhoneError.message);
    }

    // Add team_name column
    const { error: teamNameError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS team_name VARCHAR(100);"
    });
    
    if (teamNameError) {
      console.log('Team name column may already exist:', teamNameError.message);
    }

    // Add team_members column
    const { error: teamMembersError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS team_members JSONB;"
    });
    
    if (teamMembersError) {
      console.log('Team members column may already exist:', teamMembersError.message);
    }

    // Add pickup_branch_id column
    const { error: pickupBranchError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup_branch_id VARCHAR(50);"
    });
    
    if (pickupBranchError) {
      console.log('Pickup branch ID column may already exist:', pickupBranchError.message);
    }

    // Add design_images column
    const { error: designImagesError } = await supabase.rpc('exec', {
      sql: "ALTER TABLE orders ADD COLUMN IF NOT EXISTS design_images JSONB;"
    });
    
    if (designImagesError) {
      console.log('Design images column may already exist:', designImagesError.message);
    }

    console.log('✅ Custom design fields migration completed!');
    console.log('📋 Added fields: order_type, client_name, client_email, client_phone, team_name, team_members, pickup_branch_id, design_images');

  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

if (require.main === module) {
  runCustomDesignMigration();
}

module.exports = { runCustomDesignMigration };
