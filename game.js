// Book Club Clicker - Game Logic

// Constants
const WORDS_PER_PAGE = 250;
const SAVE_KEY = 'bookClubClickerSave';
const SAVE_VERSION = 5; // Bumped for Phase 12 (Special Books & Finale)
const AUTO_SAVE_INTERVAL = 10000; // 10 seconds

// Discussion Move Definitions
const DISCUSSION_MOVES = {
    hotTake: {
        name: 'Hot Take',
        cost: 50,
        description: 'High risk, high reward',
        successRate: 0.4,  // 40% base, 60% with Tiffany
        successBonus: 2.0,
        failPenalty: 0.25
    },
    deepDive: {
        name: 'Deep Dive',
        cost: 100,
        description: 'Slow but guaranteed progress',
        progressBonus: 1.5
    },
    remindsMe: {
        name: '"This reminds me of..."',
        cost: 75,
        description: 'Connect to a previous book',
        baseBonus: 1.0,
        distanceMultiplier: 0.1
    },
    devilsAdvocate: {
        name: "Devil's Advocate",
        cost: 60,
        description: 'Spark debate, generate more DP',
        dpGenerated: 40,
        progressBonus: 1.2
    },
    didntFinish: {
        name: '"I didn\'t finish it"',
        cost: 0,
        description: 'Shameful but honest',
        progressBonus: 10,
        penaltyMultiplier: 0.5,
        penaltyDuration: 10
    }
};

// Discussion Event Definitions (Phase 10)
const DISCUSSION_EVENTS = {
    // Negative Events
    technicalDifficulties: {
        name: 'Technical Difficulties',
        type: 'negative',
        messageTitle: "You're On Mute!",
        messageText: "Someone forgot to unmute. Discussion paused briefly.",
        effect: 'pauseDiscussion',
        effectValue: 3, // seconds
        baseProbability: 0.08,
        canRepeat: true,
        cooldownSeconds: 30,
        preventedBy: null,
        reducedBy: 'betterWifi'
    },
    theTangent: {
        name: 'The Tangent',
        type: 'negative',
        messageTitle: 'The Tangent!',
        messageText: "Someone went completely off-topic. The discussion spiraled.",
        effect: 'costDP',
        effectValue: 50,
        baseProbability: 0.05,
        canRepeat: true,
        cooldownSeconds: 45,
        preventedBy: 'james'
    },
    scheduleConflict: {
        name: 'Schedule Conflict',
        type: 'negative',
        messageTitle: 'Schedule Conflict!',
        messageText: "{memberName} couldn't make it this week.",
        effect: 'disableMember',
        baseProbability: 0.03,
        canRepeat: false
    },
    cameraOffEnergy: {
        name: 'Camera Off Energy',
        type: 'negative',
        messageTitle: 'Camera Off Energy',
        messageText: "Everyone has their cameras off. The energy is low.",
        effect: 'reduceClickPower',
        effectValue: 0.75, // 25% reduction
        baseProbability: 0.04,
        canRepeat: false
    },

    // Positive Events
    thePerfectTake: {
        name: 'The Perfect Take',
        type: 'positive',
        messageTitle: 'The Perfect Take!',
        messageText: "Someone absolutely nailed it. The group is energized!",
        effect: 'instantProgress',
        effectValue: 0.5, // 50% of remaining progress
        baseProbability: 0.04,
        canRepeat: false
    },
    everyoneActuallyReadIt: {
        name: 'Everyone Actually Read It',
        type: 'positive',
        messageTitle: 'A Miracle!',
        messageText: "Everyone actually finished the book this week!",
        effect: 'boostEngagement',
        effectValue: 0.25, // +25% engagement
        baseProbability: 0.02,
        canRepeat: false
    },

    // Chaotic Events
    controversialOpinion: {
        name: 'Controversial Opinion',
        type: 'chaotic',
        messageTitle: 'Controversial Opinion!',
        messageText: "Someone dropped a hot take...",
        effect: 'engagementGamble',
        effectValue: 0.3, // +/- 30%
        baseProbability: 0.06,
        canRepeat: true,
        cooldownSeconds: 60,
        controversyMultiplier: 2.0 // 2x on high/max controversy
    },

    // Special Events
    inPersonMeetup: {
        name: 'In-Person Meetup',
        type: 'special',
        messageTitle: 'IN-PERSON MEETUP!',
        messageText: "The book club meets IRL! Everything is better in person.",
        effect: 'dpMultiplier',
        effectValue: 3.0,
        triggerBooks: [50, 100, 140, 168],
        baseProbability: 0
    },

    // GREEN LIGHT Events (Phase 12 - unlocked after Book 100)
    greenlightMoment: {
        name: 'Green Light Moment',
        type: 'greenlight',
        messageTitle: 'GREEN LIGHT',
        messageText: 'good vibes boost — 1.5x DP for 30 seconds',
        effect: 'greenlightBoost',
        effectValue: 1.5,
        baseProbability: 0.08,
        canRepeat: true,
        cooldownSeconds: 45,
        requiresGreenlight: true
    },
    justKeepLivin: {
        name: 'Just Keep Livin',
        type: 'greenlight',
        messageTitle: 'GREEN LIGHT',
        messageText: 'just keep livin\' — +20% engagement',
        effect: 'boostEngagement',
        effectValue: 0.20,
        baseProbability: 0.05,
        canRepeat: true,
        cooldownSeconds: 60,
        requiresGreenlight: true
    },
    beMoreStoked: {
        name: 'Be More Stoked',
        type: 'greenlight',
        messageTitle: 'GREEN LIGHT',
        messageText: 'be more stoked — +25% instant progress',
        effect: 'instantProgress',
        effectValue: 0.25,
        baseProbability: 0.04,
        canRepeat: false,
        requiresGreenlight: true
    }
};

// McConaughey quotes for GREEN LIGHT events
const MCCONAUGHEY_QUOTES = [
    "Alright, alright, alright...",
    "Just keep livin'.",
    "Life's barely long enough to get good at one thing.",
    "Sometimes you gotta go back to actually move forward.",
    "Green lights are freedom, man."
];

// Game pause state (for when tab is hidden)
let isGamePaused = false;

// Interval IDs (for cleanup on reset)
let gameLoopInterval = null;
let autoSaveInterval = null;

