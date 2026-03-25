const fs = require('fs');

const r = {
  "Ã³": "ó",
  "Ã­": "í",
  "Ã©": "é",
  "Ã¡": "á",
  "Ãº": "ú",
  "Ã¼": "ü",
  "Ã±": "ñ",
  "âœ“": "✓",
  "Â·": "·",
  "ðŸ””": "🔔",
  "ðŸ“¤": "📤",
  "âœï¸": "✏️",
  "ðŸ“": "📍",
  "ðŸ·ï¸": "🏷️",
  "âš¡": "⚡",
  "ðŸ“…": "📅",
  "ðŸ“·": "📷",
  "â–¶": "▶",
  "â€œ": "“",
  "â€": "”"
};

['apps/web/src/pages/ReportDetail.jsx', 'apps/web/src/components/Map.jsx'].forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  for (const [k, v] of Object.entries(r)) {
    txt = txt.split(k).join(v);
  }
  fs.writeFileSync(f, txt, 'utf8');
});
console.log('Done mapping both!');