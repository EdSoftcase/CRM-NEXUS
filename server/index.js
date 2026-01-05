
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const SMTP_CONFIG_FILE = path.join(__dirname, 'smtp-config.json');

const logWithTime = (msg) => {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    console.log(`[${now}] ${msg}`);
};

// --- HELPERS ---
function getSmtpConfig() {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE)); } catch (e) { return null; }
    }
    return null;
}

// --- ROTAS ---

app.get('/status', (req, res) => {
    const smtp = getSmtpConfig();
    res.json({ 
        server: 'ONLINE', 
        smtp: smtp ? { configured: true, user: smtp.user } : { configured: false },
        bridge_version: "2.1.0"
    });
});

app.post('/send-email', async (req, res) => {
    const { to, subject, html, fromName } = req.body;
    const smtp = getSmtpConfig();

    if (!smtp) {
        return res.status(400).json({ 
            success: false, 
            error: "Arquivo server/smtp-config.json não encontrado ou inválido." 
        });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: parseInt(smtp.port),
            secure: parseInt(smtp.port) === 465,
            auth: { user: smtp.user, pass: smtp.pass },
            tls: { rejectUnauthorized: false }
        });

        // Verifica a conexão antes de tentar enviar
        await transporter.verify();

        await transporter.sendMail({
            from: `"${fromName}" <${smtp.user}>`,
            to,
            subject,
            html
        });

        logWithTime(`E-mail enviado para: ${to}`);
        res.json({ success: true });
    } catch (e) {
        logWithTime(`ERRO SMTP: ${e.message}`);
        res.status(500).json({ 
            success: false, 
            error: e.code === 'EAUTH' ? "Falha de Autenticação: Verifique usuário e senha de app." : e.message 
        });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    logWithTime(`🚀 NEXUS BRIDGE ONLINE - PORTA ${PORT}`);
});
