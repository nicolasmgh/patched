const fs = require('fs');
let content = fs.readFileSync('C:/Users/nicol/Desktop/patched/apps/web/src/pages/Stats.jsx', 'utf-8');
const search = '</>\n                )}\n            </div>\n        </div>\n    );\n}';
const insert = <br/>
                        {tab === 'leaderboard' && leaderboard && (
                            <div className=\"bg-white rounded-xl border border-gray-200 p-6 overflow-hidden\">
                                <h3 className=\"text-gray-500 font-medium mb-6 uppercase text-sm tracking-wider\">
                                    Ranking de Vecinos
                                </h3>
                                <div className=\"space-y-4\">
                                    {leaderboard.map((u, i) => (
                                        <div key={u.id} className=\"flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-emerald-50 transition border border-gray-100\">
                                            <div className=\"flex items-center gap-4\">
                                                <div className=\"w-8 text-center font-bold text-gray-400\">#{i + 1}</div>
                                                <img src={u.avatarUrl || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + u.username} alt=\"Avatar\" className=\"w-10 h-10 rounded-full border-2 cursor-pointer shadow-sm\" />
                                                <div>
                                                    <p className=\"font-bold text-gray-800\">{u.firstName} {u.lastName}</p>
                                                    <p className=\"text-xs text-gray-500\">@{u.username} • {u._count.reports} reportes creados</p>
                                                </div>
                                            </div>
                                            <div className=\"flex flex-col items-end\">
                                                <span className=\"px-3 py-1 bg-emerald-100 text-emerald-700 font-bold rounded-full text-sm\">
                                                    {u.reputation} ptos
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

content = content.replace(search, insert);
fs.writeFileSync('C:/Users/nicol/Desktop/patched/apps/web/src/pages/Stats.jsx', content, 'utf-8');
