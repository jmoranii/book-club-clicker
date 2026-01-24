// Book Club Clicker - Game Logic

// Constants
const WORDS_PER_PAGE = 250;
const SAVE_KEY = 'bookClubClickerSave';
const SAVE_VERSION = 1;
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

// Game pause state (for when tab is hidden)
let isGamePaused = false;

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

    // Members
    members: {
        james: {
            name: 'James',
            unlockBook: 5,
            recruitCost: 50,
            available: false,
            unlocked: false,
            level: 0,
            basePPS: 1,
            currentPPS: 1
        },
        sydney: {
            name: 'Sydney',
            unlockBook: 10,
            recruitCost: 200,
            available: false,
            unlocked: false,
            level: 0,
            basePPS: 10,
            currentPPS: 10
        },
        tiffany: {
            name: 'Tiffany',
            unlockBook: 15,
            recruitCost: 800,
            available: false,
            unlocked: false,
            level: 0,
            basePPS: 50,
            currentPPS: 50
        },
        winslow: {
            name: 'Winslow',
            unlockBook: 20,
            recruitCost: 2000,
            available: false,
            unlocked: false,
            level: 0,
            basePPS: 100,
            currentPPS: 100
        }
    },

    // Stage 2 (to be implemented in Phase 6)
    discussionPoints: 0,
    discussionPointsPerClick: 1,

    // Special unlocks
    careerExpertRuleUnlocked: false,
    greenlightUnlocked: false,

    // Upgrades
    upgrades: {
        speedReading: {
            name: 'Speed Reading',
            description: '+10 words per click',
            level: 0,
            baseCost: 25,
            costMultiplier: 1.5,
            maxLevel: null,
            effect: 10
        },
        readingHabit: {
            name: 'Reading Habit',
            description: '+1 passive page/second',
            level: 0,
            baseCost: 100,
            costMultiplier: 2,
            maxLevel: null,
            effect: 1
        },
        focusedReading: {
            name: 'Focused Reading',
            description: '2x progress on current book',
            level: 0,
            baseCost: 200,
            costMultiplier: 1,
            maxLevel: 1,
            effect: 2
        }
    },

    // Passive bonus from upgrades
    passivePagesPerSecond: 0,
    currentBookMultiplier: 1,

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
    messageContainer: null,
    membersContainer: null,
    upgradesContainer: null
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
    elements.membersContainer = document.getElementById('members-container');
    elements.upgradesContainer = document.getElementById('upgrades-container');
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

// Calculate total pages per second from all members and upgrades
function calculatePagesPerSecond() {
    let pps = 0;
    // Add member contributions
    for (const member of Object.values(gameState.members)) {
        if (member.unlocked) {
            pps += member.currentPPS;
        }
    }
    // Add passive bonus from Reading Habit upgrade
    pps += gameState.passivePagesPerSecond;
    return pps * gameState.globalMultiplier;
}

// Check if any members should become available after book completion
function checkMemberUnlocks() {
    const booksCompleted = gameState.booksCompleted.length;

    for (const [key, member] of Object.entries(gameState.members)) {
        if (!member.available && !member.unlocked && booksCompleted >= member.unlockBook) {
            member.available = true;
            showMessage(
                'New Member Available!',
                `${member.name} wants to join the book club!<br><em>Cost: ${member.recruitCost} pages</em>`,
                'member'
            );
        }
    }

    renderMembers();
}

// Recruit a member
function recruitMember(memberKey) {
    const member = gameState.members[memberKey];

    if (!member || !member.available || member.unlocked) {
        return false;
    }

    if (gameState.totalPages < member.recruitCost) {
        showMessage('Not Enough Pages', `You need ${member.recruitCost} pages to recruit ${member.name}.`, 'normal');
        return false;
    }

    // Deduct pages
    gameState.totalPages -= member.recruitCost;
    gameState.totalWords = gameState.totalPages * WORDS_PER_PAGE;

    // Recruit member
    member.unlocked = true;

    showMessage(
        `${member.name} Joined!`,
        `${member.name} is now reading with the club!<br><em>+${formatNumber(member.currentPPS)} pages/second</em>`,
        'member'
    );

    renderMembers();
    updateDisplay();
    saveGame();

    return true;
}

