# RCO IT Help Site

An internal IT portal for Rowe Casa Organics staff. Hosted on GitHub Pages.

🔗 **Live Site:** 

---

## Features

- **Google Auth** — Sign in with Google, restricted to `@rowecasaorganics.com` accounts only. Sessions persist across devices. Unauthenticated users are redirected to `login.html`.

- **Technology & Application Discovery Survey** — Collects a full inventory of tools and accounts per department. Includes conditional logic that shows only relevant tool categories based on the user's selected department.

- **Request Forms** — User Onboarding, Offboarding, and Equipment/Software Request forms *(in progress)*.

- **My Completed Tab** — Submissions are saved to Firestore and tied to the user's account, visible across any device.

- **Contact IT Support** — Opens Gmail with `itsupport@rowecasaorganics.com` and the user's message pre-filled.

- **Google Sheets Integration** — Survey responses are sent to a Google Sheet via Apps Script. One row per tool entry. Each submission is color-highlighted for easy reading.

- **Styling** — Sourced from RCO brand colors. Fully responsive with dark mode support.

---

## Firebase

| | |
|---|---|
| **Auth** | Google provider — `@rowecasaorganics.com` domain enforced in code |
| **Firestore Database** | `submissions` collection — stores survey title, department, user email, timestamp, and survey URL |
| **Rules** | Open read/write (internal tool — domain restriction enforced at the auth layer) |

---

## Project Structure

```
/
├── index.html           # Main portal (surveys, forms, completed, contact)
├── login.html           # Google sign-in page
├── app.js               # Auth, Firestore reads, nav logic
├── styles.css           # Global styles and theme variables
├── logo.png             # RCO logo
└── surveys/
    └── surveys   # Technology & Application Discovery Survey
```
