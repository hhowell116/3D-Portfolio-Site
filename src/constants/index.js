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
    tags: [
      {
        name: "javascript",
        color: "blue-text-gradient",
      },
      {
        name: "chart.js",
        color: "green-text-gradient",
      },
      {
        name: "firebase-auth",
        color: "pink-text-gradient",
      },
    ],
    image: starbucks,
    source_code_link: "https://github.com/hhowell116/RCO-Metrics",
  },
  {
    name: "IT Help Portal",
    description:
      "Internal IT portal for Rowe Casa Organics with department-specific technology surveys, onboarding/offboarding request forms, and Firestore-backed submission tracking with domain-restricted Google SSO.",
    tags: [
      {
        name: "javascript",
        color: "blue-text-gradient",
      },
      {
        name: "firebase",
        color: "green-text-gradient",
      },
      {
        name: "google-apps-script",
        color: "pink-text-gradient",
      },
    ],
    image: tesla,
    source_code_link: "https://github.com/hhowell116/IT-Help-Site",
  },
  {
    name: "ShipStation Leaderboard",
    description:
      "Daily shipping leaderboard ranking warehouse employees by fulfillment performance across Full-Time, Part-Time, and Wholesale categories with auto-scrolling and medal icons, optimized for wall-mounted TV display.",
    tags: [
      {
        name: "html",
        color: "blue-text-gradient",
      },
      {
        name: "css-grid",
        color: "green-text-gradient",
      },
      {
        name: "google-sheets",
        color: "pink-text-gradient",
      },
    ],
    image: meta,
    source_code_link: "https://github.com/hhowell116/shipstation-dashboard",
  },
  {
    name: "CMYK Color Analyzer",
    description:
      "React-based image color analysis tool. Upload an image via drag-and-drop to extract CMYK composition with pie charts, a top-50 color frequency grid, and individual channel isolation previews.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "chart.js",
        color: "green-text-gradient",
      },
      {
        name: "canvas-api",
        color: "pink-text-gradient",
      },
    ],
    image: shopify,
    source_code_link: "https://github.com/hhowell116/CMYK-color-analyzer",
  },
  {
    name: "HR Admin Control Panel",
    description:
      "Firebase-hosted admin dashboard for the HR team to manage employee recognition content, internal TV displays, and HR workflows with Firebase Authentication and Firestore backend.",
    tags: [
      {
        name: "javascript",
        color: "blue-text-gradient",
      },
      {
        name: "firebase",
        color: "green-text-gradient",
      },
      {
        name: "firestore",
        color: "pink-text-gradient",
      },
    ],
    image: starbucks,
    source_code_link: "https://rco-hr-admin.web.app/",
  },
  {
    name: "Mileage Tracker",
    description:
      "Full-stack mileage tracking application with a Python Flask REST API backend and a React/Tailwind frontend for logging and managing business trip mileage.",
    tags: [
      {
        name: "python",
        color: "blue-text-gradient",
      },
      {
        name: "flask",
        color: "green-text-gradient",
      },
      {
        name: "react",
        color: "pink-text-gradient",
      },
    ],
    image: tesla,
    source_code_link: "https://github.com/hhowell116/Mileage-Tracker",
  },
  {
    name: "3D Portfolio Site",
    description:
      "This portfolio website — built with React, Three.js, and Framer Motion featuring interactive 3D models, animated sections, and a working contact form. Deployed on Firebase Hosting.",
    tags: [
      {
        name: "react",
        color: "blue-text-gradient",
      },
      {
        name: "three.js",
        color: "green-text-gradient",
      },
      {
        name: "framer-motion",
        color: "pink-text-gradient",
      },
    ],
    image: meta,
    source_code_link: "https://github.com/hhowell116",
  },
];

export { services, technologies, experiences, projects };
