# Portfolio Site Overhaul — Chat Log April 6-7, 2026
**Project:** Hayden Howell 3D Portfolio Website + Demo Projects
**Live URL:** https://hayden-howell-portfolio.web.app
**GitHub:** https://github.com/hhowell116

---

## What Was Done This Session

### Phase 0: Prerequisites
- Initialized git repo for portfolio site
- Authenticated gh CLI
- Created initial commit of all files

### Phase 1: Portfolio Site UI Changes

#### 1A. Project Card Modal (NEW)
- Created `src/components/ProjectModal.jsx` — click any project card to open a detailed popup
- Modal includes: YouTube video placeholder, project image, in-depth description, full tech stack as pills/badges, Source Code + Live Demo buttons
- Uses Framer Motion AnimatePresence for animations
- Uses `createPortal` to render on `document.body` (required because SectionWrapper applies `relative z-0` which clips z-50)
- **Bug fix:** `react-tilt` library does NOT forward onClick — wrapped Tilt in a `<div onClick>` wrapper to capture clicks

#### 1B. Overview/About Section Rewrite
- Shortened from a long paragraph to 3 concise sentences
- Removed all dashes (AI indicator)
- Removed all AI tool mentions (Claude, Paperclip, prompt engineering)
- New text: "IT Specialist and Computer Science graduate from Texas A&M University-Texarkana. I build data-driven web applications and manage IT infrastructure, from real-time production dashboards to enterprise system migrations. Focused on full-stack development, data visualization, and turning operational data into business insights."

#### 1C. Tools & Platforms Section (NEW)
- Created `src/components/Tools.jsx` — standalone section placed above Contact
- 6 categories: AI & Automation, Cloud & Backend, APIs & Integrations, Enterprise IT, Data & Visualization, DevOps & Workflow
- Includes Claude Code CLI, Paperclip, Firebase, ShipStation, Shopify, M365, Active Directory, Intune, DEACOM ERP, Chart.js, jsvectormap, etc.

#### 1D. RCO Metrics Dashboard — Updated Project Info
- Read chat logs from RCO Metrics project (chat_log_mar26_27.txt, chat_log_apr3.txt)
- Updated card description, detailed description, and tech stack to reflect full Shopify API + Cloudflare Worker architecture
- Tags changed from javascript/chart.js/firebase-auth to shopify-api/cloudflare-workers/firebase
- Tech stack now includes: Shopify REST API, Cloudflare Workers, Cloudflare KV, Cron Triggers, Firebase Realtime Database, RBAC, Cursor-Based Pagination, Response Caching, Python backfill scripts

### Phase 2: GitHub Repository Setup

#### Repos Created
- `hhowell116/3D-Portfolio-Site` — portfolio site backup (pushed)
- `hhowell116/Demo-RCO-Metrics-Dashboard` — static demo
- `hhowell116/Demo-RCO-Help-Site` — static demo
- `hhowell116/Demo-HR-Admin-Control-Panel` — static demo
- `hhowell116/Mileage-Tracker` — new demo project (renamed from Live-Mileage-Tracker)

#### Repos Archived
- `hhowell116/RCO-Metrics-OLD`
- `hhowell116/Orders-Overview`
- `hhowell116/fulfillment-kpi`

#### Repo Renames
- `Live-RCO-Metrics-Dashboard` → `Demo-RCO-Metrics-Dashboard`
- `Live-RCO-Help-Site` → `Demo-RCO-Help-Site`
- `Live-HR-Admin-Control-Panel` → `Demo-HR-Admin-Control-Panel`
- `Live-Mileage-Tracker` → `Mileage-Tracker`

#### READMEs Updated
- `3D-Portfolio-Site` — new README with tech stack and setup
- `shipstation-dashboard` — expanded from 2 lines to full description
- `Demo-RCO-Metrics-Dashboard` — comprehensive README with Cloudflare/Shopify architecture, all 14 dashboards, RBAC docs
- `RCO-Metrics` (production repo) — reverted back to original after accidental update

### Phase 3: Static Demo Copies (GitHub Pages)

#### Demo-RCO-Metrics-Dashboard
- Stripped Firebase Authentication (auth-check.js stubbed, login.html removed)
- Replaced all Google Sheets API calls with static sample data
- Replaced Cloudflare Worker API calls with static data
- Added "IT Admin View — Demo Mode — Fake Data" topbar with user info
- Added green Admin Panel button (matching production styling)
- Admin panel with: Current Session, Recent Site Access (test emails), Currently Accessing, Role Permissions matrix with toggle switches, User Directory, Site Overview modal
- All real employee emails replaced with test@rowecasaorganics.com format
- KPI data generated for full years 2024, 2025, 2026 with:
  - Varied monthly performance profiles (holiday dips, seasonal improvement)
  - Monday/Friday day-of-week effects
  - Proper remaining orders (rem4/rem7) so fill rates vary
  - Seeded random for reproducible data
- Fixed sidebar cutoff (changed height from 100vh to 100% to account for topbar)
- Fixed iframe bottom cutoff (app-shell height calc)
- Cache-bust query strings on script tags

#### Demo-RCO-Help-Site
- Stripped Firebase Auth + Firestore writes
- Mock user object (skip login)
- Form submissions show "Demo: submission would be saved" toast
- Populated "My Completed" tab with sample submissions
- Demo Mode banner on all pages
- Pushed and deployed to GitHub Pages

