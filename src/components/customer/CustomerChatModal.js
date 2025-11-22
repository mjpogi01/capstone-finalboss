import React, { useState, useEffect, useCallback } from 'react';
import './CustomerChatModal.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, 
  faUser, 
  faCircle,
  faSearch,
  faTimes,
  faShoppingBag
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import DesignChat from './DesignChat';
import BranchSupportChat from './BranchSupportChat';

const CustomerChatModal = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('orders');
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();

  const fetchCustomerChatRooms = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const rooms = await chatService.getCustomerChatRooms(user.id);
      
      // Enhance rooms with order and artist information
      const enhancedRooms = await Promise.all(
        rooms.map(async (room) => {
          try {
            // Get order information (API-first, fallback to Supabase)
            let order = {};
            try {
              if (room.order_id) {
                const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                  const orderResponse = await fetch(`${API_BASE_URL}/api/orders/${room.order_id}`, {
                    headers: {
                      'Authorization': `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  if (orderResponse.ok) {
                    const orderData = await orderResponse.json();
                    const orderNumber = orderData.order_number || orderData.orderNumber || null;
                    order = {
                      order_number: orderNumber || 'N/A',
                      status: orderData.status || 'pending',
                      total_amount: orderData.total_amount || orderData.total || 0,
                      created_at: orderData.created_at || orderData.createdAt || new Date().toISOString()
                    };
                  }
                }
              }
            } catch (apiErr) {
              // Ignore and fallback
            }
            if (!order.order_number && room.order_id) {
              try {
                const { data: fallbackOrder } = await supabase
                  .from('orders')
                  .select('order_number, status, total_amount, created_at')
                  .eq('id', room.order_id)
                  .single();
                if (fallbackOrder) {
                  order = {
                    order_number: fallbackOrder.order_number || 'N/A',
                    status: fallbackOrder.status || 'pending',
                    total_amount: fallbackOrder.total_amount || 0,
                    created_at: fallbackOrder.created_at || new Date().toISOString()
                  };
                }
              } catch (fallbackErr) {
                // leave order as {}
              }
            }

            // Get artist information
            const { data: artistProfile } = await supabase
              .from('artist_profiles')
              .select('artist_name, user_id')
              .eq('id', room.artist_id)
              .single();

            // Get unread message count (messages from artist that are unread)
            const { count: unreadCount } = await supabase
              .from('design_chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('sender_type', 'artist')
              .eq('is_read', false);

            return {
              ...room,
              order: order || {},
              artist: artistProfile || {},
              unreadCount: unreadCount || 0
            };
          } catch (error) {
            console.error('Error enhancing room data:', error);
            return {
              ...room,
              order: {},
              artist: {},
              unreadCount: 0
            };
          }
        })
      );

      setChatRooms(enhancedRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchCustomerChatRooms();
      
      // Refresh every 30 seconds
      const interval = setInterval(() => {
        fetchCustomerChatRooms();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [isOpen, user, fetchCustomerChatRooms]);

  const filteredRooms = chatRooms.filter(room => {
    const matchesSearch = 
      room.artist.artist_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.room_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleRoomClick = (orderId) => {
    setSelectedOrderId(orderId);
    setShowChat(true);
  };

  const handleBackToList = () => {
    setShowChat(false);
    setSelectedOrderId(null);
    fetchCustomerChatRooms(); // Refresh when going back
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="customer-chat-modal-overlay" onClick={onClose}>
        <div
          className={`customer-chat-modal ${activeTab === 'support' ? 'is-support-active' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="customer-chat-modal-header">
            <h2>
              <FontAwesomeIcon icon={faComments} />
              Chat
            </h2>
            <button className="customer-chat-close-btn" onClick={onClose}>
              <FontAwesomeIcon icon={faTimes} />
            </button>
          </div>

          <div className="customer-chat-tabs">
            <button
              className={activeTab === 'orders' ? 'active' : ''}
              onClick={() => setActiveTab('orders')}
            >
              Order Chats
            </button>
            <button
              className={activeTab === 'support' ? 'active' : ''}
              onClick={() => setActiveTab('support')}
            >
              Customer Service
            </button>
          </div>

          {activeTab === 'orders' ? (
            !showChat ? (
              <div className="customer-chat-list-container">
                <div className="customer-chat-search">
                  <FontAwesomeIcon icon={faSearch} />
                  <input
                    type="text"
                    placeholder="Search by order number or artist name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                {loading ? (
                  <div className="customer-chat-loading">
                    <p>Loading chat rooms...</p>
                  </div>
                ) : filteredRooms.length === 0 ? (
                  <div className="customer-chat-empty">
                    <FontAwesomeIcon icon={faComments} />
                    <p>No chat rooms found</p>
                    <span>Start a conversation by placing an order</span>
                  </div>
                ) : (
                  <div className="customer-chat-rooms-list">
                    {filteredRooms.map((room) => (
                      <div
                        key={room.id}
                        className={`customer-chat-room-item ${room.unreadCount > 0 ? 'has-unread' : ''}`}
                        onClick={() => handleRoomClick(room.order_id)}
                      >
                        <div className="customer-chat-room-avatar">
                          <FontAwesomeIcon icon={faUser} />
                        </div>
                        <div className="customer-chat-room-info">
                          <div className="customer-chat-room-header">
                            <h3>{room.artist.artist_name || 'Artist'}</h3>
                            {room.unreadCount > 0 && (
                              <span className="customer-chat-unread-badge">{room.unreadCount}</span>
                            )}
                          </div>
                          <div className="customer-chat-room-details">
                            <span className="customer-chat-order-number">
                              <FontAwesomeIcon icon={faShoppingBag} />
                              {room.order.order_number || room.room_name}
                            </span>
                          </div>
                          {room.last_message_at && (
                            <div className="customer-chat-room-time">
                              {new Date(room.last_message_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="customer-chat-container">
                <button className="customer-chat-back-btn" onClick={handleBackToList}>
                  <FontAwesomeIcon icon={faTimes} />
                  Back to Chats
                </button>
                <DesignChat 
                  orderId={selectedOrderId} 
                  isOpen={true} 
                  onClose={handleBackToList}
                />
              </div>
            )
          ) : (
            <div className="customer-branch-support-tab">
              <BranchSupportChat />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CustomerChatModal;

