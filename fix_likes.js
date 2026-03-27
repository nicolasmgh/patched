const fs = require("fs");
let t = fs.readFileSync(
    "c:/Users/nicol/Desktop/urbanpatch/apps/web/src/pages/ReportDetail.jsx",
    "utf8",
);

const regex =
    /{user &&\s+user\.id !== c\.userId && \([\s\S]*?<\/button>\s*\n\s*\)}\s*{!user && \([\s\S]*?<\/span>\s*\n\s*\)}/;

const replacement = `{user ? (
    <button
        onClick={async () => {
            try {
                if (liked) {
                    await api.delete(\`/interactions/like/\${c.id}\`);
                } else {
                    await api.post(\`/interactions/like/\${c.id}\`);
                }
                fetchReport();
            } catch (err) {
                alert(err.response?.data?.message || 'Error');
            }
        }}
        className={\`text-xs flex items-center gap-1 transition \${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}\`}
    >
        ❤️ {c._count?.likes || 0}
    </button>
) : (
    <span className="text-xs text-gray-300">
        ❤️ {c._count?.likes || 0}
    </span>
)}`;

t = t.replace(regex, replacement);
fs.writeFileSync(
    "c:/Users/nicol/Desktop/urbanpatch/apps/web/src/pages/ReportDetail.jsx",
    t,
    "utf8",
);
console.log("Fixed ReportDetail likes!");
