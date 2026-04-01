const fs = require("fs");
let content = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");

const oldCode = `<button onClick={() => {    
                                                        if (!user) { if (window.confirm("Debes iniciar sesión para responder. ¿Ir a Login?")) navigate("/login"); return; }
                                                        handleReplyPrompt(c.user.username || c.user.firstName);
                                                    }} className="text-xs text-gray-400 hover:text-emerald-600 transition cursor-pointer">
                                                        Responder
                                                    </button>`;

const newCode = `<button onClick={() => {    
                                                        if (!user) { if (window.confirm("Debes iniciar sesión para responder. ¿Ir a Login?")) navigate("/login"); return; }
                                                        handleReplyPrompt(c.user.username || c.user.firstName);
                                                    }} className="text-xs text-gray-400 hover:text-emerald-600 transition cursor-pointer">
                                                        Responder
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
                                                        <button onClick={() => handleCensorComment(c.id)} className="text-xs text-gray-400 hover:text-orange-600 transition cursor-pointer">
                                                            Censurar
                                                        </button>
                                                    )}`;

content = content.replace(oldCode, newCode);
fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", content);
