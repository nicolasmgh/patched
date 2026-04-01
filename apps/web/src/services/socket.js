import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace("/api", "")
    : "http://localhost:3000";

export const socket = io(SOCKET_URL, {
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    withCredentials: true,
    transports: ["websocket"], // Forzar websocket nativo para que Render no tire Timeouts en Polling
});

socket.on("connect", () => {
    console.log(
        "🔌 [Socket.io] Conectado exitosamente al servidor con ID:",
        socket.id,
    );
});

socket.on("connect_error", (err) => {
    console.error("❌ [Socket.io] Error de conexión:", err.message);
});
