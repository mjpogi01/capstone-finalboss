const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

class ProductionWorkflowService {
  /**
   * Get production workflow for an order
   */
  async getWorkflow(orderId) {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/${orderId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch production workflow');
      }
      
      return data.workflow;
    } catch (error) {
      console.error('Error fetching production workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow history for an order
   */
  async getWorkflowHistory(orderId) {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/${orderId}/history`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch workflow history');
      }
      
      return data.history;
    } catch (error) {
      console.error('Error fetching workflow history:', error);
      throw error;
    }
  }

  /**
   * Update a specific workflow stage
   */
  async updateStage(orderId, stage, status, notes = '', updatedBy = 'admin') {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/${orderId}/stage/${stage}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status, notes, updatedBy })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update workflow stage');
      }
      
      return data;
    } catch (error) {
      console.error('Error updating workflow stage:', error);
      throw error;
    }
  }

  /**
   * Bulk update multiple stages
   */
  async bulkUpdateStages(orderId, updates, updatedBy = 'admin') {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/${orderId}/bulk-update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates, updatedBy })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to bulk update workflow');
      }
      
      return data;
    } catch (error) {
      console.error('Error bulk updating workflow:', error);
      throw error;
    }
  }

  /**
   * Get production progress for an order
   */
  async getProgress(orderId) {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/${orderId}/progress`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch production progress');
      }
      
      return data.progress;
    } catch (error) {
      console.error('Error fetching production progress:', error);
      throw error;
    }
  }

  /**
   * Get production status overview for all orders
   */
  async getOverview() {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/status/overview`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch production overview');
      }
      
      return data.orders;
    } catch (error) {
      console.error('Error fetching production overview:', error);
      throw error;
    }
  }

  /**
   * Get workflow stage metadata
   */
  async getStageMetadata() {
    try {
      const response = await fetch(`${API_URL}/api/production-workflow/meta/stages`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stage metadata');
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching stage metadata:', error);
      throw error;
    }
  }

  /**
   * Helper: Get stage display name
   */
  getStageDisplayName(stage) {
    const stageNames = {
      layout: 'Layout',
      sizing: 'Sizing',
      printing: 'Printing',
      press: 'Press',
      prod: 'Prod',
      packing_completing: 'Packing/Completing',
      picked_up_delivered: 'Picked Up/Delivered'
    };
    return stageNames[stage] || stage;
  }

  /**
   * Helper: Get status color
   */
  getStatusColor(status) {
    const colors = {
      pending: '#9CA3AF',      // gray
      in_progress: '#3B82F6',  // blue
      completed: '#10B981',    // green
      skipped: '#F59E0B'       // amber
    };
    return colors[status] || colors.pending;
  }

  /**
   * Helper: Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      pending: '⏳',
      in_progress: '🔄',
      completed: '✅',
      skipped: '⏭️'
    };
    return icons[status] || icons.pending;
  }
}

export default new ProductionWorkflowService();

