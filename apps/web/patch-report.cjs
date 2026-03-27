const fs = require('fs');
let code = fs.readFileSync('src/pages/ReportDetail.jsx', 'utf8');

// 1. Replace liked logic
let c1 = `const liked =
                                    user &&
                                    c.likes?.some((l) => l.userId === user.id);`;
if (!code.includes(c1)) throw new Error('C1 not found');
code = code.replace(c1, `const userVote = user ? (c.votes?.find(v => v.userId === user.id)?.value || 0) : 0;
                                const voteScore = c.votes?.reduce((acc, v) => acc + v.value, 0) || 0;`);

// 2. Replace button block
let b1 = `<button
                                                            onClick={async () => {
                                                                try {
                                                                    if (liked) {
                                                                        await api.delete(
                                                                            \`/interactions/like/\${c.id}\`,
                                                                        );
                                                                    } else {
                                                                        await api.post(
                                                                            \`/interactions/like/\${c.id}\`,
                                                                        );
                                                                    }
                                                                    fetchReport();
                                                                } catch (err) {
                                                                    alert(
                                                                        err.response
                                                                            ?.data
                                                                            ?.message ||
                                                                            "Error",
                                                                    );
                                                                }
                                                            }}
                                                            className={\`text-xs flex items-center gap-1 transition cursor-pointer \${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}\`}
                                                        >
                                                            ❤️{" "}
                                                            {c._count?.likes || 0}
                                                        </button>`;

if (!code.includes(b1)) throw new Error('B1 not found');

let newB1 = `
<>
<button onClick={async () => {
    try {
        await api.post(\`/interactions/vote/\${c.id}\`, { value: userVote === 1 ? 0 : 1 });
        fetchReport();
    } catch (err) { alert(err.response?.data?.message || "Error al votar"); }
}} className={"text-xs flex items-center gap-1 transition cursor-pointer " + (userVote === 1 ? "text-emerald-500 font-bold" : "text-gray-400 hover:text-emerald-500")}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"/>
    </svg>
</button>
<span className={"text-xs font-semibold " + (voteScore > 0 ? "text-emerald-600" : voteScore < 0 ? "text-red-500" : "text-gray-500")}>
    {voteScore}
</span>
<button onClick={async () => {
    try {
        await api.post(\`/interactions/vote/\${c.id}\`, { value: userVote === -1 ? 0 : -1 });
        fetchReport();
    } catch (err) { alert(err.response?.data?.message || "Error al votar"); }
}} className={"text-xs flex items-center gap-1 transition cursor-pointer " + (userVote === -1 ? "text-red-500 font-bold" : "text-gray-400 hover:text-red-500")}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
    </svg>
</button>
</>
`;

code = code.replace(b1, newB1);
fs.writeFileSync('src/pages/ReportDetail.jsx', code);
console.log('Fixed ReportDetail.jsx UI successfully!');