// Render members section
function renderMembers() {
    if (!elements.membersContainer) return;

    const memberOrder = ['james', 'sydney', 'tiffany', 'winslow'];
    let html = '';

    for (const key of memberOrder) {
        const member = gameState.members[key];
        let rowClass = 'member-row';
        let checkbox = '☐';
        let status = '';
        let action = '';

        if (member.unlocked) {
            // Recruited
            rowClass += ' recruited';
            checkbox = '☑';
            status = `<span class="member-pps">${formatNumber(member.currentPPS)} p/s</span>`;
        } else if (member.available) {
            // Available to recruit
            rowClass += ' available';
            const canAfford = gameState.totalPages >= member.recruitCost;
            const btnClass = canAfford ? 'recruit-btn' : 'recruit-btn disabled';
            action = `<button class="${btnClass}" data-member="${key}">Recruit: ${member.recruitCost}p</button>`;
        } else {
            // Locked
            rowClass += ' locked';
            status = `<span class="member-status">[Unlocks at Book ${member.unlockBook}]</span>`;
        }

        html += `
            <div class="${rowClass}">
                <span class="member-checkbox">${checkbox}</span>
                <span class="member-name">${member.name}</span>
                ${status}
                ${action}
            </div>
        `;
    }

    elements.membersContainer.innerHTML = html;
}

// Calculate current cost for an upgrade
function calculateUpgradeCost(upgradeKey) {
    const upgrade = gameState.upgrades[upgradeKey];
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

// Purchase an upgrade
function purchaseUpgrade(upgradeKey) {
    const upgrade = gameState.upgrades[upgradeKey];

    // Check if maxed
    if (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel) {
        return false;
    }

    const cost = calculateUpgradeCost(upgradeKey);

    // Check if can afford
    if (gameState.totalPages < cost) {
        showMessage('Not Enough Pages', `You need ${formatNumber(cost)} pages for ${upgrade.name}.`, 'normal');
        return false;
    }

    // Deduct pages
    gameState.totalPages -= cost;
    gameState.totalWords = gameState.totalPages * WORDS_PER_PAGE;

    // Apply upgrade effect
    upgrade.level++;

    switch (upgradeKey) {
        case 'speedReading':
            gameState.wordsPerClick += upgrade.effect;
            showMessage('Upgrade!', `${upgrade.name}: +${upgrade.effect} words per click`, 'special');
            break;
        case 'readingHabit':
            gameState.passivePagesPerSecond += upgrade.effect;
            showMessage('Upgrade!', `${upgrade.name}: +${upgrade.effect} passive page/second`, 'special');
            break;
        case 'focusedReading':
            gameState.currentBookMultiplier = upgrade.effect;
            showMessage('Upgrade!', `${upgrade.name}: 2x book progress activated!`, 'special');
            break;
    }

    renderUpgrades();
    updateDisplay();
    saveGame();
    return true;
}

// Render upgrades section
function renderUpgrades() {
    if (!elements.upgradesContainer) return;

    const upgradeOrder = ['speedReading', 'readingHabit', 'focusedReading'];
    let html = '';

    for (const key of upgradeOrder) {
        const upgrade = gameState.upgrades[key];
        const cost = calculateUpgradeCost(key);
        const isMaxed = upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel;
        const canAfford = gameState.totalPages >= cost;

        let rowClass = 'upgrade-row';
        let levelText = '';
        let costText = '';

        if (isMaxed) {
            rowClass += ' maxed';
            levelText = '';
            costText = '<span class="upgrade-cost owned">OWNED</span>';
        } else {
            rowClass += canAfford ? ' affordable' : ' unaffordable';
            levelText = upgrade.maxLevel === null ? ` (Lv.${upgrade.level})` : '';
            costText = `<span class="upgrade-cost ${canAfford ? '' : 'disabled'}">${formatNumber(cost)}p</span>`;
        }

        html += `
            <div class="${rowClass}" data-upgrade="${key}">
                <div class="upgrade-info">
                    <span class="upgrade-name">${upgrade.name}${levelText}</span>
                    <span class="upgrade-desc">${upgrade.description}</span>
                </div>
                ${costText}
            </div>
        `;
    }

    elements.upgradesContainer.innerHTML = html;
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

    // Reward: +10 words per click for each book completed
    gameState.wordsPerClick += 10;

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

    // Check for member unlocks
    checkMemberUnlocks();

    // Advance to next book
    if (gameState.currentBookIndex < booksData.length - 1) {
        gameState.currentBookIndex++;
        gameState.currentBookPages = 0;
    }

    updateDisplay();
    saveGame();
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

    // Add pages to current book (with multiplier from Focused Reading)
    const pagesGained = (gameState.wordsPerClick / WORDS_PER_PAGE) * gameState.currentBookMultiplier;
    gameState.currentBookPages += pagesGained;

    // Check for book completion
    const currentBook = getCurrentBook();
    if (gameState.currentBookPages >= currentBook.pages_required) {
        completeBook();
    }

    updateDisplay();
}

// Light update for game loop - only updates numbers, not DOM structure
function updateStatsDisplay() {
    const currentBook = getCurrentBook();

    // Update stats
    elements.totalWords.textContent = formatNumber(gameState.totalWords);
    elements.totalPages.textContent = formatNumber(gameState.totalPages);

    // Update click stats
    elements.pagesPerSecond.textContent = formatNumber(calculatePagesPerSecond());

    // Update book progress
    const progress = Math.min((gameState.currentBookPages / currentBook.pages_required) * 100, 100);
    elements.currentPages.textContent = Math.floor(Math.min(gameState.currentBookPages, currentBook.pages_required));
    elements.bookProgress.style.width = progress + '%';
}

// Full display update - includes re-rendering members and upgrades
function updateDisplay() {
    const currentBook = getCurrentBook();

    // Update book title
    elements.bookTitle.textContent = `Current Book: #${currentBook.number} - ${currentBook.title}`;

    // Update stats
    elements.totalWords.textContent = formatNumber(gameState.totalWords);
    elements.totalPages.textContent = formatNumber(gameState.totalPages);
    elements.booksCompleted.textContent = gameState.booksCompleted.length;

    // Update click stats
    elements.wordsPerClick.textContent = formatNumber(gameState.wordsPerClick);
    elements.pagesPerSecond.textContent = formatNumber(calculatePagesPerSecond());

    // Update book progress
    const progress = Math.min((gameState.currentBookPages / currentBook.pages_required) * 100, 100);
    elements.currentPages.textContent = Math.floor(Math.min(gameState.currentBookPages, currentBook.pages_required));
    elements.requiredPages.textContent = currentBook.pages_required;
    elements.bookProgress.style.width = progress + '%';

    // Update member recruit button states
    renderMembers();

    // Update upgrade availability
    renderUpgrades();
}

// Format large numbers (K, M, B)
function formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
    return (num / 1000000000).toFixed(1) + 'B';
}

