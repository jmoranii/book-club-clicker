// Book Club Clicker - Game Logic

// Constants
const WORDS_PER_PAGE = 250;

// Game State
const gameState = {
    // Core stats
    totalWords: 0,
    totalPages: 0,
    currentBook: 1,
    booksCompleted: [],

    // Clicking power
    wordsPerClick: 1,

    // Stage
    stage: 1,

    // Members (to be implemented in Phase 3)
    members: {
        sydney: { unlocked: false, level: 0, basePPS: 0.5, currentPPS: 0.5 },
        tiffany: { unlocked: false, level: 0, basePPS: 0.3, currentPPS: 0.3 },
        winslow: { unlocked: false, level: 0, basePPS: 0.4, currentPPS: 0.4 },
        james: { unlocked: false, level: 0, basePPS: 0.3, currentPPS: 0.3, multiplier: 2.0 }
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
    bookProgress: null
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

// Handle read button click
function handleReadClick() {
    gameState.totalWords += gameState.wordsPerClick;
    gameState.totalPages = calculatePages(gameState.totalWords);
    updateDisplay();
}

// Update all display elements
function updateDisplay() {
    // Update stats
    elements.totalWords.textContent = formatNumber(gameState.totalWords);
    elements.totalPages.textContent = formatNumber(gameState.totalPages);
    elements.booksCompleted.textContent = gameState.booksCompleted.length;

    // Update click stats
    elements.wordsPerClick.textContent = gameState.wordsPerClick;
    elements.pagesPerSecond.textContent = calculatePagesPerSecond().toFixed(1);

    // Update book progress (placeholder values for Phase 1)
    const currentBookPages = gameState.totalPages;
    const requiredPages = 100; // Placeholder - will come from books.json in Phase 2
    const progress = Math.min((currentBookPages / requiredPages) * 100, 100);

    elements.currentPages.textContent = Math.min(currentBookPages, requiredPages);
    elements.requiredPages.textContent = requiredPages;
    elements.bookProgress.style.width = progress + '%';
}

// Format large numbers (K, M, B)
function formatNumber(num) {
    if (num < 1000) return num.toString();
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
        gameState.totalWords += pps * WORDS_PER_PAGE * deltaTime;
        gameState.totalPages = calculatePages(gameState.totalWords);
        updateDisplay();
    }
}

// Initialize game
function init() {
    initElements();

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
