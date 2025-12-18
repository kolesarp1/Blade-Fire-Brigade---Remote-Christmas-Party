# Remote Party Platform - Product Roadmap

## Vision
Transform the Blade Fire Brigade Christmas Party into a sellable product that other companies can use to create their own remote team celebration games.

---

## Phase 1: Promo Website & Sales

### Landing Page
- Demo video showing how fast you can build a party game
- Live demo with 2-connection trial limit
- Pricing: $10-$20 per party setup
- 1-week trial period, then changes paused until payment

### Trial Limitations
- Max 2 simultaneous connections
- Full editor access for 1 week
- After trial: read-only until purchased
- All progress saved, unlocked on payment

---

## Known Bugs (from first party)

- [ ] Arrow/cursor sync sometimes fails - saw arrow with empty name tag moving around
- [ ] Investigate cursor sync reliability under load

---

## Phase 2: Party Builder Framework

### Template System
- [ ] Select from pre-made layout templates (winter, summer, office, beach, etc.)
- [ ] Configure number of players (affects card count)
- [ ] Auto-calculate card grid based on player count
- [ ] AI prompt to generate funny/personalized cards

### AI Scene Generation
- [ ] "Generate First Iteration" button
- [ ] Internal AI connection (OpenAI/Claude API)
- [ ] Spawns initial scenes based on:
  - Company name
  - Team member names
  - Selected theme/template
- [ ] Randomized but coherent initial layout

### Visual Editor

#### Navigation & Coordinates
- [x] Show coordinates on hover (already built)
- [ ] Click any object to select it
- [ ] Click scene group to select entire scene
- [ ] Highlight selected object/scene

#### Object Manipulation
- [ ] Move selected object to new coordinates (input fields)
- [ ] Drag and drop objects freely
- [ ] Drag and drop entire scenes
- [ ] Resize objects (scale transform)
- [ ] Rotate objects
- [ ] Delete objects (with confirmation)
- [ ] Duplicate/copy-paste objects

#### History & Undo
- [ ] Undo (Ctrl+Z)
- [ ] Redo (Ctrl+Y / Ctrl+Shift+Z)
- [ ] History panel showing recent changes
- [ ] Revert to any point in history

#### Asset Panel
- [ ] Toggle panel (side drawer or modal overlay)
- [ ] Scrollable categorized asset list:
  - **Environment**: trees, bushes, rocks, snow, grass
  - **Buildings**: stands, stages, tents, booths
  - **Roads & Paths**: straight, curved, intersections
  - **People**: various sizes, poses, accessories
  - **Decorations**: lights, banners, signs, balloons
  - **Vehicles**: cars, trucks, sleighs
  - **Effects**: fire, sparkles, confetti
- [ ] Drag from panel → drop onto canvas
- [ ] Search/filter assets

#### Configurable Objects (People Builder)
- [ ] Name field
- [ ] Color picker (body/clothes)
- [ ] Accessories toggle:
  - Hat styles (cowboy, beanie, crown, etc.)
  - Eyebrow styles (normal, unibrow, thick)
  - Arm poses (down, flexing, waving)
  - Facial expressions
  - Props (signs, tools, instruments)
- [ ] "Spawn" button to place configured character
- [ ] "Randomize" button to shuffle values
- [ ] Save character presets for quick re-use
- [ ] Spawn multiple copies with slight variations

#### Copy & Clone
- [ ] Select object on canvas → Ctrl+C to copy
- [ ] Ctrl+V to paste at cursor position
- [ ] Alt+drag to duplicate in place
- [ ] Clone with randomization option

### Autosave
- [ ] Auto-save every 30 seconds
- [ ] Save to cloud (Firebase/Supabase)
- [ ] Version history (last 10 saves)
- [ ] Manual save button
- [ ] "Saved" indicator with timestamp

---

## Gameplay Features (Host Tools)

### Quick Card Reveal (Host Shortcut)
- [ ] Keyboard shortcut (e.g., `C` or `Space`) to toggle card overlay
- [ ] Overlay brings all cards to current screen position
- [ ] Click card to reveal, stays on screen
- [ ] Press shortcut again or click arrow to dismiss overlay
- [ ] Cards return to original board position
- [ ] No need to navigate to card board and back

### Scene Picker / Highlighter
- [ ] Click any object to check if it belongs to a scene
- [ ] If object is part of a scene, highlight entire scene with light border
- [ ] Border fades after 2-3 seconds
- [ ] Helps players understand which objects are:
  - Part of the current guessing scene
  - Random background props
  - Part of another scene
