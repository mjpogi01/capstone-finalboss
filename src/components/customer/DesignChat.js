import React, { useState, useEffect, useRef } from 'react';
import './DesignChat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPaperPlane, 
  faPaperclip, 
  faTimes, 
  faUser,
  faImage,
  faFile,
  faCheck,
  faTimes as faX,
  faSpinner
} from '@fortawesome/free-solid-svg-icons';
import chatService from '../../services/chatService';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import ReviewResponse from './ReviewResponse';

const getReviewActionFromMessage = (text = '') => {
  const normalized = text.toLowerCase();
  if (normalized.startsWith('design approved')) return 'approve';
  if (normalized.startsWith('changes requested')) return 'request_changes';
  if (normalized.startsWith('feedback')) return 'feedback';
  return 'feedback';
};

const applyReviewResponseState = (messages = []) => {
  const updatedMessages = messages.map(msg => ({ ...msg }));

  const reviewRequests = updatedMessages
    .filter(msg => msg.message_type === 'review_request' && msg.sender_type === 'artist')
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  const reviewResponses = messages
    .filter(msg => msg.message_type === 'review_response' && msg.sender_type === 'customer')
    .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

  let responseIndex = 0;

  reviewRequests.forEach((request, idx) => {
    const requestTime = new Date(request.created_at || 0);
    const nextRequest = reviewRequests[idx + 1];
    const nextRequestTime = nextRequest ? new Date(nextRequest.created_at || 0) : null;

    while (responseIndex < reviewResponses.length) {
      const response = reviewResponses[responseIndex];
      const responseTime = new Date(response.created_at || 0);

      if (responseTime < requestTime) {
        responseIndex += 1;
        continue;
      }

      if (nextRequestTime && responseTime >= nextRequestTime) {
        break;
      }

      responseIndex += 1;

      const action = getReviewActionFromMessage(response.message || '');
      const messageIndex = updatedMessages.findIndex(msg => msg.id === request.id);
      if (messageIndex !== -1) {
        updatedMessages[messageIndex] = {
          ...updatedMessages[messageIndex],
          reviewResponded: true,
          reviewResponseAction: action,
          reviewResponseAt: response.created_at,
          reviewResponseSummary: response.message
        };
      }
      break;
    }
  });

  return updatedMessages;
};

