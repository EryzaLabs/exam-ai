const fs = require('fs');
const path = require('path');

const distIndexPath = path.resolve(__dirname, '..', 'dist', 'index.html');

if (fs.existsSync(distIndexPath)) {
  let html = fs.readFileSync(distIndexPath, 'utf8');

  // Replace any existing <title>...</title>
  html = html.replace(/<title>.*?<\/title>/gi, '');

  // Meta tags to inject
  const headElements = `  <title>Astra Exam AI</title>
    <meta name="description" content="Astra Exam AI is your all-in-one AI-driven preparation platform for competitive exams. Practice full mocks, analyze weaknesses, and master your syllabus with smart AI tools." />
    <meta name="keywords" content="Astra Exam AI, UPSC, SSC CGL, competitive exams, mock tests, AI tutor, exam preparation" />
    <meta name="author" content="Eryza Labs" />
    <meta name="theme-color" content="#4F46E5" />

    <!-- Open Graph / Facebook -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Astra Exam AI" />
    <meta property="og:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
    <meta property="og:url" content="https://astra.eryzalabs.cloud" />
    <meta property="og:site_name" content="Astra Exam AI" />

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="Astra Exam AI" />
    <meta name="twitter:description" content="Master competitive exams with AI-powered mock tests, performance analytics, and personalized learning." />
`;

  if (!html.includes('name="description"')) {
    html = html.replace('</head>', `${headElements}  </head>`);
  } else {
    // If already has description, just place title back
    html = html.replace('</head>', `  <title>Astra Exam AI</title>\n  </head>`);
  }

  fs.writeFileSync(distIndexPath, html, 'utf8');
  console.log('✅ Successfully updated Astra Exam AI title and meta tags in dist/index.html');
} else {
  console.log('⚠️ dist/index.html not found, skipping post-build injection');
}
