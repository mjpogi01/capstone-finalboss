import React, { useState, useEffect, useCallback } from 'react';
import './ArtistTasksTable.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faEye, 
  faEdit, 
  faUpload, 
  faCheck,
  faClock,
  faExclamationTriangle,
  faInfoCircle,
  faTasks,
  faComments,
  faLock
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import artistDashboardService from '../../services/artistDashboardService';
import ArtistTaskModal from './ArtistTaskModal';
import ArtistChatModal from './ArtistChatModal';
import chatService from '../../services/chatService';

const ArtistTasksTable = ({ limit = null, showHeader = false, enableTabs = false, onTasksUpdated = () => {} }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedChatRoom, setSelectedChatRoom] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [activeStatus, setActiveStatus] = useState('all'); // all | in_progress | pending | submitted | completed
  const { user } = useAuth();

  const fetchArtistTasks = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.warn('No user ID available');
        setTasks([]);
        return;
      }

      // Fetch tasks for this artist (optionally filtered by status)
      const statusFilter = activeStatus === 'all' ? null : activeStatus;
      const tasksData = await artistDashboardService.getArtistTasks(limit, statusFilter);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching artist tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user, limit, activeStatus]);

  useEffect(() => {
    fetchArtistTasks();
  }, [user, fetchArtistTasks, activeStatus]);

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'urgent':
        return faExclamationTriangle;
      case 'high':
        return faExclamationTriangle;
      case 'medium':
        return faInfoCircle;
      case 'low':
        return faInfoCircle;
      default:
        return faInfoCircle;
    }
  };

  const getOrderTypeLabel = (task) => {
    // Combine order_type and order_source to create proper labels
    const orderType = task.order_type || 'regular';
    const orderSource = task.order_source || 'online';
    
    if (orderType === 'custom_design' && orderSource === 'online') {
      return 'Custom-Online';
    } else if (orderType === 'regular' && orderSource === 'online') {
      return 'Store-Online';
    } else if (orderType === 'regular' && orderSource === 'walk_in') {
      return 'Store-Walk-In';
    } else if (orderType === 'walk_in') {
      return 'Store-Walk-In';
    } else if (orderType === 'custom_design') {
      return 'Custom-Online'; // Default for custom_design
    } else {
      return 'Store-Online'; // Default for regular
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return faCheck;
      case 'in_progress':
        return faEdit;
      case 'submitted':
        return faUpload;
      case 'pending':
        return faClock;
      default:
        return faClock;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cleanDescription = (description) => {
    if (!description) return '';
    let output = description;

    // UI-only sanitization: remove noisy prefixes from generated tasks
    // 1) Remove "Quantity: <n> units." (case-insensitive, flexible spacing)
    output = output.replace(/Quantity:\s*\d+\s*units\.?\s*/gi, '');
    // 2) Remove "Customer notes:" label (keep the actual notes content that follows)
    output = output.replace(/Customer\s*notes:\s*/gi, '');
    // 3) Remove the label "📸 Product Image:" (keep any URL or text after it)
    output = output.replace(/📸\s*Product\s*Image:\s*/gi, '');

    // Remove URLs (http, https, www) from card preview only
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
    output = output.replace(urlPattern, '').trim();

    // Clean up multiple spaces and stray punctuation
    output = output.replace(/\s{2,}/g, ' ').replace(/^\.\s*/g, '').trim();

    return output;
  };

  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowTaskModal(true);
  };

  const handleStatusUpdate = async (taskId, newStatus) => {
    try {
      console.log('🔄 Updating task status:', taskId, 'to', newStatus);
      await artistDashboardService.updateTaskStatus(taskId, newStatus);
      
      // Refetch tasks to get updated started_at timestamp and status
      await fetchArtistTasks();
      
      // Update the selected task in the modal with the new data
      const updatedTasks = await artistDashboardService.getArtistTasks();
      const updatedTask = updatedTasks.find(t => t.id === taskId);
      if (updatedTask) {
        setSelectedTask(updatedTask);
      }
      
      onTasksUpdated();
      
      // Only close modal if explicitly requested (not for starting tasks)
      // For starting tasks, keep modal open to show the unlocked details
      if (newStatus !== 'in_progress') {
        setShowTaskModal(false);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      alert(error.message || 'Failed to update task status. Please try again.');
      throw error; // Re-throw so the modal can handle it
    }
  };

  const handleOpenChat = async (task) => {
    try {
      // Get the chat room for this order
      let chatRoom = await chatService.getChatRoomByOrder(task.order_id);
      
      // If no chat room exists, create one
      if (!chatRoom && task.artist_id && task.order_id) {
        console.log('💬 No chat room found, creating one...');
        
        // Get order details to find customer_id
        const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
        const { data: { session } } = await (await import('../../lib/supabase')).supabase.auth.getSession();
        
        if (session) {
          try {
            const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${task.order_id}`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (orderResponse.ok) {
              const orderData = await orderResponse.json();
              const customerId = orderData.user_id;
              
              // Create chat room using the artist profile ID from the task
              const roomId = await chatService.createChatRoom(
                task.order_id,
                customerId,
                task.artist_id
              );
              
              // Get the newly created room
              chatRoom = await chatService.getChatRoomByOrder(task.order_id);
            }
          } catch (createError) {
            console.error('Error creating chat room:', createError);
          }
        }
      }
      
      if (chatRoom) {
        setSelectedChatRoom(chatRoom);
        setShowChatModal(true);
      } else {
        alert('Unable to create or find chat room for this order. Please try again.');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Failed to open chat. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="artist-tasks-table">
        {showHeader && (
          <div className="table-header">
            <h3>Recent Tasks</h3>
          </div>
        )}
        <div className="loading-skeleton" style={{ height: '300px', borderRadius: '12px' }}></div>
      </div>
    );
  }

  return (
    <div className="artist-tasks-table">
      {showHeader && (
        <div className="table-header">
          <h3>Recent Tasks</h3>
          {tasks.length > 2 && (
            <button
              className="view-all-btn"
              onClick={() => setShowAll((prev) => !prev)}
            >
              {showAll ? 'Show Less' : 'View All'}
            </button>
          )}
        </div>
      )}

      {enableTabs && (
        <div className="tasks-tabs">
          {['all', 'in_progress', 'pending', 'submitted', 'completed'].map((status) => (
            <button
              key={status}
              className={`tab-btn ${activeStatus === status ? 'active' : ''}`}
              onClick={() => {
                setShowAll(true); // show all when using tabs page
                setActiveStatus(status);
              }}
            >
              {status === 'all' ? 'All' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      )}
      
      <div className="tasks-container">
        {tasks.length === 0 ? (
          <div className="no-tasks">
            <FontAwesomeIcon icon={faTasks} />
            <p>No tasks assigned yet</p>
          </div>
        ) : (
          <div className="tasks-list">
            {(showAll ? tasks : tasks.slice(0, 2)).map((task) => (
              <div 
                key={task.id} 
                className={`task-item ${task.status}`}
                onClick={() => handleTaskClick(task)}
              >
                <div className="task-header">
                  <div className="task-title">{task.task_title}</div>
                </div>
                
                <div className="task-details">
                  <div className="task-description">
                    {!task.started_at && task.status === 'pending' ? (
                      <span className="blind-task-indicator">
                        <FontAwesomeIcon icon={faLock} /> Order details hidden - Start task to view
                      </span>
                    ) : (
                      cleanDescription(task.task_description)
                    )}
                  </div>
                  <div className="task-meta">
                    <span className="task-type">{getOrderTypeLabel(task)}</span>
                    <span className="task-deadline">
                      Due: {formatDate(task.deadline)}
                    </span>
                  </div>
                </div>
                
                <div className="task-footer">
                  <div className={`task-status ${task.status}`}>
                    <FontAwesomeIcon icon={getStatusIcon(task.status)} />
                    {task.status.replace('_', ' ')}
                  </div>
                  <div className="task-actions">
                    {(task.status === 'in_progress' || task.status === 'submitted' || task.status === 'completed') && (
                      <button 
                        className="action-btn chat-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenChat(task);
                        }}
                        title="Open Chat"
                      >
                        <FontAwesomeIcon icon={faComments} />
                      </button>
                    )}
                    <button 
                      className="action-btn view-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTaskClick(task);
                      }}
                      title="View Details"
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Task Modal */}
      <ArtistTaskModal
        task={selectedTask}
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        onStatusUpdate={handleStatusUpdate}
        onOpenChat={handleOpenChat}
      />

      {/* Chat Modal */}
      <ArtistChatModal
        room={selectedChatRoom}
        isOpen={showChatModal}
        onClose={() => setShowChatModal(false)}
      />
    </div>
  );
};

export default ArtistTasksTable;
