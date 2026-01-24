// Book Club Clicker - Game Logic

// Constants
const WORDS_PER_PAGE = 250;

// Books data (loaded from JSON)
let booksData = [];

// Game State
const gameState = {
    // Core stats
    totalWords: 0,
    totalPages: 0,
    currentBookIndex: 0,
    currentBookPages: 0,
    booksCompleted: [],

    // Clicking power
    wordsPerClick: 1,

    // Stage
    stage: 1,

    // Members (to be implemented in Phase 3)
    members: {
        james: { unlocked: false, level: 0, basePPS: 0.3, currentPPS: 0.3, unlockBook: 5 },
        sydney: { unlocked: false, level: 0, basePPS: 0.5, currentPPS: 0.5, unlockBook: 10 },
        tiffany: { unlocked: false, level: 0, basePPS: 0.3, currentPPS: 0.3, unlockBook: 15 },
        winslow: { unlocked: false, level: 0, basePPS: 0.4, currentPPS: 0.4, unlockBook: 20 }
    },

    // Stage 2 (to be implemented in Phase 6)
    discussionPoints: 0,
    discussionPointsPerClick: 1,

    // Special unlocks
    careerExpertRuleUnlocked: false,
    greenlightUnlocked: false,

    // Upgrades (to be implemented in Phase 4)
    upgrades: {
        speedReading: { level: 0, cost: 10 }
    },

    // Multipliers
    globalMultiplier: 1.0,

    // Timestamps
    lastSaveTime: Date.now(),
    gameStartTime: Date.now(),
    totalPlayTime: 0
};

// DOM Elements
const elements = {
    readButton: null,
    totalWords: null,
    totalPages: null,
    booksCompleted: null,
    wordsPerClick: null,
    pagesPerSecond: null,
    currentPages: null,
    requiredPages: null,
    bookProgress: null,
    bookTitle: null,
    messageContainer: null
};

// Initialize DOM element references
function initElements() {
    elements.readButton = document.getElementById('read-button');
    elements.totalWords = document.getElementById('total-words');
    elements.totalPages = document.getElementById('total-pages');
    elements.booksCompleted = document.getElementById('books-completed');
    elements.wordsPerClick = document.getElementById('words-per-click');
    elements.pagesPerSecond = document.getElementById('pages-per-second');
    elements.currentPages = document.getElementById('current-pages');
    elements.requiredPages = document.getElementById('required-pages');
    elements.bookProgress = document.getElementById('book-progress');
    elements.bookTitle = document.getElementById('book-title');
    elements.messageContainer = document.getElementById('message-container');
}

// Load books data from JSON
async function loadBooks() {
    try {
        const response = await fetch('books.json');
        booksData = await response.json();
        console.log(`Loaded ${booksData.length} books`);
        return true;
    } catch (error) {
        console.error('Failed to load books:', error);
        // Fallback single book for testing
        booksData = [{
            number: 1,
            title: "Loading...",
            author: "Unknown",
            category: "Unknown",
            pages_required: 100,
            special: null,
            note: "Could not load books data"
        }];
        return false;
    }
}

// Get current book data
function getCurrentBook() {
    return booksData[gameState.currentBookIndex] || booksData[booksData.length - 1];
}

// Calculate pages from words (every 250 words = 1 page)
function calculatePages(words) {
    return Math.floor(words / WORDS_PER_PAGE);
}

// Calculate total pages per second from all members
function calculatePagesPerSecond() {
    let pps = 0;
    for (const member of Object.values(gameState.members)) {
        if (member.unlocked) {
            pps += member.currentPPS;
        }
    }
    return pps * gameState.globalMultiplier;
}

