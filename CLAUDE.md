# Book Club Clicker

An incremental clicker game celebrating a 10-year book club's journey through 168 books. Inspired by Universal Paperclips.

## Tech Stack

- HTML5, CSS3, Vanilla JavaScript (no frameworks)
- localStorage for save persistence
- JSON for book data
- Hosted on GitHub Pages

## File Structure

- `index.html` - Game UI structure
- `style.css` - Cozy library aesthetic (Libre Baskerville + Source Sans 3 fonts)
- `game.js` - Game logic, state management, game loop
- `books.json` - Book data (164 books from real book club history)
- `CLAUDE.md` - This file

---

## Game Overview

### Stage 1: The Reading Phase (Books 1-25)
Click to read words. 250 words = 1 page. Complete books to unlock members who generate pages passively.

### Stage 2: The Discussion Phase (Books 26-168)
Members auto-read books. You click to generate Discussion Points and facilitate discussions. Complete discussions to progress.

---

## Stage 1 Mechanics

### Core Loop
Click → Words → Pages → Complete Book → Unlock Members → Members Generate Pages

### Constants
- `WORDS_PER_PAGE = 250`
- Game loop: 10 FPS (100ms interval)
- Auto-save: every 10 seconds
- No offline progress (game pauses when tab hidden)

### Member Unlock Order (Stage 1)
| Member | Unlocks | Base PPS | Specialty |
|--------|---------|----------|-----------|
| James | Book 5 | 0.3 p/s | 2x boost to all other members |
| Sydney | Book 10 | 0.5 p/s | 2x on Knowledge books |
| Tiffany | Book 15 | 0.3 p/s | 2x on Fiction/Thriller |
| Winslow | Book 20 | 0.4 p/s | 1.5x on ALL books |

### Stage 1 Upgrades
- Speed Reading: +10 words per click (cost scales 1.5x)
- Reading Habit: +1 passive page/second (cost scales 2x)
- Focused Reading: +10% book completion speed (cost scales 1.8x)

---

## Stage 2 Mechanics: The Discussion Meta-Game

### Core Concept
The shift: You're no longer *reading*—your members handle that. Your job is to *facilitate the discussion*.

### Resources
| Resource | Source | Purpose |
|----------|--------|---------|
| Pages | Members generate passively | Fills reading bar for current book |
| Discussion Points (DP) | Clicking during discussion phase | Spent on discussion moves |
| Engagement | Good discussions | Multiplier that builds over time |

### Book Completion Flow (Stage 2)
1. **Reading Phase**: Members auto-generate pages. Progress bar fills. Click to speed up.
2. **Discussion Phase**: Book "ready to discuss." Button changes to "DISCUSS," generates DP.
3. **Complete Discussion**: Spend DP on moves to hit discussion threshold.
4. **Next Book**: Engagement multiplier carries forward (resets if discussion bombs).

### Discussion Moves
| Move | Cost | Effect |
|------|------|--------|
| "I have thoughts" | Free | Basic click, steady DP generation |
| Hot Take | 50 DP | High risk/reward. 2x returns or -25% backfire |
| Deep Dive | 100 DP | Slow but guaranteed. Better for Knowledge books |
| "This reminds me of..." | 75 DP | Connect to previous book. Bonus scales with distance |
| Devil's Advocate | 60 DP | Sparks debate. Extends discussion, generates more DP |
| "I didn't finish it" | 0 DP | Shameful but honest. Reduced contribution |

### Member Roles in Stage 2
| Member | Personality | Reading Bonus | Discussion Role |
|--------|-------------|---------------|-----------------|
| James | Loves sci-fi & self-improvement | 2x boost to others | **Moderator**: Prevents tangents, +10% DP efficiency |
| Sydney | Loves literary fiction & beautiful prose | 2x on Knowledge | **Analyst**: Deep Dive -25% cost, finds hidden themes |
| Tiffany | Best book pitches & recommendations | 2x on Fiction/Thriller | **Enthusiast**: Hot Take +20% success rate |
| Winslow | Loves everything, always contributes | 1.5x on ALL | **Connector**: "This reminds me of..." bonus 2x |

