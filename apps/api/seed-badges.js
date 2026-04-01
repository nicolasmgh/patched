
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const badges = [
    { name: "PRIMER_REPORTE", description: "Creaste tu primer reporte", iconUrl: "??" },
    { name: "REPORTERO_ACTIVO", description: "Realizaste 10 reportes validados", iconUrl: "??" },
    { name: "FISCALIZADOR", description: "Validaste 5 reportes de otros vecinos", iconUrl: "???" },
    { name: "HEROE_LOCAL", description: "50 reportes publicados", iconUrl: "??" }
];

async function seed() {
    for (const b of badges) {
        await prisma.badge.upsert({
            where: { name: b.name },
            update: {},
            create: b,
        });
    }
    console.log("Badges definidos/actualizados correctamente.");
}

seed().catch(console.error).finally(() => prisma.$disconnect());

