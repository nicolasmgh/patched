const nodemailer = require("nodemailer");

// Configuración básica de transporter para enviar emails
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT || 587,
    secure: false, // true para 465, false para otros puertos
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

/**
 * Enviar un correo electrónico genérico.
 * @param {string} to Destinatario
 * @param {string} subject Asunto
 * @param {string} html Contenido en formato HTML
 */
const sendEmail = async (to, subject, html) => {
    try {
        const info = await transporter.sendMail({
            from: `"Patched" <${process.env.SMTP_USER}>`,
            to,
            subject,
            html,
        });
        console.log("Email enviado: %s", info.messageId);
        return info;
    } catch (error) {
        console.error("Error enviando email:", error);
    }
};

/**
 * Plantilla de email para nuevo reporte o actualización de estado
 */
const sendStatusUpdateEmail = async (to, userName, reportTitle, newStatus) => {
    const STATUS_MAP = {
        APPROVED: "Aprobado",
        REJECTED: "Rechazado",
        RESOLVED: "Resuelto",
        IN_PROGRESS: "En progreso",
    };

    const html = `
        <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto;">
            <h2 style="color: #059669;">Actualización en tu reporte</h2>
            <p>Hola <strong>${userName}</strong>,</p>
            <p>El reporte que subiste titulado <strong>"${reportTitle}"</strong> ha cambiado su estado a:</p>
            <h3 style="background: #f3f4f6; display: inline-block; padding: 10px 15px; border-radius: 5px;">${STATUS_MAP[newStatus] || newStatus}</h3>
            <p>Gracias por contribuir a tu ciudad.</p>
            <br/>
            <p style="font-size: 12px; color: #666;">El equipo de Patched</p>
        </div>
    `;

    return sendEmail(to, `Actualización de Reporte: ${reportTitle}`, html);
};

module.exports = {
    sendEmail,
    sendStatusUpdateEmail,
};
