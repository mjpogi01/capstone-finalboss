import { supabase } from '../lib/supabase';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

class DesignUploadService {
  // Upload design files for an order
  async uploadDesignFiles(orderId, files) {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      console.log('🎨 Design upload: User authenticated, token available:', !!session.access_token);
      console.log('🎨 Design upload: Order ID:', orderId);
      console.log('🎨 Design upload: Files count:', files.length);

      const formData = new FormData();
      
      // Add each file to FormData
      Array.from(files).forEach((file, index) => {
        formData.append('designFiles', file);
      });

      const response = await fetch(`${API_BASE_URL}/api/design-upload/${orderId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload design files');
      }

      return await response.json();
    } catch (error) {
      console.error('Error uploading design files:', error);
      throw error;
    }
  }

  // Get design files for an order
  async getDesignFiles(orderId) {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      const response = await fetch(`${API_BASE_URL}/api/design-upload/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch design files');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching design files:', error);
      throw error;
    }
  }

  // Delete a design file
  async deleteDesignFile(orderId, publicId) {
    try {
      // Get current session token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('User not authenticated');
      }

      // URL-encode the publicId to handle slashes and special characters
      const encodedPublicId = encodeURIComponent(publicId);

      const response = await fetch(`${API_BASE_URL}/api/design-upload/${orderId}/${encodedPublicId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete design file');
      }

      return await response.json();
    } catch (error) {
      console.error('Error deleting design file:', error);
      throw error;
    }
  }

  // Helper method to get file type icon
  getFileTypeIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'ai':
        return '🎨';
      case 'psd':
        return '🖼️';
      case 'png':
      case 'jpg':
      case 'jpeg':
        return '🖼️';
      default:
        return '📎';
    }
  }

  // Helper method to format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

const designUploadService = new DesignUploadService();
export default designUploadService;
