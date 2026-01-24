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
- `books.json` - All 168 books with metadata
- `CLAUDE.md` - This file

## Game Mechanics

- **Stage 1 (Books 1-25):** Click to read words. 250 words = 1 page. Complete books to progress.
- **Stage 2 (Books 26-168):** Click for Discussion Points. Members auto-generate pages.

## Core Constants

- `WORDS_PER_PAGE = 250`
- Game loop runs at 10 FPS (100ms interval)
- Auto-save every 10 seconds
- Offline progress capped at 24 hours

## Member Unlock Order

1. James - Book 5 (0.3 p/s base, 2x boost to all other members)
2. Sydney - Book 10 (0.5 p/s base, 2x on Knowledge books)
3. Tiffany - Book 15 (0.3 p/s base, 2x on Fiction/Thriller)
4. Winslow - Book 20 (0.4 p/s base, 1.5x on ALL books)

## Special Books

- Book 7: Thinking, Fast and Slow - "SO GOOD YOU READ IT TWICE!"
- Book 14: Hamilton - "BOOK CLUB GOES VIRAL!"
- Book 25: Blink - Unlocks Career Expert Rule
- Book 62: Black Leopard, Red Wolf - "THE BAD BOOK"
- Book 100: Greenlights - Unlocks GREEN LIGHT random events
- Book 168: Fight Right - Victory screen

## Implementation Status

- [x] Phase 1: Foundation (HTML, CSS, JS, click-to-read mechanics)
- [x] Phase 2: Book Progression (load books.json, book completion)
- [ ] Phase 3: Members & Passive Generation
- [ ] Phase 4: Upgrades System
- [ ] Phase 5: Save System
- [ ] Phase 6: Stage 2 Transition
- [ ] Phase 7: Special Events & Full Book Data
- [ ] Phase 8: Polish & Deploy

## Style Guidelines

- Cozy library aesthetic with warm parchment tones
- Book cover colors: leather brown, forest green, burgundy
- Gold accents for highlights and achievements
- Serif font (Libre Baskerville) for headings, sans-serif for body
- Satisfying button press feedback
