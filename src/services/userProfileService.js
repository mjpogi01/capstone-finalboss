import { supabase } from '../lib/supabase';

class UserProfileService {
  // Get user profile by user ID
  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
        .abortSignal(AbortSignal.timeout(15000)); // Increased timeout to 15 seconds

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        // Check if it's a timeout/abort error
        if (error.name === 'AbortError' || error.message?.includes('timeout')) {
          console.warn('⚠️ Timeout fetching user profile (non-critical)');
          return null; // Return null instead of throwing for graceful handling
        }
        throw error;
      }

      return data;
    } catch (error) {
      // Handle timeout errors gracefully - don't throw, return null
      if (error.name === 'AbortError' || error.message?.includes('timeout')) {
        console.warn('⚠️ Timeout fetching user profile (non-critical):', error);
        return null; // Return null for graceful fallback
      }
      // Only throw non-timeout errors
      if (error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        throw error;
      }
      return null; // PGRST116 means no rows - return null
    }
  }

  // Create or update user profile
  async upsertUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          full_name: profileData.full_name,
          phone: profileData.phone,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          address: profileData.address,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error upserting user profile:', error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          full_name: profileData.full_name,
          phone: profileData.phone,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          address: profileData.address,
          avatar_url: profileData.avatar_url,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // Create user profile (for new users)
  async createUserProfile(userId, profileData) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: userId,
          full_name: profileData.full_name,
          phone: profileData.phone,
          gender: profileData.gender,
          date_of_birth: profileData.date_of_birth,
          address: profileData.address,
          avatar_url: profileData.avatar_url
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  // Update avatar URL
  async updateAvatarUrl(userId, avatarUrl) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating avatar URL:', error);
      throw error;
    }
  }

  // Format date for database (YYYY-MM-DD)
  formatDateForDB(dateString) {
    if (!dateString) return null;
    
    // Handle MM/DD/YYYY format
    if (dateString.includes('/')) {
      const [month, day, year] = dateString.split('/');
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Handle other formats or return as is if already in YYYY-MM-DD format
    return dateString;
  }

  // Format date for display (MM/DD/YYYY)
  formatDateForDisplay(dateString) {
    if (!dateString) return '';
    
    // Handle YYYY-MM-DD format
    if (dateString.includes('-') && dateString.length === 10) {
      const [year, month, day] = dateString.split('-');
      return `${month}/${day}/${year}`;
    }
    
    // Return as is if already in MM/DD/YYYY format
    return dateString;
  }
}

const userProfileService = new UserProfileService();
export default userProfileService;
