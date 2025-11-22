import React, { useState, useRef, useEffect, useCallback } from 'react';
import './ArtistTaskModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes, 
  faCalendarAlt, 
  faTag, 
  faExclamationTriangle,
  faInfoCircle,
  faCheck,
  faClock,
  faEdit,
  faUpload,
  faImage,
  faShoppingCart,
  faComments,
  faExternalLinkAlt,
  faChevronDown,
  faChevronUp,
  faSpinner,
  faLock,
  faTrash
} from '@fortawesome/free-solid-svg-icons';
import { FaBasketballBall, FaTrophy, FaTshirt, FaUser, FaUserFriends, FaChevronLeft, FaChevronRight, FaDownload, FaTimes } from 'react-icons/fa';
import designUploadService from '../../services/designUploadService';
import { useNotification } from '../../contexts/NotificationContext';
import chatService from '../../services/chatService';
import { getApparelSizeVisibility } from '../../utils/orderSizing';
import ArtistChatModal from './ArtistChatModal';

const ArtistTaskModal = ({ task, isOpen, onClose, onStatusUpdate, onOpenChat }) => {
  const [currentTask, setCurrentTask] = useState(task);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [expandedOrderIndex, setExpandedOrderIndex] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [checkingApproval, setCheckingApproval] = useState(false);
  const [chatRoom, setChatRoom] = useState(null);
  const [loadingChatRoom, setLoadingChatRoom] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [designFiles, setDesignFiles] = useState([]);
  const fileInputRef = useRef(null);
  const [imageGallery, setImageGallery] = useState({ isOpen: false, images: [], currentIndex: 0 }); // Image gallery modal state
  const { showSuccess, showError } = useNotification();

  // Image gallery functions
  const openImageGallery = useCallback((images, startIndex = 0) => {
    if (!images || images.length === 0) return;
    setImageGallery({
      isOpen: true,
      images: images.map(img => ({
        url: img.url || img,
        filename: img.filename || img.originalname || `image-${images.indexOf(img) + 1}.jpg`
      })),
      currentIndex: startIndex
    });
  }, []);

  const closeImageGallery = useCallback(() => {
    setImageGallery({ isOpen: false, images: [], currentIndex: 0 });
  }, []);

  const goToNextImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex + 1) % prev.images.length
    }));
  }, []);

  const goToPrevImage = useCallback(() => {
    setImageGallery(prev => ({
      ...prev,
      currentIndex: (prev.currentIndex - 1 + prev.images.length) % prev.images.length
    }));
  }, []);

  const downloadImage = useCallback((imageUrl, filename) => {
    fetch(imageUrl)
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'image.jpg';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      })
      .catch(error => {
        console.error('Error downloading image:', error);
        window.open(imageUrl, '_blank');
      });
  }, []);

  // Keyboard navigation for image gallery
  useEffect(() => {
    if (!imageGallery.isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeImageGallery();
      } else if (e.key === 'ArrowLeft') {
        goToPrevImage();
      } else if (e.key === 'ArrowRight') {
        goToNextImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imageGallery.isOpen, closeImageGallery, goToPrevImage, goToNextImage]);

  // Check if design is approved or review timed out (60 minutes)
  const checkDesignApprovalStatus = useCallback(async (orderId) => {
    if (!orderId) return false;
    
    setCheckingApproval(true);
    try {
      // Get chat room for this order
      const chatRoom = await chatService.getChatRoomByOrder(orderId);
      if (!chatRoom) {
        setIsApproved(false);
        return false; // No chat room means no review request yet
      }

      // Get all messages for the chat room
      const messages = await chatService.getChatRoomMessages(chatRoom.id);
      if (!messages || messages.length === 0) {
        setIsApproved(false);
        return false;
      }

      // Sort messages by created_at to process in chronological order
      const sortedMessages = [...messages].sort((a, b) => 
        new Date(a.created_at) - new Date(b.created_at)
      );

      // Find the most recent review_request
      const reviewRequests = sortedMessages.filter(msg => 
        msg.message_type === 'review_request' && msg.sender_type === 'artist'
      );

      if (reviewRequests.length === 0) {
        setIsApproved(false);
        return false; // No review request found
      }

      const mostRecentReviewRequest = reviewRequests[reviewRequests.length - 1];
      const reviewRequestTime = new Date(mostRecentReviewRequest.created_at);
      const now = new Date();
      const sixtyMinutesInMs = 60 * 60 * 1000; // 60 minutes in milliseconds
      const timeSinceRequest = now - reviewRequestTime;

      // Check if there's an approval response after the review request
      const approvalResponse = sortedMessages.find(msg => {
        const msgTime = new Date(msg.created_at);
        return msg.message_type === 'review_response' &&
               msg.sender_type === 'customer' &&
               msgTime > reviewRequestTime &&
               msg.message.toLowerCase().includes('design approved');
      });

      // Return true if:
      // 1. Customer approved the design, OR
      // 2. 60 minutes have passed since review request with no response
      const approved = !!approvalResponse;
      const timedOut = timeSinceRequest >= sixtyMinutesInMs && !approvalResponse;
      const result = approved || timedOut;
      
      setIsApproved(result);
      return result;
    } catch (error) {
      console.error(`Error checking approval status for order ${orderId}:`, error);
      setIsApproved(false);
      return false; // Default to false on error
    } finally {
      setCheckingApproval(false);
    }
  }, []);

  // Update currentTask when task prop changes
  useEffect(() => {
    if (task) {
      console.log('📝 Task prop updated:', task.id, 'Status:', task.status, 'Started at:', task.started_at);
      setCurrentTask(task);
    }
  }, [task]);

  // Timer effect - calculate elapsed time from started_at while in progress
  useEffect(() => {
    const taskToCheck = currentTask || task;
    if (!taskToCheck || !taskToCheck.started_at || taskToCheck.status !== 'in_progress') {
      setElapsedTime(0);
      return;
    }

    const calculateElapsedTime = () => {
      const startTime = new Date(taskToCheck.started_at);
      const now = new Date();
      const elapsed = Math.floor((now - startTime) / 1000); // elapsed time in seconds
      setElapsedTime(elapsed);
    };

    // Calculate immediately
    calculateElapsedTime();

    // Update every second
    const interval = setInterval(calculateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [currentTask, task]);

  // Fetch chat room for any task status
  useEffect(() => {
    const taskToCheck = currentTask || task;
    const fetchChatRoom = async () => {
      if (isOpen && taskToCheck && taskToCheck.order_id) {
        setLoadingChatRoom(true);
        try {
          const room = await chatService.getChatRoomByOrder(taskToCheck.order_id);
          setChatRoom(room);
        } catch (error) {
          console.error('Error fetching chat room:', error);
          setChatRoom(null);
        } finally {
          setLoadingChatRoom(false);
        }
      } else {
        setChatRoom(null);
      }
    };
    fetchChatRoom();
  }, [isOpen, task, currentTask]);

  // Load existing design files for this order when modal opens
  useEffect(() => {
    const taskToCheck = currentTask || task;
    const loadDesignFiles = async () => {
      if (isOpen && taskToCheck && taskToCheck.order_id) {
        try {
          const result = await designUploadService.getDesignFiles(taskToCheck.order_id);
          setDesignFiles(Array.isArray(result?.designFiles) ? result.designFiles : []);
        } catch (e) {
          console.error('Error loading design files:', e);
          setDesignFiles([]);
        }
      } else {
        setDesignFiles([]);
      }
    };
    loadDesignFiles();
  }, [isOpen, task, currentTask]);

  // Check approval status when modal opens or task changes
  useEffect(() => {
    const taskToCheck = currentTask || task;
    if (isOpen && taskToCheck && taskToCheck.order_id && taskToCheck.status === 'in_progress') {
      checkDesignApprovalStatus(taskToCheck.order_id);
      
      // Set up interval to check every minute (for 60-minute timeout detection)
      const interval = setInterval(() => {
        checkDesignApprovalStatus(taskToCheck.order_id);
      }, 60 * 1000); // Check every minute

      return () => clearInterval(interval);
    } else {
      setIsApproved(false);
    }
  }, [isOpen, task, currentTask, checkDesignApprovalStatus]);

  if (!isOpen || !task) return null;
  
  // Use task prop directly if currentTask is not set yet
  const displayTask = currentTask || task;

  // Check if task is "blind" (not started yet)
  // Only show blind if status is pending AND started_at is null/undefined/empty
  // If status is NOT pending, always show details (task has been started or completed)
  const hasStarted = displayTask.started_at && displayTask.started_at !== null && displayTask.started_at !== '';
  const isBlindTask = displayTask.status === 'pending' && !hasStarted;
  const isInProgress = displayTask.status === 'in_progress';
  
  // Debug logging
  console.log('🔍 [ArtistTaskModal] Task visibility check:', {
    taskId: displayTask.id,
    status: displayTask.status,
    started_at: displayTask.started_at,
    hasStarted: hasStarted,
    isBlindTask: isBlindTask
  });

  const handleStartTask = async () => {
    try {
      console.log('🚀 Starting task:', displayTask.id);
      if (onStatusUpdate) {
        await onStatusUpdate(displayTask.id, 'in_progress');
        // Task will be refreshed by parent component
        showSuccess('Task started successfully!');
      } else {
        console.error('❌ onStatusUpdate is not defined');
        showError('Unable to start task. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Error starting task:', error);
      showError(error.message || 'Failed to start task. Please try again.');
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

  const formatElapsedTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

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

  const handleRemoveFile = async (file) => {
    try {
      if (!displayTask || !displayTask.order_id) {
        showError('Order not found for this task.');
        return;
      }
      const publicId = file.publicId || file.public_id || file.filename || file.name;
      if (!publicId) {
        showError('Unable to identify this file.');
        return;
      }
      const confirm = window.confirm('Remove this file from the order?');
      if (!confirm) return;
      await designUploadService.deleteDesignFile(displayTask.order_id, publicId);
      setDesignFiles(prev => (Array.isArray(prev) ? prev.filter(f => (f.publicId || f.public_id || f.filename) !== publicId) : []));
      showSuccess('File removed.');
    } catch (error) {
      console.error('❌ Error removing file:', error);
      showError(error.message || 'Failed to remove file.');
    }
  };

  const getOrderTypeClass = (task) => {
    // Return CSS class based on order type
    const orderType = task.order_type || 'regular';
    const orderSource = task.order_source || 'online';
    
    if (orderType === 'custom_design') {
      return 'custom_design';
    } else if (orderType === 'walk_in' || (orderType === 'regular' && orderSource === 'walk_in')) {
      return 'walk_in';
    } else {
      return 'regular';
    }
  };

  const getOrderItems = () => {
    if (displayTask.orders?.order_items) {
      try {
        return Array.isArray(displayTask.orders.order_items) 
          ? displayTask.orders.order_items 
          : JSON.parse(displayTask.orders.order_items);
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  const orderItems = getOrderItems();

  // Helper to format long filenames preserving extension (e.g., "reallylongna...jpeg")
  const formatFilenameForDisplay = (filename, maxBaseLength = 18) => {
    if (!filename || typeof filename !== 'string') return 'File';
    const lastDot = filename.lastIndexOf('.');
    if (lastDot <= 0 || lastDot === filename.length - 1) {
      // No extension; do simple truncation with ellipsis
      return filename.length > maxBaseLength ? `${filename.slice(0, maxBaseLength)}…` : filename;
    }
    const base = filename.slice(0, lastDot);
    const ext = filename.slice(lastDot + 1);
    if (base.length <= maxBaseLength) return filename;
    return `${base.slice(0, maxBaseLength)}….${ext}`;
  };
  const isPreviewableImage = (nameOrUrl) => {
    if (!nameOrUrl || typeof nameOrUrl !== 'string') return false;
    const lower = nameOrUrl.toLowerCase();
    return ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].some(ext => lower.endsWith(ext));
  };

  const handleOpenUpload = () => {
    // Open file selector regardless of approval; uploading files does not submit
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmitDesign = async () => {
    if (!isApproved) {
      showError('Design must be approved by customer or wait 60 minutes after review request before submitting.');
      return;
    }
    if (!designFiles || designFiles.length === 0) {
      showError('Please upload at least one design file before submitting.');
      return;
    }
    try {
      if (onStatusUpdate) {
        await onStatusUpdate(displayTask.id, 'submitted');
        showSuccess('Design submitted for review.');
      }
    } catch (error) {
      console.error('❌ Error submitting design:', error);
      showError(error.message || 'Failed to submit design. Please try again.');
    }
  };

  const handleFileChange = async (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    if (!displayTask.order_id) {
      showError('Order ID not found. Cannot upload design files.');
      return;
    }

    setUploading(true);
    try {
      console.log('🎨 Uploading design files for order:', displayTask.order_id);
      console.log('🎨 Files selected:', files.length);

      // Upload files using designUploadService (no auto-submit)
      const result = await designUploadService.uploadDesignFiles(displayTask.order_id, files);
      console.log('✅ Design files uploaded successfully:', result);
      showSuccess(result.message || 'Design files uploaded successfully');

      // Refresh local list of design files
      try {
        const refreshed = await designUploadService.getDesignFiles(displayTask.order_id);
        setDesignFiles(Array.isArray(refreshed?.designFiles) ? refreshed.designFiles : []);
      } catch {}

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('❌ Error uploading design files:', error);
      showError(error.message || 'Failed to upload design files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="artist-task-modal-overlay" onClick={onClose}>
      <div className="artist-task-modal" onClick={(e) => e.stopPropagation()}>
        {/* Floating Close Button */}
        <button className="artist-task-close-btn-floating" onClick={onClose} title="Close">
          <FontAwesomeIcon icon={faTimes} />
        </button>
        
        {/* Content */}
        <div className="artist-task-modal-content">
          <div className="content-body">
            <div className={`content-two-column ${isBlindTask ? 'content-single-column' : 'content-in-progress-layout'}`}>
              {/* Left Column - Order Details */}
              <div className="content-left-column">
                <div className="task-details-container">
                  {/* Fixed Header */}
                  <div className="task-details-container-header">
                    {/* Task Header - Moved to Left Column */}
                    <div className="task-header-left-column">
                      <div className="task-header-left-content">
                        <h3 className="task-title-left">{displayTask.task_title}</h3>
                        <div className="artist-task-header-badges">
                          <span className={`artist-task-status-badge ${displayTask.status}`}>
                            <FontAwesomeIcon icon={getStatusIcon(displayTask.status)} />
                            {displayTask.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="task-details-container-scrollable">
                    <div className="task-details-header-row">
                      <h4 className="section-title">{isBlindTask ? 'Task Information' : 'Task Details'}</h4>
                    </div>
                    
                    {/* Order Type and Deadline */}
                    <div className="artist-order-meta-info">
                      <div className="artist-order-meta-row">
                        <span className="artist-order-meta-label">Order Type:</span>
                        <span className={`artist-order-type-badge ${getOrderTypeClass(displayTask)}`}>
                          {getOrderTypeLabel(displayTask)}
                        </span>
                      </div>
                      <div className="artist-order-meta-row">
                        <span className="artist-order-meta-label">Deadline:</span>
                        <span className="artist-order-meta-value">
                          <FontAwesomeIcon icon={faCalendarAlt} />
                          {formatDate(displayTask.deadline)}
                        </span>
                      </div>
                    </div>

                    {/* Task Timer (shows during in-progress; after completion shows final elapsed) */}
                    {displayTask.started_at && (
                      (() => {
                        // Determine if task has ended and pick best available end timestamp
                        const start = displayTask.started_at ? new Date(displayTask.started_at) : null;
                        const endTimestamp =
                          displayTask.submitted_at ||
                          displayTask.completed_at ||
                          displayTask.finished_at ||
                          displayTask.ended_at ||
                          displayTask.updated_at ||
                          null;
                        const hasEnded = (displayTask.status === 'submitted' || displayTask.status === 'completed') && Boolean(endTimestamp);
                        const end = hasEnded ? new Date(endTimestamp) : null;
                        let seconds = 0;
                        if (start) {
                          if (end) {
                            seconds = Math.max(0, Math.floor((end - start) / 1000));
                          } else if (displayTask.status === 'in_progress') {
                            seconds = elapsedTime;
                          }
                        }
                        return (
                          <div className="task-timer-container">
                            <div className="task-timer-label">
                              <FontAwesomeIcon icon={faClock} />
                              <span>Time Elapsed</span>
                            </div>
                            <div className="task-timer-display">
                              {formatElapsedTime(seconds)}
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {isBlindTask ? (
                    <div className="artist-blind-task-notice">
                      <div className="blind-task-icon">
                        <FontAwesomeIcon icon={faLock} />
                      </div>
                      <h4>Task Details Locked</h4>
                      <p>Order details will be revealed once you start this task. Click "Start Task" to begin and view the full order information.</p>
                    </div>
                  ) : (
                    <div className="order-details-list">
                    {orderItems.length > 0 ? (
                      orderItems.map((item, index) => {
                        // Determine product category
                        const isBall = item.category?.toLowerCase() === 'balls';
                        const isTrophy = item.category?.toLowerCase() === 'trophies';
                        const isCustomDesign = item.product_type === 'custom_design';
                        const isApparel = !isBall && !isTrophy && !isCustomDesign;
                        // Determine category for hiding fields
                        const categoryLower = (item.category || '').toString().toLowerCase().trim();
                        const isUniformsCategory = categoryLower === 'uniforms';
                        const isHoodieCategory = categoryLower === 'hoodies';
                        const isLongSleevesCategory = categoryLower === 'long sleeves';
                        const isTShirtCategory = categoryLower === 't-shirts' || categoryLower === 't-shirt';
                        const shouldHideJerseyType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                        const shouldHideCutType = isUniformsCategory || isHoodieCategory || isLongSleevesCategory || isTShirtCategory;
                        // For custom design, check team_members; for regular orders, check teamMembers
                        const isTeamOrder = isCustomDesign 
                          ? ((item.team_members || item.teamMembers || []).length > 1)
                          : (item.isTeamOrder || (item.teamMembers && item.teamMembers.length > 0));
                        
                        // For custom design orders, use design_images as product image
                        const designImages = item.design_images || [];
                        const productImage = isCustomDesign && designImages.length > 0 
                          ? designImages[0].url 
                          : (item.main_image || item.image || item.imageUrl || item.photo || item.image_url || item.product_image || item.thumbnail || '/image_highlights/image.png');

                        return (
                          <div key={index} className="artist-order-item-card">
                            <div className="artist-order-item-header">
                              <div 
                                className="artist-order-item-image"
                                style={{ position: 'relative' }}
                              >
                                {isCustomDesign && designImages.length > 0 ? (
                                  <div 
                                    className="artist-order-item-image-wrapper"
                                    onClick={() => openImageGallery(designImages, 0)}
                                    style={{ position: 'relative', cursor: 'pointer' }}
                                  >
                                    <img 
                                      src={productImage} 
                                      alt={item.name}
                                      className="artist-product-img-clickable"
                                      onError={(e) => {
                                        e.target.src = '/image_highlights/image.png';
                                      }}
                                    />
                                    {designImages.length > 1 && (
                                      <div className="artist-order-item-image-badge">
                                        +{designImages.length - 1}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <img 
                                    src={productImage} 
                                    alt={item.name}
                                    className="artist-product-img-clickable"
                                    onClick={() => setZoomedImage({
                                      url: productImage,
                                      name: item.name
                                    })}
                                    onError={(e) => {
                                      e.target.src = '/image_highlights/image.png';
                                    }}
                                  />
                                )}
                              </div>
                              <div className="artist-order-item-info">
                                <div className="artist-order-item-name">{item.name}</div>
                                <div className="artist-order-item-category">
                                  {isBall ? (
                                    <><FaBasketballBall /> Basketball</>
                                  ) : isTrophy ? (
                                    <><FaTrophy /> Trophy</>
                                  ) : (
                                    <><FaTshirt /> {item.category ? item.category.charAt(0).toUpperCase() + item.category.slice(1) : 'Apparel'}</>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div 
                              className="artist-order-type-toggle"
                              onClick={() => setExpandedOrderIndex(expandedOrderIndex === index ? null : index)}
                            >
                              <div className="artist-order-type-label">
                                {isBall ? (
                                  <><FaBasketballBall /> Ball</>
                                ) : isTrophy ? (
                                  <><FaTrophy /> Trophy</>
                                ) : isTeamOrder ? (
                                  <><FaUserFriends /> Team Order</>
                                ) : (
                                  <><FaUser /> Single Order</>
                                )}
                                <FontAwesomeIcon 
                                  icon={expandedOrderIndex === index ? faChevronUp : faChevronDown} 
                                  className="artist-order-chevron"
                                />
                              </div>
                            </div>
                            {expandedOrderIndex === index && (
                              <div className="artist-order-details-dropdown">
                                {/* Apparel - Team Orders */}
                                {isApparel && isTeamOrder && item.teamMembers && item.teamMembers.length > 0 ? (
                                  <div className="artist-order-team-details">
                                    <div className="artist-order-detail-row">
                                      <span className="artist-order-detail-label">Team:</span>
                                      <span className="artist-order-detail-value">{item.teamName || item.team_name || item.teamMembers?.[0]?.teamName || item.teamMembers?.[0]?.team_name || 'N/A'}</span>
                                    </div>
                                    <div className="artist-order-team-divider"></div>
                                    <div className="artist-order-members-list">
                                      {(() => {
                                        const fallbackVisibility = {
                                          jersey: item.teamMembers.some(member => Boolean(member?.jerseySize || member?.size)),
                                          shorts: item.teamMembers.some(member => Boolean(member?.shortsSize))
                                        };
                                        const { showJersey: showTeamJerseySize, showShorts: showTeamShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                        return item.teamMembers.map((member, memberIndex) => {
                                          const memberJerseyType = member.jerseyType || member.jersey_type || 'full';
                                          const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                          return (
                                          <div key={memberIndex} className="artist-order-member-item">
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Surname:</span>
                                              <span className="artist-order-detail-value">{(member.surname || member.lastName || 'N/A').toUpperCase()}</span>
                                            </div>
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Jersey No:</span>
                                              <span className="artist-order-detail-value">{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</span>
                                            </div>
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Jersey Type:</span>
                                              <span className="artist-order-detail-value">{jerseyTypeLabel}</span>
                                            </div>
                                            {(member.fabricOption || member.fabric_option) && (
                                              <div className="artist-order-detail-row">
                                                <span className="artist-order-detail-label">Fabric:</span>
                                                <span className="artist-order-detail-value">{member.fabricOption || member.fabric_option || 'N/A'}</span>
                                              </div>
                                            )}
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Cut Type:</span>
                                              <span className="artist-order-detail-value">{member.cutType || member.cut_type || 'N/A'}</span>
                                            </div>
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Type:</span>
                                              <span className="artist-order-detail-value">{member.sizingType || item.sizeType || 'Adult'}</span>
                                            </div>
                                              {showTeamJerseySize && (memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Jersey Size:</span>
                                              <span className="artist-order-detail-value">{member.jerseySize || member.size || 'N/A'}</span>
                                            </div>
                                              )}
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Shorts Size:</span>
                                              <span className="artist-order-detail-value">{(memberJerseyType === 'full' || memberJerseyType === 'shorts') ? (member.shortsSize || 'N/A') : '-'}</span>
                                            </div>
                                            </div>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                ) : isApparel ? (
                                  /* Apparel - Single Orders */
                                  <div className="artist-order-single-details">
                                    <div className="artist-order-detail-row">
                                      <span className="artist-order-detail-label">Team:</span>
                                      <span className="artist-order-detail-value">{item.singleOrderDetails?.teamName || item.singleOrderDetails?.team_name || item.teamName || 'N/A'}</span>
                                    </div>
                                    <div className="artist-order-detail-row">
                                      <span className="artist-order-detail-label">Surname:</span>
                                      <span className="artist-order-detail-value">{((item.singleOrderDetails?.surname || item.singleOrderDetails?.lastName || 'N/A')).toUpperCase()}</span>
                                    </div>
                                    <div className="artist-order-detail-row">
                                      <span className="artist-order-detail-label">Jersey No:</span>
                                      <span className="artist-order-detail-value">{item.singleOrderDetails?.number || item.singleOrderDetails?.jerseyNo || item.singleOrderDetails?.jerseyNumber || 'N/A'}</span>
                                    </div>
                                    {(() => {
                                      const jerseyType = item.jerseyType || item.singleOrderDetails?.jerseyType || 'full';
                                      const jerseyTypeLabel = jerseyType === 'shirt' ? 'Shirt Only' : jerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                      const fallbackVisibility = {
                                        jersey: Boolean(item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size),
                                        shorts: Boolean(item.singleOrderDetails?.shortsSize)
                                      };
                                      const { showJersey: showSingleJerseySize, showShorts: showSingleShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                      return (
                                        <>
                                          {/* Jersey Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                          {!shouldHideJerseyType && (
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Jersey Type:</span>
                                              <span className="artist-order-detail-value">{jerseyTypeLabel}</span>
                                            </div>
                                          )}
                                          {(item.fabricOption || item.singleOrderDetails?.fabricOption) && (
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Fabric:</span>
                                              <span className="artist-order-detail-value">{item.fabricOption || item.singleOrderDetails?.fabricOption || 'N/A'}</span>
                                            </div>
                                          )}
                                          {/* Cut Type - Hide for uniforms, hoodies, long sleeves, and T-shirts */}
                                          {!shouldHideCutType && (
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Cut Type:</span>
                                              <span className="artist-order-detail-value">{item.cutType || item.singleOrderDetails?.cutType || 'N/A'}</span>
                                            </div>
                                          )}
                                          <div className="artist-order-detail-row">
                                            <span className="artist-order-detail-label">Type:</span>
                                            <span className="artist-order-detail-value">{item.singleOrderDetails?.sizingType || item.sizeType || 'Adult'}</span>
                                          </div>
                                          {/* Jersey/Shirt Size - For non-jersey apparel, show as "Size" */}
                                          {((showSingleJerseySize && (jerseyType === 'full' || jerseyType === 'shirt')) || (shouldHideJerseyType && (item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size))) && (
                                    <div className="artist-order-detail-row">
                                      <span className="artist-order-detail-label">{shouldHideJerseyType ? 'Size' : 'Jersey Size'}:</span>
                                      <span className="artist-order-detail-value">{item.singleOrderDetails?.jerseySize || item.singleOrderDetails?.size || item.size || 'N/A'}</span>
                                    </div>
                                          )}
                                          {/* Shorts Size - Hide for hoodies, long sleeves, and T-shirts */}
                                          {!shouldHideJerseyType && (
                                            <div className="artist-order-detail-row">
                                              <span className="artist-order-detail-label">Shorts Size:</span>
                                              <span className="artist-order-detail-value">{(jerseyType === 'full' || jerseyType === 'shorts') ? (item.singleOrderDetails?.shortsSize || 'N/A') : '-'}</span>
                                            </div>
                                          )}
                                        </>
                                      );
                                    })()}
                                  </div>
                                ) : isBall ? (
                                  /* Balls */
                                  <div className="artist-order-ball-details">
                                    {item.ballDetails?.sportType && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Sport:</span>
                                        <span className="artist-order-detail-value">{item.ballDetails.sportType}</span>
                                      </div>
                                    )}
                                    {item.ballDetails?.brand && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Brand:</span>
                                        <span className="artist-order-detail-value">{item.ballDetails.brand}</span>
                                      </div>
                                    )}
                                    {item.ballDetails?.size && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Size:</span>
                                        <span className="artist-order-detail-value">{item.ballDetails.size}</span>
                                      </div>
                                    )}
                                    {item.ballDetails?.material && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Material:</span>
                                        <span className="artist-order-detail-value">{item.ballDetails.material}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : isTrophy ? (
                                  /* Trophies */
                                  <div className="artist-order-trophy-details">
                                    {item.trophyDetails?.type && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Type:</span>
                                        <span className="artist-order-detail-value">{item.trophyDetails.type}</span>
                                      </div>
                                    )}
                                    {item.trophyDetails?.size && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Size:</span>
                                        <span className="artist-order-detail-value">{item.trophyDetails.size}</span>
                                      </div>
                                    )}
                                    {item.trophyDetails?.material && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Material:</span>
                                        <span className="artist-order-detail-value">{item.trophyDetails.material}</span>
                                      </div>
                                    )}
                                    {item.trophyDetails?.engraving && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Engraving:</span>
                                        <span className="artist-order-detail-value">{item.trophyDetails.engraving}</span>
                                      </div>
                                    )}
                                    {item.trophyDetails?.occasion && (
                                      <div className="artist-order-detail-row">
                                        <span className="artist-order-detail-label">Occasion:</span>
                                        <span className="artist-order-detail-value">{item.trophyDetails.occasion}</span>
                                      </div>
                                    )}
                                  </div>
                                ) : isCustomDesign ? (
                                  /* Custom Design - Use same layout as regular orders */
                                  (() => {
                                    const teamMembers = item.team_members || item.teamMembers || [];
                                    const memberCount = teamMembers.length;
                                    const isCustomTeamOrder = memberCount > 1;
                                    
                                    return isCustomTeamOrder ? (
                                      /* Custom Design - Team Orders */
                                      <div className="artist-order-team-details">
                                        <div className="artist-order-detail-row">
                                          <span className="artist-order-detail-label">Team:</span>
                                          <span className="artist-order-detail-value">{item.team_name || item.teamName || 'N/A'}</span>
                                        </div>
                                        <div className="artist-order-team-divider"></div>
                                        <div className="artist-order-members-list">
                                          {(() => {
                                            const fallbackVisibility = {
                                              jersey: teamMembers.some(member => Boolean(member?.size)),
                                              shorts: teamMembers.some(member => Boolean(member?.shortsSize))
                                            };
                                            const { showJersey: showTeamJerseySize, showShorts: showTeamShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                            return teamMembers.map((member, memberIndex) => {
                                              const memberJerseyType = member.jerseyType || member.jersey_type || 'full';
                                              const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                              return (
                                                <div key={memberIndex} className="artist-order-member-item">
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Surname:</span>
                                                    <span className="artist-order-detail-value">{(member.surname || member.lastName || 'N/A').toUpperCase()}</span>
                                                  </div>
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Jersey No:</span>
                                                    <span className="artist-order-detail-value">{member.number || member.jerseyNo || member.jerseyNumber || 'N/A'}</span>
                                                  </div>
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Jersey Type:</span>
                                                    <span className="artist-order-detail-value">{jerseyTypeLabel}</span>
                                                  </div>
                                                  {(member.fabricOption || member.fabric_option) && (
                                                    <div className="artist-order-detail-row">
                                                      <span className="artist-order-detail-label">Fabric:</span>
                                                      <span className="artist-order-detail-value">{member.fabricOption || member.fabric_option || 'N/A'}</span>
                                                    </div>
                                                  )}
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Cut Type:</span>
                                                    <span className="artist-order-detail-value">{member.cutType || member.cut_type || 'N/A'}</span>
                                                  </div>
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Type:</span>
                                                    <span className="artist-order-detail-value">{member.sizingType || member.sizing_type || 'Adult'}</span>
                                                  </div>
                                                  {showTeamJerseySize && (memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                                    <div className="artist-order-detail-row">
                                                      <span className="artist-order-detail-label">Jersey Size:</span>
                                                      <span className="artist-order-detail-value">{member.size || member.jerseySize || 'N/A'}</span>
                                                    </div>
                                                  )}
                                                  <div className="artist-order-detail-row">
                                                    <span className="artist-order-detail-label">Shorts Size:</span>
                                                    <span className="artist-order-detail-value">{(memberJerseyType === 'full' || memberJerseyType === 'shorts') ? (member.shortsSize || 'N/A') : '-'}</span>
                                                  </div>
                                                </div>
                                              );
                                            });
                                          })()}
                                        </div>
                                      </div>
                                    ) : (
                                      /* Custom Design - Single Orders */
                                      <div className="artist-order-single-details">
                                        {teamMembers.length > 0 ? (() => {
                                          const member = teamMembers[0];
                                          const memberJerseyType = member.jerseyType || 'full';
                                          const jerseyTypeLabel = memberJerseyType === 'shirt' ? 'Shirt Only' : memberJerseyType === 'shorts' ? 'Shorts Only' : 'Full Set';
                                          const fallbackVisibility = {
                                            jersey: Boolean(member?.size),
                                            shorts: Boolean(member?.shortsSize)
                                          };
                                          const { showJersey: showSingleJerseySize, showShorts: showSingleShortsSize } = getApparelSizeVisibility(item, fallbackVisibility);
                                          return (
                                            <>
                                              {item.team_name && (
                                                <div className="artist-order-detail-row">
                                                  <span className="artist-order-detail-label">Team:</span>
                                                  <span className="artist-order-detail-value">{item.team_name || 'N/A'}</span>
                                                </div>
                                              )}
                                              {member.surname && (
                                                <div className="artist-order-detail-row">
                                                  <span className="artist-order-detail-label">Surname:</span>
                                                  <span className="artist-order-detail-value">{(member.surname || 'N/A').toUpperCase()}</span>
                                                </div>
                                              )}
                                              {member.number && (
                                                <div className="artist-order-detail-row">
                                                  <span className="artist-order-detail-label">Jersey No:</span>
                                                  <span className="artist-order-detail-value">{member.number || 'N/A'}</span>
                                                </div>
                                              )}
                                              <div className="artist-order-detail-row">
                                                <span className="artist-order-detail-label">Jersey Type:</span>
                                                <span className="artist-order-detail-value">{jerseyTypeLabel}</span>
                                              </div>
                                              {member.fabricOption && (
                                                <div className="artist-order-detail-row">
                                                  <span className="artist-order-detail-label">Fabric:</span>
                                                  <span className="artist-order-detail-value">{member.fabricOption || 'N/A'}</span>
                                                </div>
                                              )}
                                              <div className="artist-order-detail-row">
                                                <span className="artist-order-detail-label">Cut Type:</span>
                                                <span className="artist-order-detail-value">{member.cutType || 'N/A'}</span>
                                              </div>
                                              <div className="artist-order-detail-row">
                                                <span className="artist-order-detail-label">Type:</span>
                                                <span className="artist-order-detail-value">{member.sizingType === 'kids' ? 'Kids' : 'Adult'}</span>
                                              </div>
                                              {showSingleJerseySize && (memberJerseyType === 'full' || memberJerseyType === 'shirt') && (
                                                <div className="artist-order-detail-row">
                                                  <span className="artist-order-detail-label">Jersey Size:</span>
                                                  <span className="artist-order-detail-value">{member.size || 'N/A'}</span>
                                                </div>
                                              )}
                                              <div className="artist-order-detail-row">
                                                <span className="artist-order-detail-label">Shorts Size:</span>
                                                <span className="artist-order-detail-value">{(memberJerseyType === 'full' || memberJerseyType === 'shorts') ? (member.shortsSize || 'N/A') : '-'}</span>
                                              </div>
                                            </>
                                          );
                                        })() : (
                                          <div className="artist-order-detail-row">
                                            <span className="artist-order-detail-label">No member details available</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })()
                                ) : null}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="artist-order-empty">
                        <p>No order items found</p>
                      </div>
                    )}
                    {/* Revision Notes from Admin (artist_tasks.revision_notes) */}
                    {displayTask.revision_notes && (
                      <div className="artist-revision-notes-panel" style={{ border: '1px solid var(--border-color, #e5e7eb)', borderRadius: '10px', padding: '12px', marginBottom: '6px', background: '#ffffff' }}>
                        <div className="artist-revision-notes-title" style={{ fontWeight: 700, marginBottom: '6px', fontSize: 'clamp(13px, 1.2vw, 16px)', display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                          <FontAwesomeIcon icon={faInfoCircle} />
                          Revision Notes
                        </div>
                        <div className="artist-revision-notes-body" style={{ fontSize: 'clamp(12px, 1.1vw, 15px)', whiteSpace: 'pre-wrap', color: '#000' }}>
                          {displayTask.revision_notes}
                        </div>
                      </div>
                    )}

                    {/* Uploaded Design Files moved below Order Details */}
                    <div className="artist-design-files-panel">
                      <div className="artist-design-files-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <FontAwesomeIcon icon={faImage} /> Uploaded Design Files
                          {' '}
                          <span style={{ color: '#64748b', fontWeight: 600 }}>
                            ({Array.isArray(designFiles) ? designFiles.length : 0})
                          </span>
                        </span>
                        {isInProgress && (
                          <button
                            className="artist-task-action-btn artist-task-secondary-btn"
                            onClick={handleOpenUpload}
                            disabled={uploading}
                            title="Upload one or more design files"
                          >
                            <FontAwesomeIcon icon={faUpload} />
                            {uploading ? 'Uploading…' : 'Upload Files'}
                          </button>
                        )}
                      </div>
                      {designFiles && designFiles.length > 0 ? (
                        <ul className="artist-design-files-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
                          {designFiles.map((f, idx) => {
                            const displayName = formatFilenameForDisplay(f.filename || f.publicId || `File-${idx + 1}`);
                            const dateStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleDateString() : '';
                            const timeStr = f.uploadedAt ? new Date(f.uploadedAt).toLocaleTimeString() : '';
                            return (
                              <li
                                key={f.publicId || idx}
                                className="artist-design-file-item"
                                style={{
                                  display: 'grid',
                                  gridTemplateColumns: '1fr auto',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  minWidth: 0,
                                  position: 'relative'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, width: '100%' }}>
                                  {isPreviewableImage(f.filename || f.url) ? (
                                    <button
                                      type="button"
                                      className="artist-design-file-button-link"
                                      title={f.filename || f.publicId}
                                      onClick={() => setZoomedImage({ url: f.url, name: f.filename || f.publicId || `File-${idx + 1}` })}
                                      style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                      {displayName}
                                    </button>
                                  ) : (
                                    <a
                                      className="artist-design-file-link"
                                      href={f.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      title={f.filename || f.publicId}
                                      style={{ maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                                    >
                                      {displayName}
                                    </a>
                                  )}
                                </div>
                                <div className="artist-design-file-date" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginRight: '8px', minWidth: '100px' }}>
                                  <span style={{ lineHeight: 1.1 }}>{dateStr}</span>
                                  <span style={{ lineHeight: 1.1, opacity: 0.8 }}>{timeStr}</span>
                                </div>
                                {isInProgress && (
                                  <button
                                    type="button"
                                    className="artist-task-icon-btn"
                                    title="Remove file"
                                    onClick={() => handleRemoveFile(f)}
                                    style={{ color: '#dc2626' }}
                                  >
                                    <FontAwesomeIcon icon={faTrash} />
                                  </button>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <div className="artist-design-files-empty">No files uploaded yet.</div>
                      )}
                    </div>
                  </div>
                  )}
                  
                    {/* Action Buttons in Left Column */}
                    <div className="task-details-actions">
                    {displayTask.status === 'pending' && (
                      <button 
                        className="artist-task-action-btn-left artist-task-primary-btn"
                        onClick={handleStartTask}
                        disabled={uploading}
                      >
                        <FontAwesomeIcon icon={faCheck} />
                        Start Task
                      </button>
                    )}
                    {displayTask.status === 'in_progress' && (
                      <button 
                        className={`artist-task-action-btn-left artist-task-success-btn ${!isApproved ? 'artist-task-btn-disabled' : ''}`}
                        onClick={handleSubmitDesign}
                        disabled={uploading || !isApproved || checkingApproval}
                        title={!isApproved ? 'Design must be approved by customer or wait 60 minutes after review request' : 'Submit design files'}
                      >
                        {uploading ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin />
                            Uploading...
                          </>
                        ) : checkingApproval ? (
                          <>
                            <FontAwesomeIcon icon={faSpinner} spin />
                            Checking...
                          </>
                        ) : !isApproved ? (
                          <>
                            <FontAwesomeIcon icon={faLock} />
                            Awaiting Approval
                          </>
                        ) : (
                          <>
                            <FontAwesomeIcon icon={faUpload} />
                            Submit Design
                          </>
                      )}
                    </button>
                    )}
                  </div>
                  </div>
                  
                  {/* Fixed Footer - Task Completed Badge */}
                  {displayTask.status === 'submitted' && (
                    <div className="task-details-container-footer">
                      <div className="task-completed-badge">
                        <FontAwesomeIcon icon={faCheck} />
                        <span>Task Completed</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Chat Room (70%) */}
              {!isBlindTask && (
                <div className="content-right-column">
                  <div className="artist-chat-embedded-container">
                    {loadingChatRoom ? (
                      <div className="artist-chat-loading">
                        <FontAwesomeIcon icon={faSpinner} spin />
                        <p>Loading chat...</p>
                      </div>
                    ) : chatRoom ? (
                      <div className="artist-chat-embedded-wrapper">
                        <ArtistChatModal 
                          room={chatRoom} 
                          isOpen={true}
                          onClose={() => {}} // Don't allow closing embedded chat
                        />
                      </div>
                    ) : (
                      <div className="artist-chat-no-room">
                        <FontAwesomeIcon icon={faComments} />
                        <p>Chat room not available</p>
                        <button 
                          className="artist-task-chat-btn"
                          onClick={() => onOpenChat && onOpenChat(displayTask)}
                        >
                          <FontAwesomeIcon icon={faComments} />
                          Create Chat Room
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div className="artist-image-zoom-overlay" onClick={() => setZoomedImage(null)}>
            <div className="artist-image-zoom-container" onClick={(e) => e.stopPropagation()}>
              <button className="artist-image-zoom-close" onClick={() => setZoomedImage(null)} aria-label="Close">
                <FontAwesomeIcon icon={faTimes} />
              </button>
              <img 
                src={zoomedImage.url} 
                alt={zoomedImage.name}
                className="artist-image-zoom-img"
              />
              <div className="artist-image-zoom-caption">{zoomedImage.name}</div>
            </div>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.ai,.psd,.eps,.svg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

      </div>

      {/* Image Gallery Modal */}
      {imageGallery.isOpen && imageGallery.images.length > 0 && (
        <div 
          className="artist-image-gallery-overlay"
          onClick={closeImageGallery}
        >
          <div 
            className="artist-image-gallery-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="artist-image-gallery-close"
              onClick={closeImageGallery}
              aria-label="Close gallery"
            >
              <FaTimes />
            </button>

            <button
              className="artist-image-gallery-nav artist-image-gallery-prev"
              onClick={goToPrevImage}
              aria-label="Previous image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronLeft />
            </button>

            <div className="artist-image-gallery-main">
              <img
                src={imageGallery.images[imageGallery.currentIndex].url}
                alt={`Design ${imageGallery.currentIndex + 1}`}
                className="artist-image-gallery-image"
                onError={(e) => {
                  e.target.src = '/image_highlights/image.png';
                }}
              />
              <div className="artist-image-gallery-info">
                <span className="artist-image-gallery-counter">
                  {imageGallery.currentIndex + 1} / {imageGallery.images.length}
                </span>
                <button
                  className="artist-image-gallery-download"
                  onClick={() => downloadImage(
                    imageGallery.images[imageGallery.currentIndex].url,
                    imageGallery.images[imageGallery.currentIndex].filename
                  )}
                  aria-label="Download image"
                >
                  <FaDownload />
                </button>
              </div>
            </div>

            <button
              className="artist-image-gallery-nav artist-image-gallery-next"
              onClick={goToNextImage}
              aria-label="Next image"
              disabled={imageGallery.images.length <= 1}
            >
              <FaChevronRight />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistTaskModal;
