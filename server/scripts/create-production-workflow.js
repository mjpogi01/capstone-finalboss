const { query } = require('../lib/db');

/**
 * Creates production workflow tracking system
 * Tracks orders through: Layout → Sizing → Printing → Press → Prod → Packing/Completing → Picked Up/Delivered
 */
async function createProductionWorkflow() {
  try {
    console.log('📋 Creating production workflow tables...');
    
    // Add production_status column to orders table
    await query(`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS production_status VARCHAR(50) DEFAULT 'pending';
    `);

    // Create production_workflow table to track each stage
    await query(`
      CREATE TABLE IF NOT EXISTS production_workflow (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
        started_at TIMESTAMPTZ,
        completed_at TIMESTAMPTZ,
        notes TEXT,
        updated_by VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create production_workflow_history for audit trail
    await query(`
      CREATE TABLE IF NOT EXISTS production_workflow_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        stage VARCHAR(50) NOT NULL,
        previous_status VARCHAR(20),
        new_status VARCHAR(20) NOT NULL,
        changed_by VARCHAR(100),
        change_notes TEXT,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Create indexes for better performance
    await query(`
      CREATE INDEX IF NOT EXISTS idx_production_workflow_order_id 
      ON production_workflow(order_id);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_production_workflow_stage 
      ON production_workflow(stage);
    `);
    
    await query(`
      CREATE INDEX IF NOT EXISTS idx_production_workflow_status 
      ON production_workflow(status);
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_production_workflow_history_order_id 
      ON production_workflow_history(order_id);
    `);

    // Create function to initialize workflow stages for new orders
    await query(`
      CREATE OR REPLACE FUNCTION initialize_production_workflow()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Create workflow stages for the new order
        INSERT INTO production_workflow (order_id, stage, status)
        VALUES 
          (NEW.id, 'layout', 'pending'),
          (NEW.id, 'sizing', 'pending'),
          (NEW.id, 'printing', 'pending'),
          (NEW.id, 'press', 'pending'),
          (NEW.id, 'prod', 'pending'),
          (NEW.id, 'packing_completing', 'pending'),
          (NEW.id, 'picked_up_delivered', 'pending');
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger to automatically initialize workflow for new orders
    await query(`
      DROP TRIGGER IF EXISTS trigger_initialize_production_workflow ON orders;
      CREATE TRIGGER trigger_initialize_production_workflow
        AFTER INSERT ON orders
        FOR EACH ROW
        EXECUTE FUNCTION initialize_production_workflow();
    `);

    // Create function to update production_workflow updated_at
    await query(`
      CREATE OR REPLACE FUNCTION update_production_workflow_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        
        -- Record history when status changes
        IF OLD.status IS DISTINCT FROM NEW.status THEN
          INSERT INTO production_workflow_history (
            order_id, stage, previous_status, new_status, changed_by, change_notes
          )
          VALUES (
            NEW.order_id, 
            NEW.stage, 
            OLD.status, 
            NEW.status, 
            NEW.updated_by,
            NEW.notes
          );
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger for production_workflow timestamp and history
    await query(`
      DROP TRIGGER IF EXISTS trigger_update_production_workflow_timestamp ON production_workflow;
      CREATE TRIGGER trigger_update_production_workflow_timestamp
        BEFORE UPDATE ON production_workflow
        FOR EACH ROW
        EXECUTE FUNCTION update_production_workflow_timestamp();
    `);

    // Initialize workflow for existing orders
    console.log('🔄 Initializing workflow for existing orders...');
    await query(`
      INSERT INTO production_workflow (order_id, stage, status)
      SELECT 
        o.id,
        stage,
        'pending'
      FROM orders o
      CROSS JOIN (
        VALUES 
          ('layout'),
          ('sizing'),
          ('printing'),
          ('press'),
          ('prod'),
          ('packing_completing'),
          ('picked_up_delivered')
      ) AS stages(stage)
      WHERE NOT EXISTS (
        SELECT 1 FROM production_workflow pw 
        WHERE pw.order_id = o.id AND pw.stage = stages.stage
      );
    `);

    console.log('✅ Production workflow system created successfully!');
    console.log('');
    console.log('Workflow stages:');
    console.log('  1. Layout');
    console.log('  2. Sizing');
    console.log('  3. Printing');
    console.log('  4. Press');
    console.log('  5. Prod');
    console.log('  6. Packing/Completing');
    console.log('  7. Picked Up/Delivered');
    
  } catch (error) {
    console.error('❌ Failed to create production workflow:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  createProductionWorkflow()
    .then(() => {
      console.log('✅ Production workflow setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = createProductionWorkflow;

