import {
  mobile,
  backend,
  creator,
  web,
  javascript,
  typescript,
  html,
  css,
  reactjs,
  redux,
  tailwind,
  nodejs,
  mongodb,
  threejs,
  git,
  figma,
  docker,
  meta,
  starbucks,
  tesla,
  shopify,
} from "../assets";

export const navLinks = [
  {
    id: "about",
    title: "About",
  },
  {
    id: "work",
    title: "Work",
  },
  {
    id: "contact",
    title: "Contact",
  },
];

const services = [
  {
    title: "IT Solutions & Infrastructure",
    icon: backend,
  },
  {
    title: "Web Development",
    icon: web,
  },
  {
    title: "AI & Multi-Agent Systems",
    icon: mobile,
  },
  {
    title: "Data Analytics & Dashboards",
    icon: creator,
  },
];

const technologies = [
  {
    name: "HTML 5",
    icon: html,
  },
  {
    name: "CSS 3",
    icon: css,
  },
  {
    name: "JavaScript",
    icon: javascript,
  },
  {
    name: "TypeScript",
    icon: typescript,
  },
  {
    name: "React JS",
    icon: reactjs,
  },
  {
    name: "Tailwind CSS",
    icon: tailwind,
  },
  {
    name: "Node JS",
    icon: nodejs,
  },
  {
    name: "MongoDB",
    icon: mongodb,
  },
  {
    name: "Three JS",
    icon: threejs,
  },
  {
    name: "git",
    icon: git,
  },
  {
    name: "figma",
    icon: figma,
  },
  {
    name: "docker",
    icon: docker,
  },
];

const tools = [
  {
    category: "AI & Automation",
    items: ["Claude Code CLI", "Paperclip"],
  },
  {
    category: "Cloud & Backend",
    items: ["Firebase", "Node.js", "Python", "Flask"],
  },
  {
    category: "APIs & Integrations",
    items: ["ShipStation", "Shopify", "Google Sheets", "Google Apps Script", "Google Maps"],
  },
  {
    category: "Enterprise IT",
    items: ["Microsoft 365", "Active Directory", "Intune", "DEACOM ERP"],
  },
  {
    category: "Data & Visualization",
    items: ["Chart.js", "jsvectormap", "Excel", "SQL"],
  },
  {
    category: "DevOps & Workflow",
    items: ["Git", "GitHub", "Jira", "HubSpot"],
  },
];

const experiences = [
  {
    title: "IT Specialist",
    company_name: "Rowe Casa Organics",
    icon: starbucks,
    iconBg: "#E6DEDD",
    date: "Aug 2025 - Present",
    points: [
      "Supported company-wide DEACOM ERP rollout, configuring workflows and training departments on system usage.",
      "Deployed and managed Intune-configured scanners integrated with DEACOM ERP.",
      "Built HTML/JavaScript dashboards using ShipStation and Shopify APIs for real-time operational metrics.",
      "Managed day-to-day IT operations, ticketing, RMM platforms, MDM, and physical security systems.",
      "Completed Google Workspace to Microsoft 365 migration with Active Directory-based user provisioning.",
      "Leveraged Claude Code CLI for AI-assisted development, accelerating dashboard and tool delivery.",
      "Architected multi-agent AI workflows using Paperclip orchestration framework with specialized Claude-powered agents for research, development, QA, and documentation tasks.",
    ],
  },
  {
    title: "Data Entry Specialist",
    company_name: "Michigan Health Information Network (MiHIN)",
    icon: meta,
    iconBg: "#383E56",
    date: "Jan 2024 - Feb 2025",
    points: [
      "Maintained data accuracy and organized large data sets in Excel.",
      "Used SQL to query and validate data in support of healthcare information systems.",
      "Collaborated across teams using HubSpot and Jira to ensure consistent data reporting and task tracking.",
    ],
  },
  {
    title: "Customer Engagement Team",
    company_name: "Michigan Health Information Network (MiHIN)",
    icon: meta,
    iconBg: "#383E56",
    date: "Jan 2023 - Jan 2024",
    points: [
      "Acted as liaison between MiHIN and healthcare organizations to facilitate secure data exchange.",
      "Created and managed communication pathways using destination strings.",
      "Onboarded and decommissioned organizations via Jira tickets and HubSpot.",
      "Collected data for RCA (Root Cause Analysis) requests to resolve internal issues.",
    ],
  },
  {
    title: "Graphic Design Marketing Intern",
    company_name: "Better Homes and Gardens Real Estate",
    icon: shopify,
    iconBg: "#E6DEDD",
    date: "Jun 2021 - Dec 2022",
    points: [
      "Designed promotional materials targeting key real estate demographics.",
      "Collaborated with agents to develop branding materials and client outreach content.",
      "Applied graphic design and social media marketing skills to increase engagement.",
    ],
  },
];

