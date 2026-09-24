const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.report.findMany({
    include: {
        reporter: { select: { id: true, username: true, name: true } },
        reportedUser: { select: { id: true, username: true, name: true } },
        flaggedMessage: true
    }
})
    .then(res => {
        console.log("Success! Include query returned reports count:", res.length);
        process.exit(0);
    })
    .catch(err => {
        console.error("Include query failed!");
        console.error(err);
        process.exit(1);
    });
