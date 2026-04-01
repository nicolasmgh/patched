const fs = require("fs");
let content = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");

// Add initial states
content = content.replace(
    '// Sugerir modal\n    const [showSuggestModal, setShowSuggestModal] = useState(false);\n    const [suggestForm, setSuggestForm] = useState({\n        reason: "STATUS_CHANGE",\n        message: "",\n    });',
    `// Sugerir modal
    const [showSuggestModal, setShowSuggestModal] = useState(false);
    const [suggestForm, setSuggestForm] = useState({
        reason: "STATUS_CHANGE",
        message: "",
    });

    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editingCommentText, setEditingCommentText] = useState("");

    const handleEditCommentSubmit = async (commentId) => {
        if (!editingCommentText.trim()) return;
        try {
            await api.put(\`/comments/\${commentId}\`, { content: editingCommentText });
            setEditingCommentId(null);
            fetchReport();
        } catch (err) {
            alert(err.response?.data?.message || "Error al editar comentario");
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("¿Estás seguro de eliminar este comentario?")) return;
        try {
            await api.delete(\`/comments/\${commentId}\`);
            fetchReport();
        } catch (err) {
            alert(err.response?.data?.message || "Error al eliminar comentario");
        }
    };

    const handleCensorComment = async (commentId) => {
        if (!window.confirm("¿Censurar este comentario permanentemente?")) return;
        try {
            await api.patch(\`/comments/censor/\${commentId}\`);
            fetchReport();
        } catch (err) {
            alert(err.response?.data?.message || "Error al censurar comentario");
        }
    };`
);

// Add variables to the map() scope
content = content.replace(
    'const voteScore = c.votes?.reduce((acc, v) => acc + v.value, 0) || 0;',
    `const voteScore = c.votes?.reduce((acc, v) => acc + v.value, 0) || 0;
                                const isOwner = user?.id === c.userId;
                                const isAdminOrCollab = user?.role === "ADMIN" || user?.role === "COLLABORATOR";
                                const isWithin5Mins = (new Date() - new Date(c.createdAt)) <= 300000;
                                const canEditDelete = isOwner && isWithin5Mins;`
);

// Update comment text render with edit textarea
content = content.replace(
    /\{\s*parseMentions\(c\.content\)\s*\}/g,
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
                                                <span className={c.flagged ? "text-orange-700 font-medium italic" : "text-gray-600"}>
                                                    {c.flagged ? c.content : parseMentions(c.content)}
                                                </span>
                                            )}`
);

// Append action buttons after Responder button
content = content.replace(
    /Responder\s*<\/button>/g,
    `Responder
                                                    </button>
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

fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", content);
