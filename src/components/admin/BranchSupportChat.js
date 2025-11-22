import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import './BranchSupportChat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComments,
  faFilter,
  faPaperPlane,
  faSpinner,
  faBuilding,
  faUserCircle,
  faDoorClosed,
  faCircleCheck
} from '@fortawesome/free-solid-svg-icons';
import branchChatService from '../../services/branchChatService';
import { useAuth } from '../../contexts/AuthContext';

const BranchSupportChat = () => {
  const { user } = useAuth();
  const role = user?.user_metadata?.role || 'customer';
  const adminBranchId = user?.user_metadata?.branch_id || null;

  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [branchFilter, setBranchFilter] = useState(adminBranchId ? String(adminBranchId) : '');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [closingRoom, setClosingRoom] = useState(false);
  const [error, setError] = useState(null);
  const selectedRoomIdRef = useRef(null);

  const isOwner = role === 'owner';

  const loadBranches = useCallback(async () => {
    if (!isOwner) return;
    try {
      const data = await branchChatService.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setBranches([]);
    }
  }, [isOwner]);

  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      setError(null);

      const payload = {};
      if (statusFilter && statusFilter !== 'all') {
        payload.status = statusFilter;
      }

      if (isOwner) {
        if (branchFilter) {
          payload.branchId = branchFilter;
        }
      } else if (adminBranchId) {
        payload.branchId = adminBranchId;
      }

      const data = await branchChatService.getAdminRooms(payload);
      const fetchedRooms = data.rooms || [];
      setRooms(fetchedRooms);

      // Check if currently selected room still exists in the new list
      const currentSelectedId = selectedRoomIdRef.current;
      if (currentSelectedId && !fetchedRooms.some(room => room.id === currentSelectedId)) {
        // Selected room no longer exists, clear selection
        selectedRoomIdRef.current = null;
        setSelectedRoomId(null);
      }

      // Auto-select first room only if no room is currently selected
      if (fetchedRooms.length > 0 && !selectedRoomIdRef.current) {
        const firstRoomId = fetchedRooms[0].id;
        selectedRoomIdRef.current = firstRoomId;
        setSelectedRoomId(firstRoomId);
      }
    } catch (err) {
      console.error('Failed to load branch support chats:', err);
      setError(err.message || 'Unable to load chats.');
      setRooms([]);
    } finally {
      setLoadingRooms(false);
    }
  }, [statusFilter, branchFilter, isOwner, adminBranchId]);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      setLoadingMessages(true);
      const data = await branchChatService.getMessages(roomId);
      setMessages(data.messages || []);
      await branchChatService.markMessagesAsRead(roomId);
    } catch (err) {
      console.error('Failed to load branch support messages:', err);
      setMessages([]);
      setError(err.message || 'Unable to load messages.');
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
  }, [loadBranches]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // Sync ref with state
  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (selectedRoomId) {
      loadMessages(selectedRoomId);
    } else {
      setMessages([]);
    }
  }, [selectedRoomId, loadMessages]);

  const handleRoomSelect = (roomId) => {
    selectedRoomIdRef.current = roomId;
    setSelectedRoomId(roomId);
  };

  const handleSendMessage = async () => {
    if (!selectedRoomId || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      setError(null);
      const trimmed = newMessage.trim();

      setMessages((prev) => [
        ...prev,
        {
          id: `temp-${Date.now()}`,
          room_id: selectedRoomId,
          sender_id: user?.id,
          sender_type: 'admin',
          message: trimmed,
          message_type: 'text',
          attachments: [],
          is_read: false,
          created_at: new Date().toISOString()
        }
      ]);

      setNewMessage('');

      await branchChatService.sendMessage(selectedRoomId, trimmed);
      await loadMessages(selectedRoomId);
      await loadRooms();
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Unable to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleCloseRoom = async () => {
    if (!selectedRoomId) return;

    try {
      setClosingRoom(true);
      await branchChatService.closeRoom(selectedRoomId);
      await loadRooms();
      await loadMessages(selectedRoomId);
    } catch (err) {
      console.error('Failed to close chat room:', err);
      setError(err.message || 'Unable to close chat room.');
    } finally {
      setClosingRoom(false);
    }
  };

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) || null,
    [rooms, selectedRoomId]
  );

  const branchLookup = useMemo(() => {
    const lookup = new Map();
    branches.forEach((branch) => lookup.set(branch.id, branch));
    return lookup;
  }, [branches]);

  const formattedMessages = useMemo(() => {
    return (messages || []).map((message) => ({
      ...message,
      direction: message.sender_type === 'admin' ? 'outbound' : 'inbound'
    }));
  }, [messages]);

  return (
    <div className="admin-branch-support">
      <div className="admin-branch-support-header">
        <h2>
          <FontAwesomeIcon icon={faComments} />
          Branch Support Chats
        </h2>
        <div className="admin-branch-support-filters">
          <div className="admin-branch-support-filter-group">
            <FontAwesomeIcon icon={faFilter} />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="open">Open</option>
              <option value="pending">Pending</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
          </div>
          {isOwner && (
            <div className="admin-branch-support-filter-group">
              <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="admin-branch-support-body">
        <div className="admin-branch-support-list">
          <div className="admin-branch-support-list-content">
            {loadingRooms ? (
              <div className="admin-branch-support-empty">
                <FontAwesomeIcon icon={faSpinner} spin />
                <p>Loading chats…</p>
              </div>
            ) : rooms.length === 0 ? (
              <div className="admin-branch-support-empty">
                <FontAwesomeIcon icon={faComments} />
                <p>No branch chats found</p>
                <span>Conversations from customers will appear here.</span>
              </div>
            ) : (
              rooms.map((room) => {
                const branch = branchLookup.get(room.branch_id) || room.branch || {};
                const isActive = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    className={`admin-branch-support-room ${isActive ? 'active' : ''}`}
                    onClick={() => handleRoomSelect(room.id)}
                  >
                    <div className="admin-branch-support-room-icon">
                      <FontAwesomeIcon icon={faBuilding} />
                    </div>
                    <div className="admin-branch-support-room-info">
                      <h3>{room.customer_name || `Customer ${room.customer_id?.slice(0, 8)}`}</h3>
                      <p>
                        <FontAwesomeIcon icon={faBuilding} />
                        {branch.name || 'Branch'}
                      </p>
                      <div className="admin-branch-support-room-meta">
                        <span className={`admin-branch-support-status-pill admin-branch-support-status-${room.status}`}>
                          {room.status}
                        </span>
                        {room.last_message_at && (
                          <span>{new Date(room.last_message_at).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="admin-branch-support-chat">
          {selectedRoom ? (
            <div className="admin-branch-support-window">
              <div className="admin-branch-support-window-header">
                <div>
                  <h3>{selectedRoom.customer_name || `Customer ${selectedRoom.customer_id?.slice(0, 8)}`}</h3>
                  <span>Branch: {branchLookup.get(selectedRoom.branch_id)?.name || selectedRoom.branch?.name || 'Branch Support'}</span>
                </div>
                <button
                  className="admin-branch-support-close-btn"
                  onClick={handleCloseRoom}
                  disabled={closingRoom || selectedRoom.status === 'closed'}
                >
                  {closingRoom ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faDoorClosed} /> Close Chat
                    </>
                  )}
                </button>
              </div>

              <div className="admin-branch-support-messages">
                {loadingMessages ? (
                  <div className="admin-branch-support-placeholder">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <p>Loading messages…</p>
                  </div>
                ) : formattedMessages.length === 0 ? (
                  <div className="admin-branch-support-placeholder">
                    <FontAwesomeIcon icon={faComments} />
                    <p>No messages yet. Send a reply to begin.</p>
                  </div>
                ) : (
                  formattedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`admin-branch-support-message admin-branch-support-message-${msg.direction}`}
                    >
                      <div className="admin-branch-support-message-bubble">
                        <p>{msg.message}</p>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                        {msg.sender_type === 'admin' && (
                          <FontAwesomeIcon icon={faCircleCheck} className="admin-branch-support-message-sent-icon" />
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="admin-branch-support-input">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Reply to the customer…"
                  disabled={sendingMessage || selectedRoom.status === 'closed'}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !newMessage.trim() || selectedRoom.status === 'closed'}
                >
                  {sendingMessage ? (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  ) : (
                    <FontAwesomeIcon icon={faPaperPlane} />
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="admin-branch-support-empty">
              <FontAwesomeIcon icon={faComments} />
              <p>Select a support chat to begin</p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="admin-branch-support-error">{error}</div>
      )}
    </div>
  );
};

export default BranchSupportChat;


