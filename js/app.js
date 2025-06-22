// app.js
import { Preferences } from './preference-utils.js';

const BASE_API_URL = 'http://localhost:8000'; // Add this at the top

// Global variables
let gameImages = [];
let flippedCards = [];
let matchedPairs = 0;
let gameTimer = null;
let elapsedTime = 0;
let currentPreferences = Preferences.getDefaults();

// Load preferences when the app starts
async function loadPreferences() {
  try {
    console.log('Loading preferences...'); // Debug log
    const token = localStorage.getItem('jwt_token');
    console.log('JWT token available:', !!token); // Debug log

    currentPreferences = await Preferences.get();
    console.log('Preferences loaded:', currentPreferences); // Debug log

    updateCardStyles();

    const themeSelect = document.getElementById('image-theme');
    if (themeSelect && currentPreferences.api) {
      themeSelect.value = currentPreferences.api;
    }
  } catch (error) {
    console.error('Error in loadPreferences:', error);
    currentPreferences = Preferences.getDefaults();
    updateCardStyles();
  }
}

function updateScore(playerName, newScore) {
  const list = document.getElementById("top5-list");
  const items = Array.from(list.getElementsByTagName("li"));

  // Find and update the player's score
  const playerItem = items.find(item => item.dataset.player === playerName);
  if (playerItem) {
    playerItem.dataset.score = newScore;
    playerItem.textContent = `${playerName} - ${newScore} pts`;
  }

  // Re-sort the list based on the new scores
  items.sort((a, b) => {
    return Number(b.dataset.score) - Number(a.dataset.score);
  });

  // Clear and re-append sorted items
  list.innerHTML = "";
  items.forEach(item => list.appendChild(item));

  // Rebuild the leaderboard
  items.forEach(item => {
    const playerName = item.dataset.player;
    const score = item.dataset.score;
    item.textContent = `${playerName} - ${score} pts`;
  });
}

// API Functions
async function fetchLeaderboard() {
  try {
    const response = await fetch(`${BASE_API_URL}/memory/top-scores`);
    if (response.status === 200) {
      const leaderboard = await response.json();
      updateLeaderboard(leaderboard);
    } else if (response.status === 500) {
      throw new Error('Server error fetching leaderboard');
    }
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
  }
}

function updateLeaderboard(leaderboard) {
  const list = document.getElementById("top5-list");
  list.innerHTML = "";

  leaderboard.forEach((player, index) => {
    const li = document.createElement("li");
    li.dataset.player = player.username;
    li.dataset.score = player.score;
    li.textContent = `${player.username} - ${player.score} pts`;
    list.appendChild(li);
  });
}

async function endGame(won) {
  stopTimer();

  if (won) {
    alert(`Congratulations! You won in ${elapsedTime} seconds!`);
    try {
      const response = await fetch(`${BASE_API_URL}/game/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        },
        body: JSON.stringify({
          id: '1', // You'll need to provide this
          score: elapsedTime
        }),
      });

      if (response.status === 200) {
        fetchLeaderboard();
      } else if (response.status === 500) {
        throw new Error('Server error saving score');
      }
    } catch (error) {
      console.error('Error submitting score:', error);
    }
  } else {
    alert('Time is up! Try again.');
  }
}

async function fetchCatImages(count) {
  const fetchPromises = Array.from({ length: count }, (_, i) =>
    fetch('https://api.thecatapi.com/v1/images/search')
      .then(response => response.json())
      .then(data => ({
        id: i + 1,
        image: data[0].url,
      }))
      .catch(error => {
        console.error(`Error fetching cat image ${i + 1}:`, error);
        return {
          id: i + 1,
          image: `https://placekitten.com/400/300?image=${i + 1}`,
        };
      })
  );

  return Promise.all(fetchPromises);
}

async function fetchPokemonImages(count) {
  const fetchPromises = Array.from({ length: count }, (_, i) => {
    const randomId = Math.floor(Math.random() * 1000) + 1;
    return fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}/`)
      .then(response => response.json())
      .then(pokemon => ({
        id: i + 1,
        name: pokemon.name,
        image: pokemon.sprites.front_default
      }))
      .catch(error => {
        console.error(`Error fetching Pokemon ${randomId}:`, error);
        return {
          id: i + 1,
          name: `Pokemon ${i + 1}`,
          image: `https://picsum.photos/200/200?random=${i + 100}`
        };
      });
  });

  return Promise.all(fetchPromises);
}

function fetchRandomPotterCharacters(count) {
  return fetch('https://potterhead-api.vercel.app/api/characters')
    .then(response => response.json())
    .then(characters => {
      const charactersWithImages = characters.filter(character => character.image);
      const shuffled = charactersWithImages.sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map((character, index) => ({
        id: index + 1,
        name: character.name,
        image: character.image
      }));
    })
    .catch(error => {
      console.error('Error fetching Potter characters:', error);
      return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `Character ${i + 1}`,
        image: `https://picsum.photos/200/200?random=${i + 300}`
      }));
    });
}

