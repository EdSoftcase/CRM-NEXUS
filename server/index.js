
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

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const SMTP_CONFIG_FILE = path.join(__dirname, 'smtp-config.json');
const IUGU_CONFIG_FILE = path.join(__dirname, 'iugu-config.json');

// Helpers: Carregar Configs
function getSMTPConfig() {
    if (fs.existsSync(SMTP_CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(SMTP_CONFIG_FILE)); } catch (e) { return null; }
    }
    return null;
}

function getIuguConfig() {
    if (fs.existsSync(IUGU_CONFIG_FILE)) {
        try { return JSON.parse(fs.readFileSync(IUGU_CONFIG_FILE)); } catch (e) { return null; }
    }
    return null;
}

// --- ROTAS GERAIS ---

app.get('/status', (req, res) => {
    const iugu = getIuguConfig();
    res.json({ 
        server: 'ONLINE', 
        whatsapp: 'OFFLINE', 
        iugu: iugu ? 'CONFIGURED' : 'PENDING',
        timestamp: new Date().toISOString()
    });
});

// --- ROTAS IUGU ---

app.post('/config/iugu', (req, res) => {
    const { token, accountId } = req.body;
    try {
        fs.writeFileSync(IUGU_CONFIG_FILE, JSON.stringify({ token, accountId }));
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Erro ao salvar config Iugu' });
    }
});

app.post('/iugu/create-invoice', async (req, res) => {
    const config = getIuguConfig();
    if (!config || !config.token) {
        return res.status(500).json({ error: 'Iugu não configurada no Bridge.' });
    }

    try {
        const { email, due_date, items, customer_name, payer_cpf_cnpj } = req.body;

        const response = await axios.post('https://api.iugu.com/v1/invoices', {
            email,
            due_date,
            items,
            payer: {
                cpf_cnpj: payer_cpf_cnpj,
                name: customer_name
            },
            payment_methods: ["pix", "bank_slip", "credit_card"]
        }, {
            headers: {
                'Authorization': `Basic ${Buffer.from(config.token + ':').toString('base64')}`,
                'Content-Type': 'application/json'
            }
        });

        res.json(response.data);
    } catch (error) {
        console.error("[IUGU] Erro API:", error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Falha na comunicação com a Iugu.', 
            details: error.response?.data || error.message 
        });
    }
});

// --- ROTAS SMTP ---

app.post('/send-email', async (req, res) => {
    const { to, subject, html, fromName } = req.body;
    const config = getSMTPConfig();
    if (!config || !config.host) return res.status(500).json({ error: 'SMTP não configurado.' });

    try {
        const transporter = nodemailer.createTransport({
            host: config.host,
            port: parseInt(config.port),
            secure: config.port == 465,
            auth: { user: config.user, pass: config.pass },
            tls: { rejectUnauthorized: false }
        });

        await transporter.sendMail({
            from: `"${fromName || 'Nexus CRM'}" <${config.user}>`,
            to,
            subject,
            html,
        });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Falha no SMTP.', details: error.message });
    }
});

// --- ROTAS WHATSAPP (MOCK) ---
app.post('/send-whatsapp', async (req, res) => {
    const { number, message } = req.body;
    console.log(`[WA] Simulação de envio para ${number}: ${message}`);
    res.json({ success: true, mock: true });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
  🚀 NEXUS BRIDGE ONLINE - PORTA ${PORT}
  -----------------------------------
  Iugu API: ${fs.existsSync(IUGU_CONFIG_FILE) ? 'PRONTO' : 'PENDENTE'}
  SMTP: ${fs.existsSync(SMTP_CONFIG_FILE) ? 'PRONTO' : 'PENDENTE'}
  -----------------------------------
  `);
});
