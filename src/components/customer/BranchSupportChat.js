import React, { useEffect, useMemo, useState, useCallback } from 'react';
import './BranchSupportChat.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBuilding,
  faComments,
  faPaperPlane,
  faSpinner,
  faMessage,
  faArrowLeft,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import branchChatService from '../../services/branchChatService';
import { useAuth } from '../../contexts/AuthContext';

const BranchSupportChat = () => {
  const { user } = useAuth();
  const [branches, setBranches] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [selectedBranchForNew, setSelectedBranchForNew] = useState('');
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState(null);
  const [showRoomListOnMobile, setShowRoomListOnMobile] = useState(true);
  const [showStartModal, setShowStartModal] = useState(false);

  const branchLookup = useMemo(() => {
    const lookup = new Map();
    branches.forEach((branch) => {
      lookup.set(branch.id, branch);
    });
    return lookup;
  }, [branches]);

  const selectedRoom = useMemo(() => rooms.find((room) => room.id === selectedRoomId) || null, [rooms, selectedRoomId]);
  const branchForSelectedRoom = useMemo(() => {
    if (!selectedRoom) return null;
    return branchLookup.get(selectedRoom.branch_id) || selectedRoom.branch || null;
  }, [selectedRoom, branchLookup]);

  const loadRooms = useCallback(async () => {
    try {
      setLoadingRooms(true);
      const data = await branchChatService.getCustomerRooms();
      const fetchedRooms = data.rooms || [];
      setRooms(fetchedRooms);

      if (selectedRoomId) {
        const stillExists = fetchedRooms.some((room) => room.id === selectedRoomId);
        if (!stillExists) {
          setSelectedRoomId(null);
          setShowRoomListOnMobile(true);
        }
      }
    } catch (err) {
      console.error('Failed to load branch chat rooms:', err);
      setError(err.message || 'Unable to load branch chats.');
    } finally {
      setLoadingRooms(false);
    }
  }, [selectedRoomId]);

  const loadBranches = useCallback(async () => {
    try {
      const data = await branchChatService.getBranches();
      setBranches(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setBranches([]);
    }
  }, []);

  const loadMessages = useCallback(async (roomId) => {
    if (!roomId) return;
    try {
      setLoadingMessages(true);
      const data = await branchChatService.getMessages(roomId);
      setMessages(data.messages || []);
      await branchChatService.markMessagesAsRead(roomId);
    } catch (err) {
      console.error('Failed to load branch chat messages:', err);
      setError(err.message || 'Unable to load messages.');
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  useEffect(() => {
    loadBranches();
    loadRooms();
  }, [loadBranches, loadRooms]);

  useEffect(() => {
    if (selectedRoomId) {
      loadMessages(selectedRoomId);
    } else {
      setMessages([]);
    }
  }, [selectedRoomId, loadMessages]);

  const handleRoomSelect = (roomId) => {
    setSelectedRoomId(roomId);
    setShowRoomListOnMobile(false);
  };

  const handleCreateRoom = async () => {
    if (!selectedBranchForNew) {
      setError('Please select a branch to start chatting.');
      return;
    }

    if (!initialMessage.trim()) {
      setError('Please enter a message to begin the conversation.');
      return;
    }

    try {
      setCreatingRoom(true);
      setError(null);

      const branchId = parseInt(selectedBranchForNew, 10);
      const data = await branchChatService.createRoom(branchId, {
        initialMessage: initialMessage.trim()
      });

      setSelectedRoomId(data.room?.id);
      setInitialMessage('');
      setSelectedBranchForNew('');
      setShowRoomListOnMobile(false);
      setShowStartModal(false);

      await loadRooms();
      if (data.room?.id) {
        await loadMessages(data.room.id);
      }
    } catch (err) {
      console.error('Failed to create branch chat room:', err);
      setError(err.message || 'Unable to start the conversation.');
    } finally {
      setCreatingRoom(false);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedRoomId || !newMessage.trim()) {
      return;
    }

    try {
      setSendingMessage(true);
      setError(null);

      const trimmed = newMessage.trim();
      setMessages((prev) => [...prev, {
        id: `temp-${Date.now()}`,
        room_id: selectedRoomId,
        sender_id: user?.id,
        sender_type: 'customer',
        message: trimmed,
        message_type: 'text',
        attachments: [],
        is_read: false,
        created_at: new Date().toISOString()
      }]);

      setNewMessage('');

      await branchChatService.sendMessage(selectedRoomId, trimmed);
      await loadMessages(selectedRoomId);
      await loadRooms();
    } catch (err) {
      console.error('Failed to send branch chat message:', err);
      setError(err.message || 'Unable to send message.');
    } finally {
      setSendingMessage(false);
    }
  };

  const formattedMessages = useMemo(() => {
    return (messages || []).map((message) => ({
      ...message,
      direction: message.sender_type === 'customer' ? 'outbound' : 'inbound'
    }));
  }, [messages]);

  return (
    <div className="customer-branch-support-wrapper">
      <div className={`customer-branch-support-sidebar ${showRoomListOnMobile ? 'visible' : ''}`}>
        <div className="customer-branch-support-sidebar-header">
          <h3>
            <FontAwesomeIcon icon={faComments} />
            Customer Service Conversations
          </h3>
          <button
            className="customer-branch-support-sidebar-toggle"
            onClick={() => setShowRoomListOnMobile(false)}
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </button>
        </div>

        {loadingRooms ? (
          <div className="customer-branch-support-sidebar-empty">
            <FontAwesomeIcon icon={faSpinner} spin />
            <p>Loading conversations…</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="customer-branch-support-sidebar-empty">
            <FontAwesomeIcon icon={faComments} />
            <p>No conversations yet</p>
            <span>Select a branch to start a chat.</span>
          </div>
        ) : (
          <div className="customer-branch-support-room-list">
            {rooms.map((room) => {
              const branchInfo = branchLookup.get(room.branch_id) || room.branch || {};
              const isActive = room.id === selectedRoomId;
              return (
                <button
                  key={room.id}
                  className={`customer-branch-support-room-card ${isActive ? 'active' : ''}`}
                  onClick={() => handleRoomSelect(room.id)}
                >
                  <div className="customer-branch-support-room-card-icon">
                    <FontAwesomeIcon icon={faBuilding} />
                  </div>
                  <div className="customer-branch-support-room-card-info">
                    <h4>{branchInfo.name || 'Customer Service'}</h4>
                    <p>Status: <span className={`customer-branch-support-status-pill customer-branch-support-status-${room.status}`}>{room.status}</span></p>
                    {room.last_message_at && (
                      <span className="customer-branch-support-room-time">
                        {new Date(room.last_message_at).toLocaleString()}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="customer-branch-support-main">
        {selectedRoom ? (
          <div className="customer-branch-support-window">
            <div className="customer-branch-support-window-inner">
              <div className="customer-branch-support-window-header">
                <div className="customer-branch-support-window-header-info">
                  <FontAwesomeIcon icon={faBuilding} />
                  <div>
                    <h3>{branchForSelectedRoom?.name || 'Customer Service'}</h3>
                    {selectedRoom.status === 'closed' && (
                      <span className="customer-branch-support-status-pill">Closed</span>
                    )}
                  </div>
                </div>
                <button
                  className="customer-branch-support-window-back"
                  onClick={() => {
                    setSelectedRoomId(null);
                    setShowRoomListOnMobile(true);
                  }}
                  aria-label="Close conversation"
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>

              <div className="customer-branch-support-messages">
                {loadingMessages ? (
                  <div className="customer-branch-support-messages-loading">
                    <FontAwesomeIcon icon={faSpinner} spin />
                    <p>Loading messages…</p>
                  </div>
                ) : formattedMessages.length === 0 ? (
                  <div className="customer-branch-support-messages-empty">
                    <FontAwesomeIcon icon={faMessage} />
                    <p>Say hello to start the conversation.</p>
                  </div>
                ) : (
                  formattedMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`customer-branch-support-message customer-branch-support-message-${msg.direction}`}
                    >
                      <div className="customer-branch-support-message-bubble">
                        <p>{msg.message}</p>
                        <span>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="customer-branch-support-input">
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
                  placeholder="Type your message…"
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
          </div>
        ) : (
          <div className="customer-branch-support-welcome">
            <FontAwesomeIcon icon={faComments} />
            <h3>Select or start a conversation</h3>
            <p>Pick an existing customer service conversation or start a new request.</p>
            <button
              className="customer-branch-support-start-button"
              onClick={() => setShowStartModal(true)}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              Start Customer Service Request
            </button>
          </div>
        )}
      </div>

      {showStartModal && (
        <div className="customer-branch-support-modal" role="dialog" aria-modal="true">
          <div className="customer-branch-support-modal-content">
            <div className="customer-branch-support-modal-header">
              <h3>Start Customer Service Request</h3>
              <button
                className="customer-branch-support-modal-close"
                onClick={() => {
                  setShowStartModal(false);
                  setInitialMessage('');
                  setSelectedBranchForNew('');
                }}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="customer-branch-support-modal-body">
              <label htmlFor="modal-branch-select">Select a branch</label>
              <select
                id="modal-branch-select"
                value={selectedBranchForNew}
                onChange={(e) => setSelectedBranchForNew(e.target.value)}
              >
                <option value="">Choose a branch…</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>

              <label htmlFor="modal-initial-message">Message</label>
              <textarea
                id="modal-initial-message"
                placeholder="Hi! I have a question about…"
                value={initialMessage}
                onChange={(e) => setInitialMessage(e.target.value)}
                rows={4}
              />
            </div>
            <div className="customer-branch-support-modal-footer">
              <button
                className="customer-branch-support-modal-cancel"
                onClick={() => {
                  setShowStartModal(false);
                  setInitialMessage('');
                  setSelectedBranchForNew('');
                }}
              >
                Cancel
              </button>
              <button
                className="customer-branch-support-modal-submit"
                onClick={handleCreateRoom}
                disabled={creatingRoom}
              >
                {creatingRoom ? (
                  <>
                    <FontAwesomeIcon icon={faSpinner} spin />
                    Starting…
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faPaperPlane} />
                    Start Chat
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="customer-branch-support-error">
          {error}
        </div>
      )}
    </div>
  );
};

export default BranchSupportChat;

