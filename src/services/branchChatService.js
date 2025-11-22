import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

async function withAuthFetch(path, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('User not authenticated');
  }

  const headers = {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers
  });

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json().catch(() => ({})) : {};

  if (!response.ok) {
    const errorMessage = data?.error || response.statusText || 'Request failed';
    throw new Error(errorMessage);
  }

  return data;
}

class BranchChatService {
  async getBranches() {
    const response = await fetch(`${API_BASE_URL}/api/branches`);
    if (!response.ok) {
      throw new Error('Failed to load branches');
    }
    return response.json();
  }

  async getCustomerRooms() {
    return withAuthFetch('/api/branch-chat/rooms/customer', {
      method: 'GET'
    });
  }

  async createRoom(branchId, { subject, initialMessage } = {}) {
    return withAuthFetch('/api/branch-chat/rooms', {
      method: 'POST',
      body: JSON.stringify({ branchId, subject, initialMessage })
    });
  }

  async getMessages(roomId) {
    return withAuthFetch(`/api/branch-chat/rooms/${roomId}/messages`, {
      method: 'GET'
    });
  }

  async sendMessage(roomId, message, options = {}) {
    return withAuthFetch(`/api/branch-chat/rooms/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        message,
        messageType: options.messageType || 'text',
        attachments: options.attachments || []
      })
    });
  }

  async markMessagesAsRead(roomId) {
    return withAuthFetch(`/api/branch-chat/rooms/${roomId}/mark-read`, {
      method: 'POST'
    });
  }

  async getAdminRooms({ status, branchId } = {}) {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (branchId) params.append('branchId', branchId);

    const queryString = params.toString();
    const path = queryString ? `/api/branch-chat/rooms/admin?${queryString}` : '/api/branch-chat/rooms/admin';

    return withAuthFetch(path, { method: 'GET' });
  }

  async closeRoom(roomId) {
    return withAuthFetch(`/api/branch-chat/rooms/${roomId}/close`, {
      method: 'POST'
    });
  }
}

const branchChatService = new BranchChatService();
export default branchChatService;


