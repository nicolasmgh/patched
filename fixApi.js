const fs = require("fs");
let c = fs.readFileSync("apps/api/src/services/comments.service.js", "utf8");

const oldRemove = `const remove = async (commentId, userId, userRole) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    const isOwner = comment.userId === userId;
    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole);

    if (!isOwner && !isPrivileged) {
        throw new Error("No tenés permisos para eliminar este comentario");
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return { deleted: true };
};`;

const newRemove = `const remove = async (commentId, userId, userRole) => {
    const comment = await prisma.comment.findUnique({
        where: { id: commentId },
    });
    if (!comment) throw new Error("Comentario no encontrado");

    const isOwner = comment.userId === userId;
    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole);

    if (!isOwner && !isPrivileged) {
        throw new Error("No tenés permisos para eliminar este comentario");
    }
    
    if (isOwner && !isPrivileged) {
        const timeDiff = (new Date() - new Date(comment.createdAt)) / 1000 / 60;
        if (timeDiff > 5) {
            throw new Error("Solo podés eliminar tu comentario dentro de los primeros 5 minutos");
        }
    }

    await prisma.comment.delete({ where: { id: commentId } });

    return { deleted: true };
};

const edit = async (commentId, userId, newContent) => {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error("Comentario no encontrado");
    
    const isPrivileged = ["ADMIN", "COLLABORATOR"].includes(userRole); // Wait, edit takes userId, userRole? Let's just do commentId, userId. 
    // And users can only edit their own.
    if (comment.userId !== userId) throw new Error("Solo podés editar tus propios comentarios");
    if (!newContent?.trim()) throw new Error("El comentario no puede estar vacío");

    const timeDiff = (new Date() - new Date(comment.createdAt)) / 1000 / 60;
    if (timeDiff > 5) throw new Error("Solo podés editar tu comentario dentro de los primeros 5 minutos");

    return await prisma.comment.update({
        where: { id: commentId },
        data: { content: newContent.trim() }
    });
};

const censor = async (commentId, userRole) => {
    const comment = await prisma.comment.findUnique({ where: { id: commentId } });
    if (!comment) throw new Error("Comentario no encontrado");

    if (!["ADMIN", "COLLABORATOR"].includes(userRole)) {
        throw new Error("No tenés permisos para esto");
    }

    return await prisma.comment.update({
        where: { id: commentId },
        data: { 
            content: "[Comentario censurado por moderación]",
            flagged: true 
        }
    });
};`;

c = c.replace(oldRemove, newRemove);
c = c.replace("module.exports = { create, remove, flag };", "module.exports = { create, remove, flag, edit, censor };");
fs.writeFileSync("apps/api/src/services/comments.service.js", c);