- [ ] Scene grouping defined in editor (link objects to card)

### Leaderboard & Scoring
- [ ] Scoreboard panel (toggle with shortcut or button)
- [ ] After each reveal, host selects winner(s) for closest guess
- [ ] Support split points (2+ people can share a point)
- [ ] Running score display during game
- [ ] "Announce Winner" button at end
- [ ] Winner celebration animation (confetti, spotlight, sound)
- [ ] Final leaderboard with rankings

---

## Logging & Analytics (Post-Game Insights)

### Session Logging
- [ ] Log all cursor movements (sampled, not every frame)
- [ ] Log card reveal timestamps
- [ ] Log user join/leave events
- [ ] Log connection issues and reconnects

### Post-Game Dashboard
- [ ] View session replay (optional)
- [ ] Heatmap of where cursors spent most time
- [ ] Timeline of card reveals
- [ ] Connection quality report per user
- [ ] Export session data for analysis

### Behavioral Insights
- [ ] Which scenes got the most attention?
- [ ] Average time to guess per card
- [ ] Engagement patterns (who was most active?)
- [ ] Use insights to improve future games

---

## Phase 3: Admin Dashboard

### User Management
- [ ] View all customers
- [ ] Customer communication (support tickets/chat)
- [ ] Account status (trial, paid, expired)

### Payment Management
- [ ] Stripe/PayPal integration
- [ ] View transactions
- [ ] Process refunds
- [ ] Subscription management (if recurring)
- [ ] Revenue reports

### Layout Storage
- [ ] View all customer layouts
- [ ] Storage usage per customer
- [ ] Backup/export layouts
- [ ] Delete abandoned layouts

### Analytics
- [ ] Active users (daily/weekly/monthly)
- [ ] Trial → paid conversion rate
- [ ] Popular templates
- [ ] Average session duration
- [ ] Feature usage heatmap

### Cost Evaluation
- [ ] Firebase usage tracking
- [ ] AI API costs (OpenAI/Claude calls)
- [ ] Storage costs
- [ ] Bandwidth monitoring
- [ ] Cost per customer calculation
- [ ] Profit margin dashboard

---

## Tech Stack Considerations

### Frontend
- Current: Vanilla HTML/CSS/JS (simple, fast)
- Consider: React/Vue for complex editor UI

### Backend
- Firebase Realtime DB (current, proven)
- Supabase (alternative with better SQL)
- Custom Node.js API for AI integration

### Payments
- Stripe (recommended)
- Paddle (handles VAT for SaaS)

### AI Integration
- OpenAI API for scene/card generation
- Claude API as alternative
- Budget: ~$0.01-0.05 per generation

### Hosting
- GitHub Pages (current, free for static)
- Vercel/Netlify (better for dynamic)
- Firebase Hosting (integrated)

---

## Pricing Strategy

### Launch Phase (First 10 customers)
- **Free Pro access** in exchange for testimonial + feedback

### Early Bird (Next 50 customers)
| Tier | Price | Features |
|------|-------|----------|
| Trial | Free | 3 connections, 2 weeks, full editor |
| Starter | **$5** | 15 players, 1 game, no AI generation |
| Pro | **$10** | 50 players, unlimited games, AI generation |

### Regular Pricing (After early bird)
| Tier | Price | Features |
|------|-------|----------|
| Trial | Free | 3 connections, 2 weeks, full editor |
| Starter | $9 | 15 players, 1 game, no AI generation |
| Pro | $19 | 50 players, unlimited games, AI generation |

---

## MVP Priorities (Recommended Order)

1. **Visual Editor** - Click to select, drag to move
2. **Undo/Redo** - Essential for editing
3. **Asset Panel** - Drag-drop new objects
4. **People Builder** - Configure & spawn characters
5. **Template System** - Starting layouts
6. **Autosave** - Don't lose work
7. **Trial/Payment** - Monetization
8. **Admin Dashboard** - Management
9. **AI Generation** - Nice to have, not essential

---

## Notes

- Keep it simple initially - the current hand-coded SVG approach works well
- The coordinate display feature is a good foundation for the editor
- Consider keyboard shortcuts early (delete, duplicate, undo)
- Mobile support is low priority (this is a desktop editing experience)
- Demo video should show: idea → finished party in under 1 minute

---

*Last updated: December 2024*