// Flag to prevent saving during reset
let isResetting = false;

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

    // Stage 2 state
    bookPhase: 'reading', // 'reading' or 'discussion' (Stage 2 only)
    discussionPoints: 0,
    discussionPointsPerClick: 1,
    currentDiscussionProgress: 0,
    engagement: 1.0, // Multiplier that persists between books

    // Discussion moves tracking
    discussionClickCount: 0,        // Clicks this discussion (for quality)
    usedRemindsMeThisBook: false,   // Track callback usage
    didntFinishPenalty: 0,          // Remaining clicks with penalty
    lastDiscussionQuality: 'good',  // 'great', 'good', 'bad'
    showingBookSelector: false,     // UI state for reminds me

    // Special unlocks
    careerExpertRuleUnlocked: false,
    greenlightUnlocked: false,
    badBookSurvived: false,
    gameComplete: false,
    victoryStats: null,

    // Events state (Phase 10)
    events: {
        occurredThisBook: [],      // Event IDs that happened this book
        lastOccurrence: {},        // eventId -> timestamp
        lastEventCheck: 0,         // Last check timestamp
        eventCheckInterval: 5000,  // Check every 5 seconds
        activeEffects: {
            discussionPaused: false,
            pauseEndTime: 0,
            memberDisabled: null,
            clickPowerMultiplier: 1.0,
            dpMultiplier: 1.0,
            tangentRefocusCost: 0
        },
        inPersonMeetupActive: false
    },

    // Upgrades (Stage 1)
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

    // Stage 2 Upgrades (cost DP)
    stage2Upgrades: {
        discussionGuide: {
            name: 'Discussion Guide',
            description: '+1 DP per click',
            level: 0,
            baseCost: 50,
            costMultiplier: 2.5,
            maxLevel: null,
            effect: 1
        },
        betterWifi: {
            name: 'Better Wifi',
            description: 'Reduce Technical Difficulties event chance',
            level: 0,
            baseCost: 200,
            costMultiplier: 1,
            maxLevel: 1,
            effect: 0.5
        },
        bookClubHistorian: {
            name: 'Book Club Historian',
            description: '"This reminds me of..." works on ALL books',
            level: 0,
            baseCost: 300,
            costMultiplier: 1,
            maxLevel: 1,
            effect: true
        },
        hotTakeInsurance: {
            name: 'Hot Take Insurance',
            description: 'Hot Takes can never result in DP loss',
            level: 0,
            baseCost: 500,
            costMultiplier: 1,
            maxLevel: 1,
            effect: true
        },
        theGroupChat: {
            name: 'The Group Chat',
            description: 'Members generate passive DP during discussions',
            level: 0,
            baseCost: 1000,
            costMultiplier: 1,
            maxLevel: 1,
            effect: 0.1
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
    upgradesContainer: null,
    // Stage 2 elements
    stageIndicator: null,
    phaseIndicator: null,
    discussionPointsDisplay: null,
    discussionProgressBar: null,
    discussionProgressText: null,
    engagementDisplay: null,
    readingProgressContainer: null,
    discussionProgressContainer: null,
    dpStat: null,
    engagementStat: null,
    // Discussion moves elements
    movesSection: null,
    movesContainer: null,
    bookSelectorModal: null,
    bookSelectorList: null
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
    // Stage 2 elements
    elements.stageIndicator = document.getElementById('stage-indicator');
    elements.phaseIndicator = document.getElementById('phase-indicator');
    elements.discussionPointsDisplay = document.getElementById('discussion-points');
    elements.discussionProgressBar = document.getElementById('discussion-progress');
    elements.discussionProgressText = document.getElementById('discussion-progress-text');
    elements.engagementDisplay = document.getElementById('engagement-display');
    elements.readingProgressContainer = document.getElementById('reading-progress-container');
    elements.discussionProgressContainer = document.getElementById('discussion-progress-container');
    elements.dpStat = document.getElementById('dp-stat');
    elements.engagementStat = document.getElementById('engagement-stat');
    // Discussion moves elements
    elements.movesSection = document.getElementById('moves-section');
    elements.movesContainer = document.getElementById('moves-container');
    elements.bookSelectorModal = document.getElementById('book-selector-modal');
    elements.bookSelectorList = document.getElementById('book-selector-list');
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

// Check if all available books have been completed
function isAllBooksComplete() {
    return gameState.booksCompleted.length >= booksData.length;
}

// Check if currently in Stage 2
function isStage2() {
    return gameState.stage === 2;
}

// Check if in discussion phase (Stage 2 only)
function isDiscussionPhase() {
    return gameState.stage === 2 && gameState.bookPhase === 'discussion';
}

// Get discussion requirement for current book (Stage 2)
function getDiscussionRequired() {
    const book = getCurrentBook();
    return book.discussion_required || 50; // Default to 50 if not specified
}

// Transition from reading phase to discussion phase (Stage 2)
function transitionToDiscussionPhase() {
    gameState.bookPhase = 'discussion';
    gameState.currentDiscussionProgress = 0;

    const book = getCurrentBook();
    showMessage(
        'Ready to Discuss!',
        `"${book.title}" - The book club has finished reading.<br><em>Click to facilitate the discussion!</em>`,
        'member'
    );

    updateDisplay();
}

// Determine discussion quality based on performance
function determineDiscussionQuality() {
    const discussionRequired = getDiscussionRequired();
    const baseDP = gameState.discussionPointsPerClick * gameState.engagement;

    // Expected clicks = required / DP per click (approximate)
    const expectedClicks = discussionRequired / baseDP;
    const actualClicks = gameState.discussionClickCount;

    // Great: used callback OR completed efficiently
    if (gameState.usedRemindsMeThisBook) {
        return 'great';
    }

    // Bad: took more than 2x expected clicks
    if (actualClicks > expectedClicks * 2) {
        return 'bad';
    }

    // Good: completed within reasonable range
    if (actualClicks <= expectedClicks * 1.2) {
        return 'good';
    }

    return 'good';
}

// Complete discussion and advance to next book (Stage 2)
function completeDiscussion() {
    const book = getCurrentBook();

    // Add to completed list
    if (!gameState.booksCompleted.includes(book.number)) {
        gameState.booksCompleted.push(book.number);
    }

    // Determine discussion quality and award engagement
    const quality = determineDiscussionQuality();
    gameState.lastDiscussionQuality = quality;

    let engagementChange = 0;
    let qualityText = '';

    switch (quality) {
        case 'great':
            engagementChange = 0.15 + Math.random() * 0.05; // +15-20%
            qualityText = 'Great discussion!';
            break;
        case 'good':
            engagementChange = 0.05 + Math.random() * 0.05; // +5-10%
            qualityText = 'Good discussion!';
            break;
        case 'bad':
            gameState.engagement = 1.0; // Reset
            qualityText = 'Discussion dragged on... Engagement reset.';
            break;
    }

    if (quality !== 'bad') {
        gameState.engagement = Math.min(gameState.engagement + engagementChange, 3.0);
    }

    // Show completion message
    let messageType = 'normal';
    if (quality === 'great') messageType = 'special';
    if (book.controversy === 'high') messageType = 'special';

    showMessage(
        `Discussion Complete!`,
        `"${book.title}" by ${book.author}<br><em>${book.note}</em><br>${qualityText}<br>Engagement: ${gameState.engagement.toFixed(2)}x`,
        messageType
    );

    // Handle special book effects
    handleSpecialBook(book);

    // Reset for next book
    gameState.currentBookPages = 0;
    gameState.currentDiscussionProgress = 0;
    gameState.bookPhase = 'reading';
    gameState.discussionClickCount = 0;
    gameState.usedRemindsMeThisBook = false;
    gameState.didntFinishPenalty = 0;
    resetEventsForNewBook(); // Reset events state

    // Advance to next book
    if (gameState.currentBookIndex < booksData.length - 1) {
        gameState.currentBookIndex++;
    }

    updateDisplay();
    saveGame();
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

// Render upgrades section (Stage 1 or Stage 2 based on current stage)
function renderUpgrades() {
    if (!elements.upgradesContainer) return;

    let html = '';

    if (gameState.stage === 1) {
        // Stage 1 upgrades
        const upgradeOrder = ['speedReading', 'readingHabit', 'focusedReading'];

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
    } else {
        // Stage 2 upgrades
        const stage2Order = ['discussionGuide', 'betterWifi', 'bookClubHistorian', 'hotTakeInsurance', 'theGroupChat'];

        for (const key of stage2Order) {
            html += renderStage2UpgradeRow(key, gameState.stage2Upgrades[key]);
        }
    }

    elements.upgradesContainer.innerHTML = html;
}

// Calculate current cost for a Stage 2 upgrade
function calculateStage2UpgradeCost(upgradeKey) {
    const upgrade = gameState.stage2Upgrades[upgradeKey];
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, upgrade.level));
}

// Render a single Stage 2 upgrade row
function renderStage2UpgradeRow(key, upgrade) {
    const cost = calculateStage2UpgradeCost(key);
    const isMaxed = upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel;
    const canAfford = gameState.discussionPoints >= cost;

    let rowClass = 'upgrade-row stage2-upgrade';
    let levelText = '';
    let costText = '';

    if (isMaxed) {
        rowClass += ' maxed';
        levelText = '';
        costText = '<span class="upgrade-cost owned">OWNED</span>';
    } else {
        rowClass += canAfford ? ' affordable' : ' unaffordable';
        levelText = upgrade.maxLevel === null ? ` (Lv.${upgrade.level})` : '';
        costText = `<span class="upgrade-cost ${canAfford ? '' : 'disabled'}">${formatNumber(cost)} DP</span>`;
    }

    return `
        <div class="${rowClass}" data-stage2-upgrade="${key}">
            <div class="upgrade-info">
                <span class="upgrade-name">${upgrade.name}${levelText}</span>
                <span class="upgrade-desc">${upgrade.description}</span>
            </div>
            ${costText}
        </div>
    `;
}

// Purchase a Stage 2 upgrade
function purchaseStage2Upgrade(upgradeKey) {
    const upgrade = gameState.stage2Upgrades[upgradeKey];

    // Check if maxed
    if (upgrade.maxLevel !== null && upgrade.level >= upgrade.maxLevel) {
        return false;
    }

    const cost = calculateStage2UpgradeCost(upgradeKey);

    // Check if can afford (DP currency)
    if (gameState.discussionPoints < cost) {
        showMessage('Not Enough DP', `You need ${formatNumber(cost)} Discussion Points for ${upgrade.name}.`, 'normal');
        return false;
    }

    // Deduct DP
    gameState.discussionPoints -= cost;

    // Apply upgrade effect
    upgrade.level++;

    switch (upgradeKey) {
        case 'discussionGuide':
            gameState.discussionPointsPerClick += upgrade.effect;
            showMessage('Upgrade!', `${upgrade.name}: +${upgrade.effect} DP per click!`, 'special');
            break;
        case 'betterWifi':
            showMessage('Upgrade!', `${upgrade.name}: Technical Difficulties will be less frequent!`, 'special');
            break;
        case 'bookClubHistorian':
            showMessage('Upgrade!', `${upgrade.name}: "This reminds me of..." now works with ALL books!`, 'special');
            break;
        case 'hotTakeInsurance':
            showMessage('Upgrade!', `${upgrade.name}: Hot Takes are now risk-free!`, 'special');
            break;
        case 'theGroupChat':
            showMessage('Upgrade!', `${upgrade.name}: Members now generate passive DP during discussions!`, 'special');
            break;
    }

    renderUpgrades();
    updateDisplay();
    saveGame();
    return true;
}

// Get move modifiers based on member bonuses
function getMoveModifiers(moveKey) {
    const modifiers = {
        costMultiplier: 1.0,
        successBonus: 0,
        effectMultiplier: 1.0,
        bonusText: null
    };

    switch (moveKey) {
        case 'deepDive':
            // Sydney: Deep Dive -25% cost
            if (gameState.members.sydney.unlocked) {
                modifiers.costMultiplier = 0.75;
                modifiers.bonusText = 'Sydney: -25% cost';
            }
            break;
        case 'hotTake':
            // Tiffany: Hot Take +20% success rate
            if (gameState.members.tiffany.unlocked) {
                modifiers.successBonus = 0.2;
                modifiers.bonusText = 'Tiffany: +20% success';
            }
            break;
        case 'remindsMe':
            // Winslow: 2x bonus
            if (gameState.members.winslow.unlocked) {
                modifiers.effectMultiplier = 2.0;
                modifiers.bonusText = 'Winslow: 2x bonus';
            }
            break;
    }

    return modifiers;
}

// Calculate actual cost for a move (after member bonuses)
function getMoveCost(moveKey) {
    const move = DISCUSSION_MOVES[moveKey];
    const modifiers = getMoveModifiers(moveKey);
    return Math.floor(move.cost * modifiers.costMultiplier);
}

// Render discussion moves section
function renderMoves() {
    if (!elements.movesContainer) return;

    const moveOrder = ['hotTake', 'deepDive', 'remindsMe', 'devilsAdvocate', 'didntFinish'];
    let html = '';

    for (const key of moveOrder) {
        const move = DISCUSSION_MOVES[key];
        const modifiers = getMoveModifiers(key);
        const actualCost = getMoveCost(key);
        const canAfford = gameState.discussionPoints >= actualCost;

        // Check if move is disabled (remindsMe can only be used once per discussion)
        const isUsed = (key === 'remindsMe' && gameState.usedRemindsMeThisBook);
        const isDisabled = !canAfford || isUsed;

        let btnClass = 'move-btn';
        if (isUsed) {
            btnClass += ' used';
        } else if (isDisabled) {
            btnClass += ' disabled';
        }

        const costClass = actualCost === 0 ? 'move-cost free' : 'move-cost';
        const costText = actualCost === 0 ? 'FREE' : `${actualCost} DP`;

        // Show original cost strikethrough if discounted
        let costDisplay = costText;
        if (modifiers.costMultiplier < 1.0 && move.cost > 0) {
            costDisplay = `<s>${move.cost}</s> ${actualCost} DP`;
        }

        const bonusHtml = modifiers.bonusText ?
            `<span class="move-bonus">${modifiers.bonusText}</span>` : '';

        html += `
            <button class="${btnClass}" data-move="${key}" ${isDisabled ? 'disabled' : ''}>
                <span class="move-name">${move.name}</span>
                <span class="move-desc">${move.description}</span>
                <span class="${costClass}">${costDisplay}</span>
                ${bonusHtml}
            </button>
        `;
    }

    elements.movesContainer.innerHTML = html;
}

// Execute a discussion move
function executeMove(moveKey) {
    const move = DISCUSSION_MOVES[moveKey];
    const modifiers = getMoveModifiers(moveKey);
    const cost = getMoveCost(moveKey);

    // Check if can afford
    if (gameState.discussionPoints < cost) {
        showMessage('Not Enough DP', `You need ${cost} Discussion Points for ${move.name}.`, 'normal');
        return false;
    }

    // Deduct cost
    gameState.discussionPoints -= cost;

    // Execute move-specific logic
    switch (moveKey) {
        case 'hotTake':
            executeHotTake(move, modifiers);
            break;
        case 'deepDive':
            executeDeepDive(move, modifiers);
            break;
        case 'devilsAdvocate':
            executeDevilsAdvocate(move, modifiers);
            break;
        case 'didntFinish':
            executeDidntFinish(move, modifiers);
            break;
        case 'remindsMe':
            // This is handled separately via showBookSelector()
            gameState.discussionPoints += cost; // Refund, will be charged after selection
            showBookSelector();
            return true;
    }

    // Check for discussion completion
    const discussionRequired = getDiscussionRequired();
    if (gameState.currentDiscussionProgress >= discussionRequired) {
        completeDiscussion();
    } else {
        updateDisplay();
    }

    return true;
}

// Hot Take: 40% success for 2x, 60% fail for -25% (unless insured)
function executeHotTake(move, modifiers) {
    const successRate = move.successRate + modifiers.successBonus;
    const roll = Math.random();

    if (roll < successRate) {
        // Success! 2x return
        const bonus = move.cost * move.successBonus;
        gameState.currentDiscussionProgress += bonus;
        showMessage('Hot Take Success!', `Your bold opinion landed perfectly!<br><em>+${Math.floor(bonus)} discussion progress</em>`, 'special');
    } else {
        // Fail
        if (gameState.stage2Upgrades.hotTakeInsurance.level > 0) {
            // Insurance: no DP loss, just no progress
            showMessage('Hot Take Missed!', `That opinion didn't land...<br><em>Insurance protected your DP!</em>`, 'normal');
        } else {
            // Original penalty - lose 25% of cost from DP pool
            const penalty = Math.floor(move.cost * move.failPenalty);
            gameState.discussionPoints = Math.max(0, gameState.discussionPoints - penalty);
            showMessage('Hot Take Backfired!', `That opinion was too spicy...<br><em>-${penalty} DP</em>`, 'normal');
        }
    }
}

// Deep Dive: Guaranteed 1.5x progress
function executeDeepDive(move, modifiers) {
    const cost = getMoveCost('deepDive');
    const bonus = cost * move.progressBonus;

    // Knowledge books get extra 25% progress
    const currentBook = getCurrentBook();
    let categoryBonus = 0;
    if (currentBook.category === 'Knowledge') {
        categoryBonus = bonus * 0.25;
    }

    const totalProgress = bonus + categoryBonus;
    gameState.currentDiscussionProgress += totalProgress;

    let message = `Thoughtful analysis pays off!<br><em>+${Math.floor(totalProgress)} discussion progress</em>`;
    if (categoryBonus > 0) {
        message += '<br><em>Knowledge book bonus!</em>';
    }
    showMessage('Deep Dive Complete!', message, 'special');
}

// Devil's Advocate: Generate DP and add progress
function executeDevilsAdvocate(move, modifiers) {
    // Generate DP
    let dpGenerated = move.dpGenerated;

    // High controversy books get +50% DP generated
    const currentBook = getCurrentBook();
    if (currentBook.controversy === 'high') {
        dpGenerated = Math.floor(dpGenerated * 1.5);
    }

    gameState.discussionPoints += dpGenerated;

    // Add progress
    const progress = move.cost * move.progressBonus;
    gameState.currentDiscussionProgress += progress;

    let message = `Stirring the pot!<br><em>+${dpGenerated} DP, +${Math.floor(progress)} progress</em>`;
    if (currentBook.controversy === 'high') {
        message += '<br><em>Controversy bonus!</em>';
    }
    showMessage("Devil's Advocate!", message, 'special');
}

// Didn't Finish: Shameful but gives small progress, penalties for next clicks
function executeDidntFinish(move, modifiers) {
    // Small progress boost for honesty
    gameState.currentDiscussionProgress += move.progressBonus;

    // Apply penalty for next N clicks
    gameState.didntFinishPenalty = move.penaltyDuration;

    showMessage('"I didn\'t finish it..."', `Honesty is... something.<br><em>+${move.progressBonus} progress, but -50% DP for ${move.penaltyDuration} clicks</em>`, 'normal');
}

// Show book selector for "Reminds Me" move
function showBookSelector() {
    if (!elements.bookSelectorModal || !elements.bookSelectorList) return;

    gameState.showingBookSelector = true;

    // Determine minimum book number based on Historian upgrade
    let minBookNumber = 26; // Default: Stage 2 books only
    if (gameState.stage2Upgrades.bookClubHistorian.level > 0) {
        minBookNumber = 1; // Historian: All books
    }

    // Get completed books (excluding current)
    const completedBooks = gameState.booksCompleted
        .filter(num => num >= minBookNumber && num < getCurrentBook().number)
        .sort((a, b) => a - b);

    if (completedBooks.length === 0) {
        showMessage('No Books to Connect', 'You need to complete more books first!', 'normal');
        gameState.showingBookSelector = false;
        return;
    }

    let html = '';
    for (const bookNum of completedBooks) {
        const book = booksData.find(b => b.number === bookNum);
        if (!book) continue;

        html += `
            <div class="book-option" data-book="${bookNum}">
                <span class="book-option-title">#${bookNum} - ${book.title}</span>
            </div>
        `;
    }

    elements.bookSelectorList.innerHTML = html;
    elements.bookSelectorModal.style.display = 'flex';
}

// Execute "Reminds Me" after book selection
function executeRemindsMe(selectedBookNum) {
    const move = DISCUSSION_MOVES.remindsMe;
    const modifiers = getMoveModifiers('remindsMe');
    const cost = getMoveCost('remindsMe');

    // Deduct cost
    if (gameState.discussionPoints < cost) {
        showMessage('Not Enough DP', `You need ${cost} Discussion Points.`, 'normal');
        hideBookSelector();
        return;
    }
    gameState.discussionPoints -= cost;

    // Calculate bonus
    const currentBookIndex = gameState.currentBookIndex;
    const selectedBookIndex = booksData.findIndex(b => b.number === selectedBookNum);
    const distance = currentBookIndex - selectedBookIndex;
    const baseBonus = cost * (1 + distance * move.distanceMultiplier);
    const totalBonus = Math.floor(baseBonus * modifiers.effectMultiplier);

    // Add progress
    gameState.currentDiscussionProgress += totalBonus;

    // Mark as used this book
    gameState.usedRemindsMeThisBook = true;

    const selectedBook = booksData.find(b => b.number === selectedBookNum);
    showMessage('"This reminds me of..."', `Connection to "${selectedBook.title}"!<br><em>+${totalBonus} discussion progress</em>`, 'special');

    hideBookSelector();

    // Check for discussion completion
    const discussionRequired = getDiscussionRequired();
    if (gameState.currentDiscussionProgress >= discussionRequired) {
        completeDiscussion();
    } else {
        updateDisplay();
    }
}

// Hide book selector modal
function hideBookSelector() {
    if (elements.bookSelectorModal) {
        elements.bookSelectorModal.style.display = 'none';
    }
    gameState.showingBookSelector = false;
}

// ==================== EVENTS SYSTEM (Phase 10) ====================

// Check if an event can trigger (cooldown, repeats, prevention)
function canEventTrigger(eventId) {
    const event = DISCUSSION_EVENTS[eventId];
    const eventState = gameState.events;

    // Check greenlight requirement (Phase 12)
    if (event.requiresGreenlight && !gameState.greenlightUnlocked) {
        return false;
    }

    // Non-repeating already occurred?
    if (!event.canRepeat && eventState.occurredThisBook.includes(eventId)) {
        return false;
    }

    // Cooldown check
    if (event.cooldownSeconds > 0) {
        const lastTime = eventState.lastOccurrence[eventId] || 0;
        if (Date.now() - lastTime < event.cooldownSeconds * 1000) {
            return false;
        }
    }

    // Prevented by member?
    if (event.preventedBy && gameState.members[event.preventedBy]?.unlocked) {
        return false;
    }

    return true;
}

// Calculate actual probability for an event
function calculateEventProbability(eventId) {
    const event = DISCUSSION_EVENTS[eventId];
    let prob = event.baseProbability;

    // Better Wifi reduces Technical Difficulties
    if (event.reducedBy === 'betterWifi' &&
        gameState.stage2Upgrades.betterWifi.level > 0) {
        prob *= gameState.stage2Upgrades.betterWifi.effect; // 0.5 = 50% reduction
    }

    // Controversy affects chaotic events
    if (event.controversyMultiplier) {
        const controversy = getCurrentBook().controversy;
        if (controversy === 'high' || controversy === 'maximum') {
            prob *= event.controversyMultiplier;
        }
    }

    return prob;
}

// Main event check function - called periodically during discussion phase
function checkForEvents() {
    if (!isDiscussionPhase()) return;
    if (gameState.events.activeEffects.discussionPaused) return;

    const now = Date.now();
    if (now - gameState.events.lastEventCheck < gameState.events.eventCheckInterval) {
        return;
    }
    gameState.events.lastEventCheck = now;

    // Check special events first (guaranteed at specific books)
    checkSpecialEvents();

    // Check GREEN LIGHT events if unlocked (Phase 12)
    if (gameState.greenlightUnlocked) {
        const greenlightEvents = ['greenlightMoment', 'justKeepLivin', 'beMoreStoked'];
        for (const eventId of greenlightEvents) {
            if (!canEventTrigger(eventId)) continue;
            if (Math.random() < calculateEventProbability(eventId)) {
                executeEvent(eventId);
                return; // Only one event per check
            }
        }
    }

    // Roll for regular random events (one per check max)
    const eventOrder = [
        'technicalDifficulties', 'theTangent', 'scheduleConflict',
        'cameraOffEnergy', 'thePerfectTake', 'everyoneActuallyReadIt',
        'controversialOpinion'
    ];

    for (const eventId of eventOrder) {
        if (!canEventTrigger(eventId)) continue;
        if (Math.random() < calculateEventProbability(eventId)) {
            executeEvent(eventId);
            return; // Only one event per check
        }
    }
}

// Check for special book-triggered events
function checkSpecialEvents() {
    const currentBook = getCurrentBook();

    // In-Person Meetup check
    const meetupEvent = DISCUSSION_EVENTS.inPersonMeetup;
    if (meetupEvent.triggerBooks.includes(currentBook.number)) {
        if (!gameState.events.occurredThisBook.includes('inPersonMeetup')) {
            executeEvent('inPersonMeetup');
        }
    }
}

// Main event execution dispatcher
function executeEvent(eventId) {
    const event = DISCUSSION_EVENTS[eventId];

    // Mark as occurred
    gameState.events.occurredThisBook.push(eventId);
    gameState.events.lastOccurrence[eventId] = Date.now();

    // Execute effect based on type
    switch (event.effect) {
        case 'pauseDiscussion':
            executePauseDiscussion(event);
            break;
        case 'costDP':
            executeTangent(event);
            break;
        case 'disableMember':
            executeScheduleConflict(event);
            break;
        case 'reduceClickPower':
            executeCameraOffEnergy(event);
            break;
        case 'instantProgress':
            executePerfectTake(event);
            break;
        case 'boostEngagement':
            executeEveryoneReadIt(event);
            break;
        case 'engagementGamble':
            executeControversialOpinion(event);
            break;
        case 'dpMultiplier':
            executeInPersonMeetup(event);
            break;
        case 'greenlightBoost':
            executeGreenlightBoost(event);
            break;
    }

    saveGame();
}

// Technical Difficulties - pause discussion briefly
function executePauseDiscussion(event) {
    gameState.events.activeEffects.discussionPaused = true;
    gameState.events.activeEffects.pauseEndTime = Date.now() + (event.effectValue * 1000);

    showMessage(event.messageTitle, event.messageText, 'event-negative');

    // Auto-resume after duration
    setTimeout(() => {
        gameState.events.activeEffects.discussionPaused = false;
        showMessage('Connection Restored', 'Discussion can continue!', 'normal');
    }, event.effectValue * 1000);
}

// The Tangent - costs DP to refocus (James prevents entirely)
function executeTangent(event) {
    gameState.events.activeEffects.tangentRefocusCost = event.effectValue;

    showMessage(
        event.messageTitle,
        `${event.messageText}<br><em>Click to refocus: -${event.effectValue} DP</em>`,
        'event-negative'
    );
}

// Schedule Conflict - disable a random member for this book
function executeScheduleConflict(event) {
    const unlockedMembers = Object.entries(gameState.members)
        .filter(([key, member]) => member.unlocked);

    if (unlockedMembers.length === 0) return;

    // Pick a random unlocked member
    const randomIndex = Math.floor(Math.random() * unlockedMembers.length);
    const [memberKey, member] = unlockedMembers[randomIndex];

    gameState.events.activeEffects.memberDisabled = memberKey;

    const messageText = event.messageText.replace('{memberName}', member.name);
    showMessage(
        event.messageTitle,
        `${messageText}<br><em>${member.name}'s bonuses won't apply this book.</em>`,
        'event-negative'
    );
}

// Camera Off Energy - reduce click power for this book
function executeCameraOffEnergy(event) {
    gameState.events.activeEffects.clickPowerMultiplier = event.effectValue;

    showMessage(
        event.messageTitle,
        `${event.messageText}<br><em>-25% click power for this discussion.</em>`,
        'event-negative'
    );
}

// The Perfect Take - instant 50% of remaining progress
function executePerfectTake(event) {
    const discussionRequired = getDiscussionRequired();
    const remaining = discussionRequired - gameState.currentDiscussionProgress;
    const bonus = Math.floor(remaining * event.effectValue);

    gameState.currentDiscussionProgress += bonus;

    showMessage(
        event.messageTitle,
        `${event.messageText}<br><em>+${bonus} discussion progress!</em>`,
        'event-positive'
    );

    // Check for completion
    if (gameState.currentDiscussionProgress >= discussionRequired) {
        completeDiscussion();
    } else {
        updateDisplay();
    }
}

// Everyone Actually Read It - boost engagement
function executeEveryoneReadIt(event) {
    const oldEngagement = gameState.engagement;
    gameState.engagement = Math.min(gameState.engagement + event.effectValue, 3.0);
    const gained = gameState.engagement - oldEngagement;

    showMessage(
        event.messageTitle,
        `${event.messageText}<br><em>+${(gained * 100).toFixed(0)}% engagement!</em>`,
        'event-positive'
    );

    updateDisplay();
}

// Controversial Opinion - 50/50 engagement change
function executeControversialOpinion(event) {
    const isPositive = Math.random() < 0.5;
    let messageText = event.messageText;

    if (isPositive) {
        const bonus = event.effectValue;
        const oldEngagement = gameState.engagement;
        gameState.engagement = Math.min(gameState.engagement + bonus, 3.0);
        const gained = gameState.engagement - oldEngagement;

        messageText += `<br><em>It sparked great debate! +${(gained * 100).toFixed(0)}% engagement!</em>`;
        showMessage(event.messageTitle, messageText, 'event-chaotic-good');
    } else {
        const penalty = event.effectValue;
        gameState.engagement = Math.max(gameState.engagement - penalty, 1.0);

        messageText += `<br><em>It killed the vibe... -${(penalty * 100).toFixed(0)}% engagement.</em>`;
        showMessage(event.messageTitle, messageText, 'event-chaotic-bad');
    }

    updateDisplay();
}

// In-Person Meetup - 3x DP generation for this book
function executeInPersonMeetup(event) {
    gameState.events.activeEffects.dpMultiplier = event.effectValue;
    gameState.events.inPersonMeetupActive = true;

    const currentBook = getCurrentBook();
    let specialNote = '';

    if (currentBook.number === 100) {
        specialNote = '<br><em>Book #100! Alright, alright, alright...</em>';
    } else if (currentBook.number === 168) {
        specialNote = '<br><em>THE FINALE! 10 years of book club!</em>';
    }

    showMessage(
        event.messageTitle,
        `${event.messageText}<br><em>3x DP generation this book!</em>${specialNote}`,
        'event-special'
    );

    updateDisplay();
}

// GREEN LIGHT Boost - temporary 1.5x DP multiplier (Phase 12)
function executeGreenlightBoost(event) {
    const originalMultiplier = gameState.events.activeEffects.dpMultiplier;
    gameState.events.activeEffects.dpMultiplier *= event.effectValue;

    const quote = MCCONAUGHEY_QUOTES[Math.floor(Math.random() * MCCONAUGHEY_QUOTES.length)];

    showMessage(
        event.messageTitle,
        `${quote}<br><em>${event.effectValue}x DP for 30 seconds!</em>`,
        'greenlight'
    );

    // Revert after 30 seconds
    setTimeout(() => {
        gameState.events.activeEffects.dpMultiplier = originalMultiplier;
        showMessage('Green Light Fading...', 'Back to normal, but stay stoked!', 'normal');
    }, 30000);
}

// Reset events state for new book
function resetEventsForNewBook() {
    gameState.events.occurredThisBook = [];
    gameState.events.activeEffects = {
        discussionPaused: false,
        pauseEndTime: 0,
        memberDisabled: null,
        clickPowerMultiplier: 1.0,
        dpMultiplier: 1.0,
        tangentRefocusCost: 0
    };
    gameState.events.inPersonMeetupActive = false;
}

// ==================== END EVENTS SYSTEM ====================

// ==================== VICTORY SCREEN (Phase 12) ====================

function showVictoryScreen() {
    const stats = gameState.victoryStats;

    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
        <div class="victory-modal">
            <div class="victory-header">
                <div class="victory-sparkles">&#10022; &#10022; &#10022;</div>
                <h1>10 YEARS OF BOOK CLUB</h1>
                <div class="victory-subtitle">The Journey is Complete</div>
            </div>

            <div class="victory-stats">
                <div class="victory-stat">
                    <span class="victory-stat-value">${stats.totalBooks}</span>
                    <span class="victory-stat-label">Books Completed</span>
                </div>
                <div class="victory-stat">
                    <span class="victory-stat-value">${formatNumber(stats.totalWords)}</span>
                    <span class="victory-stat-label">Words Read</span>
                </div>
                <div class="victory-stat">
                    <span class="victory-stat-value">${formatNumber(stats.totalPages)}</span>
                    <span class="victory-stat-label">Pages Turned</span>
                </div>
                <div class="victory-stat">
                    <span class="victory-stat-value">${formatNumber(stats.discussionPoints)}</span>
                    <span class="victory-stat-label">Discussion Points</span>
                </div>
            </div>

            <div class="victory-journey">
                <h2>The Journey</h2>
                <div class="journey-milestones">
                    <div class="milestone">&#128214; Started with "The Lies of Locke Lamora"</div>
                    <div class="milestone">&#128101; Recruited James, Sydney, Tiffany & Winslow</div>
                    ${stats.badBookSurvived ? '<div class="milestone">&#128170; Survived "THE BAD BOOK"</div>' : ''}
                    ${stats.greenlightUnlocked ? '<div class="milestone">&#128994; Found the Green Lights</div>' : ''}
                    <div class="milestone">&#127942; Completed "Fight Right" - the finale</div>
                </div>
            </div>

            <div class="victory-message">
                <p><em>"168 books. Countless discussions. One amazing book club."</em></p>
                <p>Thank you for playing Book Club Clicker!</p>
            </div>

            <div class="victory-actions">
                <button class="victory-btn victory-btn-primary" onclick="closeVictoryScreen()">Continue</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => overlay.classList.add('show'), 10);
}

