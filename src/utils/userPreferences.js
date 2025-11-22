/**
 * User Preferences Utility
 * Stores and retrieves user preferences for ProductModal selections
 * Preferences are stored in localStorage, keyed by user ID
 */

const PREFERENCES_KEY_PREFIX = 'productModal_preferences_';

/**
 * Get preferences key for a specific user
 */
const getPreferencesKey = (userId) => {
  if (!userId) return null;
  return `${PREFERENCES_KEY_PREFIX}${userId}`;
};

/**
 * Save user preferences for ProductModal
 * @param {string} userId - User ID
 * @param {Object} preferences - Preferences object
 */
export const saveProductModalPreferences = (userId, preferences) => {
  if (!userId) return;
  
  try {
    const key = getPreferencesKey(userId);
    const preferencesToSave = {
      ...preferences,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(key, JSON.stringify(preferencesToSave));
    console.log('💾 [UserPreferences] Saved preferences for user:', userId, preferencesToSave);
  } catch (error) {
    console.error('❌ [UserPreferences] Error saving preferences:', error);
  }
};

/**
 * Load user preferences for ProductModal
 * @param {string} userId - User ID
 * @returns {Object|null} Preferences object or null
 */
export const loadProductModalPreferences = (userId) => {
  if (!userId) return null;
  
  try {
    const key = getPreferencesKey(userId);
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const preferences = JSON.parse(stored);
    console.log('📖 [UserPreferences] Loaded preferences for user:', userId, preferences);
    return preferences;
  } catch (error) {
    console.error('❌ [UserPreferences] Error loading preferences:', error);
    return null;
  }
};

/**
 * Clear user preferences
 * @param {string} userId - User ID
 */
export const clearProductModalPreferences = (userId) => {
  if (!userId) return;
  
  try {
    const key = getPreferencesKey(userId);
    localStorage.removeItem(key);
    console.log('🗑️ [UserPreferences] Cleared preferences for user:', userId);
  } catch (error) {
    console.error('❌ [UserPreferences] Error clearing preferences:', error);
  }
};

/**
 * Update specific preference fields
 * @param {string} userId - User ID
 * @param {Object} updates - Partial preferences object to update
 */
export const updateProductModalPreferences = (userId, updates) => {
  if (!userId) return;
  
  const existing = loadProductModalPreferences(userId) || {};
  const updated = {
    ...existing,
    ...updates,
    lastUpdated: new Date().toISOString()
  };
  saveProductModalPreferences(userId, updated);
};

