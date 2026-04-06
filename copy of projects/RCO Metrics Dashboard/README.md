# RCO Metrics Dashboard

Internal operational dashboard for Rowe Casa Organics. Provides real-time visibility into fulfillment performance, shipping activity, order trends, and international order distribution — all in one place.

Access is restricted to `@rowecasaorganics.com` Google accounts via Firebase Authentication.

---

## Dashboards

### Fulfillment KPI

Tracks daily fulfillment performance using 4-day and 7-day fill rate metrics against target thresholds (85% and 95%). Includes a data table with daily breakdowns, line charts for fill rate trends and orders remaining, and a calendar heatmap view color-coded by performance. Supports switching between Retail, Wholesale, and combined Total datasets via a dropdown. Data is sourced from static JS files (`data.js` and `wholesale.js`).

### Shipping Leaderboards

Displays daily shipping performance ranked by employee across three categories: Full-Time, Part-Time, and Wholesale. Each leaderboard card shows rank, employee name, products shipped, orders completed, and average items per order. Data is pulled live from a published Google Sheet and the cards auto-scroll when content overflows.

### Orders Overview

Monthly orders dashboard with two views: a calendar grid showing order volume per month (clickable for detailed breakdowns) and a line chart comparing orders placed vs. fulfilled over time. Summary stats at the top show totals, fulfillment rate, and items shipped. Includes a year filter and a "Current Month" jump button. Data comes from a Google Sheet via the Gviz API.

### International Orders

Interactive choropleth map showing order distribution across countries (world view) and US states. Regions are color-coded on a green-to-red scale based on order volume. Hovering over any region shows a tooltip with order count and percentage of total. A detail panel on the right displays summary stats and a ranked top-8 list. Supports year filtering. Built with jsvectormap. Currently uses stub data — designed to be connected to the Shopify API.

---

## Features

### Dark Mode

Toggle between light and dark themes using the moon/sun icon in the sidebar. The theme preference is saved to localStorage and synced across all dashboard iframes automatically.

### TV Mode

Enters fullscreen and auto-rotates through a curated playlist of dashboard views on an 8-second interval with fade transitions. Designed for display on a wall-mounted TV in the warehouse. Cycles through Retail monthly/calendar, Wholesale monthly/calendar, Shipping, Orders calendar/chart, and International world/US views. Exit by pressing Escape or clicking the TV icon again.

### Live Order Counter

The sidebar displays today's order count pulled from a Google Sheet, refreshing every 10 minutes. Includes a timestamp showing when the data was last updated.

### Product Carousel

The sidebar rotates through top product images (Tart Cherry, Elderberry, Hair Spritz) on a 5-second cycle with a fade transition.

### Fullscreen Mode

Each individual dashboard has its own fullscreen button for focused viewing without the sidebar.

---

## Authentication

The site uses Firebase Authentication with Google Sign-In. Access is locked down to the `@rowecasaorganics.com` domain only. When a user signs in:

1. If the email ends with `@rowecasaorganics.com`, they are granted access to the dashboard.
2. If the email belongs to any other domain, they are immediately signed out and shown an "Access denied" message.
3. Unauthenticated visitors are automatically redirected to the login page.

The sign-out button in the sidebar ends the session and returns to the login screen.

---

## Project Structure

```
RCO-Metrics-main/
|-- index.html                 Main shell (sidebar + iframe container)
|-- html/
|   |-- fulfillment.html       Fulfillment KPI dashboard
|   |-- shipping.html          Shipping Leaderboards dashboard
|   |-- orders.html            Orders Overview dashboard
|   |-- international.html     International Orders map dashboard
|   |-- login.html             Google Sign-In page
|-- js/
|   |-- fulfillment.js         Fulfillment dashboard logic (charts, calendar, dataset switching)
|   |-- data.js                Retail fulfillment data
|   |-- wholesale.js           Wholesale fulfillment data
|   |-- auth-check.js          Firebase auth guard module
|-- css/
|   |-- main.css               All styles (shared + page-scoped via body classes)
|-- Assets/
|   |-- logo.png               Rowe Casa Organics logo
|   |-- tartcherry.png         Product image
|   |-- elderberry.png         Product image
|   |-- hairspritz.png         Product image
```

---

## Data Sources

| Dashboard       | Source                          | Update Method       |
|-----------------|--------------------------------|---------------------|
| Fulfillment KPI | `data.js` / `wholesale.js`     | Static (manual)     |
| Shipping        | Google Sheets (published CSV)  | Live on page load   |
| Orders Overview | Google Sheets (Gviz JSON API)  | Live on page load   |
| International   | Stub data in HTML              | Static (placeholder)|
| Order Counter   | Google Sheets (Gviz JSON API)  | Live, 10-min refresh|

---

## Tech Stack

- Vanilla HTML, CSS, and JavaScript (no build tools or frameworks)
- Chart.js for line charts and data visualization
- jsvectormap for interactive world and US state maps
- Firebase Authentication for Google SSO
- Google Sheets Gviz API for live data
- CSS custom properties for theming with dark mode support
- iframe-based architecture with postMessage for cross-frame communication
