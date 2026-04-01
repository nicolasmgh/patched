
const prisma = require("./src/utils/prisma");
async function check(userId) {
    if(!userId) return;
    const count = await prisma.report.count({ where: { userId } });
    if(count === 1) {
        const b = await prisma.badge.findUnique({where: {name: "PRIMER_REPORTE"}});
        if(b) {
            await prisma.userBadge.upsert({
                where: { userId_badgeId: { userId, badgeId: b.id } },
                update: {},
                create: { userId, badgeId: b.id }
            })
        }
    }
}
module.exports = check;

