
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

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

const IUGU_CONFIG_FILE = path.join(__dirname, 'iugu-config.json');
const SMTP_CONFIG_FILE = path.join(__dirname, 'smtp-config.json');

// --- WHATSAPP SETUP ---
let qrCodeBase64 = "";
let isReady = false;
let clientInfo = null;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        handleSIGINT: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

client.on('qr', (qr) => {
    qrcode.toDataURL(qr, (err, url) => {
        qrCodeBase64 = url;
        isReady = false;
    });
});

client.on('ready', () => {
    console.log('--- WHATSAPP READY ---');
    isReady = true;
    qrCodeBase64 = "";
    clientInfo = client.info;
});

client.on('disconnected', (reason) => {
    console.log('WhatsApp Disconnected:', reason);
    isReady = false;
    clientInfo = null;
    client.initialize();
});

client.initialize();

// --- HELPERS ---
function getIuguConfig() {
    if (fs.existsSync(IUGU_CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(IUGU_CONFIG_FILE)); } catch (e) { return null; }
    }
    return null;
}

function getSmtpConfig() {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE)); } catch (e) { return null; }
    }
    return null;
}

// --- ROTAS ---

app.get('/status', (req, res) => {
    const iugu = getIuguConfig();
    res.json({ 
        server: 'ONLINE', 
        whatsapp: isReady ? 'CONNECTED' : (qrCodeBase64 ? 'QR_READY' : 'INITIALIZING'),
        whatsapp_user: clientInfo ? clientInfo.wid.user : null,
        qr_code: qrCodeBase64,
        iugu: iugu ? 'CONFIGURED' : 'PENDING'
    });
});

app.get('/whatsapp/check-number/:number', async (req, res) => {
    if (!isReady) return res.status(400).json({ error: "WhatsApp não está conectado." });
    
    try {
        const number = req.params.number;
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        const isRegistered = await client.isRegisteredUser(chatId);
        res.json({ registered: isRegistered });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/send-email', async (req, res) => {
    const { to, subject, html, fromName } = req.body;
    const smtp = getSmtpConfig();

    if (!smtp) {
        console.log(`[SIMULAÇÃO EMAIL] De: ${fromName} Para: ${to} | Assunto: ${subject}`);
        return res.json({ success: true, message: "Modo simulação: configure o SMTP no servidor." });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: smtp.host,
            port: smtp.port,
            secure: smtp.port === 465,
            auth: { user: smtp.user, pass: smtp.pass }
        });

        await transporter.sendMail({
            from: `"${fromName}" <${smtp.user}>`,
            to,
            subject,
            html
        });

        res.json({ success: true });
    } catch (e) {
        console.error("Erro SMTP:", e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/whatsapp/logout', async (req, res) => {
    try {
        await client.logout();
        isReady = false;
        clientInfo = null;
        res.json({ success: true, message: "Desconectado. Aguarde o novo QR Code." });
    } catch (e) {
        res.status(500).json({ error: "Erro ao desconectar WhatsApp" });
    }
});

app.post('/send-whatsapp', async (req, res) => {
    const { number, message } = req.body;
    if (!isReady) return res.status(400).json({ error: "WhatsApp não está conectado." });
    
    try {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        await client.sendMessage(chatId, message);
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- ROTAS IUGU ---
app.post('/config/iugu', (req, res) => {
    const { token, accountId } = req.body;
    fs.writeFileSync(IUGU_CONFIG_FILE, JSON.stringify({ token, accountId }));
    res.json({ success: true });
});

app.post('/iugu/create-invoice', async (req, res) => {
    const config = getIuguConfig();
    if (!config || !config.token) return res.status(400).json({ error: "Iugu não configurada." });

    try {
        const response = await axios.post('https://api.iugu.com/v1/invoices', req.body, {
            params: { api_token: config.token }
        });
        res.json(response.data);
    } catch (e) {
        res.status(e.response?.status || 500).json(e.response?.data || { error: e.message });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 NEXUS BRIDGE ONLINE - PORTA ${PORT}`);
});
