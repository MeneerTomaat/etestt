// auth.js
const API_BASE_URL = 'http://localhost:8000';

// Override global fetch to include JWT
const originalFetch = window.fetch;
window.fetch = async (url, options = {}) => {
  const token = localStorage.getItem('jwt_token');

  // Add Authorization header if token exists
  if (token) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }

  const fullUrl = url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
  const response = await originalFetch(fullUrl, options);

  // Check for expired token
  if (response.status === 401) {
    localStorage.removeItem('jwt_token');
    alert('Session expired. Please login again.');
    window.location.href = 'login.html';
    return;
  }

  return response;
};

// Auth functions
async function register(username, email, password) {
  const response = await fetch(`${API_BASE_URL}/memory/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      email,
      password
    }),
  });

  if (response.status === 201) { // 201 Created
    return { status: response.status, statusText: response.statusText };
  }
  // Handle error cases
  if (response.status === 400) { // 400 Bad Request
    throw new Error('Invalid registration data');
  }
  // For all other error statuses
  throw new Error(`Registration failed: ${response.status} ${response.statusText}`);

}async function login(username, password) {
  const response = await fetch(`${API_BASE_URL}/memory/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username,
      password
    }),
  });
  if (response.status === 200) { // 200 OK
    // Only parse JSON if you need the token
    try {
      const data = await response.json();
      if (data.token) {
        localStorage.setItem('jwt_token', data.token);
        return { status: 200, token: data.token };
      }
    } catch (e) {
      // If JSON parsing fails but status is 200, proceed without token
      return { status: 200 };
    }
  }

  if (response.status === 401) { // 401 Unauthorized
    throw new Error('Invalid username or password');
  }

  throw new Error(`Login failed: ${response.status} ${response.statusText}`);
}

function isAuthenticated() {
  return !!localStorage.getItem('jwt_token');
}

function logout() {
  localStorage.removeItem('jwt_token');
  window.location.href = 'login.html';
}

// Export functions for use in other files
window.auth = {
  register,
  login,
  isAuthenticated,
  logout
};




