# 3D Portfolio Site

Personal portfolio website built with React, Three.js, and Framer Motion featuring interactive 3D models, animated sections, and a working contact form.

**Live Site:** [hayden-howell-portfolio.web.app](https://hayden-howell-portfolio.web.app)

## Features

- Interactive 3D desktop computer model on hero section
- Floating 3D technology balls
- 3D Earth globe on contact page
- Smooth scroll animations with Framer Motion
- Project cards with detailed modal popups
- Tools & Platforms showcase
- Work experience timeline
- Contact form (FormSubmit.co)
- Fully responsive design

## Tech Stack

| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| Vite 5 | Build tool |
| Three.js / React Three Fiber / Drei | 3D graphics |
| Framer Motion | Animations |
| Tailwind CSS 3 | Styling |
| FormSubmit.co | Contact form email delivery |
| Firebase Hosting | Deployment |

## Setup

```bash
npm install --legacy-peer-deps
npx vite          # dev server
npx vite build    # production build
```

## Deploy

```bash
npx vite build
npx firebase deploy --only hosting
```
