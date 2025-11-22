import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ArtistChatModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faPaperclip, 
  faTimes, 
  faUser,
  faFile,
  faTimes as faX,
  faSpinner,
  faEye,
  faUpload,
  faClipboardCheck
} from '@fortawesome/free-solid-svg-icons';
import chatService from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ConfirmModal from '../shared/ConfirmModal';

const ArtistChatModal = ({ room, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [orderNumber, setOrderNumber] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFiles, setReviewFiles] = useState([]);
  const [reviewNotes, setReviewNotes] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [reviewConfirmModal, setReviewConfirmModal] = useState({
    isOpen: false,
    message: ''
  });
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const reviewFileInputRef = useRef(null);
  const { user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Add/remove class to body when image is zoomed to hide task modal close button
  useEffect(() => {
    if (zoomedImage) {
      document.body.classList.add('image-zoomed');
    } else {
      document.body.classList.remove('image-zoomed');
    }
    return () => {
      document.body.classList.remove('image-zoomed');
    };
  }, [zoomedImage]);

  const initializeChat = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔧 Initializing chat for room:', room.id);
      
      // Get customer information from backend API (bypasses RLS)
      let customerName = 'Customer';
      let customerPhone = null;
      
      try {
        const customerInfo = await chatService.getCustomerInfo(room.id);
        console.log('👤 Customer info from API:', customerInfo);
        customerName = customerInfo.full_name || 'Customer';
        customerPhone = customerInfo.phone || null;
        setCustomer({
          full_name: customerName,
          phone: customerPhone
        });
      } catch (error) {
        console.error('❌ Error fetching customer info:', error);
        // Fallback to default
        setCustomer({
          full_name: customerName,
          phone: customerPhone
        });
      }
      
      // Get order number from order
      if (room.order_id) {
        try {
          const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            // Use artist-specific endpoint that allows artists to access their assigned orders
            const orderResponse = await fetch(`${API_BASE_URL}/api/artist/order/${room.order_id}/number`, {
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (orderResponse.ok) {
              const orderData = await orderResponse.json();
              const extractedOrderNumber = orderData.order_number || null;
              console.log('📦 Order number for chat modal:', extractedOrderNumber);
              setOrderNumber(extractedOrderNumber);
            } else {
              console.warn('⚠️ Could not fetch order number, using room.order_number or room_name');
              // Fallback to order_number from room if available, otherwise room_name
              setOrderNumber(room.order?.order_number || room.order_number || room.room_name || 'N/A');
            }
          }
        } catch (orderError) {
          console.warn('Error fetching order number:', orderError);
          // Fallback to order_number from room if available, otherwise room_name
          setOrderNumber(room.order?.order_number || room.order_number || room.room_name || 'N/A');
        }
      } else {
        // No order_id, use room_name or order_number from room
        setOrderNumber(room.order?.order_number || room.order_number || room.room_name || 'N/A');
      }
      
      // Load messages
      console.log('📥 Loading messages for room:', room.id);
      const messagesData = await chatService.getChatRoomMessages(room.id);
      console.log('📥 Loaded messages:', messagesData);
      console.log('📥 Messages data type:', Array.isArray(messagesData), 'Length:', messagesData?.length);
      
      if (!messagesData || !Array.isArray(messagesData)) {
        console.warn('⚠️ No messages data or invalid format:', messagesData);
        setMessages([]);
      } else {
        const messagesWithSenders = messagesData.map(msg => ({
          ...msg,
          client_id: msg.client_id || msg.id,
          sender_name: msg.sender_type === 'artist' ? 'You' : customerName
        }));
        console.log('📥 Messages with senders:', messagesWithSenders);
        console.log('📥 Setting messages state with count:', messagesWithSenders.length);
        setMessages(messagesWithSenders);
      }
      
      // Mark messages as read
      await chatService.markMessagesAsRead(room.id, user.id);
      
      // Subscribe to new messages
      console.log('🔔 Setting up real-time subscription for room:', room.id);
      const subscription = chatService.subscribeToChatRoom(room.id, (payload) => {
        console.log('📨 Real-time message received:', payload);
        if (payload.new) {
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id);
            if (!exists) {
              const messageWithSender = {
                ...payload.new,
                client_id: payload.new.id,
                sender_name: payload.new.sender_type === 'artist' ? 'You' : (customer?.full_name || customerName || 'Customer')
              };
              console.log('📨 Message added to state, new count:', prev.length + 1);
              return [...prev, messageWithSender];
            }
            console.log('📨 Message already exists, not adding');
            return prev;
          });
          chatService.markMessagesAsRead(room.id, user.id);
        }
      });

      return () => {
        console.log('🔔 Unsubscribing from room:', room.id);
        subscription.unsubscribe();
      };
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      alert('Error loading chat: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [room, user]);

  useEffect(() => {
    if (isOpen && room) {
      initializeChat();
    }
  }, [isOpen, room, initializeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && attachments.length === 0) return;

    const messageText = newMessage.trim();
    const messageAttachments = [...attachments];
    let optimisticId = null;

    try {
      setSending(true);
      
      console.log('📤 Sending message:', {
        roomId: room.id,
        userId: user.id,
        message: messageText,
        attachments: messageAttachments
      });
      
      // Optimistically add message
      optimisticId = `temp-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        client_id: optimisticId,
        room_id: room.id,
        sender_id: user.id,
        sender_type: 'artist',
        message: messageText,
        message_type: 'text',
        attachments: messageAttachments,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: 'You'
      };
      
      setMessages(prev => {
        const exists = prev.some(msg => (msg.client_id || msg.id) === optimisticId);
        if (!exists) {
          return [...prev, optimisticMessage];
        }
        return prev;
      });
      
      // Clear input
      setNewMessage('');
      setAttachments([]);
      
      // Scroll to bottom after message is added
      setTimeout(() => {
        scrollToBottom();
      }, 50);

      // Send message to database
      const sentMessage = await chatService.sendMessage(
        room.id,
        user.id,
        'artist',
        messageText,
        'text',
        messageAttachments
      );

      console.log('✅ Message sent successfully:', sentMessage);

      // Replace optimistic message with actual message details
      setMessages(prev => prev.map(msg => {
        if ((msg.client_id || msg.id) === optimisticId) {
          return {
            ...msg,
            id: sentMessage.id,
            client_id: optimisticId,
            created_at: sentMessage.created_at || msg.created_at,
            updated_at: sentMessage.updated_at || msg.updated_at,
            is_read: sentMessage.is_read ?? msg.is_read,
            attachments: sentMessage.attachments || msg.attachments
          };
        }
        return msg;
      }));
      
    } catch (error) {
      console.error('❌ Error sending message:', error);
      alert('Failed to send message. Please try again.');

      // Remove optimistic message on failure
      if (optimisticId) {
        setMessages(prev => prev.filter(msg => (msg.client_id || msg.id) !== optimisticId));
      }
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Upload failed');
        }
        
        const data = await response.json();
        return {
          name: file.name,
          url: data.url,
          type: file.type,
          size: file.size
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedFiles]);
      
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleReviewFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setUploading(true);
      
      // Get auth token
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required');
      }
      
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('http://localhost:4000/api/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Upload failed');
        }
        
        const data = await response.json();
        return {
          name: file.name,
          url: data.url,
          type: file.type,
          size: file.size
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      setReviewFiles(prev => [...prev, ...uploadedFiles]);
      
    } catch (error) {
      console.error('Error uploading review files:', error);
      alert('Failed to upload files. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const removeReviewFile = (index) => {
    setReviewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const buildReviewConfirmationMessage = () => {
    const fileCount = reviewFiles.length;
    const fileLabel = `${fileCount} design file${fileCount === 1 ? '' : 's'}`;
    const filePreviewNames = reviewFiles
      .slice(0, 3)
      .map(file => file.name)
      .join(', ');
    const extraFiles =
      fileCount > 3 ? ` +${fileCount - 3} more` : '';
    const notes = reviewNotes.trim();
    const notesPreview = notes
      ? `Notes preview: "${notes.length > 140 ? `${notes.slice(0, 137)}…` : notes}"`
      : 'No additional notes were added.';

    return `You're about to send ${fileLabel} for customer approval (${filePreviewNames}${extraFiles}). ${notesPreview}`;
  };

  const openReviewConfirmation = () => {
    if (reviewFiles.length === 0) {
      alert('Please upload at least one design file for review.');
      return;
    }

    setReviewConfirmModal({
      isOpen: true,
      message: buildReviewConfirmationMessage()
    });
  };

  const closeReviewConfirmation = () => {
    setReviewConfirmModal(prev => ({ ...prev, isOpen: false }));
  };

  const handleSubmitReview = async () => {
    if (reviewFiles.length === 0) {
      alert('Please upload at least one design file for review.');
      return;
    }

    let optimisticId = null;

    try {
      setSubmittingReview(true);
      
      // Submit review request with files and notes

      optimisticId = `review-${Date.now()}`;
      const optimisticMessage = {
        id: optimisticId,
        client_id: optimisticId,
        room_id: room.id,
        sender_id: user.id,
        sender_type: 'artist',
        message: `Design Review Request\n\n${reviewNotes || 'Please review the attached design files and provide your feedback.'}`,
        message_type: 'review_request',
        attachments: reviewFiles,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: 'You'
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setShowReviewModal(false);
      setReviewFiles([]);
      setReviewNotes('');
      setTimeout(() => scrollToBottom(), 50);

      const sentMessage = await chatService.sendMessage(
        room.id,
        user.id,
        'artist',
        optimisticMessage.message,
        'review_request',
        reviewFiles
      );

      setMessages(prev => prev.map(msg => (
        (msg.client_id || msg.id) === optimisticId
          ? {
              ...msg,
              id: sentMessage.id,
              created_at: sentMessage.created_at || msg.created_at,
              updated_at: sentMessage.updated_at || msg.updated_at,
              attachments: sentMessage.attachments || msg.attachments,
              is_read: sentMessage.is_read ?? msg.is_read
            }
          : msg
      )));

      // Close review modal and reset state
      setShowReviewModal(false);
      setReviewFiles([]);
      setReviewNotes('');
      
    } catch (error) {
      console.error('Error submitting review:', error);
      if (optimisticId) {
        setMessages(prev => prev.filter(msg => (msg.client_id || msg.id) !== optimisticId));
      }
    } finally {
      setSubmittingReview(false);
      closeReviewConfirmation();
    }
  };

  const handleConfirmReviewSubmit = () => {
    closeReviewConfirmation();
    handleSubmitReview();
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen || !room) return null;

  // Build a clean order display without redundant words like "Order" or "Chat"
  const rawOrderDisplay =
    orderNumber ||
    room.order?.order_number ||
    room.order_number ||
    room.room_name ||
    'N/A';
  const cleanedOrderDisplay = String(rawOrderDisplay)
    .replace(/\bOrder\s*#?\s*/i, '') // remove "Order" or "Order #"
    .replace(/\s*\bChat\b\s*$/i, '') // remove trailing "Chat"
    .trim();

  return (
    <div className="artist-chat-modal-overlay" onClick={onClose}>
      <div className="artist-chat-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="artist-chat-header">
          <div className="artist-chat-header-info">
            <h3 className="artist-chat-customer-name">
              <FontAwesomeIcon icon={faUser} />
              <span><strong>{customer?.full_name || 'Customer'}</strong></span>
            </h3>
            <p className="artist-chat-order-info">{cleanedOrderDisplay}</p>
          </div>
          <button className="artist-chat-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>

        {/* Messages */}
        <div className="artist-chat-messages">
          {loading ? (
            <div className="artist-chat-loading-messages">
              <FontAwesomeIcon icon={faSpinner} spin />
              <span>Loading messages...</span>
            </div>
          ) : (
            <>
              {console.log('🎨 Rendering messages, count:', messages.length)}
              {messages.length === 0 ? (
                <div className="artist-chat-empty-state">
                  <div className="artist-chat-empty-icon">
                    <FontAwesomeIcon icon={faUser} />
                  </div>
                  <p className="artist-chat-empty-title">Start a conversation</p>
                  <p className="artist-chat-empty-message">
                    This is a new chat room. Send a message to start communicating with {customer?.full_name || 'the customer'}.
                  </p>
                </div>
              ) : (
                messages.map((message) => {
                console.log('🎨 Rendering message:', message.id, message.message);
                return (
                  <div 
                    key={message.client_id || message.id}
                    className={`artist-chat-message ${message.sender_type === 'artist' ? 'sent' : 'received'}`}
                  >
                  <div className="artist-chat-message-content">
                    <div className="artist-chat-message-header">
                      <span className="artist-chat-sender-name">{message.sender_name}</span>
                      <span className="artist-chat-message-time">{formatTime(message.created_at)}</span>
                    </div>
                    <div 
                      className="artist-chat-message-text"
                      dangerouslySetInnerHTML={{
                        __html: (() => {
                          try {
                            if (typeof message.message === 'string' && message.message.startsWith('{')) {
                              const parsed = JSON.parse(message.message);
                              const text = parsed.message || message.message;
                              return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                            }
                            return message.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                          } catch (e) {
                            return message.message.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
                          }
                        })()
                      }}
                    />
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="artist-chat-message-attachments">
                        {message.attachments.map((attachment, index) => (
                          <div key={index} className="artist-chat-attachment">
                            {attachment.type.startsWith('image/') ? (
                              <div className="artist-chat-image-attachment">
                                <img 
                                  src={attachment.url} 
                                  alt={attachment.name}
                                  onClick={() => setZoomedImage(attachment.url)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span className="artist-chat-attachment-name">{attachment.name}</span>
                              </div>
                            ) : (
                              <div className="artist-chat-file-attachment">
                                <FontAwesomeIcon icon={faFile} />
                                <span className="artist-chat-attachment-name">{attachment.name}</span>
                                <a 
                                  href={attachment.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="artist-chat-download-link"
                                >
                                  <FontAwesomeIcon icon={faEye} />
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                );
              })
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Message Input */}
        <div className="artist-chat-input-container">

          {attachments.length > 0 && (
            <div className="artist-attachments-preview">
              {attachments.map((attachment, index) => (
                <div key={index} className="artist-attachment-preview">
                  {attachment.type.startsWith('image/') ? (
                    <img src={attachment.url} alt={attachment.name} />
                  ) : (
                    <FontAwesomeIcon icon={faFile} />
                  )}
                  <span>{attachment.name}</span>
                  <button
                    onClick={() => removeAttachment(index)}
                    className="artist-remove-attachment"
                  >
                    <FontAwesomeIcon icon={faX} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Ask for Review Button - Inside Chat Box */}
          {!showReviewModal && (
            <button
              className="artist-ask-review-btn"
              onClick={() => setShowReviewModal(true)}
              title="Submit design for customer review"
            >
              <FontAwesomeIcon icon={faClipboardCheck} />
              Ask for Review
            </button>
          )}

          <form onSubmit={handleSendMessage} className="artist-message-form">
            <div className="artist-text-input-group">
              <input
                type="file"
                ref={fileInputRef}
                multiple
                accept="image/*,.pdf,.doc,.docx"
                onChange={(e) => handleFileUpload(e.target.files)}
                style={{ display: 'none' }}
                disabled={uploading}
              />

              <button
                type="button"
                className="artist-chat-attach-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faPaperclip} />
                )}
              </button>

              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="artist-chat-message-input"
                disabled={sending}
              />

              <button
                type="submit"
                className="artist-chat-send-btn"
                disabled={sending || (!newMessage.trim() && attachments.length === 0)}
              >
                {sending ? (
                  <FontAwesomeIcon icon={faSpinner} spin />
                ) : (
                  <FontAwesomeIcon icon={faPaperPlane} />
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Artist Review Modal */}
        {showReviewModal && (
          <div className="artist-review-modal-overlay" onClick={() => setShowReviewModal(false)}>
            <div className="artist-review-modal" onClick={(e) => e.stopPropagation()}>
              <div className="artist-review-modal-header">
                <h3>
                  <FontAwesomeIcon icon={faClipboardCheck} />
                  Submit Design for Review
                </h3>
                <button 
                  className="artist-chat-close-btn" 
                  onClick={() => setShowReviewModal(false)}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="artist-review-modal-content">
                <div className="artist-review-instructions">
                  <p>Upload your design files and add notes for the customer to review. They can approve, request changes, or provide feedback.</p>
                </div>

                {/* File Upload Section */}
                <div className="artist-review-file-upload">
                  <h4>Design Files</h4>
                  <div className="artist-file-upload-area">
                    <input
                      type="file"
                      ref={reviewFileInputRef}
                      multiple
                      accept="image/*,.pdf,.ai,.psd,.eps"
                      onChange={(e) => handleReviewFileUpload(e.target.files)}
                      style={{ display: 'none' }}
                      disabled={uploading}
                    />
                    
                    <button
                      type="button"
                      className="upload-files-btn"
                      onClick={() => reviewFileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} spin />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faUpload} />
                          Choose Design Files
                        </>
                      )}
                    </button>
                    
                    <p className="upload-hint">
                      Supported formats: JPG, PNG, PDF, AI, PSD, EPS
                    </p>
                  </div>

                  {/* File Preview */}
                  {reviewFiles.length > 0 && (
                    <div className="artist-review-files-preview">
                      <h5>Selected Files:</h5>
                      <div className="files-list">
                        {reviewFiles.map((file, index) => (
                          <div key={index} className="artist-file-item">
                            <div className="artist-file-info">
                              {file.type.startsWith('image/') ? (
                                <img src={file.url} alt={file.name} className="artist-file-thumbnail" />
                              ) : (
                                <FontAwesomeIcon icon={faFile} className="artist-file-icon" />
                              )}
                              <span className="artist-file-name">{file.name}</span>
                            </div>
                            <button 
                              onClick={() => removeReviewFile(index)}
                              className="remove-file-btn"
                            >
                              <FontAwesomeIcon icon={faX} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes Section */}
                <div className="artist-review-notes">
                  <h4>Notes for Customer</h4>
                  <textarea
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    placeholder="Add any notes, instructions, or questions for the customer..."
                    className="artist-notes-textarea"
                    rows={4}
                  />
                </div>
              </div>

              <div className="artist-review-modal-actions">
                <button 
                  className="artist-chat-cancel-btn"
                  onClick={() => setShowReviewModal(false)}
                >
                  Cancel
                </button>
                <button 
                  className="submit-review-btn"
                  onClick={openReviewConfirmation}
                  disabled={submittingReview || reviewFiles.length === 0}
                >
                  {submittingReview ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faClipboardCheck} />
                      Submit for Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="artist-chat-image-zoom-overlay"
            onClick={() => setZoomedImage(null)}
          >
            <button 
              className="artist-chat-image-zoom-close"
              onClick={() => setZoomedImage(null)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed"
              className="artist-chat-image-zoom-content"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}

        <ConfirmModal
          isOpen={reviewConfirmModal.isOpen}
          onClose={closeReviewConfirmation}
          onConfirm={handleConfirmReviewSubmit}
          title="Send review request?"
          message={reviewConfirmModal.message}
          confirmText="Send Review"
          cancelText="Go Back"
          type="warning"
        />
      </div>
    </div>
  );
};

export default ArtistChatModal;