### Engagement System
Engagement is a persistent multiplier between books:
- Good discussion (smooth completion): +5-10%
- Great discussion (callbacks, bonuses hit): +15-20%
- Bad discussion (events tanked it, too slow): Resets to 1x

Creates a "streak" mechanic—keep momentum or start over.

### Discussion Events (Random)

**Negative Events:**
- *"Technical Difficulties"* — Someone's on mute. Discussion paused briefly.
- *"The Tangent"* — Off-topic spiral. Costs 50 DP to refocus (James prevents this).
- *"Hot Take Gone Wrong"* — Spicy opinion landed badly. -20% engagement.
- *"Schedule Conflict"* — One member absent. Their bonuses don't apply.
- *"Camera Off Energy"* — Everyone's tired. -25% click power this book.

**Positive Events:**
- *"IN-PERSON MEETUP!"* — Rare (4 total). 3x DP generation. Special memory unlocked.
- *"The Perfect Take"* — Someone nails it. +50% discussion progress instant.
- *"Everyone Actually Read It"* — Rare miracle. +25% engagement.

**Chaotic Events:**
- *"Controversial Opinion"* — 50/50: +30% or -30% engagement.
- *"The Reread Suggestion"* — Accept for bonus, but delays progress.

**GREEN LIGHT Events (unlocked after Book 100):**
All GREEN LIGHT events use the format: title "GREEN LIGHT" + lowercase description of effect.
- *"GREEN LIGHT"* — good vibes boost — 1.5x DP for 30 seconds
- *"GREEN LIGHT"* — just keep livin' — +20% engagement
- *"GREEN LIGHT"* — be more stoked — +25% instant progress

### In-Person Meetup Schedule
4 meetups across Stage 2, spaced at milestone books:
- Book 50
- Book 100 (Greenlights)
- Book 140
- Book 168 (Finale)

### Book Controversy System
Each book has hidden Discussion Potential:
| Rating | Effect |
|--------|--------|
| Low ("it was fine") | Steady, slow. Need more clicks. Safe. |
| Medium | Normal progression. Balanced. |
| High | Volatile. Hot Takes more effective but riskier. |
| Maximum | Everyone has opinions. Tons of DP, chaos. |

### Stage 2 Upgrades (Cost DP, not pages)
| Upgrade | Effect | Base Cost | Max Level |
|---------|--------|-----------|-----------|
| Discussion Guide | +1 DP per click | 50 DP | Unlimited (2.5x scaling) |
| Better Wifi | Reduce "Technical Difficulties" chance | 200 DP | 1 |
| Book Club Historian | "This reminds me of..." works on ALL books | 300 DP | 1 |
| Hot Take Insurance | Hot Takes can never result in DP loss | 500 DP | 1 |
| The Group Chat | Members generate passive DP during discussions | 1000 DP | 1 |

---

## Special Books

### Stage 1
- **Book 7: Thinking, Fast and Slow** — "SO GOOD YOU READ IT TWICE!" (bonus pages)
- **Book 14: Hamilton** — "BOOK CLUB GOES VIRAL!" (engagement boost)
- **Book 25: Blink** — Unlocks Career Expert Rule. Transition to Stage 2.

### Stage 2
- **Book 62: Black Leopard, Red Wolf** — "THE BAD BOOK"
  - Pitched as "the Game of Thrones of Africa"
  - Reality: confusing, uncomfortable, hard to follow
  - Maximum controversy rating. Generates massive DP because no one can stop talking about how bad it was.
  - Achievement: "We Finished It Anyway"
- **Book 100: Greenlights** — Unlocks GREEN LIGHT events. All use format: "GREEN LIGHT" title + lowercase effect description. McConaughey quotes appear on the boost event.
- **Book 168: Fight Right** — FINALE. Ultimate discussion. All members at full power. Victory screen with 10-year stats.

### Easter Egg Books
- **George Washington: A Life** — "This one took FOREVER." Extended reading phase, but big payoff.
- Other long books may have similar "marathon read" mechanics.

---

## Implementation Status

