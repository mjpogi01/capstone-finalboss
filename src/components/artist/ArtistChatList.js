import React, { useState, useEffect, useCallback } from 'react';
import './ArtistChatList.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faComments, 
  faUser, 
  faCircle,
  faSearch,
  faShoppingBag,
  faFilter
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../contexts/AuthContext';
import chatService from '../../services/chatService';
import { supabase } from '../../lib/supabase';
import ArtistChatModal from './ArtistChatModal';

const ArtistChatList = () => {
  const [chatRooms, setChatRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChat, setSelectedChat] = useState(null);
  const [showChatModal, setShowChatModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('last_message');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const { user } = useAuth();

  const fetchArtistChatRooms = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get artist profile first to get the artist_id
      const { data: artistProfile, error: profileError } = await supabase
        .from('artist_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (profileError || !artistProfile) {
        console.error('Error fetching artist profile:', profileError);
        setChatRooms([]);
        return;
      }

      const rooms = await chatService.getArtistChatRooms(artistProfile.id);
      console.log('📦 Fetched rooms:', rooms);
      console.log('📦 Number of rooms:', rooms?.length || 0);
      
      if (!rooms || rooms.length === 0) {
        console.log('⚠️ No rooms found for artist:', artistProfile.id);
        setChatRooms([]);
        setLoading(false);
        return;
      }
      
      // Enhance rooms with order and customer information
      const enhancedRooms = await Promise.all(
        rooms.map(async (room) => {
          try {
            // ALWAYS fetch order_number from the actual orders table, not from room data
            let order = null;
            let orderNumber = null;
            
            console.log('🔍 Fetching order for room', room.id, 'order_id:', room.order_id);
            
            // Use artist-specific endpoint to fetch order number
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
                    console.log('📋 Order API response for', room.order_id, ':', {
                      order_number: orderData.order_number,
                      id: room.order_id
                    });
                    
                    // Extract order_number - this is the ACTUAL order number from orders table
                    orderNumber = orderData.order_number || null;
                    
                    if (orderNumber) {
                      console.log('✅ ACTUAL order number from orders table:', orderNumber, 'Length:', orderNumber.length);
                    } else {
                      console.warn('⚠️ No order_number field in API response');
                      console.warn('⚠️ Available fields:', Object.keys(orderData));
                    }
                    
                    order = {
                      order_number: orderNumber || 'N/A',
                      status: orderData.status || 'pending',
                      total_amount: orderData.total_amount || 0,
                      created_at: orderData.created_at || new Date().toISOString()
                    };
                  } else {
                    const errorText = await orderResponse.text().catch(() => '');
                    console.warn('❌ Error fetching order from API:', orderResponse.status, orderResponse.statusText);
                    console.warn('❌ Error details:', errorText.substring(0, 200));
                  }
                }
              } catch (orderError) {
                console.warn('Error fetching order for room', room.id, ':', orderError);
              }
              
              // Fallback: try direct Supabase query if API fails (only if API returned 403/404)
              // Note: Direct Supabase queries may fail due to RLS policies, so prefer API
              if (!order || !orderNumber || order.order_number === 'N/A') {
                try {
                  console.log('🔄 API failed, trying direct Supabase query for order_id:', room.order_id);
                  
                  // Ensure we have a valid session before making the query
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    console.warn('⚠️ No session available for Supabase query');
                  } else {
                    const { data: orderData, error: orderError } = await supabase
                      .from('orders')
                      .select('order_number, status, total_amount, created_at')
                      .eq('id', room.order_id)
                      .single();
                    
                    if (!orderError && orderData && orderData.order_number) {
                      orderNumber = orderData.order_number;
                      console.log('✅ Order number from Supabase:', orderNumber);
                      order = {
                        order_number: orderData.order_number,
                        status: orderData.status || 'pending',
                        total_amount: orderData.total_amount || 0,
                        created_at: orderData.created_at || new Date().toISOString()
                      };
                    } else if (orderError) {
                      // Silently handle RLS/permission errors - this is expected for direct queries
                      if (orderError.code !== 'PGRST301' && orderError.code !== '42501') {
                        console.warn('❌ Supabase query error:', orderError.message);
                      }
                    }
                  }
                } catch (fallbackError) {
                  // Silently handle fallback errors - API should be the primary method
                  console.debug('Fallback Supabase query failed (expected if RLS blocks access):', fallbackError.message);
                }
              }
            }
            
            // Final fallback - only use this if we absolutely cannot get the order
            if (!order || !orderNumber || order.order_number === 'N/A') {
              console.error('❌ Could not fetch order_number from orders table for order_id:', room.order_id);
              console.error('❌ This means the order might not exist or there are permission issues');
              order = {
                order_number: 'N/A',
                status: 'unknown',
                total_amount: 0,
                created_at: room.created_at || new Date().toISOString()
              };
            }
            
            console.log('📦 Final order data for room', room.id, ':', {
              order_number: order.order_number,
              order_id: room.order_id
            });

            // Get customer information using chatService method (bypasses RLS)
            let customer = null;
            try {
              const customerInfo = await chatService.getCustomerInfo(room.id);
              customer = {
                full_name: customerInfo.full_name || 
                  (customerInfo.first_name && customerInfo.last_name 
                    ? `${customerInfo.first_name} ${customerInfo.last_name}`.trim()
                    : customerInfo.email || 'Unknown Customer'),
                email: customerInfo.email || ''
              };
            } catch (customerError) {
              console.warn('Error fetching customer info for room', room.id, ':', customerError);
              // Fallback: try direct query
              try {
                const { data: userProfile } = await supabase
                  .from('user_profiles')
                  .select('first_name, last_name, email')
                  .eq('user_id', room.customer_id)
                  .single();
                
                if (userProfile) {
                  customer = {
                    full_name: `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() || userProfile.email || 'Unknown Customer',
                    email: userProfile.email || ''
                  };
                } else {
                  customer = {
                    full_name: 'Unknown Customer',
                    email: ''
                  };
                }
              } catch (fallbackError) {
                console.warn('Fallback customer fetch also failed:', fallbackError);
                customer = {
                  full_name: 'Unknown Customer',
                  email: ''
                };
              }
            }
            
            console.log('👤 Customer data for room', room.id, ':', customer);

            // Get unread message count for this specific room (messages from customer that are unread)
            const { count: unreadCount, error: unreadError } = await supabase
              .from('design_chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id)
              .eq('sender_type', 'customer')
              .eq('is_read', false);

            if (unreadError) {
              console.warn('Error fetching unread count:', unreadError);
            }

            return {
              ...room,
              order: order || {},
              customer: customer || {},
              unreadCount: unreadCount || 0,
              // Ensure order_number is accessible at room level too
              order_number: order?.order_number || null
            };
          } catch (error) {
            console.error('Error enhancing room data:', error);
            return {
              ...room,
              order: {},
              customer: {},
              unreadCount: 0,
              order_number: null
            };
          }
        })
      );

      console.log('✅ Enhanced rooms:', enhancedRooms);
      console.log('✅ Number of enhanced rooms:', enhancedRooms?.length || 0);
      setChatRooms(enhancedRooms);
    } catch (error) {
      console.error('❌ Error fetching chat rooms:', error);
      console.error('❌ Error details:', error.message, error.stack);
      setChatRooms([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?.id) {
      fetchArtistChatRooms();
    }
  }, [user, fetchArtistChatRooms]);

  // Close filter dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showFilterDropdown && !event.target.closest('.filter-dropdown-container')) {
        setShowFilterDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilterDropdown]);

  const filteredRooms = chatRooms.filter(room => {
    const customerName = room.customer?.full_name || '';
    // Use order_number (not order_id) for search
    const orderNumber = room.order?.order_number || room.order_number || '';
    
    const matchesSearch = 
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'unread' && (room.unreadCount || 0) > 0) ||
      (filterStatus === 'active' && room.status === 'active') ||
      (filterStatus === 'closed' && room.status === 'closed');

    return matchesSearch && matchesFilter;
  });
  
  console.log('🔍 Filtered rooms:', filteredRooms.length, 'out of', chatRooms.length);

  const sortedRooms = filteredRooms.sort((a, b) => {
    switch (sortBy) {
      case 'last_message':
        return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
      case 'order_date':
        return new Date(b.order.created_at || 0) - new Date(a.order.created_at || 0);
      case 'customer_name':
        return (a.customer.full_name || '').localeCompare(b.customer.full_name || '');
      case 'order_amount':
        return (b.order.total_amount || 0) - (a.order.total_amount || 0);
      default:
        return 0;
    }
  });

  const handleChatClick = (room) => {
    setSelectedChat(room);
    setShowChatModal(true);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No messages';
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };


  if (loading) {
    return (
      <div className="artist-chat-list">
        <div className="chat-loading">
          <FontAwesomeIcon icon={faComments} spin />
          <p>Loading chats...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="artist-chat-list">
      <div className="chat-filters">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="Search by customer or order number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <div className="filter-dropdown-container">
            <button 
              className="filter-icon-btn"
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              aria-label="Filter options"
            >
              <FontAwesomeIcon icon={faFilter} />
            </button>
            {showFilterDropdown && (
              <div className="filter-dropdown">
                <div className="filter-dropdown-item">
                  <label>Status:</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="all">All Chats</option>
                    <option value="unread">Unread</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                
                <div className="filter-dropdown-item">
                  <label>Sort By:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="sort-select"
                  >
                    <option value="last_message">Last Message</option>
                    <option value="order_date">Order Date</option>
                    <option value="customer_name">Customer Name</option>
                    <option value="order_amount">Order Amount</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="chat-rooms-list">
        {sortedRooms.length === 0 ? (
          <div className="no-chats">
            <FontAwesomeIcon icon={faComments} />
            <h3>No chats found</h3>
            <p>You don't have any customer chats yet.</p>
          </div>
        ) : (
          sortedRooms.map((room) => (
            <div
              key={room.id}
              className={`chat-room-item ${room.unreadCount > 0 ? 'unread' : ''}`}
              onClick={() => handleChatClick(room)}
            >
              <div className="room-avatar">
                <FontAwesomeIcon icon={faUser} />
                {room.unreadCount > 0 && (
                  <div className="unread-indicator">
                    <FontAwesomeIcon icon={faCircle} />
                  </div>
                )}
              </div>
              
              <div className="room-content">
                <div className="room-header">
                  <h4 className="customer-name">
                    {room.customer.full_name || 'Unknown Customer'}
                  </h4>
                  {room.unreadCount > 0 && (
                    <span className="unread-count">
                      {room.unreadCount}
                    </span>
                  )}
                </div>
                
                <div className="room-details">
                  <span className="order-info">
                    <FontAwesomeIcon icon={faShoppingBag} />
                    {room.order?.order_number || room.order_number || 'N/A'}
                  </span>
                  {room.last_message_at && (
                    <span className="room-time">
                      {new Date(room.last_message_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {showChatModal && selectedChat && (
        <ArtistChatModal
          room={selectedChat}
          isOpen={showChatModal}
          onClose={() => {
            setShowChatModal(false);
            setSelectedChat(null);
            fetchArtistChatRooms(); // Refresh the list
          }}
        />
      )}
    </div>
  );
};

export default ArtistChatList;