const testimonials = [
  {
    testimonial:
      "Hayden transformed our production floor visibility with real-time dashboards that supervisors actually use every day.",
    name: "Operations Lead",
    designation: "Supervisor",
    company: "Rowe Casa Organics",
    image: "https://randomuser.me/api/portraits/men/4.jpg",
  },
  {
    testimonial:
      "His ability to bridge IT infrastructure and business needs made our ERP implementation significantly smoother.",
    name: "Department Manager",
    designation: "Manager",
    company: "Rowe Casa Organics",
    image: "https://randomuser.me/api/portraits/women/6.jpg",
  },
  {
    testimonial:
      "Hayden's data analysis skills and attention to detail were invaluable for maintaining our healthcare information systems.",
    name: "Team Lead",
    designation: "Lead",
    company: "MiHIN",
    image: "https://randomuser.me/api/portraits/men/5.jpg",
  },
];

const projects = [
  {
    name: "RCO Metrics Dashboard",
    description:
      "Internal operations dashboard with fulfillment KPI tracking, shipping leaderboards, order trends, and international order maps. Features TV mode for warehouse display, dark mode, and Firebase Authentication.",
    detailedDescription:
      "A comprehensive internal operations dashboard built for Rowe Casa Organics that consolidates fulfillment KPIs, shipping performance, order trends, and international order data into a single platform. The dashboard features over 10 views including a fulfillment tracker with 4-day and 7-day fill rate metrics, a shipping leaderboard that ranks warehouse employees by performance across Full-Time, Part-Time, and Wholesale categories, a monthly orders overview with calendar grid view, and an interactive choropleth map for international orders. It includes a TV Mode that auto-rotates between dashboard views on 8-second intervals for wall-mounted warehouse displays, a dark mode toggle with localStorage persistence, and a live order counter that refreshes from Google Sheets every 10 minutes. Firebase Authentication restricts access to @rowecasaorganics.com domain users via Google SSO.",
    tags: [
      { name: "javascript", color: "blue-text-gradient" },
      { name: "chart.js", color: "green-text-gradient" },
      { name: "firebase-auth", color: "pink-text-gradient" },
    ],
    techStack: [
      "JavaScript", "HTML5", "CSS3", "Chart.js", "jsvectormap",
      "Firebase Authentication", "Google SSO", "Google Sheets Gviz API",
      "Web Workers", "localStorage", "CSS Custom Properties", "iframe Architecture",
    ],
    image: starbucks,
    source_code_link: "https://github.com/hhowell116/RCO-Metrics",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "IT Help Portal",
    description:
      "Internal IT portal for Rowe Casa Organics with department-specific technology surveys, onboarding/offboarding request forms, and Firestore-backed submission tracking with domain-restricted Google SSO.",
    detailedDescription:
      "An internal IT help portal built for Rowe Casa Organics that streamlines IT request management and technology discovery. The portal features a Technology & Application Discovery Survey with conditional logic that adapts questions based on the user's department, request forms for employee onboarding, offboarding, and equipment/software requests, and a submission tracking system backed by Cloud Firestore. Users authenticate via Google Sign-In restricted to @rowecasaorganics.com accounts. Completed submissions are viewable in a \"My Completed\" tab showing the user's history. The portal integrates with Google Sheets via Google Apps Script for data export and reporting. Includes dark mode support, responsive design with RCO brand colors, and a direct \"Contact IT Support\" button that opens a pre-filled Gmail compose window.",
    tags: [
      { name: "javascript", color: "blue-text-gradient" },
      { name: "firebase", color: "green-text-gradient" },
      { name: "google-apps-script", color: "pink-text-gradient" },
    ],
    techStack: [
      "JavaScript", "HTML5", "CSS3", "Firebase Authentication", "Cloud Firestore",
      "Google Apps Script", "Google Sheets", "Google SSO", "Responsive Design",
    ],
    image: tesla,
    source_code_link: "https://github.com/hhowell116/IT-Help-Site",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "ShipStation Leaderboard",
    description:
      "Daily shipping leaderboard ranking warehouse employees by fulfillment performance across Full-Time, Part-Time, and Wholesale categories with auto-scrolling and medal icons, optimized for wall-mounted TV display.",
    detailedDescription:
      "A daily shipping leaderboard designed for wall-mounted TV displays on the Rowe Casa Organics warehouse floor. The board ranks warehouse employees by fulfillment performance, segmented into Full-Time, Part-Time, and Wholesale categories. Top performers receive gold, silver, and bronze medal icons. The display auto-scrolls through the rankings and is optimized for large-screen readability. Data is sourced from a published Google Sheets CSV that pulls shipping metrics from the ShipStation API, ensuring the leaderboard stays current without manual updates.",
    tags: [
      { name: "html", color: "blue-text-gradient" },
      { name: "css-grid", color: "green-text-gradient" },
      { name: "google-sheets", color: "pink-text-gradient" },
    ],
    techStack: [
      "HTML5", "CSS Grid", "JavaScript", "Google Sheets CSV",
      "ShipStation API", "Auto-scroll Animation", "TV Display Optimization",
    ],
    image: meta,
    source_code_link: "https://github.com/hhowell116/shipstation-dashboard",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "CMYK Color Analyzer",
    description:
      "React-based image color analysis tool. Upload an image via drag-and-drop to extract CMYK composition with pie charts, a top-50 color frequency grid, and individual channel isolation previews.",
    detailedDescription:
      "A React-based image color analysis tool built for the design team at Rowe Casa Organics. Users upload images via drag-and-drop to extract detailed CMYK color composition data. The tool generates pie charts showing the overall color distribution, displays a top-50 color frequency grid highlighting the most prominent colors, and provides individual channel isolation previews (Cyan, Magenta, Yellow, Key/Black) so designers can evaluate print color accuracy. Built with the Canvas API for pixel-level image processing and Chart.js for data visualization.",
    tags: [
      { name: "react", color: "blue-text-gradient" },
      { name: "chart.js", color: "green-text-gradient" },
      { name: "canvas-api", color: "pink-text-gradient" },
    ],
    techStack: [
      "React", "Chart.js", "Canvas API", "Drag-and-Drop API",
      "CMYK Color Space", "Image Processing", "CSS3",
    ],
    image: shopify,
    source_code_link: "https://github.com/hhowell116/CMYK-color-analyzer",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "HR Admin Control Panel",
    description:
      "Firebase-hosted admin dashboard for the HR team to manage employee recognition content, internal TV displays, and HR workflows with Firebase Authentication and Firestore backend.",
    detailedDescription:
      "A multi-package admin dashboard built for the Rowe Casa Organics HR team to manage employee recognition programs and internal TV displays. The project is structured as a monorepo with three workspace packages: an admin panel for HR staff to manage content and campaigns, a display interface optimized for Airtame-connected TVs that shows employee recognition slideshows, and a shared component library. Features include role-based access control (RBAC) with admin, editor, and viewer roles, Firebase Cloud Functions for user role management and data seeding, real-time Firestore syncing between admin edits and display updates, and separate Firebase Hosting configurations for the admin and display builds.",
    tags: [
      { name: "javascript", color: "blue-text-gradient" },
      { name: "firebase", color: "green-text-gradient" },
      { name: "firestore", color: "pink-text-gradient" },
    ],
    techStack: [
      "React 18", "TypeScript", "Vite", "Tailwind CSS",
      "Firebase Authentication", "Cloud Firestore", "Firebase Cloud Functions",
      "Firebase Hosting (Multi-site)", "RBAC", "npm Workspaces (Monorepo)",
    ],
    image: starbucks,
    source_code_link: "https://rco-hr-admin.web.app/",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "Mileage Tracker",
    description:
      "Business trip mileage tracking app with map integration, start/end trip controls, automatic distance calculation, and email reporting for employee travel between company locations.",
    detailedDescription:
      "A mileage tracking application designed for Rowe Casa Organics employees who travel between company locations. Employees select their starting and ending locations, and the app automatically calculates the distance traveled. Trip history is logged with dates, routes, and mileage totals. A built-in reporting feature generates and sends mileage summary emails to management for reimbursement processing. The interface features a map view showing company locations and trip routes, with simple Start Trip and End Trip controls for quick logging on the go.",
    tags: [
      { name: "react", color: "blue-text-gradient" },
      { name: "tailwind", color: "green-text-gradient" },
      { name: "google-maps", color: "pink-text-gradient" },
    ],
    techStack: [
      "React", "Vite", "Tailwind CSS", "Google Maps",
      "localStorage", "Email Integration", "Geolocation",
    ],
    image: tesla,
    source_code_link: "https://github.com/hhowell116/Mileage-Tracker",
    videoUrl: "",
    liveDemo: "",
  },
  {
    name: "3D Portfolio Site",
    description:
      "This portfolio website built with React, Three.js, and Framer Motion featuring interactive 3D models, animated sections, and a working contact form. Deployed on Firebase Hosting.",
    detailedDescription:
      "This portfolio website showcasing my projects and experience, built with React 18 and Vite 5. Features interactive 3D elements powered by Three.js, React Three Fiber, and Drei, including a rotating desktop computer model on the hero section and a 3D Earth on the contact page. Smooth scroll animations and section transitions use Framer Motion. The tech section displays floating 3D balls for each technology. A working contact form powered by FormSubmit.co delivers messages directly to email. Styled with Tailwind CSS 3 and deployed on Firebase Hosting.",
    tags: [
      { name: "react", color: "blue-text-gradient" },
      { name: "three.js", color: "green-text-gradient" },
      { name: "framer-motion", color: "pink-text-gradient" },
    ],
    techStack: [
      "React 18", "Vite 5", "Three.js", "React Three Fiber", "Drei",
      "Framer Motion", "Tailwind CSS 3", "FormSubmit.co", "Firebase Hosting",
    ],
    image: meta,
    source_code_link: "https://github.com/hhowell116",
    videoUrl: "",
    liveDemo: "",
  },
];

export { services, technologies, tools, experiences, projects };