// Save game to localStorage
function saveGame() {
    try {
        const saveData = {
            version: SAVE_VERSION,
            savedAt: Date.now(),
            gameState: {
                totalWords: gameState.totalWords,
                totalPages: gameState.totalPages,
                currentBookIndex: gameState.currentBookIndex,
                currentBookPages: gameState.currentBookPages,
                booksCompleted: gameState.booksCompleted,
                wordsPerClick: gameState.wordsPerClick,
                stage: gameState.stage,
                members: {},
                upgrades: {},
                passivePagesPerSecond: gameState.passivePagesPerSecond,
                currentBookMultiplier: gameState.currentBookMultiplier,
                discussionPoints: gameState.discussionPoints,
                discussionPointsPerClick: gameState.discussionPointsPerClick,
                careerExpertRuleUnlocked: gameState.careerExpertRuleUnlocked,
                greenlightUnlocked: gameState.greenlightUnlocked,
                globalMultiplier: gameState.globalMultiplier,
                gameStartTime: gameState.gameStartTime,
                totalPlayTime: gameState.totalPlayTime
            }
        };

        // Save member states (only dynamic properties)
        for (const [key, member] of Object.entries(gameState.members)) {
            saveData.gameState.members[key] = {
                available: member.available,
                unlocked: member.unlocked,
                level: member.level,
                currentPPS: member.currentPPS
            };
        }

        // Save upgrade states (only dynamic properties)
        for (const [key, upgrade] of Object.entries(gameState.upgrades)) {
            saveData.gameState.upgrades[key] = {
                level: upgrade.level
            };
        }

        localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
        gameState.lastSaveTime = Date.now();
        console.log('Game saved');
        return true;
    } catch (error) {
        console.error('Failed to save game:', error);
        return false;
    }
}