async function getImages(theme, count) {
  switch (theme) {
    case 'harrypotter':
      return await fetchRandomPotterCharacters(count);
    case 'pokemon':
      return await fetchPokemonImages(count);
    case 'cats':
      return await fetchCatImages(count);
    default:
      const images = [];
      for (let i = 1; i <= count; i++) {
        images.push({
          id: i,
          name: `Image ${i}`,
          image: `https://picsum.photos/200/200?random=${i}`
        });
      }
      return images;
  }
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startTimer() {
  if (gameTimer) {
    clearInterval(gameTimer);
  }

  elapsedTime = 0;
  gameTimer = setInterval(() => {
    elapsedTime++;
    document.getElementById('elapsed').textContent = elapsedTime;

    const remaining = Math.max(0, 120 - elapsedTime);
    document.getElementById('remaining').textContent = remaining;

    const progress = (elapsedTime / 120) * 100;
    const timerFill = document.querySelector('.timer-bar-fill');
    if (timerFill) {
      timerFill.style.width = `${Math.min(100, progress)}%`;
    }

    if (remaining <= 0) {
      endGame(false);
    }
  }, 1000);
}

function stopTimer() {
  if (gameTimer) {
    clearInterval(gameTimer);
    gameTimer = null;
  }
}

function handleCardClick(card, imageData) {
  if (card.classList.contains('flipped') || card.classList.contains('matched') || flippedCards.length >= 2) {
    return;
  }

  const img = card.querySelector('img');
  img.classList.remove('hidden');
  card.classList.add('flipped');
  flippedCards.push({ card, imageData });

  if (flippedCards.length === 2) {
    setTimeout(checkForMatch, 1000);
  }
}

function checkForMatch() {
  const [card1, card2] = flippedCards;

  if (card1.imageData.id === card2.imageData.id) {
    card1.card.classList.add('matched');
    card2.card.classList.add('matched');
    matchedPairs++;

    document.getElementById('pairs').textContent = matchedPairs;

    const totalPairs = gameImages.length/2;
    if (matchedPairs === totalPairs) {
      endGame(true);
    }
  } else {
    card1.card.querySelector('img').classList.add('hidden');
    card2.card.querySelector('img').classList.add('hidden');
    card1.card.classList.remove('flipped');
    card2.card.classList.remove('flipped');
  }

  flippedCards = [];
}

function updateCardStyles() {
  const styleId = 'dynamic-card-styles';
  let style = document.getElementById(styleId);

  if (!style) {
    style = document.createElement('style');
    style.id = styleId;
    document.head.appendChild(style);
  }

  style.textContent = `
    .card {
      border-color: ${currentPreferences.color_closed} !important;
      background: ${currentPreferences.color_closed} !important;
    }
    .card.matched {
      background: ${currentPreferences.color_found} !important;
      border-color: ${currentPreferences.color_found} !important;
    }
  `;
}

async function generateGrid() {
  const gridSize = document.getElementById('grid-size').value;
  const imageTheme = document.getElementById('image-theme')?.value || 'starwars';
  const [rows, cols] = gridSize.split('x').map(Number);
  const totalCards = rows * cols;
  const uniqueImages = totalCards / 2;

  const gameBoard = document.getElementById('game-board');
  const gameSection = document.querySelector('.game');

  gameBoard.innerHTML = '<p>Loading images...</p>';
  gameSection.classList.add('visible');

  try {
    // If preferences haven't been loaded yet, load them now
    if (!currentPreferences || Object.keys(currentPreferences).length === 0) {
      console.log('Preferences not loaded, loading now...');
      await loadPreferences();
    }

    const fetchedImages = await getImages(imageTheme, uniqueImages);
    gameImages = [...fetchedImages, ...fetchedImages];
    gameImages = shuffleArray(gameImages);

    gameBoard.innerHTML = '';
    gameBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    gameBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    flippedCards = [];
    matchedPairs = 0;
    document.getElementById('pairs').textContent = '0';

    gameImages.forEach((imageData, index) => {
      const button = document.createElement('button');
      button.className = 'card';
      button.style.borderColor = currentPreferences.color_closed;
      button.setAttribute('aria-label', `Card ${imageData.name}`);

      button.addEventListener('click', () => handleCardClick(button, imageData));

      const img = document.createElement('img');
      img.src = imageData.image;
      img.alt = imageData.name;
      img.className = 'card-image hidden';
      img.loading = 'lazy';

      button.appendChild(img);
      gameBoard.appendChild(button);
    });

    updateCardStyles();
    startTimer();
  } catch (error) {
    console.error('Error generating grid:', error);
    gameBoard.innerHTML = '<p>Error loading images. Please try again.</p>';
  }
}

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      localStorage.removeItem('jwt_token');
      window.location.href = 'login.html';
    });
  }
}

function updateAuthButtons() {
  const isLoggedIn = !!localStorage.getItem('jwt_token');
  const authButtons = document.getElementById('auth-buttons');
  const authActions = document.getElementById('auth-actions');

  if (authButtons) authButtons.setAttribute('data-loggedin', isLoggedIn);
  if (authActions) authActions.setAttribute('data-loggedin', isLoggedIn);
}

function setupPreferences() {
  const prefsBtn = document.getElementById('preferences-btn');
  if (prefsBtn) {
    prefsBtn.addEventListener('click', () => {
      window.location.href = 'preferences.html';
    });
  }
}

// Handle preference updates from preferences page
window.addEventListener('message', (event) => {
  if (event.data.type === 'preferencesUpdated') {
    currentPreferences = event.data.preferences;
    localStorage.setItem('currentPrefs', JSON.stringify(currentPreferences));
    updateCardStyles();

    const themeSelect = document.getElementById('image-theme');
    if (themeSelect && currentPreferences.api) {
      themeSelect.value = currentPreferences.api;
    }
  }
});

// Initialize on page load
window.onload = async function() {
  try {
    await loadPreferences();
    updateAuthButtons();
    setupLogout();
    setupPreferences();

    const newGameButton = document.querySelector('button[onclick="generateGrid()"]');
    if (newGameButton) {
      newGameButton.addEventListener('click', generateGrid);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
  }
};
