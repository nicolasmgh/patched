const fs = require("fs");
let c = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");

// 1. Insert Hooks
c = c.replace(
    /const\s+\[suggestForm,\s*setSuggestForm\]\s*=\s*useState\(\{[\s\S]*?\}\);/m,
    match => match + `\n\n    const [editingCommentId, setEditingCommentId] = useState(null);\n    const [editingCommentText, setEditingCommentText] = useState("");\n\n    const handleEditCommentSubmit = async (commentId) => {\n        if (!editingCommentText.trim()) return;\n        try {\n            await api.put(\`/comments/\${commentId}\`, { content: editingCommentText });\n            setEditingCommentId(null);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al editar comentario");\n        }\n    };\n\n    const handleDeleteComment = async (commentId) => {\n        if (!window.confirm("¿Estás seguro de eliminar este comentario?")) return;\n        try {\n            await api.delete(\`/comments/\${commentId}\`);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al eliminar comentario");\n        }\n    };\n\n    const handleCensorComment = async (commentId) => {\n        if (!window.confirm("¿Censurar este comentario permanentemente?")) return;\n        try {\n            await api.patch(\`/comments/censor/\${commentId}\`);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al censurar comentario");\n        }\n    };\n`
);

// 2. Insert iteration vars
c = c.replace(
    /const voteScore = c\.votes\?\.reduce[\s\S]*?\|\| 0;/,
    match => match + `\n                                const isOwner = user?.id === c.userId;\n                                const isAdminOrCollab = user?.role === "ADMIN" || user?.role === "COLLABORATOR";\n                                const isWithin5Mins = (new Date() - new Date(c.createdAt)) <= 300000;\n                                const canEditDelete = isOwner && isWithin5Mins;`
);

// 3. Insert rendering
c = c.replace(
    /<p className="text-sm text-gray-600 whitespace-pre-wrap">\s*\{parseMentions\(c\.content\)\}\s*<\/p>/,
    `{editingCommentId === c.id ? (
                                                <div className="flex flex-col gap-2 mt-1 mb-2">
                                                    <textarea 
                                                        value={editingCommentText}
                                                        onChange={e => setEditingCommentText(e.target.value)}
                                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                                                        rows={2}
                                                    />
                                                    <div className="flex gap-2 justify-end">
                                                        <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-500 hover:underline cursor-pointer">Cancelar</button>
                                                        <button onClick={() => handleEditCommentSubmit(c.id)} className="text-xs text-emerald-600 font-medium hover:underline cursor-pointer">Guardar</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className={\`text-sm whitespace-pre-wrap \${c.flagged ? 'text-orange-700 font-medium italic' : 'text-gray-600'}\`}>
                                                    {c.flagged ? c.content : parseMentions(c.content)}
                                                </p>
                                            )}`
);

// 4. Insert buttons
c = c.replace(
    /handleReplyPrompt\(c\.user\.username \|\| c\.user\.firstName\);\s*\}\}\s*className="text-xs text-gray-400 hover:text-emerald-600 transition cursor-pointer">\s*Responder\s*<\/button>/,
    match => match + `
                                                    {canEditDelete && (
                                                        <button onClick={() => {
                                                            setEditingCommentId(c.id);
                                                            setEditingCommentText(c.content || "");
                                                        }} className="text-xs text-gray-400 hover:text-blue-600 transition cursor-pointer">
                                                            Editar
                                                        </button>
                                                    )}
                                                    {(canEditDelete || isAdminOrCollab) && (
                                                        <button onClick={() => handleDeleteComment(c.id)} className="text-xs text-gray-400 hover:text-red-600 transition cursor-pointer">
                                                            Eliminar
                                                        </button>
                                                    )}
                                                    {isAdminOrCollab && !c.flagged && (
                                                        <button onClick={() => handleCensorComment(c.id)} className="text-xs text-orange-400 font-bold hover:text-orange-600 transition cursor-pointer">
                                                            Censurar
                                                        </button>
                                                    )}`
);

fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", c);