// Show completion message
function showMessage(title, text, type = 'normal') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <div class="message-title">${title}</div>
        <div class="message-text">${text}</div>
    `;

    elements.messageContainer.appendChild(messageDiv);

    // Trigger animation
    setTimeout(() => messageDiv.classList.add('show'), 10);

    // Remove after delay
    setTimeout(() => {
        messageDiv.classList.remove('show');
        setTimeout(() => messageDiv.remove(), 300);
    }, 4000);
}

// Complete current book and advance
function completeBook() {
    const book = getCurrentBook();

    // Add to completed list
    gameState.booksCompleted.push(book.number);

    // Show completion message
    let messageType = 'normal';
    if (book.special === 'thinking_fast_slow') messageType = 'special';
    else if (book.special === 'hamilton') messageType = 'viral';
    else if (book.special === 'member_unlock') messageType = 'member';
    else if (book.special === 'stage_transition') messageType = 'transition';

    showMessage(
        `Book #${book.number} Complete!`,
        `"${book.title}" by ${book.author}<br><em>${book.note}</em>`,
        messageType
    );

    // Handle special book effects
    handleSpecialBook(book);

    // Advance to next book
    if (gameState.currentBookIndex < booksData.length - 1) {
        gameState.currentBookIndex++;
        gameState.currentBookPages = 0;
    }

    updateDisplay();
}

// Handle special book effects
function handleSpecialBook(book) {
    switch (book.special) {
        case 'thinking_fast_slow':
            // Double rewards, +2 words/click permanent
            gameState.wordsPerClick += 2;
            showMessage('BONUS!', '+2 words per click permanently!', 'special');
            break;

        case 'hamilton':
            // 3x speed boost would be applied here in later phases
            showMessage('VIRAL MOMENT!', 'The book club is growing!', 'viral');
            break;

        case 'stage_transition':
            // Unlock Career Expert Rule
            gameState.careerExpertRuleUnlocked = true;
            // Stage 2 transition will be implemented in Phase 6
            break;
    }
}

// Handle read button click
function handleReadClick() {
    // Add words
    gameState.totalWords += gameState.wordsPerClick;
    gameState.totalPages = calculatePages(gameState.totalWords);

    // Add pages to current book
    const pagesGained = gameState.wordsPerClick / WORDS_PER_PAGE;
    gameState.currentBookPages += pagesGained;

    // Check for book completion
    const currentBook = getCurrentBook();
    if (gameState.currentBookPages >= currentBook.pages_required) {
        completeBook();
    }

    updateDisplay();
}

// Update all display elements
function updateDisplay() {
    const currentBook = getCurrentBook();

    // Update book title
    elements.bookTitle.textContent = `Current Book: #${currentBook.number} - ${currentBook.title}`;

    // Update stats
    elements.totalWords.textContent = formatNumber(gameState.totalWords);
    elements.totalPages.textContent = formatNumber(gameState.totalPages);
    elements.booksCompleted.textContent = gameState.booksCompleted.length;

    // Update click stats
    elements.wordsPerClick.textContent = gameState.wordsPerClick;
    elements.pagesPerSecond.textContent = calculatePagesPerSecond().toFixed(1);

    // Update book progress
    const progress = Math.min((gameState.currentBookPages / currentBook.pages_required) * 100, 100);
    elements.currentPages.textContent = Math.floor(Math.min(gameState.currentBookPages, currentBook.pages_required));
    elements.requiredPages.textContent = currentBook.pages_required;
    elements.bookProgress.style.width = progress + '%';
}

// Format large numbers (K, M, B)
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
}

// Game loop (10 FPS) - will be more useful in Phase 3 with members
let lastTime = Date.now();
function gameLoop() {
    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000; // Convert to seconds
    lastTime = now;

    // Add passive pages from members (Phase 3)
    const pps = calculatePagesPerSecond();
    if (pps > 0) {
        const pagesGained = pps * deltaTime;
        gameState.totalWords += pagesGained * WORDS_PER_PAGE;
        gameState.totalPages = calculatePages(gameState.totalWords);
        gameState.currentBookPages += pagesGained;

        // Check for book completion
        const currentBook = getCurrentBook();
        if (gameState.currentBookPages >= currentBook.pages_required) {
            completeBook();
        }

        updateDisplay();
    }
}

// Initialize game
async function init() {
    initElements();

    // Load books data
    await loadBooks();

    // Set up click handler
    elements.readButton.addEventListener('click', handleReadClick);

    // Start game loop (10 FPS = 100ms interval)
    setInterval(gameLoop, 100);

    // Initial display update
    updateDisplay();

    console.log('Book Club Clicker initialized!');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
