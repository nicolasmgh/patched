
require("dotenv").config({ path: "./.env" });
const prisma = require("./src/utils/prisma");

const badges = [
    { name: "PRIMER_REPORTE", description: "Creaste tu primer reporte", iconUrl: "/badges/primer-reporte.png" },
    { name: "REPORTERO_ACTIVO", description: "Realizaste 10 reportes validados", iconUrl: "/badges/reportero-activo.png" },
    { name: "FISCALIZADOR", description: "Validaste 5 reportes de otros vecinos", iconUrl: "/badges/fiscalizador.png" },
    { name: "HEROE_LOCAL", description: "50 reportes publicados", iconUrl: "/badges/heroe-local.png" },
    { name: "FOTOGRAFO_PRINCIPIANTE", description: "Subiste tu primera foto aprobada", iconUrl: "/badges/foto-1.png" },
    { name: "FOTOGRAFO_MAESTRO", description: "Aportaste 10 fotos validadas", iconUrl: "/badges/foto-10.png" },
    { name: "RESEÑADOR_EXPERTO", description: "Dejaste 5 comentarios en reportes", iconUrl: "/badges/resena.png" }
];

async function grant(userId, badgeName) {
    const b = await prisma.badge.findUnique({ where: { name: badgeName }});
    if (!b) return;
    await prisma.userBadge.upsert({
        where: { userId_badgeId: { userId, badgeId: b.id } },
        update: {},
        create: { userId, badgeId: b.id }
    });
}

async function seed() {
    console.log("Creando nuevas insignias...");
    // first upsert badges
    for (const b of badges) {
        // since prisma.badge might already have standard badges, let us just upsert
        const existing = await prisma.badge.findUnique({where: {name: b.name}});
        if(!existing){
           await prisma.badge.create({data: b});
        }else{
           await prisma.badge.update({where: {name: b.name}, data: {description: b.description}});
        }
    }

    console.log("Calculando retroactivos de badges...");
    const users = await prisma.user.findMany();
    
    for (const u of users) {
        const approvedReports = await prisma.report.count({ where: { userId: u.id, status: { in: ["APPROVED", "RESOLVED", "IN_PROGRESS"] } }});
        if (approvedReports >= 1) await grant(u.id, "PRIMER_REPORTE");
        if (approvedReports >= 10) await grant(u.id, "REPORTERO_ACTIVO");
        if (approvedReports >= 50) await grant(u.id, "HEROE_LOCAL");

        const confirms = await prisma.confirmation.count({ where: { userId: u.id } });
        if (confirms >= 5) await grant(u.id, "FISCALIZADOR");

        const photos = await prisma.media.count({ where: { userId: u.id, status: "APPROVED" }});
        if (photos >= 1) await grant(u.id, "FOTOGRAFO_PRINCIPIANTE");
        if (photos >= 10) await grant(u.id, "FOTOGRAFO_MAESTRO");

        const comments = await prisma.comment.count({ where: { userId: u.id, flagged: false } });
        if (comments >= 5) await grant(u.id, "RESEÑADOR_EXPERTO");
    }

    console.log("Listo retroactivos.");
    process.exit(0);
}

seed().catch((e)=> {console.error(e); process.exit(1)} );

