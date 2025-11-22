import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

class ArtistDashboardService {
  // Get authentication headers
  async getAuthHeaders() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }
    return {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    };
  }

  // Get artist profile
  async getArtistProfile() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/artist/profile`, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch artist profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artist profile:', error);
      throw error;
    }
  }

  // Update artist profile
  async updateArtistProfile(profileData) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/artist/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update artist profile');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating artist profile:', error);
      throw error;
    }
  }

  // Get artist metrics (dashboard cards)
  async getArtistMetrics() {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/artist/metrics`, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch artist metrics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artist metrics:', error);
      throw error;
    }
  }

  // Get artist workload data
  async getArtistWorkload(period = 'week') {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/artist/workload?period=${period}`, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workload data');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching workload data:', error);
      throw error;
    }
  }

  // Get artist tasks
  async getArtistTasks(limit = null, status = null) {
    try {
      const headers = await this.getAuthHeaders();
      let url = `${API_BASE_URL}/api/artist/tasks`;
      const params = new URLSearchParams();
      
      if (limit) params.append('limit', limit);
      if (status) params.append('status', status);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await fetch(url, {
        headers
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch artist tasks');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching artist tasks:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(taskId, status) {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/api/artist/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task status');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }
}

const artistDashboardService = new ArtistDashboardService();
export default artistDashboardService;
