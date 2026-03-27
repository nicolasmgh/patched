const fs = require("fs");
let code = fs.readFileSync("src/pages/ReportDetail.jsx", "utf8");

const r1 =
    /const liked =\s*user &&\s*c\.likes\?\.some\(\(l\) => l\.userId === user\.id\);/g;
const newR1 = `const userVote = user ? (c.votes?.find(v => v.userId === user.id)?.value || 0) : 0;
                                const voteScore = c.votes?.reduce((acc, v) => acc + v.value, 0) || 0;`;

code = code.replace(r1, newR1);

const r2 =
    /<button\s*onClick={async \(\) => {[\s\S]*?interactions\/like\/[\s\S]*?<\/button>/;

const newB1 = `
<>
<button onClick={async () => {
    try {
        await api.post(\`/interactions/vote/\${c.id}\`, { value: userVote === 1 ? 0 : 1 });
        fetchReport();
    } catch (err) { alert("Error al votar"); }
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
    } catch (err) { alert("Error al votar"); }
}} className={"text-xs flex items-center gap-1 transition cursor-pointer " + (userVote === -1 ? "text-red-500 font-bold" : "text-gray-400 hover:text-red-500")}>
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path fillRule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v5.793l2.146-2.147a.5.5 0 0 1 .708.708l-3 3a.5.5 0 0 1-.708 0l-3-3a.5.5 0 1 1 .708-.708L7.5 10.293V4.5A.5.5 0 0 1 8 4z"/>
    </svg>
</button>
</>
`;

code = code.replace(r2, newB1);
fs.writeFileSync("src/pages/ReportDetail.jsx", code);
console.log("Fixed ReportDetail.jsx successfully!");
