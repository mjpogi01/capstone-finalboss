import React, { useState, useEffect } from 'react';
import './ProductionWorkflow.css';
import productionWorkflowService from '../../services/productionWorkflowService';

const ProductionWorkflow = ({ orderId, onUpdate }) => {
  const [workflow, setWorkflow] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (orderId) {
      loadWorkflow();
      loadProgress();
    }
  }, [orderId]);

  const loadWorkflow = async () => {
    try {
      setLoading(true);
      const data = await productionWorkflowService.getWorkflow(orderId);
      setWorkflow(data);
    } catch (error) {
      console.error('Error loading workflow:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProgress = async () => {
    try {
      const data = await productionWorkflowService.getProgress(orderId);
      setProgress(data);
    } catch (error) {
      console.error('Error loading progress:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const data = await productionWorkflowService.getWorkflowHistory(orderId);
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const handleStageUpdate = async (stage, newStatus) => {
    try {
      setUpdating(stage);
      await productionWorkflowService.updateStage(
        orderId, 
        stage, 
        newStatus,
        '',
        'admin'
      );
      
      // Reload workflow and progress
      await Promise.all([loadWorkflow(), loadProgress()]);
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating stage:', error);
      alert('Failed to update stage: ' + error.message);
    } finally {
      setUpdating(null);
    }
  };

  const handleQuickComplete = async (stage) => {
    await handleStageUpdate(stage, 'completed');
  };

  const handleQuickStart = async (stage) => {
    await handleStageUpdate(stage, 'in_progress');
  };

  const getStatusBadgeClass = (status) => {
    return `status-badge status-${status}`;
  };

  const getStageIcon = (status) => {
    return productionWorkflowService.getStatusIcon(status);
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadHistory();
    }
    setShowHistory(!showHistory);
  };

  if (loading) {
    return <div className="workflow-loading">Loading production workflow...</div>;
  }

  return (
    <div className="production-workflow-container">
      <div className="workflow-header">
        <h3>Production Workflow</h3>
        {progress && (
          <div className="workflow-progress">
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progress.completionPercentage}%` }}
              />
            </div>
            <span className="progress-text">
              {progress.completedStages} of {progress.totalStages} stages completed 
              ({progress.completionPercentage}%)
            </span>
          </div>
        )}
      </div>

      {progress && progress.currentStage && (
        <div className="current-stage-card">
          <span className="current-stage-label">Current Stage:</span>
          <span className="current-stage-name">{progress.currentStage.stageName}</span>
          <span className={getStatusBadgeClass(progress.currentStage.status)}>
            {getStageIcon(progress.currentStage.status)} {progress.currentStage.status}
          </span>
        </div>
      )}

      <div className="workflow-stages">
        {workflow.map((stage, index) => (
          <div key={stage.id} className={`workflow-stage ${stage.status}`}>
            <div className="stage-header">
              <div className="stage-number">{index + 1}</div>
              <div className="stage-info">
                <h4 className="stage-name">
                  {productionWorkflowService.getStageDisplayName(stage.stage)}
                </h4>
                <span className={getStatusBadgeClass(stage.status)}>
                  {getStageIcon(stage.status)} {stage.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <div className="stage-actions">
              {stage.status === 'pending' && (
                <button
                  className="btn-stage-action btn-start"
                  onClick={() => handleQuickStart(stage.stage)}
                  disabled={updating === stage.stage}
                >
                  {updating === stage.stage ? 'Starting...' : 'Start'}
                </button>
              )}
              
              {stage.status === 'in_progress' && (
                <button
                  className="btn-stage-action btn-complete"
                  onClick={() => handleQuickComplete(stage.stage)}
                  disabled={updating === stage.stage}
                >
                  {updating === stage.stage ? 'Completing...' : 'Mark Complete'}
                </button>
              )}

              {stage.status === 'completed' && (
                <button
                  className="btn-stage-action btn-reopen"
                  onClick={() => handleStageUpdate(stage.stage, 'in_progress')}
                  disabled={updating === stage.stage}
                >
                  {updating === stage.stage ? 'Reopening...' : 'Reopen'}
                </button>
              )}

              {stage.status !== 'completed' && stage.status !== 'in_progress' && (
                <button
                  className="btn-stage-action btn-skip"
                  onClick={() => handleStageUpdate(stage.stage, 'skipped')}
                  disabled={updating === stage.stage}
                >
                  {updating === stage.stage ? 'Skipping...' : 'Skip'}
                </button>
              )}
            </div>

            {stage.started_at && (
              <div className="stage-timestamps">
                <small>Started: {new Date(stage.started_at).toLocaleString()}</small>
              </div>
            )}

            {stage.completed_at && (
              <div className="stage-timestamps">
                <small>Completed: {new Date(stage.completed_at).toLocaleString()}</small>
              </div>
            )}

            {stage.notes && (
              <div className="stage-notes">
                <small><strong>Notes:</strong> {stage.notes}</small>
              </div>
            )}
          </div>
        ))}
      </div>

      <button className="btn-history" onClick={toggleHistory}>
        {showHistory ? 'Hide History' : 'Show History'}
      </button>

      {showHistory && history.length > 0 && (
        <div className="workflow-history">
          <h4>Workflow History</h4>
          <div className="history-list">
            {history.map(entry => (
              <div key={entry.id} className="history-entry">
                <div className="history-stage">
                  {productionWorkflowService.getStageDisplayName(entry.stage)}
                </div>
                <div className="history-change">
                  {entry.previous_status && (
                    <span className="status-from">{entry.previous_status}</span>
                  )}
                  <span className="status-arrow">→</span>
                  <span className="status-to">{entry.new_status}</span>
                </div>
                <div className="history-meta">
                  <small>
                    {entry.changed_by} • {new Date(entry.timestamp).toLocaleString()}
                  </small>
                </div>
                {entry.change_notes && (
                  <div className="history-notes">
                    <small>{entry.change_notes}</small>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionWorkflow;

