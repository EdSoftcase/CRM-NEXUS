
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const http = require('http');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const PORT = 3001;

// 1. MIDDLEWARES (Deve vir ANTES das rotas)
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const CONFIG_FILE = path.join(__dirname, 'smtp-config.json');
const IUGU_CONFIG_FILE = path.join(__dirname, 'iugu-config.json');

// --- HELPER: CARREGAR CONFIG SMTP ---
function getSMTPConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(CONFIG_FILE));
        } catch (e) {
            return null;
        }
    }
    return null;
}

// --- ROTAS ---

app.get('/status', (req, res) => {
    res.json({ server: 'ONLINE', whatsapp: 'OFFLINE', timestamp: new Date().toISOString() });
});

app.post('/config/iugu', (req, res) => {
    const { token, accountId } = req.body;
    fs.writeFileSync(IUGU_CONFIG_FILE, JSON.stringify({ token, accountId }, null, 2));
    res.json({ success: true });
});

// ROTA DE EMAIL CORRIGIDA
app.post('/send-email', async (req, res) => {
    console.log("[SMTP] 📩 Requisição recebida em /send-email");
    console.log("[SMTP] Headers:", req.headers['content-type']);
    console.log("[SMTP] Body Keys:", Object.keys(req.body));

    const { to, subject, html, fromName } = req.body;

    if (!to) {
        console.error("[SMTP] ❌ Erro: Destinatário (to) não definido no corpo da requisição.");
        return res.status(400).json({ error: 'Destinatário não definido.' });
    }

    const config = getSMTPConfig();
    if (!config || !config.host) {
        console.warn("[SMTP] ⚠️ Configuração SMTP não encontrada. Usando modo simulado (Log).");
        console.log(`[MOCK EMAIL] Para: ${to} | Assunto: ${subject}`);
        return res.json({ success: true, message: 'Simulado (SMTP não configurado)' });
    }

    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.port === 465,
            auth: {
                user: config.user,
                pass: config.pass,
            },
        });

        await transporter.sendMail({
            from: `"${fromName || 'Nexus CRM'}" <${config.user}>`,
            to,
            subject,
            html,
        });

        console.log(`[SMTP] ✅ E-mail enviado com sucesso para: ${to}`);
        res.json({ success: true });
    } catch (error) {
        console.error("[SMTP] ❌ Erro ao enviar e-mail:", error.message);
        res.status(500).json({ error: 'Falha ao enviar e-mail via SMTP.', details: error.message });
    }
});

// ROTA IUGU
app.post('/iugu/create-invoice', async (req, res) => {
    const configPath = path.join(__dirname, 'iugu-config.json');
    if (!fs.existsSync(configPath)) return res.status(400).json({ error: 'Iugu não configurada.' });
    
    const iuguConfig = JSON.parse(fs.readFileSync(configPath));
    
    try {
        const response = await axios.post('https://api.iugu.com/v1/invoices', req.body, {
            headers: { 'Authorization': `Basic ${Buffer.from(iuguConfig.token + ':').toString('base64')}` }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json(error.response?.data || { error: 'Falha na Iugu' });
    }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ NEXUS BRIDGE ONLINE EM http://127.0.0.1:${PORT}`);
});
