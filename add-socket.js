const fs = require("fs");
let code = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");
if (!code.includes("import { io } from \"socket.io-client\";")) {
    code = code.replace("import { useParams, useNavigate }", "import { io } from \"socket.io-client\";\nimport { useParams, useNavigate }");
}
let ioInit = `
const socket = io(import.meta.env.VITE_API_URL || "http://localhost:3000");
`;
if (!code.includes("const socket = io(")) {
    code = code.replace("const ReportDetail = () => {", `${ioInit}\nconst ReportDetail = () => {`);
}
let effectCode = `
    useEffect(() => {
        socket.on("reportUpdate", (data) => {
            if (data.id === id || data.id === parseInt(id)) {
                setReport(prev => ({...prev, ...data}));
                toast.success("El reporte ha sido actualizado");
            }
        });
        socket.on("commentAdded", (data) => {
            if (data.reportId === id || data.reportId === parseInt(id)) {
                setComments(prev => [data, ...prev]);
                toast.info("Nuevo comentario");
            }
        });
        return () => {
            socket.off("reportUpdate");
            socket.off("commentAdded");
        };
    }, [id]);
`;
if (!code.includes("socket.on(\"reportUpdate\"")) {
    code = code.replace("useEffect(() => {", `${effectCode}\n    useEffect(() => {`);
}
fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", code, "utf8");

let adminService = fs.readFileSync("apps/api/src/services/admin.service.js", "utf8");
if (!adminService.includes("getIO")) {
    adminService = "const { getIO } = require(\"../utils/socket\");\n" + adminService;
    adminService = adminService.replace("return { message: \"Reporte actualizado con éxito\"", "getIO().emit(\"reportUpdate\", updatedReport);\n      return { message: \"Reporte actualizado con éxito\"");
    fs.writeFileSync("apps/api/src/services/admin.service.js", adminService, "utf8");
}
let commentsService = fs.readFileSync("apps/api/src/services/comments.service.js", "utf8");
if (!commentsService.includes("getIO")) {
    commentsService = "const { getIO } = require(\"../utils/socket\");\n" + commentsService;
    commentsService = commentsService.replace("return newComment;", "getIO().emit(\"commentAdded\", newComment);\n    return newComment;");
    fs.writeFileSync("apps/api/src/services/comments.service.js", commentsService, "utf8");
}

