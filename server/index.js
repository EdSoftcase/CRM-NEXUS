
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const nodemailer = require('nodemailer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors'); 

const app = express();
const server = http.createServer(app);

const PORT = 3001;

// --- CONFIGURAÇÃO DE SEGURANÇA (CORS ROBUSTO) ---
// Substitui middleware manual para evitar problemas de preflight
app.use(cors({
    origin: '*', // Permite todas as origens (Front na porta 3000, 5173, etc)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Access-Control-Allow-Private-Network'],
    credentials: false // Simplifica conexão local
}));

// Header adicional para Chrome (Private Network Access)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Private-Network", "true");
    console.log(`[REQUEST] ${req.method} ${req.url} - IP: ${req.ip}`);
    next();
});

app.use(express.json());

const io = new Server(server, {
  cors: { 
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const CONFIG_FILE = path.join(__dirname, 'smtp-config.json');

// --- STATE ---
let qrCodeData = null;
let whatsappStatus = 'DISCONNECTED'; 
let whatsappClient = null;

// --- CONFIGURAÇÃO SMTP ---
let smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user: '', pass: '' }
};

if (fs.existsSync(CONFIG_FILE)) {
    try {
        smtpConfig = JSON.parse(fs.readFileSync(CONFIG_FILE));
        console.log(`📧 SMTP Config Loaded: ${smtpConfig.auth.user}`);
    } catch (err) {
        console.error('Erro config SMTP:', err);
    }
}

const saveSmtpConfig = () => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(smtpConfig, null, 2));
    } catch (err) {
        console.error('Erro salvar config:', err);
    }
};

// --- WHATSAPP ---
const initializeWhatsApp = () => {
    try {
        console.log('Iniciando WhatsApp...');
        whatsappClient = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            }
        });

        whatsappClient.on('qr', (qr) => {
            console.log('👉 QR Code Novo Gerado!');
            qrCodeData = qr;
            whatsappStatus = 'QR_READY';
            io.emit('wa_status', { status: whatsappStatus, qr: qrCodeData });
        });

        whatsappClient.on('ready', () => {
            console.log('✅ WhatsApp Conectado!');
            whatsappStatus = 'READY';
            qrCodeData = null;
            io.emit('wa_status', { status: whatsappStatus });
        });

        whatsappClient.on('auth_failure', msg => {
            console.error('❌ Falha Auth WA', msg);
            whatsappStatus = 'DISCONNECTED';
        });

        whatsappClient.on('disconnected', (reason) => {
            console.log('❌ WA Desconectado:', reason);
            whatsappStatus = 'DISCONNECTED';
            setTimeout(() => {
                try { whatsappClient.initialize(); } catch(e){}
            }, 5000);
        });

        whatsappClient.initialize();
    } catch (e) {
        console.error("Erro fatal WA:", e);
    }
};

initializeWhatsApp();

// --- ROTAS ---

// Rota de Diagnóstico (Importante para testes simples)
app.get('/', (req, res) => {
    res.json({ status: 'Online', service: 'Nexus Bridge Server' });
});

app.get('/status', (req, res) => {
    res.json({ 
        whatsapp: whatsappStatus,
        smtp: smtpConfig.auth.user ? 'CONFIGURED' : 'MISSING_CREDENTIALS',
        server: 'ONLINE',
        mode: 'HYBRID_MODE'
    });
});

app.get('/qr', async (req, res) => {
    const qrcodeLib = require('qrcode');
    if (qrCodeData) {
        try {
            const imgUrl = await qrcodeLib.toDataURL(qrCodeData);
            res.json({ qrImage: imgUrl });
        } catch (err) {
            res.status(500).json({ error: 'Erro geração QR' });
        }
    } else {
        if(whatsappStatus === 'READY') {
             res.json({ status: 'CONNECTED', message: 'WhatsApp conectado' });
        } else {
             // Retorna 200 com status vazio para evitar erro no front
             res.json({ status: 'WAITING', message: 'Aguardando QR Code...' });
        }
    }
});

app.post('/config/smtp', (req, res) => {
    const { host, port, user, pass } = req.body;
    console.log(`[CONFIG] Atualizando SMTP: ${user}`);
    smtpConfig = { host, port, secure: port === 465, auth: { user, pass } };
    saveSmtpConfig();
    res.json({ success: true });
});

app.post('/send-whatsapp', async (req, res) => {
    if (whatsappStatus !== 'READY') return res.status(400).json({ error: 'WhatsApp Offline' });
    const { number, message } = req.body;
    
    if(!number || !message) return res.status(400).json({ error: 'Dados incompletos' });

    let cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) cleanNumber = '55' + cleanNumber;
    
    const chatId = `${cleanNumber}@c.us`;
    
    try {
        await whatsappClient.sendMessage(chatId, message);
        console.log(`Msg WA -> ${cleanNumber}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Erro envio WA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-email', async (req, res) => {
    const { to, subject, html, fromName } = req.body;
    console.log(`[SMTP] Enviando para: ${to}`);

    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
        return res.status(400).json({ error: 'SMTP não configurado no servidor.' });
    }

    const transporter = nodemailer.createTransport(smtpConfig);
    
    try {
        await transporter.verify();
        await transporter.sendMail({
            from: `"${fromName || 'Nexus CRM'}" <${smtpConfig.auth.user}>`,
            to, subject, html
        });
        
        console.log(`[SMTP] ✅ Sucesso para ${to}`);
        res.json({ success: true });
    } catch (error) {
        console.error("[SMTP] ❌ Erro:", error.message);
        res.status(500).json({ error: error.message });
    }
});

// Fallback para rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: 'Rota não encontrada no Bridge Server' });
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} ocupada! O servidor já está rodando ou outro processo está usando a porta.`);
    console.error(`   Tente 'killall node' ou feche outros terminais.`);
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`
===============================================
   ✅ NEXUS BRIDGE ONLINE (V3.2 STABLE)
===============================================
   📡 URL: http://127.0.0.1:${PORT}
   🛡️  CORS: Habilitado (Todas as origens)
===============================================
`);
});
