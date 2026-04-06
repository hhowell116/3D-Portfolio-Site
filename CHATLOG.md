# Portfolio Site Build — Chat Log
**Date:** April 6, 2026
**Project:** Hayden Howell 3D Portfolio Website
**Live URL:** https://hayden-howell-portfolio.web.app
**Firebase Project:** hayden-howell-portfolio

---

## What Was Built

A 3D interactive portfolio website modeled after [adrianhajdin/project_3D_developer_portfolio](https://github.com/adrianhajdin/project_3D_developer_portfolio), fully customized with Hayden's info, deployed to Firebase Hosting.

### Tech Stack
- React 18.2 + Vite 5
- Three.js / React Three Fiber / Drei (3D elements)
- Framer Motion (animations)
- Tailwind CSS 3 (styling)
- FormSubmit.co (contact form emails → hhowell403@gmail.com)
- Firebase Hosting (deployment)

### Key Note: esbuild / ThreatLocker
ThreatLocker on this managed Rowe Casa device blocks `esbuild.exe` from executing. We installed `esbuild-wasm` as a fallback and used `--ignore-scripts` during npm install. Once ThreatLocker approved esbuild, builds worked fine. If npm install fails in the future, use:
```
npm install --legacy-peer-deps --ignore-scripts
```

---

## Site Sections (in order)

1. **Navbar** — Fixed top nav, "Hayden | Howell" branding, mobile hamburger menu
2. **Hero** — "Hi, I'm Hayden" with 3D rotating computer model, animated scroll indicator
3. **About** — Bio mentioning IT, web dev, AI (Claude Code CLI, Paperclip, prompt engineering), data viz, ETL
4. **Tech** — 3D floating balls: HTML, CSS, JS, TS, React, Tailwind, Node, MongoDB, Three.js, Git, Figma, Docker
5. **Projects** — 7 project cards (see below)
6. **Experience** — Vertical timeline, newest first (RCO → MiHIN x2 → Better Homes & Gardens)
7. **Contact** — Form sends email via FormSubmit.co to hhowell403@gmail.com, green "Message sent!" confirmation
8. **Stars** — Animated pink star field background behind contact section

### Testimonials — REMOVED (was placeholder data)

---

## Projects Displayed (current)

| # | Name | Source | Tech Tags |
|---|------|--------|-----------|
| 1 | RCO Metrics Dashboard | github.com/hhowell116/RCO-Metrics | javascript, chart.js, firebase-auth |
| 2 | IT Help Portal | github.com/hhowell116/IT-Help-Site | javascript, firebase, google-apps-script |
| 3 | ShipStation Leaderboard | github.com/hhowell116/shipstation-dashboard | html, css-grid, google-sheets |
| 4 | CMYK Color Analyzer | github.com/hhowell116/CMYK-color-analyzer | react, chart.js, canvas-api |
| 5 | HR Admin Control Panel | rco-hr-admin.web.app | javascript, firebase, firestore |
| 6 | Mileage Tracker | github.com/hhowell116/Mileage-Tracker | python, flask, react |
| 7 | 3D Portfolio Site | github.com/hhowell116 | react, three.js, framer-motion |

### Other GitHub repos NOT currently on the site:
- RCO-Rockstars (employee recognition slideshow)
- Orders-Overview (deprecated, merged into RCO-Metrics)
- SO-Email-Survey (support ticket satisfaction survey)
- Expense-Tracker (personal finance app)
- RCO-Metrics-OLD (deprecated)
- Deacom-Connectivity-Test (ERP diagnostic tool)
- fulfillment-kpi (deprecated, merged into RCO-Metrics)
- calendar-task-manager (Electron desktop app)

---

## Work Experience (as shown on site)

1. **IT Specialist** — Rowe Casa Organics (Aug 2025 – Present)
   - DEACOM ERP rollout
   - Intune-configured scanners
   - HTML/JS dashboards (ShipStation + Shopify APIs)
   - Day-to-day IT ops, RMM, MDM, physical security
   - **Completed** Google Workspace → Microsoft 365 migration w/ Active Directory
   - Claude Code CLI for AI-assisted development
   - Paperclip multi-agent AI workflows (research, dev, QA, docs agents)

2. **Data Entry Specialist** — MiHIN (Jan 2024 – Feb 2025)
3. **Customer Engagement Team** — MiHIN (Jan 2023 – Jan 2024)
4. **Graphic Design Marketing Intern** — Better Homes and Gardens Real Estate (Jun 2021 – Dec 2022)

---

## Services Cards (About section)
1. IT Solutions & Infrastructure
2. Web Development
3. AI & Multi-Agent Systems
4. Data Analytics & Dashboards

---

## Resume

- **HTML source:** `resume.html` (in project root)
- **PDF output:** `Hayden_Howell_Resume.pdf` (in project root)
- Generated using Edge headless: `msedge.exe --headless --print-to-pdf`
- Matches website content: AI skills, updated projects, M365 done, Claude/Paperclip bullets
- Skills categories: Languages, Frameworks & Libraries, Platforms & Tools, AI & Automation, IT & Infrastructure, Data & APIs

---

## Contact Form Setup

Using **FormSubmit.co** (free, no account needed):
- POST to `https://formsubmit.co/ajax/hhowell403@gmail.com`
- First submission triggers a confirmation email from FormSubmit — must click to activate
- After activation, all form submissions deliver to hhowell403@gmail.com
- Green "Message sent successfully!" popup appears for 5 seconds after send

---

## Deployment

```bash
cd "C:/Users/hayden.howell_roweca/Documents/Claude Projects/portfoliosite"
npx vite build
npx firebase deploy --only hosting
```

Firebase project: `hayden-howell-portfolio`
Hosting URL: https://hayden-howell-portfolio.web.app

---

## Still TODO / Future Ideas

- [ ] Replace placeholder project card images with actual screenshots
- [ ] Add custom company logos for experience timeline icons (currently using reference repo's logos: starbucks, meta, shopify)
- [ ] Set up EmailJS if FormSubmit.co doesn't work well (needs account + env vars)
- [ ] Update LinkedIn manually (M365 done, AI bullets)
- [ ] Consider adding a downloadable resume button on the site
- [ ] Custom domain (optional)
- [ ] Push code to GitHub repo

---

## AI Research Done This Session

### Solstice Studio AI (solstice-agent / "Sol")
- Open-source local-first AI agent, 72 tools, Python-based
- Single agent with DAG workflow orchestration
- v0.1.0, very early, 3 GitHub stars
- Multi-agent is more "workflow engine" than "team of agents"

### Paperclip (Multi-Agent Company Framework)
- npm-based orchestration for teams of specialized Claude-powered agents
- CEO agent delegates to researcher, marketer, designer agents
- YAML configs, file-based inter-agent communication
- Claude Code is the execution layer
- Better fit for Hayden's use case (business workflows, content pipelines)

### Comparison
- Sol = one agent, many tools (Swiss Army knife)
- Paperclip = team of agents with distinct roles (org chart)
- Recommendation: Paperclip for scaling work, Claude Code CLI for day-to-day

---

## File Structure

```
portfoliosite/
├── public/
│   ├── logo.svg (HH initials)
│   ├── desktop_pc/ (3D computer model - GLTF)
│   └── planet/ (3D earth model - GLTF)
├── src/
│   ├── assets/ (images, icons, tech logos, company logos)
│   ├── components/
│   │   ├── Navbar.jsx, Hero.jsx, About.jsx
│   │   ├── Experience.jsx, Tech.jsx, Works.jsx
│   │   ├── Contact.jsx, Loader.jsx
│   │   ├── Feedbacks.jsx (exists but unused — testimonials removed)
│   │   ├── index.js
│   │   └── canvas/ (Computers.jsx, Ball.jsx, Earth.jsx, Stars.jsx)
│   ├── constants/index.js (ALL DATA — experiences, projects, services, technologies)
│   ├── hoc/SectionWrapper.jsx (scroll animation wrapper)
│   ├── utils/motion.js (Framer Motion presets)
│   ├── styles.js (Tailwind class exports)
│   ├── index.css (Tailwind + custom gradients + loader animation)
│   ├── App.jsx (main layout)
│   └── main.jsx (React entry point)
├── resume.html (resume source)
├── Hayden_Howell_Resume.pdf (generated PDF)
├── firebase.json (hosting config)
├── .firebaserc (project: hayden-howell-portfolio)
├── package.json
├── vite.config.js
├── tailwind.config.cjs
├── postcss.config.cjs
└── CHATLOG.md (this file)
```