### Completed (Stage 1)
- [x] Phase 1: Foundation (HTML, CSS, JS, click-to-read mechanics)
- [x] Phase 2: Book Progression (load books.json, book completion)
- [x] Phase 3: Members & Passive Generation
- [x] Phase 4: Upgrades System
- [x] Phase 5: Save System (localStorage, auto-save, reset button)
- [x] Phase 5.5: Stage 1 Complete state (stops book progress when all 25 books done)

### Stage 2 Implementation
- [x] **Phase 6: Stage 2 Core**
  - Stage detection (trigger after book 25 complete)
  - Reading phase vs Discussion phase split
  - Discussion Points (DP) resource and generation
  - UI updates: DP counter, phase indicator, button text changes ("READ" → "DISCUSS")
  - Add ~10 test books (26-35) to verify the loop works

- [x] **Phase 7: Discussion Mechanics**
  - Discussion moves UI (buttons/panel for Hot Take, Deep Dive, etc.)
  - Discussion move logic and DP costs
  - Discussion threshold per book (how much DP needed to complete)
  - Engagement multiplier system (streak mechanic)

- [x] **Phase 8: Member Stage 2 Roles** (implemented with Phase 7)
  - James: Moderator (prevents tangents, +10% DP efficiency)
  - Sydney: Analyst (Deep Dive -25% cost)
  - Tiffany: Enthusiast (Hot Take +20% success, base 40% → 60%)
  - Winslow: Connector ("This reminds me of..." bonus 2x)
  - Member bonuses apply during discussion phase

- [x] **Phase 9: Stage 2 Upgrades**
  - Stage 2 upgrades cost Discussion Points (DP)
  - Discussion Guide (+1 DP per click, repeatable)
  - Better Wifi (placeholder for Phase 10 events)
  - Book Club Historian ("This reminds me of..." works on ALL books)
  - Hot Take Insurance (Hot Takes can't result in DP loss)
  - The Group Chat (members generate passive DP during discussions)

- [x] **Phase 10: Events System**
  - Random event triggers during discussions (every 5 seconds check)
  - Event UI with styled messages (negative=red, positive=green, chaotic=purple, special=gold)
  - Negative events: Technical Difficulties (pauses 3s, Better Wifi reduces), The Tangent (50 DP cost, James prevents), Schedule Conflict (disables random member), Camera Off Energy (-25% click power)
  - Positive events: The Perfect Take (+50% remaining progress), Everyone Actually Read It (+25% engagement)
  - Chaotic events: Controversial Opinion (50/50 for +30% or -30% engagement, 2x on high controversy)
  - Special events: In-Person Meetup at books 50, 100, 140, 168 (3x DP generation)

- [x] **Phase 11: Full Book Data**
  - All 164 books from real book club CSV added to books.json
  - Controversy ratings assigned (low/medium/high/maximum)
  - Categories and special flags assigned
  - George Washington: A Life marked as marathon (book 78)
  - Book-specific flavor text and Easter eggs based on club history

- [x] **Phase 12: Special Books & Finale**
  - Book 62: Black Leopard, Red Wolf "THE BAD BOOK" special behavior
  - Book 100: Greenlights unlocks GREEN LIGHT events, McConaughey quotes
  - Book 168: Fight Right victory screen with 10-year stats
  - Achievement flags (badBookSurvived, greenlightUnlocked) tracked and shown in victory screen

- [ ] **Phase 13: Polish & Deploy**
  - Remove dev tools (reset button, console logging)
  - Balance pass (DP costs, thresholds, engagement scaling)
  - Mobile responsiveness check
  - Performance optimization
  - Deploy to GitHub Pages

---

## Dev Tools (remove before release)

- Reset button at bottom of page - wipes localStorage and restarts game
- Console logging for save/load debugging

---

## Style Guidelines

- Cozy library aesthetic with warm parchment tones
- Book cover colors: leather brown, forest green, burgundy
- Gold accents for highlights and achievements
- Serif font (Libre Baskerville) for headings, sans-serif for body
- Satisfying button press feedback
- Stage 2 UI: Discussion-themed. Chat bubbles? Different color scheme to mark the shift?

---

## Future: Stage 3 (Post-168, if desired)

**Book Club Empire** — Your club grows into a movement. Spend Influence to start satellite book clubs. Original 4 become "Founders." Could be added after full game is complete.
