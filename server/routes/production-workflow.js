const express = require('express');
const { query } = require('../lib/db');
const router = express.Router();

// Production workflow stages
const WORKFLOW_STAGES = {
  LAYOUT: 'layout',
  SIZING: 'sizing',
  PRINTING: 'printing',
  PRESS: 'press',
  PROD: 'prod',
  PACKING_COMPLETING: 'packing_completing',
  PICKED_UP_DELIVERED: 'picked_up_delivered'
};

// Stage display names
const STAGE_NAMES = {
  layout: 'Layout',
  sizing: 'Sizing',
  printing: 'Printing',
  press: 'Press',
  prod: 'Prod',
  packing_completing: 'Packing/Completing',
  picked_up_delivered: 'Picked Up/Delivered'
};

// Stage status types
const STAGE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped'
};

// Get production workflow for an order
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await query(`
      SELECT * FROM production_workflow 
      WHERE order_id = $1 
      ORDER BY 
        CASE stage
          WHEN 'layout' THEN 1
          WHEN 'sizing' THEN 2
          WHEN 'printing' THEN 3
          WHEN 'press' THEN 4
          WHEN 'prod' THEN 5
          WHEN 'packing_completing' THEN 6
          WHEN 'picked_up_delivered' THEN 7
          ELSE 99
        END
    `, [orderId]);

    res.json({
      success: true,
      workflow: result.rows
    });
  } catch (error) {
    console.error('Error fetching production workflow:', error);
    res.status(500).json({ error: 'Failed to fetch production workflow' });
  }
});

// Get workflow history for an order
router.get('/:orderId/history', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await query(`
      SELECT * FROM production_workflow_history 
      WHERE order_id = $1 
      ORDER BY timestamp DESC
    `, [orderId]);

    res.json({
      success: true,
      history: result.rows
    });
  } catch (error) {
    console.error('Error fetching workflow history:', error);
    res.status(500).json({ error: 'Failed to fetch workflow history' });
  }
});

// Update a specific stage status
router.put('/:orderId/stage/:stage', async (req, res) => {
  try {
    const { orderId, stage } = req.params;
    const { status, notes, updatedBy } = req.body;
    
    // Validate stage
    if (!Object.values(WORKFLOW_STAGES).includes(stage)) {
      return res.status(400).json({ 
        error: 'Invalid stage',
        validStages: Object.values(WORKFLOW_STAGES)
      });
    }
    
    // Validate status
    if (!Object.values(STAGE_STATUS).includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status',
        validStatuses: Object.values(STAGE_STATUS)
      });
    }
    
    // Update timestamps based on status
    let timestampUpdate = '';
    if (status === STAGE_STATUS.IN_PROGRESS) {
      timestampUpdate = ', started_at = COALESCE(started_at, NOW())';
    } else if (status === STAGE_STATUS.COMPLETED || status === STAGE_STATUS.SKIPPED) {
      timestampUpdate = ', completed_at = NOW()';
    }
    
    const result = await query(`
      UPDATE production_workflow 
      SET 
        status = $1,
        notes = COALESCE($2, notes),
        updated_by = $3
        ${timestampUpdate}
      WHERE order_id = $4 AND stage = $5
      RETURNING *
    `, [status, notes, updatedBy || 'system', orderId, stage]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Workflow stage not found' });
    }

    // Update order's production_status to current active stage
    await updateOrderProductionStatus(orderId);

    res.json({
      success: true,
      message: `${STAGE_NAMES[stage]} updated to ${status}`,
      workflow: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating workflow stage:', error);
    res.status(500).json({ error: 'Failed to update workflow stage' });
  }
});

// Bulk update multiple stages at once
router.put('/:orderId/bulk-update', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { updates, updatedBy } = req.body;
    
    // updates should be an array of { stage, status, notes }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'Updates must be a non-empty array' });
    }
    
    const updatedStages = [];
    
    for (const update of updates) {
      const { stage, status, notes } = update;
      
      // Validate each update
      if (!Object.values(WORKFLOW_STAGES).includes(stage)) {
        continue;
      }
      if (!Object.values(STAGE_STATUS).includes(status)) {
        continue;
      }
      
      // Update timestamp logic
      let timestampUpdate = '';
      if (status === STAGE_STATUS.IN_PROGRESS) {
        timestampUpdate = ', started_at = COALESCE(started_at, NOW())';
      } else if (status === STAGE_STATUS.COMPLETED || status === STAGE_STATUS.SKIPPED) {
        timestampUpdate = ', completed_at = NOW()';
      }
      
      const result = await query(`
        UPDATE production_workflow 
        SET 
          status = $1,
          notes = COALESCE($2, notes),
          updated_by = $3
          ${timestampUpdate}
        WHERE order_id = $4 AND stage = $5
        RETURNING *
      `, [status, notes, updatedBy || 'system', orderId, stage]);
      
      if (result.rows.length > 0) {
        updatedStages.push(result.rows[0]);
      }
    }
    
    // Update order's production_status
    await updateOrderProductionStatus(orderId);
    
    res.json({
      success: true,
      message: `Updated ${updatedStages.length} stages`,
      updatedStages
    });
  } catch (error) {
    console.error('Error bulk updating workflow:', error);
    res.status(500).json({ error: 'Failed to bulk update workflow' });
  }
});