const DesignChat = ({ orderId, isOpen, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatRoom, setChatRoom] = useState(null);
  const [sending, setSending] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [assignedArtist, setAssignedArtist] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [responseNotice, setResponseNotice] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen && orderId) {
      initializeChat();
    }
  }, [isOpen, orderId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!responseNotice) return;
    const timer = setTimeout(() => setResponseNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [responseNotice]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    try {
      setLoading(true);
      
      // Get assigned artist for this order
      const artist = await chatService.getAssignedArtist(orderId);
      setAssignedArtist(artist);
      
      // Try to get existing chat room
      let room = await chatService.getChatRoomByOrder(orderId);
      
      if (!room) {
        // Create new chat room if it doesn't exist
        // Use the assigned artist ID if available, otherwise use placeholder
        const artistId = artist?.id || '00000000-0000-0000-0000-000000000001';
        
        const roomId = await chatService.createChatRoom(orderId, user.id, artistId);
        room = { id: roomId, order_id: orderId, customer_id: user.id, artist_id: artistId };
      }

      setChatRoom(room);
      
      // Load messages
      const messagesData = await chatService.getChatRoomMessages(room.id);
      let messagesWithSenders = (messagesData || []).map(msg => ({
        ...msg,
        sender_name: msg.sender_type === 'customer' ? 'You' : (artist?.artist_name || 'Artist')
      }));
      
      setMessages(applyReviewResponseState(messagesWithSenders));
      
      // Mark messages as read
      await chatService.markMessagesAsRead(room.id, user.id);
      
      // Subscribe to new messages
      const subscription = chatService.subscribeToChatRoom(room.id, (payload) => {
        if (payload.new) {
          // Add sender name for better display
          const messageWithSender = {
            ...payload.new,
            sender_name: payload.new.sender_type === 'customer' ? 'You' : (assignedArtist?.artist_name || 'Artist')
          };
          
          // Only add if it's not already in the messages (avoid duplicates)
          setMessages(prev => {
            const exists = prev.some(msg => msg.id === payload.new.id);
            const nextMessages = exists
              ? prev.map(msg => (msg.id === payload.new.id ? { ...msg, ...messageWithSender } : msg))
              : [...prev, messageWithSender];

            return applyReviewResponseState(nextMessages);
          });
          
          chatService.markMessagesAsRead(room.id, user.id);
        }
      });

      return () => {
        subscription.unsubscribe();
      };
      
    } catch (error) {
      console.error('Error initializing chat:', error);
      alert('Error loading chat: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!chatRoom) return;

    try {
      setSending(true);
      
      const messageData = {
        roomId: chatRoom.id,
        senderId: user.id,
        senderType: 'customer',
        message: newMessage.trim(),
        messageType: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments
      };

      // Add message to local state immediately for instant UI feedback
      const tempMessage = {
        id: `temp-${Date.now()}`,
        room_id: messageData.roomId,
        sender_id: messageData.senderId,
        sender_type: messageData.senderType,
        message: messageData.message,
        message_type: messageData.messageType,
        attachments: messageData.attachments,
        is_read: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sender_name: 'You' // Temporary name for local display
      };

      // Add to local state immediately
      setMessages(prev => [...prev, tempMessage]);
      
      // Clear input immediately
      setNewMessage('');
      setAttachments([]);

      // Send to server
      const messageId = await chatService.sendMessage(
        messageData.roomId,
        messageData.senderId,
        messageData.senderType,
        messageData.message,
        messageData.messageType,
        messageData.attachments
      );

      // Update the temp message with the real ID from server
      setMessages(prev => prev.map(msg => 
        msg.id === tempMessage.id 
          ? { ...msg, id: messageId }
          : msg
      ));
      
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message: ' + error.message);
      
      // Remove the temp message if sending failed
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    } finally {
      setSending(false);
    }
  };

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    try {
      setUploading(true);
      const uploadPromises = files.map(file => chatService.uploadAttachment(file, chatRoom.id));
      const uploadedFiles = await Promise.all(uploadPromises);
      setAttachments(prev => [...prev, ...uploadedFiles]);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleReviewResponse = async (response) => {
    try {
      setSending(true);
      
      const trimmedFeedback = response.feedback.trim();
      const responsePrefix = (() => {
        switch (response.action) {
          case 'approve':
            return 'Design Approved';
          case 'request_changes':
            return 'Changes Requested';
          default:
            return '';
        }
      })();

      const responseMessage = responsePrefix
        ? `${responsePrefix}${trimmedFeedback ? `\n\n${trimmedFeedback}` : ''}`
        : trimmedFeedback;

      await chatService.sendMessage(
        chatRoom.id,
        user.id,
        'customer',
        responseMessage,
        'review_response',
        []
      );

      const responseRecordedAt = new Date().toISOString();
      setMessages(prev => prev.map(msg => (
        msg.id === response.reviewId
          ? {
              ...msg,
              reviewResponded: true,
              reviewResponseAction: response.action,
              reviewResponseAt: responseRecordedAt,
              reviewResponseSummary: trimmedFeedback || (responsePrefix ? responsePrefix : 'Feedback shared with artist')
            }
          : msg
      )));

      setResponseNotice({
        type: 'success',
        message: 'Your response was sent to the artist.'
      });

    } catch (error) {
      console.error('Error sending review response:', error);
      setResponseNotice({
        type: 'error',
        message: 'Failed to send your response. Please try again.'
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageIcon = (messageType) => {
    switch (messageType) {
      case 'image':
        return faImage;
      case 'file':
        return faFile;
      case 'approval_request':
        return faCheck;
      case 'approval_response':
        return faCheck;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    // Only close if clicking the overlay itself, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="design-chat-overlay" onClick={handleOverlayClick}>
      <div className="design-chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="design-chat-header">
          <div className="chat-header-info">
            <h3>Design Chat</h3>
            {chatRoom && (
              <p className="chat-order-info">
                Order: {chatRoom.order_id?.substring(0, 8) || 'N/A'} • 
                Artist: {assignedArtist ? assignedArtist.artist_name : 'Not Assigned'}
              </p>
            )}
          </div>
          <button className="chat-close-btn" onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        {responseNotice && (
          <div className={`design-chat-response-banner ${responseNotice.type}`}>
            <span>{responseNotice.message}</span>
            <button
              type="button"
              className="response-banner-close"
              onClick={() => setResponseNotice(null)}
              aria-label="Dismiss notification"
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>
        )}

        <div className="design-chat-body">
          {loading ? (
            <div className="chat-loading">
              <FontAwesomeIcon icon={faSpinner} spin />
              <p>Loading chat...</p>
            </div>
          ) : (
            <>
              <div className="chat-messages">
                {messages.length === 0 ? (
                  <div className="chat-empty">
                    <FontAwesomeIcon icon={faUser} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => {
                    console.log('🎨 Rendering message:', message.id, 'Type:', message.message_type, 'Sender:', message.sender_type);
                    const isReviewRequest = message.message_type === 'review_request' && message.sender_type === 'artist';
                    return (
                      <div 
                        key={message.id} 
                        className={`chat-message ${message.sender_type === 'customer' ? 'customer' : 'artist'}`}
                      >
                      <div className="message-content">
                        <div className="message-header">
                          <span className="sender-name">{message.sender_name}</span>
                          <span className="message-time">{formatTime(message.created_at)}</span>
                        </div>
                        
                        <div className="message-body">
                          {message.message && !isReviewRequest && (
                            <p 
                              className="message-text"
                              dangerouslySetInnerHTML={{
                                __html: message.message
                                  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                  .replace(/\n/g, '<br>')
                              }}
                            />
                          )}
                          
                          {!isReviewRequest && message.attachments && message.attachments.length > 0 && (
                            <div className="message-attachments">
                              {message.attachments.map((attachment, index) => {
                                const isImage = attachment.type?.startsWith('image/') || 
                                                (attachment.url && /\.(png|jpe?g|gif|webp)$/i.test(attachment.url));
                                return (
                                  <div key={index} className="attachment-item">
                                    {isImage ? (
                                      <>
                                        <img 
                                          src={attachment.url} 
                                          alt={attachment.filename || attachment.name}
                                          onClick={() => setZoomedImage(attachment.url)}
                                          style={{ cursor: 'pointer', maxWidth: '200px', maxHeight: '150px', borderRadius: '8px' }}
                                        />
                                        <span>{attachment.filename || attachment.name}</span>
                                      </>
                                    ) : (
                                      <>
                                        <FontAwesomeIcon icon={faFile} />
                                        <span>{attachment.filename || attachment.name}</span>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Review Request Component */}
                          {isReviewRequest ? (
                            <ReviewResponse 
                              reviewMessage={message}
                              onRespond={handleReviewResponse}
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="chat-input-area">
                {attachments.length > 0 && (
                  <div className="attachments-preview">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="attachment-preview">
                        <FontAwesomeIcon icon={faFile} />
                        <span>{attachment.filename}</span>
                        <button onClick={() => removeAttachment(index)}>
                          <FontAwesomeIcon icon={faX} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="chat-input-container">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    multiple
                    style={{ display: 'none' }}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  
                  <button 
                    className="attach-btn"
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
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="chat-input"
                    disabled={sending}
                  />
                  
                  <button 
                    className="send-btn"
                    onClick={handleSendMessage}
                    disabled={sending || (!newMessage.trim() && attachments.length === 0)}
                  >
                    {sending ? (
                      <FontAwesomeIcon icon={faSpinner} spin />
                    ) : (
                      <FontAwesomeIcon icon={faPaperPlane} />
                    )}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div 
            className="image-zoom-overlay"
            onClick={() => setZoomedImage(null)}
          >
            <button 
              className="image-zoom-close"
              onClick={() => setZoomedImage(null)}
            >
              <FontAwesomeIcon icon={faTimes} />
            </button>
            <img 
              src={zoomedImage} 
              alt="Zoomed"
              className="image-zoom-content"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DesignChat;
