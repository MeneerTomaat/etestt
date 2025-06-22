// preferences.js

import { Preferences, notifyPreferencesUpdated } from './preference-utils.js';

document.addEventListener('DOMContentLoaded', async () => {
  // Check authentication
  const token = localStorage.getItem('jwt_token');
  if (!token) {
    window.location.href = 'login.html';
    return;
  }

  // Load current preferences
  try {
    const [emailResponse, prefs] = await Promise.all([
      fetch('/player/email', {
        headers: { 'Authorization': `Bearer ${token}` }
      }),
      Preferences.get()
    ]);

    if (emailResponse.status === 200) {
      const emailData = await emailResponse.json();
      document.getElementById('email').value = emailData.email || '';
    } else if (emailResponse.status !== 404) {
      throw new Error('Failed to load email');
    }

    // Set form values
    document.getElementById('theme').value = prefs.api;
    document.getElementById('matchedColor').value = prefs.color_found;
    document.getElementById('matchedColorPreview').style.backgroundColor = prefs.color_found;
    document.getElementById('unmatchedColor').value = prefs.color_closed;
    document.getElementById('unmatchedColorPreview').style.backgroundColor = prefs.color_closed;

  } catch (error) {
    console.error('Error loading preferences:', error);
    alert('Failed to load preferences. Please try again.');
  }

  // Setup color picker live preview
  document.getElementById('matchedColor').addEventListener('input', (e) => {
    document.getElementById('matchedColorPreview').style.backgroundColor = e.target.value;
  });

  document.getElementById('unmatchedColor').addEventListener('input', (e) => {
    document.getElementById('unmatchedColorPreview').style.backgroundColor = e.target.value;
  });

  // Setup form submission
  const form = document.getElementById('preferences-form');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const saveBtn = document.querySelector('.save-btn');
      if (!saveBtn) return;

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        // Update email
        const email = document.getElementById('email').value;
        const emailResponse = await fetch('/player/email', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({email})
        });

        if (emailResponse.status === 500) {
          throw new Error('Failed to update email');
        }

        // Update preferences
        const preferences = {
          api: document.getElementById('theme').value,
          color_found: document.getElementById('matchedColor').value,
          color_closed: document.getElementById('unmatchedColor').value
        };

        const success = await Preferences.save(preferences);
        if (success) {
          notifyPreferencesUpdated(preferences);
          alert('Preferences saved successfully!');
          window.location.href = 'index.html';
        } else {
          throw new Error('Failed to save preferences');
        }
      } catch (error) {
        console.error('Error saving preferences:', error);
        alert('Failed to save preferences. Please try again.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Preferences';
      }
    });
  }
});
