// preferences-utils.js
const BASE_API_URL = 'http://localhost:8000';

// Utility functions for managing preferences
const Preferences = {
  get: async function() {
    const token = localStorage.getItem('jwt_token');
    if (!token) return this.getDefaults();
    try {
      const response = await fetch(`${BASE_API_URL}/player/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      console.log(response);
      if (response.status === 200) {
        const prefs = await response.json();
        localStorage.setItem('currentPrefs', JSON.stringify(prefs));
        return prefs;
      } else if (response.status === 404) {
        return this.getDefaults();
      } else {
        console.error('Failed to load preferences');
        return this.getDefaults();
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      return this.getDefaults();
    }
  },

  save: async function(prefs) {
    const token = localStorage.getItem('jwt_token');
    if (!token) return false;

    try {
      const response = await fetch('/player/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(prefs)
      });

      if (response.status === 204) {
        localStorage.setItem('currentPrefs', JSON.stringify(prefs));
        return true;
      } else if (response.status === 500) {
        throw new Error('Failed to save preferences');
      }
      return false;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  },

  getDefaults: function() {
    return {
      api: 'harrypotter',
      color_found: '#00d4ff',
      color_closed: '#2a2d47'
    };
  },

  getCurrent: function() {
    const saved = localStorage.getItem('currentPrefs');
    return saved ? JSON.parse(saved) : this.getDefaults();
  }
};

// For cross-window communication
function notifyPreferencesUpdated(prefs) {
  if (window.opener) {
    window.opener.postMessage({
      type: 'preferencesUpdated',
      preferences: prefs
    }, '*');
  }
}

export { Preferences, notifyPreferencesUpdated };