// Get overall production progress for an order
router.get('/:orderId/progress', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const result = await query(`
      SELECT 
        COUNT(*) as total_stages,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_stages,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_stages,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_stages,
        COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_stages,
        ROUND(
          (COUNT(CASE WHEN status = 'completed' THEN 1 END)::numeric / COUNT(*)::numeric) * 100,
          1
        ) as completion_percentage
      FROM production_workflow 
      WHERE order_id = $1
    `, [orderId]);

    const progress = result.rows[0];
    
    // Get current stage
    const currentStageResult = await query(`
      SELECT stage, status, started_at, notes
      FROM production_workflow 
      WHERE order_id = $1 AND status IN ('in_progress', 'pending')
      ORDER BY 
        CASE stage
          WHEN 'layout' THEN 1
          WHEN 'sizing' THEN 2
          WHEN 'printing' THEN 3
          WHEN 'press' THEN 4
          WHEN 'prod' THEN 5
          WHEN 'packing_completing' THEN 6
          WHEN 'picked_up_delivered' THEN 7
          ELSE 99
        END
      LIMIT 1
    `, [orderId]);
    
    const currentStage = currentStageResult.rows[0] || null;

    res.json({
      success: true,
      progress: {
        totalStages: parseInt(progress.total_stages),
        completedStages: parseInt(progress.completed_stages),
        inProgressStages: parseInt(progress.in_progress_stages),
        pendingStages: parseInt(progress.pending_stages),
        skippedStages: parseInt(progress.skipped_stages),
        completionPercentage: parseFloat(progress.completion_percentage || 0),
        currentStage: currentStage ? {
          stage: currentStage.stage,
          stageName: STAGE_NAMES[currentStage.stage],
          status: currentStage.status,
          startedAt: currentStage.started_at,
          notes: currentStage.notes
        } : null
      }
    });
  } catch (error) {
    console.error('Error fetching production progress:', error);
    res.status(500).json({ error: 'Failed to fetch production progress' });
  }
});

// Get all orders with their production status
router.get('/status/overview', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        o.id,
        o.order_number,
        o.production_status,
        o.created_at,
        COUNT(pw.id) as total_stages,
        COUNT(CASE WHEN pw.status = 'completed' THEN 1 END) as completed_stages,
        MAX(CASE WHEN pw.status = 'in_progress' THEN pw.stage END) as current_stage
      FROM orders o
      LEFT JOIN production_workflow pw ON o.id = pw.order_id
      GROUP BY o.id, o.order_number, o.production_status, o.created_at
      ORDER BY o.created_at DESC
    `);

    const ordersWithStatus = result.rows.map(row => ({
      ...row,
      currentStageName: row.current_stage ? STAGE_NAMES[row.current_stage] : null,
      completionPercentage: row.total_stages > 0 
        ? Math.round((row.completed_stages / row.total_stages) * 100) 
        : 0
    }));

    res.json({
      success: true,
      orders: ordersWithStatus
    });
  } catch (error) {
    console.error('Error fetching production overview:', error);
    res.status(500).json({ error: 'Failed to fetch production overview' });
  }
});

// Helper function to update order's overall production status
async function updateOrderProductionStatus(orderId) {
  try {
    // Get the current workflow state
    const result = await query(`
      SELECT stage, status
      FROM production_workflow 
      WHERE order_id = $1
      ORDER BY 
        CASE stage
          WHEN 'layout' THEN 1
          WHEN 'sizing' THEN 2
          WHEN 'printing' THEN 3
          WHEN 'press' THEN 4
          WHEN 'prod' THEN 5
          WHEN 'packing_completing' THEN 6
          WHEN 'picked_up_delivered' THEN 7
          ELSE 99
        END
    `, [orderId]);

    let productionStatus = 'pending';
    
    // Check if all completed
    const allCompleted = result.rows.every(row => 
      row.status === 'completed' || row.status === 'skipped'
    );
    
    if (allCompleted) {
      productionStatus = 'completed';
    } else {
      // Find the first in-progress or pending stage
      const activeStage = result.rows.find(row => 
        row.status === 'in_progress' || row.status === 'pending'
      );
      
      if (activeStage) {
        productionStatus = STAGE_NAMES[activeStage.stage];
      }
    }
    
    // Update the order
    await query(`
      UPDATE orders 
      SET production_status = $1, updated_at = NOW()
      WHERE id = $2
    `, [productionStatus, orderId]);
    
    return productionStatus;
  } catch (error) {
    console.error('Error updating order production status:', error);
  }
}

// Get workflow stage names (useful for frontend)
router.get('/meta/stages', async (req, res) => {
  res.json({
    success: true,
    stages: WORKFLOW_STAGES,
    stageNames: STAGE_NAMES,
    statuses: STAGE_STATUS
  });
});

module.exports = router;

