import fs from 'fs';
import path from 'path';

const ARTIFACT_DIR = 'C:\\Users\\saksh\\.gemini\\antigravity-ide\\brain\\9d1f5d55-641e-44e6-8ed4-4d44aa7ff73b';
const TARGET_DIR = path.join(process.cwd(), 'docs', 'screenshots');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const images = [
  {
    src: 'landing_page_1790419263491.png',
    dest: '01_landing_page.png',
    title: '1. Landing Page (/)',
    description: 'Entry point presenting accessibility features, keyboard navigation cues, dual language toggle, and WCAG AA contrast compliance.',
  },
  {
    src: 'settings_page_1790419267494.png',
    dest: '02_settings_page.png',
    title: '2. Accessibility Settings (/settings)',
    description: 'Centralized accessibility accommodations: Text Scaling (16px, 18px, 20px), Theme Selection (Light, Dark, High-Contrast), Audio Assistance, and Cloud Profile Name synchronization.',
  },
  {
    src: 'login_page_1790419283074.png',
    dest: '03_login_page.png',
    title: '3. Candidate Sign In (/login)',
    description: 'Accessible sign-in workflow with Supabase cookie SSR authentication, keyboard focus indicators, and accessible error handling.',
  },
  {
    src: 'signup_page_1790419286585.png',
    dest: '04_signup_page.png',
    title: '4. Candidate Registration (/signup)',
    description: 'Candidate account creation with full name, password guidelines, and seamless onboarding to Supabase candidate profiles.',
  },
  {
    src: 'dashboard_page_1790419313337.png',
    dest: '05_dashboard_page.png',
    title: '5. Candidate Performance Dashboard (/dashboard)',
    description: 'Real-time performance analytics directly synchronized with Supabase PostgreSQL attempts: Total Completed Attempts, Average Score, Accuracy Rate, Subject Breakdown, and Weak-Topic Recommendations.',
  },
  {
    src: 'practice_page_1790419325412.png',
    dest: '06_practice_page.png',
    title: '6. Practice Sets Hub (/practice)',
    description: 'Interactive question practice library with real-time multi-facet filters (Subject pills, search query, difficulty), question count/duration metadata, and accessible empty state resets.',
  },
  {
    src: 'exam_page_1790419337077.png',
    dest: '07_exam_page.png',
    title: '7. Timed Sectional Examination Engine (/exam?exam=e2)',
    description: 'Accessible examination interface showing Sectional Timing Active badges, section-specific countdown clocks, secure remote question delivery with zero answer keys exposed, bilingual Voice Examination Panel (EN/HI), and responsive Question Palette.',
  },
  {
    src: 'results_page_1790419349588.png',
    dest: '08_results_page.png',
    title: '8. Official Results & Question Review (/results)',
    description: 'Comprehensive performance breakdown with official server-evaluated score, percentage accuracy, time used, weak topic diagnostic badges, and full question-by-question review with official explanations.',
  },
];

console.log('Copying screenshots into docs/screenshots/ ...');
const base64Images: Record<string, string> = {};

for (const img of images) {
  const srcPath = path.join(ARTIFACT_DIR, img.src);
  const destPath = path.join(TARGET_DIR, img.dest);
  if (fs.existsSync(srcPath)) {
    fs.copyFileSync(srcPath, destPath);
    console.log(`Copied ${img.src} -> ${img.dest}`);
    const fileBuffer = fs.readFileSync(srcPath);
    base64Images[img.dest] = `data:image/png;base64,${fileBuffer.toString('base64')}`;
  } else {
    console.warn(`File not found: ${srcPath}`);
  }
}

// 1. Generate Markdown file docs/EXAMSARTHI_PAGES_SHOWCASE.md
console.log('Generating docs/EXAMSARTHI_PAGES_SHOWCASE.md ...');
let mdContent = `# EXAMSARTHI — Complete Platform Visual Showcase

This document provides a complete walkthrough and screenshots of all 8 core pages of **EXAMSARTHI**, an accessibility-first, server-evaluated competitive examination platform.

---

`;

for (const img of images) {
  mdContent += `## ${img.title}

${img.description}

![${img.title}](./screenshots/${img.dest})

---

`;
}

fs.writeFileSync(path.join(process.cwd(), 'docs', 'EXAMSARTHI_PAGES_SHOWCASE.md'), mdContent, 'utf8');

// 2. Generate standalone self-contained HTML file docs/EXAMSARTHI_SHOWCASE_STANDALONE.html with embedded Base64 images
console.log('Generating docs/EXAMSARTHI_SHOWCASE_STANDALONE.html ...');
let htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EXAMSARTHI — Platform Visual Showcase & Screenshots</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --text: #f9fafb;
      --text-muted: #9ca3af;
      --primary: #3b82f6;
      --primary-light: #60a5fa;
      --border: #1f2937;
      --radius: 12px;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      line-height: 1.6;
      padding: 2rem 1rem;
    }
    .container {
      max-width: 1100px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 3rem;
      padding-bottom: 2rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      margin-bottom: 0.75rem;
      color: #ffffff;
    }
    .badge {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      background: rgba(59, 130, 246, 0.15);
      color: var(--primary-light);
      border: 1px solid rgba(59, 130, 246, 0.3);
      margin-bottom: 1rem;
    }
    .subtitle {
      font-size: 1.125rem;
      color: var(--text-muted);
      max-width: 750px;
      margin: 0 auto;
    }
    .section-card {
      background: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 2rem;
      margin-bottom: 2.5rem;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    }
    h2 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .description {
      font-size: 1rem;
      color: var(--text-muted);
      margin-bottom: 1.5rem;
      line-height: 1.5;
    }
    .img-wrapper {
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid var(--border);
      background: #000;
    }
    img {
      width: 100%;
      height: auto;
      display: block;
      transition: transform 0.2s ease;
    }
    footer {
      text-align: center;
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <span class="badge">EXAMSARTHI Feature-Complete Showcase</span>
      <h1>Accessible Online Examination Platform</h1>
      <p class="subtitle">
        High-resolution visual showcase of all 8 core candidate pages, demonstrating WCAG 2.1 AA accessibility, Supabase SSR authentication, sectional timing enforcement, hands-free voice mode, and server-side grading.
      </p>
    </header>
`;

for (const img of images) {
  const b64 = base64Images[img.dest] || '';
  htmlContent += `
    <article class="section-card">
      <h2>${img.title}</h2>
      <p class="description">${img.description}</p>
      <div class="img-wrapper">
        <img src="${b64}" alt="${img.title}" loading="lazy">
      </div>
    </article>
`;
}

htmlContent += `
    <footer>
      <p>EXAMSARTHI &copy; 2026. Built with Next.js 16, TypeScript, Tailwind CSS, Supabase SSR, and Web Speech API.</p>
    </footer>
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(process.cwd(), 'docs', 'EXAMSARTHI_SHOWCASE_STANDALONE.html'), htmlContent, 'utf8');
console.log('Successfully packaged all screenshots and created downloadable files!');
