const fs = require("fs");
let content = fs.readFileSync("apps/web/src/pages/ReportDetail.jsx", "utf8");

content = content.replace(/Responder\s*<\/button>/, `Responder
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
                                                    )}`);

fs.writeFileSync("apps/web/src/pages/ReportDetail.jsx", content);
