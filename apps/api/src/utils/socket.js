let io;

module.exports = {
    init: (server) => {
        const { Server } = require("socket.io");
        console.log("Inicializando Socket.io...");
        io = new Server(server, {
            cors: {
                origin: (origin, callback) => {
                    callback(null, true);
                },
                methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
                credentials: true,
            },
        });
        return io;
    },
    getIO: () => {
        if (!io) {
            console.error(
                "Error: Intentaron llamar a getIO() antes de inicializar el servidor",
            );
            throw new Error("Socket.io not initialized!");
        }
        return io;
    },
    emitNotification: (notif) => {
        if (io && notif) {
            console.log(
                `[Socket] Emitiendo newNotification a userId: ${notif.userId}`,
            );
            io.emit("newNotification", notif);
        }
    },
};