#### Demo-HR-Admin-Control-Panel
- Replaced Firebase Auth with mock auth (fake HR-admin user)
- Replaced all Firestore reads/writes with local JSON fixtures and in-memory state
- All 10 pages rewritten to remove Firebase imports
- Demo Mode banner added
- Vite config set with `/Demo-HR-Admin-Control-Panel/` base path
- BrowserRouter basename set for GitHub Pages
- GitHub Actions workflow for build + deploy
- Added 404.html SPA redirect for GitHub Pages (fixes refresh 404 issue)
- **All real employee data scrubbed:**
  - 327 real names → fake names
  - 76 real emails → @demo.com / @example.com
  - 10 rockstar employees → fake names
  - "Rowe Casa Organics" → "Acme Co" in UI
  - BambooHR photo URLs nulled
  - Phone numbers randomized

#### Mileage Tracker (NEW — Built from Scratch)
- React 18 + Vite + Tailwind CSS
- Dark theme with #915EFF purple accents
- Interactive SVG map with Texas outline and 4 RCO facility pins (Waco, Temple, Dallas, Austin)
- Animated pulse rings on selected locations and route lines during trips
- Start/End trip controls with location dropdowns
- Hardcoded distance matrix between facilities
- Trip history table with 4 pre-populated sample trips + localStorage persistence
- Send Report button → mock email preview modal
- "Demo Mode" banner
- GitHub Actions workflow for Pages deployment
- Vite base path set to `/Mileage-Tracker/`

### Phase 4: Deployment
- Portfolio site built with Vite and deployed to Firebase Hosting multiple times
- All demo sites deployed to GitHub Pages
- All changes committed and pushed to respective GitHub repos

---

## Key Bug Fixes

1. **Project modal not opening** — `react-tilt` library's render() only forwards className, style, onMouseEnter/Move/Leave — does NOT forward onClick. Fixed by wrapping `<Tilt>` in a `<div onClick>`.

2. **Modal clipped by section wrapper** — SectionWrapper HOC applies `relative z-0`, clipping the modal's z-50. Fixed with `createPortal(modal, document.body)`.

3. **KPI fill rates showing 0%** — data.js generated fields named `fill_rate_4day`/`fill_rate_7day` but fulfillment.js reads `rate4`/`rate7`/`rem4`/`rem7`. Fixed by outputting both field name formats.

4. **Sidebar bottom cutoff on demo site** — Sidebar had `height: 100vh` but the topbar pushes content down. Changed to `height: 100%` to fit within the app-shell container.

5. **HR Admin 404 on refresh** — GitHub Pages doesn't support SPA client-side routing. Added 404.html redirect script that preserves the path and redirects to index.html.

6. **Browser caching old JS** — Added `?v=3` cache-bust query strings to script tags in fulfillment.html.

---

## Live URLs

| Project | URL |
|---------|-----|
| Portfolio Site | https://hayden-howell-portfolio.web.app |
| Demo RCO Metrics | https://hhowell116.github.io/Demo-RCO-Metrics-Dashboard/ |
| Demo RCO Help Site | https://hhowell116.github.io/Demo-RCO-Help-Site/ |
| Demo HR Admin | https://hhowell116.github.io/Demo-HR-Admin-Control-Panel/ |
| Mileage Tracker | https://hhowell116.github.io/Mileage-Tracker/ |

---

## Still TODO / Next Session

- [ ] Replace placeholder project card images with actual screenshots
- [ ] Add YouTube video URLs to project modals when recordings are made
- [ ] Add custom company logos for experience timeline icons (currently using template logos)
- [ ] Delete `Live-Mileage-Tracker` repo (needs `delete_repo` scope — run `gh auth refresh -h github.com -s delete_repo`)
- [ ] Set up contact form — FormSubmit.co may need re-confirmation at hhowell403@gmail.com
- [ ] Consider adding a downloadable resume button
- [ ] Firebase migration to personal account when ready
- [ ] Custom domain (optional)

---

## File Structure Changes

```
portfoliosite/
├── src/
│   ├── components/
│   │   ├── ProjectModal.jsx    ← NEW (modal popup for project details)
│   │   ├── Tools.jsx           ← NEW (tools & platforms section)
│   │   ├── Works.jsx           ← MODIFIED (click handler, modal integration)
│   │   ├── About.jsx           ← MODIFIED (shortened overview)
│   │   ├── Tech.jsx            ← MODIFIED (reverted to just 3D balls)
│   │   ├── index.js            ← MODIFIED (added Tools export)
│   │   └── ...
│   ├── constants/
│   │   └── index.js            ← MODIFIED (extended project data, added tools array, updated URLs)
│   └── App.jsx                 ← MODIFIED (added Tools section)
├── README.md                   ← NEW
├── CHATLOG.md                  ← original chat log
├── CHATLOG_APR6_7.md           ← THIS FILE
└── copy of projects/           ← source for demo copies
```

## Tech Notes

- ThreatLocker on managed Rowe Casa device blocks esbuild.exe — use `npm install --legacy-peer-deps --ignore-scripts`
- esbuild-wasm installed as fallback
- Firebase project: `hayden-howell-portfolio`
- FormSubmit.co endpoint: `https://formsubmit.co/ajax/hhowell403@gmail.com`
- GitHub Pages SPA fix: 404.html redirect pattern needed for React Router apps
