import { supabase } from '../lib/supabase';

class ArtistService {
  // Assign a custom design order task to an artist
  async assignCustomDesignTask(orderData) {
    try {
      const { data, error } = await supabase.rpc('assign_custom_design_task', {
        p_order_id: orderData.id,
        p_product_name: orderData.product_name || 'Custom Design',
        p_quantity: orderData.total_items || 1,
        p_customer_requirements: orderData.order_notes || null,
        p_priority: orderData.priority || 'medium',
        p_deadline: orderData.deadline || null,
        p_product_id: orderData.product_id || null
      });

      if (error) {
        console.error('Error assigning custom design task:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in assignCustomDesignTask:', error);
      throw error;
    }
  }

  // Assign a regular order task to an artist
  async assignRegularOrderTask(orderData) {
    try {
      const { data, error } = await supabase.rpc('assign_regular_order_task', {
        p_product_name: orderData.product_name || 'Store Product',
        p_quantity: orderData.total_items || 1,
        p_customer_requirements: orderData.order_notes || null,
        p_priority: orderData.priority || 'medium',
        p_deadline: orderData.deadline || null,
        p_order_id: orderData.id,
        p_product_id: orderData.product_id || null,
        p_order_source: orderData.order_source || 'online'
      });

      if (error) {
        console.error('Error assigning regular order task:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in assignRegularOrderTask:', error);
      throw error;
    }
  }

  // Assign a walk-in order task to an artist
  async assignWalkInOrderTask(orderData) {
    try {
      const { data, error } = await supabase.rpc('assign_walk_in_order_task', {
        p_product_name: orderData.product_name || 'Walk-in Product',
        p_quantity: orderData.total_items || 1,
        p_customer_requirements: orderData.order_notes || null,
        p_priority: orderData.priority || 'high',
        p_deadline: orderData.deadline || null,
        p_order_id: orderData.id,
        p_product_id: orderData.product_id || null
      });

      if (error) {
        console.error('Error assigning walk-in order task:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in assignWalkInOrderTask:', error);
      throw error;
    }
  }

  // Get artist workload summary
  async getArtistWorkloadSummary() {
    try {
      const { data, error } = await supabase.rpc('get_artist_workload_summary');

      if (error) {
        console.error('Error getting artist workload summary:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in getArtistWorkloadSummary:', error);
      throw error;
    }
  }

  // Get tasks for a specific artist
  async getArtistTasks(artistId) {
    try {
      const { data, error } = await supabase
        .from('artist_tasks')
        .select(`
          *,
          orders(order_number, status)
        `)
        .eq('artist_id', artistId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting artist tasks:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in getArtistTasks:', error);
      throw error;
    }
  }

  // Update task status
  async updateTaskStatus(taskId, status, notes = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString()
      };

      if (notes) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('artist_tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task status:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in updateTaskStatus:', error);
      throw error;
    }
  }

  // Upload design files for a task
  async uploadDesignFiles(taskId, files) {
    try {
      const uploadPromises = files.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${taskId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('artist-designs')
          .upload(fileName, file);

        if (error) {
          throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        }

        return {
          filename: file.name,
          file_path: data.path,
          file_size: file.size,
          uploaded_at: new Date().toISOString()
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);

      // Update the task with design files
      const { data, error } = await supabase
        .from('artist_tasks')
        .update({
          design_files: uploadedFiles,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
        .select()
        .single();

      if (error) {
        console.error('Error updating task with design files:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in uploadDesignFiles:', error);
      throw error;
    }
  }

  // Get all artists
  async getAllArtists() {
    try {
      const { data, error } = await supabase
        .from('artist_profiles')
        .select('*')
        .eq('is_active', true)
        .order('artist_name');

      if (error) {
        console.error('Error getting all artists:', error);
        throw new Error(error.message);
      }

      return data;
    } catch (error) {
      console.error('Error in getAllArtists:', error);
      throw error;
    }
  }
}

export default new ArtistService();