// Load game from localStorage
function loadGame() {
    try {
        const saveString = localStorage.getItem(SAVE_KEY);
        if (!saveString) {
            console.log('No save found, starting fresh');
            return false;
        }

        const saveData = JSON.parse(saveString);

        // Validate save data
        if (!saveData || !saveData.gameState) {
            console.error('Invalid save data');
            return false;
        }

        const saved = saveData.gameState;

        // Restore core stats
        gameState.totalWords = saved.totalWords || 0;
        gameState.totalPages = saved.totalPages || 0;
        gameState.currentBookIndex = saved.currentBookIndex || 0;
        gameState.currentBookPages = saved.currentBookPages || 0;
        gameState.booksCompleted = saved.booksCompleted || [];
        gameState.wordsPerClick = saved.wordsPerClick || 1;
        gameState.stage = saved.stage || 1;
        gameState.passivePagesPerSecond = saved.passivePagesPerSecond || 0;
        gameState.currentBookMultiplier = saved.currentBookMultiplier || 1;
        gameState.discussionPoints = saved.discussionPoints || 0;
        gameState.discussionPointsPerClick = saved.discussionPointsPerClick || 1;
        gameState.careerExpertRuleUnlocked = saved.careerExpertRuleUnlocked || false;
        gameState.greenlightUnlocked = saved.greenlightUnlocked || false;
        gameState.globalMultiplier = saved.globalMultiplier || 1.0;
        gameState.gameStartTime = saved.gameStartTime || Date.now();
        gameState.totalPlayTime = saved.totalPlayTime || 0;

        // Restore member states
        if (saved.members) {
            for (const [key, memberData] of Object.entries(saved.members)) {
                if (gameState.members[key]) {
                    gameState.members[key].available = memberData.available || false;
                    gameState.members[key].unlocked = memberData.unlocked || false;
                    gameState.members[key].level = memberData.level || 0;
                    gameState.members[key].currentPPS = memberData.currentPPS || gameState.members[key].basePPS;
                }
            }
        }

        // Restore upgrade states
        if (saved.upgrades) {
            for (const [key, upgradeData] of Object.entries(saved.upgrades)) {
                if (gameState.upgrades[key]) {
                    gameState.upgrades[key].level = upgradeData.level || 0;
                }
            }
        }

        // No offline progress - game only progresses when tab is active

        console.log('Game loaded successfully');
        return true;
    } catch (error) {
        console.error('Failed to load game:', error);
        return false;
    }
}

// Game loop (10 FPS)
let lastTime = Date.now();
function gameLoop() {
    // Don't progress if game is paused (tab hidden)
    if (isGamePaused) {
        lastTime = Date.now(); // Reset timer to prevent time accumulation
        return;
    }

    const now = Date.now();
    const deltaTime = (now - lastTime) / 1000; // Convert to seconds
    lastTime = now;

    // Add passive pages from members and upgrades
    const pps = calculatePagesPerSecond();
    if (pps > 0) {
        const pagesGained = pps * deltaTime;
        gameState.totalWords += pagesGained * WORDS_PER_PAGE;
        gameState.totalPages = calculatePages(gameState.totalWords);
        // Apply current book multiplier from Focused Reading
        gameState.currentBookPages += pagesGained * gameState.currentBookMultiplier;

        // Check for book completion
        const currentBook = getCurrentBook();
        if (gameState.currentBookPages >= currentBook.pages_required) {
            completeBook();
        } else {
            // Only update stats, not full DOM rebuild
            updateStatsDisplay();
        }
    }
}

// Initialize game
async function init() {
    initElements();

    // Load books data
    await loadBooks();

    // Load saved game (if exists)
    loadGame();

    // Set up click handler for read button
    elements.readButton.addEventListener('click', handleReadClick);

    // Set up event delegation for members container (click handlers attached once)
    elements.membersContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.recruit-btn');
        if (btn && !btn.classList.contains('disabled')) {
            const memberKey = btn.dataset.member;
            recruitMember(memberKey);
        }
    });

    // Set up event delegation for upgrades container (click handlers attached once)
    elements.upgradesContainer.addEventListener('click', (e) => {
        const row = e.target.closest('.upgrade-row.affordable');
        if (row) {
            const upgradeKey = row.dataset.upgrade;
            purchaseUpgrade(upgradeKey);
        }
    });

    // Track when tab was hidden
    let hiddenAt = null;

    // Pause game when tab is hidden (Page Visibility API)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isGamePaused = true;
            hiddenAt = Date.now();
            saveGame(); // Save when leaving
            console.log('Game paused (tab hidden)');
        } else {
            isGamePaused = false;
            lastTime = Date.now(); // Reset timer to prevent time jump

            // Show welcome back message if away for more than 5 seconds
            if (hiddenAt && (Date.now() - hiddenAt) > 5000) {
                showMessage('Welcome Back!', 'Your book club missed you!', 'normal');
            }
            hiddenAt = null;
            console.log('Game resumed (tab visible)');
        }
    });

    // Initial render of members and upgrades
    renderMembers();
    renderUpgrades();

    // Start game loop (10 FPS = 100ms interval)
    setInterval(gameLoop, 100);

    // Start auto-save (every 10 seconds)
    setInterval(saveGame, AUTO_SAVE_INTERVAL);

    // Initial display update
    updateDisplay();

    console.log('Book Club Clicker initialized!');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
