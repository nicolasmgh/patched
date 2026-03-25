const fs = require('fs');
let txt = fs.readFileSync('apps/web/src/pages/ReportDetail.jsx', 'utf8');

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

for (const [k, v] of Object.entries(r)) {
  txt = txt.split(k).join(v);
}
fs.writeFileSync('apps/web/src/pages/ReportDetail.jsx', txt, 'utf8');
console.log('Done!');