function closeVictoryScreen() {
    const overlay = document.querySelector('.victory-overlay');
    if (overlay) {
        overlay.classList.remove('show');
        setTimeout(() => overlay.remove(), 500);
    }
}

// ==================== END VICTORY SCREEN ====================

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

    // Don't complete a book that's already been completed (prevents infinite loop on last book)
    if (gameState.booksCompleted.includes(book.number)) {
        return;
    }

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
    gameState.currentBookPages = 0;
    if (gameState.currentBookIndex < booksData.length - 1) {
        gameState.currentBookIndex++;
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
            // Transition to Stage 2
            gameState.stage = 2;
            gameState.bookPhase = 'reading';
            setTimeout(() => {
                showMessage('STAGE 2 BEGINS!', 'The Discussion Era<br><em>Your members now auto-read. Click to facilitate discussions!</em>', 'transition');
            }, 500);
            break;

        case 'the_bad_book':
            // Phase 12: Book 62 - Black Leopard, Red Wolf
            gameState.badBookSurvived = true;
            showMessage(
                'WE SURVIVED "THE BAD BOOK"',
                `"${book.title}" is finally over.<br><em>Achievement unlocked!</em>`,
                'event-special'
            );
            // Reward for surviving
            gameState.engagement = Math.min(gameState.engagement + 0.5, 3.0);
            gameState.discussionPoints += 500;
            setTimeout(() => {
                showMessage(
                    'Achievement: "We Finished It Anyway"',
                    '+50% engagement, +500 DP<br><em>For surviving the most controversial book.</em>',
                    'special'
                );
            }, 2000);
            break;

        case 'greenlights':
            // Phase 12: Book 100 - Greenlights
            gameState.greenlightUnlocked = true;
            showMessage(
                'GREEN LIGHTS UNLOCKED!',
                `"${book.title}" by Matthew McConaughey<br><em>"Alright, alright, alright..."</em>`,
                'event-special'
            );
            setTimeout(() => {
                showMessage(
                    'GREEN LIGHT Events Active',
                    'Positive McConaughey-inspired events will now appear!',
                    'greenlight'
                );
            }, 2500);
            break;

        case 'finale':
            // Phase 12: Book 168 - Victory screen
            gameState.gameComplete = true;
            gameState.victoryStats = {
                totalBooks: gameState.booksCompleted.length,
                totalWords: gameState.totalWords,
                totalPages: gameState.totalPages,
                discussionPoints: gameState.discussionPoints,
                badBookSurvived: gameState.badBookSurvived,
                greenlightUnlocked: gameState.greenlightUnlocked
            };
            setTimeout(() => showVictoryScreen(), 1000);
            saveGame();
            break;
    }
}

