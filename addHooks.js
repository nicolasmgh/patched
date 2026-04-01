const fs = require("fs");
let content = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");

if (!content.includes("editingCommentId")) {
    content = content.replace(
        /const\s+\[suggestForm,\s*setSuggestForm\]\s*=\s*useState\(\{[\s\S]*?\}\);/m,
        match => match + `\n\n    const [editingCommentId, setEditingCommentId] = useState(null);\n    const [editingCommentText, setEditingCommentText] = useState("");\n\n    const handleEditCommentSubmit = async (commentId) => {\n        if (!editingCommentText.trim()) return;\n        try {\n            await api.put(\`/comments/\${commentId}\`, { content: editingCommentText });\n            setEditingCommentId(null);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al editar comentario");\n        }\n    };\n\n    const handleDeleteComment = async (commentId) => {\n        if (!window.confirm("¿Estás seguro de eliminar este comentario?")) return;\n        try {\n            await api.delete(\`/comments/\${commentId}\`);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al eliminar comentario");\n        }\n    };\n\n    const handleCensorComment = async (commentId) => {\n        if (!window.confirm("¿Censurar este comentario permanentemente?")) return;\n        try {\n            await api.patch(\`/comments/censor/\${commentId}\`);\n            fetchReport();\n        } catch (err) {\n            alert(err.response?.data?.message || "Error al censurar comentario");\n        }\n    };\n`
    );
    fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", content);
}