// Handle read button click
function handleReadClick() {
    // Check if all books are done
    if (isAllBooksComplete()) {
        updateDisplay();
        return;
    }

    // Stage 2 Discussion Phase - Generate DP and progress
    if (isDiscussionPhase()) {
        // Check if discussion is paused (Technical Difficulties)
        if (gameState.events.activeEffects.discussionPaused) {
            showMessage('Connection Issues', 'Wait for the connection to restore...', 'normal');
            return;
        }

        // Handle Tangent refocus cost
        if (gameState.events.activeEffects.tangentRefocusCost > 0) {
            const cost = gameState.events.activeEffects.tangentRefocusCost;
            if (gameState.discussionPoints >= cost) {
                gameState.discussionPoints -= cost;
                gameState.events.activeEffects.tangentRefocusCost = 0;
                showMessage('Refocused!', `The discussion is back on track. (-${cost} DP)`, 'normal');
                updateDisplay();
            } else {
                showMessage('Not Enough DP', `You need ${cost} DP to refocus the tangent.`, 'normal');
            }
            return;
        }

        // Track clicks for engagement quality
        gameState.discussionClickCount++;

        // Calculate DP gained
        let dpMultiplier = gameState.engagement;

        // Apply In-Person Meetup multiplier
        dpMultiplier *= gameState.events.activeEffects.dpMultiplier;

        // Apply Camera Off Energy reduction
        dpMultiplier *= gameState.events.activeEffects.clickPowerMultiplier;

        // James bonus: +10% DP efficiency (if not disabled by Schedule Conflict)
        if (gameState.members.james.unlocked && gameState.events.activeEffects.memberDisabled !== 'james') {
            dpMultiplier *= 1.1;
        }

        // Apply "didn't finish" penalty if active
        if (gameState.didntFinishPenalty > 0) {
            dpMultiplier *= 0.5;
            gameState.didntFinishPenalty--;
        }

        const dpGained = gameState.discussionPointsPerClick * dpMultiplier;
        gameState.discussionPoints += dpGained;

        // Add to discussion progress (basic "I have thoughts" contributes directly)
        gameState.currentDiscussionProgress += dpGained;

        // Check for discussion completion
        const discussionRequired = getDiscussionRequired();
        if (gameState.currentDiscussionProgress >= discussionRequired) {
            completeDiscussion();
        }

        updateDisplay();
        return;
    }

    // Stage 1 or Stage 2 Reading Phase - Generate words/pages
    gameState.totalWords += gameState.wordsPerClick;
    gameState.totalPages = calculatePages(gameState.totalWords);

    // Add pages to current book (with multiplier from Focused Reading)
    const pagesGained = (gameState.wordsPerClick / WORDS_PER_PAGE) * gameState.currentBookMultiplier;
    gameState.currentBookPages += pagesGained;

    // Check for book/phase completion
    const currentBook = getCurrentBook();
    if (gameState.currentBookPages >= currentBook.pages_required) {
        if (isStage2()) {
            // Stage 2: Transition to discussion phase
            transitionToDiscussionPhase();
        } else {
            // Stage 1: Complete the book
            completeBook();
        }
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

    // Update Stage 2 stats if visible
    if (elements.discussionPointsDisplay && isStage2()) {
        elements.discussionPointsDisplay.textContent = formatNumber(Math.floor(gameState.discussionPoints));
    }
    if (elements.engagementDisplay && isStage2()) {
        elements.engagementDisplay.textContent = gameState.engagement.toFixed(2);
    }

    // Update progress based on current phase
    if (isDiscussionPhase()) {
        const discussionRequired = getDiscussionRequired();
        const discussionProgress = Math.min((gameState.currentDiscussionProgress / discussionRequired) * 100, 100);
        if (elements.discussionProgressBar) {
            elements.discussionProgressBar.style.width = discussionProgress + '%';
        }
        if (elements.discussionProgressText) {
            elements.discussionProgressText.textContent = `${Math.floor(gameState.currentDiscussionProgress)}/${discussionRequired} discussion`;
        }
    } else {
        const progress = Math.min((gameState.currentBookPages / currentBook.pages_required) * 100, 100);
        elements.currentPages.textContent = Math.floor(Math.min(gameState.currentBookPages, currentBook.pages_required));
        elements.bookProgress.style.width = progress + '%';
    }
}

// Full display update - includes re-rendering members and upgrades
function updateDisplay() {
    const currentBook = getCurrentBook();
    const inStage2 = isStage2();
    const inDiscussion = isDiscussionPhase();

    // Update stage indicator
    if (elements.stageIndicator) {
        if (inStage2) {
            elements.stageIndicator.textContent = '[Stage 2: The Discussion Era]';
            elements.stageIndicator.classList.add('stage2');
        } else {
            elements.stageIndicator.textContent = '[Stage 1: The Reading Years]';
            elements.stageIndicator.classList.remove('stage2');
        }
    }

    // Update phase indicator (Stage 2 only)
    if (elements.phaseIndicator) {
        if (inStage2) {
            elements.phaseIndicator.style.display = 'inline-block';
            if (inDiscussion) {
                elements.phaseIndicator.textContent = 'Discussion Phase';
                elements.phaseIndicator.className = 'phase-indicator discussion';
            } else {
                elements.phaseIndicator.textContent = 'Reading Phase';
                elements.phaseIndicator.className = 'phase-indicator reading';
            }
        } else {
            elements.phaseIndicator.style.display = 'none';
        }
    }

    // Update button text
    if (inDiscussion) {
        elements.readButton.textContent = 'DISCUSS';
        elements.readButton.classList.add('discuss-mode');
    } else {
        elements.readButton.textContent = 'READ WORDS';
        elements.readButton.classList.remove('discuss-mode');
    }

    // Update current book section styling
    const currentBookSection = document.querySelector('.current-book');
    if (currentBookSection) {
        if (inDiscussion) {
            currentBookSection.classList.add('discussion-mode');
        } else {
            currentBookSection.classList.remove('discussion-mode');
        }
    }

    // Update book title
    elements.bookTitle.textContent = `Current Book: #${currentBook.number} - ${currentBook.title}`;

    // Update stats
    elements.totalWords.textContent = formatNumber(gameState.totalWords);
    elements.totalPages.textContent = formatNumber(gameState.totalPages);
    elements.booksCompleted.textContent = gameState.booksCompleted.length;

    // Update click stats
    elements.wordsPerClick.textContent = formatNumber(gameState.wordsPerClick);
    elements.pagesPerSecond.textContent = formatNumber(calculatePagesPerSecond());

    // Show/hide Stage 2 stats
    if (elements.dpStat) {
        elements.dpStat.style.display = inStage2 ? 'block' : 'none';
    }
    if (elements.engagementStat) {
        elements.engagementStat.style.display = inStage2 ? 'block' : 'none';
    }
    if (elements.discussionPointsDisplay) {
        elements.discussionPointsDisplay.textContent = formatNumber(Math.floor(gameState.discussionPoints));
    }
    if (elements.engagementDisplay) {
        elements.engagementDisplay.textContent = gameState.engagement.toFixed(2);
    }

    // Update progress bars based on phase
    if (inDiscussion) {
        // Show discussion progress, hide reading progress
        if (elements.readingProgressContainer) {
            elements.readingProgressContainer.style.display = 'none';
        }
        if (elements.discussionProgressContainer) {
            elements.discussionProgressContainer.style.display = 'block';
            const discussionRequired = getDiscussionRequired();
            const discussionProgress = Math.min((gameState.currentDiscussionProgress / discussionRequired) * 100, 100);
            elements.discussionProgressBar.style.width = discussionProgress + '%';
            elements.discussionProgressText.textContent = `${Math.floor(gameState.currentDiscussionProgress)}/${discussionRequired} discussion`;
        }
    } else {
        // Show reading progress, hide discussion progress
        if (elements.readingProgressContainer) {
            elements.readingProgressContainer.style.display = 'block';
            const progress = Math.min((gameState.currentBookPages / currentBook.pages_required) * 100, 100);
            elements.currentPages.textContent = Math.floor(Math.min(gameState.currentBookPages, currentBook.pages_required));
            elements.requiredPages.textContent = currentBook.pages_required;
            elements.bookProgress.style.width = progress + '%';
        }
        if (elements.discussionProgressContainer) {
            elements.discussionProgressContainer.style.display = 'none';
        }
    }

    // Show/hide moves section (Stage 2 Discussion Phase only)
    if (elements.movesSection) {
        if (inDiscussion) {
            elements.movesSection.style.display = 'block';
            renderMoves();
        } else {
            elements.movesSection.style.display = 'none';
        }
    }

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
    // Don't save if we're in the middle of resetting
    if (isResetting) {
        console.log('Save skipped (resetting)');
        return false;
    }
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
                bookPhase: gameState.bookPhase,
                discussionPoints: gameState.discussionPoints,
                discussionPointsPerClick: gameState.discussionPointsPerClick,
                currentDiscussionProgress: gameState.currentDiscussionProgress,
                engagement: gameState.engagement,
                discussionClickCount: gameState.discussionClickCount,
                usedRemindsMeThisBook: gameState.usedRemindsMeThisBook,
                didntFinishPenalty: gameState.didntFinishPenalty,
                lastDiscussionQuality: gameState.lastDiscussionQuality,
                careerExpertRuleUnlocked: gameState.careerExpertRuleUnlocked,
                greenlightUnlocked: gameState.greenlightUnlocked,
                badBookSurvived: gameState.badBookSurvived,
                gameComplete: gameState.gameComplete,
                victoryStats: gameState.victoryStats,
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

        // Save Stage 2 upgrade states
        saveData.gameState.stage2Upgrades = {};
        for (const [key, upgrade] of Object.entries(gameState.stage2Upgrades)) {
            saveData.gameState.stage2Upgrades[key] = {
                level: upgrade.level
            };
        }

        // Save events state (Phase 10)
        saveData.gameState.events = {
            occurredThisBook: gameState.events.occurredThisBook,
            lastOccurrence: gameState.events.lastOccurrence,
            activeEffects: {
                memberDisabled: gameState.events.activeEffects.memberDisabled,
                clickPowerMultiplier: gameState.events.activeEffects.clickPowerMultiplier,
                dpMultiplier: gameState.events.activeEffects.dpMultiplier
                // Don't save paused/tangent - temporary effects
            },
            inPersonMeetupActive: gameState.events.inPersonMeetupActive
        };

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
        console.log('Loading game, save exists:', !!saveString);
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
        gameState.bookPhase = saved.bookPhase || 'reading';
        gameState.discussionPoints = saved.discussionPoints || 0;
        gameState.discussionPointsPerClick = saved.discussionPointsPerClick || 1;
        gameState.currentDiscussionProgress = saved.currentDiscussionProgress || 0;
        gameState.engagement = saved.engagement || 1.0;
        gameState.discussionClickCount = saved.discussionClickCount || 0;
        gameState.usedRemindsMeThisBook = saved.usedRemindsMeThisBook || false;
        gameState.didntFinishPenalty = saved.didntFinishPenalty || 0;
        gameState.lastDiscussionQuality = saved.lastDiscussionQuality || 'good';
        gameState.careerExpertRuleUnlocked = saved.careerExpertRuleUnlocked || false;
        gameState.greenlightUnlocked = saved.greenlightUnlocked || false;
        gameState.badBookSurvived = saved.badBookSurvived || false;
        gameState.gameComplete = saved.gameComplete || false;
        gameState.victoryStats = saved.victoryStats || null;
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

        // Restore Stage 2 upgrade states
        if (saved.stage2Upgrades) {
            for (const [key, upgradeData] of Object.entries(saved.stage2Upgrades)) {
                if (gameState.stage2Upgrades[key]) {
                    gameState.stage2Upgrades[key].level = upgradeData.level || 0;
                }
            }
        }

        // Recompute discussionPointsPerClick from Discussion Guide level
        const guideLevel = gameState.stage2Upgrades.discussionGuide.level;
        if (guideLevel > 0) {
            gameState.discussionPointsPerClick = 1 + guideLevel;
        }

        // Restore events state (Phase 10)
        if (saved.events) {
            gameState.events.occurredThisBook = saved.events.occurredThisBook || [];
            gameState.events.lastOccurrence = saved.events.lastOccurrence || {};
            gameState.events.inPersonMeetupActive = saved.events.inPersonMeetupActive || false;

            if (saved.events.activeEffects) {
                gameState.events.activeEffects.memberDisabled = saved.events.activeEffects.memberDisabled || null;
                gameState.events.activeEffects.clickPowerMultiplier = saved.events.activeEffects.clickPowerMultiplier || 1.0;
                gameState.events.activeEffects.dpMultiplier = saved.events.activeEffects.dpMultiplier || 1.0;
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

    // Don't do anything if all books complete
    if (isAllBooksComplete()) {
        return;
    }

    // In Stage 2 Discussion Phase, members don't generate pages
    // (The book has been read, now we're discussing)
    if (isDiscussionPhase()) {
        // Check for random events
        checkForEvents();

        // If discussion is paused (Technical Difficulties), don't generate passive DP
        if (gameState.events.activeEffects.discussionPaused) {
            updateStatsDisplay();
            return;
        }

        // Group Chat upgrade: members generate passive DP
        if (gameState.stage2Upgrades.theGroupChat.level > 0) {
            // Count unlocked members, excluding disabled member from Schedule Conflict
            let unlockedMembers = Object.entries(gameState.members)
                .filter(([key, m]) => m.unlocked && key !== gameState.events.activeEffects.memberDisabled)
                .length;

            // Base: 0.1 DP per second, plus 0.1 per unlocked member, multiplied by engagement
            let dpRate = gameState.stage2Upgrades.theGroupChat.effect * (1 + unlockedMembers) * gameState.engagement;

            // Apply In-Person Meetup multiplier
            dpRate *= gameState.events.activeEffects.dpMultiplier;

            // James bonus: +10% DP efficiency (if not disabled)
            if (gameState.members.james.unlocked && gameState.events.activeEffects.memberDisabled !== 'james') {
                dpRate *= 1.1;
            }

            gameState.discussionPoints += dpRate * deltaTime;
            updateStatsDisplay();
        }
        return;
    }

    // Stage 1 or Stage 2 Reading Phase: Add passive pages from members and upgrades
    const pps = calculatePagesPerSecond();
    if (pps > 0) {
        const pagesGained = pps * deltaTime;
        gameState.totalWords += pagesGained * WORDS_PER_PAGE;
        gameState.totalPages = calculatePages(gameState.totalWords);

        // Apply current book multiplier from Focused Reading
        gameState.currentBookPages += pagesGained * gameState.currentBookMultiplier;

        // Check for book/phase completion
        const currentBook = getCurrentBook();
        if (gameState.currentBookPages >= currentBook.pages_required) {
            if (isStage2()) {
                // Stage 2: Transition to discussion phase
                transitionToDiscussionPhase();
            } else {
                // Stage 1: Complete the book
                completeBook();
            }
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
    const saveLoaded = loadGame();
    console.log('Save loaded?', saveLoaded, '| Current book index:', gameState.currentBookIndex, '| Books completed:', gameState.booksCompleted.length);

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
        // Stage 1 upgrades
        const stage1Row = e.target.closest('.upgrade-row.affordable:not(.stage2-upgrade)');
        if (stage1Row) {
            const upgradeKey = stage1Row.dataset.upgrade;
            purchaseUpgrade(upgradeKey);
            return;
        }

        // Stage 2 upgrades
        const stage2Row = e.target.closest('.upgrade-row.stage2-upgrade.affordable');
        if (stage2Row) {
            const upgradeKey = stage2Row.dataset.stage2Upgrade;
            purchaseStage2Upgrade(upgradeKey);
        }
    });

    // Set up event delegation for moves container
    elements.movesContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.move-btn:not(.disabled):not(.used)');
        if (btn) {
            const moveKey = btn.dataset.move;
            executeMove(moveKey);
        }
    });

    // Set up event delegation for book selector list
    elements.bookSelectorList.addEventListener('click', (e) => {
        const option = e.target.closest('.book-option');
        if (option) {
            const bookNum = parseInt(option.dataset.book, 10);
            executeRemindsMe(bookNum);
        }
    });

    // Set up cancel button for book selector modal
    document.getElementById('book-selector-cancel')?.addEventListener('click', hideBookSelector);

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
    gameLoopInterval = setInterval(gameLoop, 100);

    // Start auto-save (every 10 seconds)
    autoSaveInterval = setInterval(saveGame, AUTO_SAVE_INTERVAL);

    // Initial display update
    updateDisplay();

    // Dev tools
    document.getElementById('reset-game')?.addEventListener('click', resetGame);

    console.log('Book Club Clicker initialized!');
}

// Reset game (dev tool)
function resetGame() {
    if (confirm('Are you sure you want to reset ALL progress? This cannot be undone.')) {
        console.log('Resetting game...');
        // Set flag to prevent any saves during reset
        isResetting = true;
        // Stop all intervals to prevent auto-save race condition
        clearInterval(gameLoopInterval);
        clearInterval(autoSaveInterval);
        console.log('Intervals cleared');
        localStorage.removeItem(SAVE_KEY);
        // Verify it was actually removed
        const stillExists = localStorage.getItem(SAVE_KEY);
        console.log('After removeItem, save still exists:', !!stillExists);
        if (stillExists) {
            alert('WARNING: localStorage.removeItem failed! Save still exists.');
        }
        console.log('Reloading...');
        location.reload();
    }
}

// ============================================
// DEV TOOLS FOR TESTING (remove before release)
// ============================================

// List all available event IDs
window.listEvents = function() {
    console.log('Available events:');
    Object.keys(DISCUSSION_EVENTS).forEach(id => {
        const event = DISCUSSION_EVENTS[id];
        console.log(`  ${id} (${event.type}) - ${event.name}`);
    });
    console.log('\nUsage: triggerEvent("eventId")');
    console.log('Other commands: goToDiscussion(), skipToBook(num), giveDP(amount)');
};

// Manually trigger an event
window.triggerEvent = function(eventId) {
    if (!DISCUSSION_EVENTS[eventId]) {
        console.error(`Unknown event: ${eventId}`);
        console.log('Use listEvents() to see available events');
        return;
    }

    if (!isDiscussionPhase()) {
        console.warn('Not in discussion phase. Use goToDiscussion() first.');
        return;
    }

    console.log(`Triggering event: ${eventId}`);
    executeEvent(eventId);
};

// Skip to discussion phase
window.goToDiscussion = function() {
    if (gameState.currentStage !== 2) {
        console.error('Must be in Stage 2. Use skipToBook(26) first.');
        return;
    }

    // Complete reading phase instantly
    const book = getCurrentBook();
    if (book) {
        gameState.currentPages = book.pages;
        gameState.isDiscussionPhase = true;
        gameState.currentDiscussionProgress = 0;
        updateDisplay();
        console.log('Now in discussion phase for:', book.title);
    }
};

// Skip to a specific book number
window.skipToBook = function(bookNum) {
    if (bookNum < 1 || bookNum > 168) {
        console.error('Book number must be 1-168');
        return;
    }

    gameState.currentBookIndex = bookNum - 1;
    gameState.currentPages = 0;
    gameState.currentDiscussionProgress = 0;
    gameState.isDiscussionPhase = false;

    // Reset events for new book
    resetEventsForNewBook();

    // Switch stages if needed
    if (bookNum >= 26 && gameState.currentStage === 1) {
        gameState.currentStage = 2;
        console.log('Switched to Stage 2');
    }

    updateDisplay();
    saveGame();
    console.log(`Skipped to book #${bookNum}: ${getCurrentBook()?.title}`);
};

// Give discussion points
window.giveDP = function(amount = 1000) {
    gameState.discussionPoints += amount;
    updateDisplay();
    saveGame();
    console.log(`Added ${amount} DP. Total: ${gameState.discussionPoints}`);
};

// Show current event state
window.eventState = function() {
    console.log('Current event state:', JSON.stringify(gameState.events, null, 2));
};

// Clear all active event effects
window.clearEventEffects = function() {
    gameState.events.activeEffects = {
        discussionPaused: false,
        pauseEndTime: 0,
        memberDisabled: null,
        clickPowerMultiplier: 1.0,
        dpMultiplier: 1.0,
        tangentRefocusCost: 0
    };
    gameState.events.inPersonMeetupActive = false;
    updateDisplay();
    console.log('Event effects cleared');
};

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
