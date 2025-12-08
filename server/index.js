
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const nodemailer = require('nodemailer');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const PORT = 3001;

// --- MIDDLEWARE DE SEGURANÇA (CORS REFLETIVO - PROOF OF BULLET) ---
// Para satisfazer o Chrome/Edge em redes locais (PNA), precisamos de:
// 1. O header 'Access-Control-Allow-Private-Network'.
// 2. CORS permissivo.
app.use((req, res, next) => {
    const origin = req.headers.origin;

    // Estratégia Híbrida:
    // Se tem origem definida, reflete ela para permitir credenciais se necessário.
    // Se não tem (ex: Postman ou Proxy server-side), libera geral (*).
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Private-Network', 'true'); // Essencial para Chrome PNA

    // Responder imediatamente ao Preflight
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    console.log(`[IN] ${req.method} ${req.url} | Origin: ${origin || 'Unknown/Proxy'}`);
    
    next();
});

app.use(express.json());

const io = new Server(server, {
  cors: { 
    origin: true,
    credentials: true,
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
    } catch (err) {}
}

const saveSmtpConfig = () => {
    try {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(smtpConfig, null, 2));
    } catch (err) {
        console.error('Erro ao salvar config:', err);
    }
};

// --- WHATSAPP ---
const initializeWhatsApp = () => {
    try {
        console.log('Iniciando cliente WhatsApp...');
        whatsappClient = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                headless: true
            }
        });

        whatsappClient.on('qr', (qr) => {
            console.log('👉 QR Code Gerado!');
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
        console.error("Erro fatal init WA:", e);
    }
};

initializeWhatsApp();

// --- ROTAS ---

app.get('/status', (req, res) => {
    res.json({ 
        whatsapp: whatsappStatus,
        smtp: smtpConfig.auth.user ? 'CONFIGURED' : 'MISSING_CREDENTIALS',
        server: 'ONLINE'
    });
});

app.get('/qr', async (req, res) => {
    const qrcodeLib = require('qrcode');
    if (qrCodeData) {
        try {
            const imgUrl = await qrcodeLib.toDataURL(qrCodeData);
            res.json({ qrImage: imgUrl });
        } catch (err) {
            res.status(500).json({ error: 'Erro ao gerar imagem do QR' });
        }
    } else {
        if(whatsappStatus === 'READY') {
             res.json({ status: 'CONNECTED', message: 'WhatsApp já conectado' });
        } else {
             res.status(404).json({ error: 'QR Code ainda não gerado. Aguarde...' });
        }
    }
});

app.post('/config/smtp', (req, res) => {
    const { host, port, user, pass } = req.body;
    smtpConfig = { host, port, secure: port === 465, auth: { user, pass } };
    saveSmtpConfig();
    res.json({ success: true });
});

app.post('/send-whatsapp', async (req, res) => {
    if (whatsappStatus !== 'READY') return res.status(400).json({ error: 'WhatsApp Offline' });
    const { number, message } = req.body;
    
    if(!number || !message) return res.status(400).json({ error: 'Número e mensagem obrigatórios' });

    let cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber.length <= 11 && !cleanNumber.startsWith('55')) cleanNumber = '55' + cleanNumber;
    
    const chatId = `${cleanNumber}@c.us`;
    
    try {
        await whatsappClient.sendMessage(chatId, message);
        console.log(`Msg enviada para ${cleanNumber}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Erro envio WA:", error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/send-email', async (req, res) => {
    const { to, subject, html, fromName } = req.body;
    if (!smtpConfig.auth.user) return res.status(400).json({ error: 'SMTP Offline / Não configurado' });

    const transporter = nodemailer.createTransport(smtpConfig);
    try {
        await transporter.sendMail({
            from: `"${fromName || 'Nexus'}" <${smtpConfig.auth.user}>`,
            to, subject, html
        });
        console.log(`Email enviada para ${to}`);
        res.json({ success: true });
    } catch (error) {
        console.error("Erro envio Email:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- TRATAMENTO DE ERROS DE SERVIDOR ---
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('\x1b[31m%s\x1b[0m', `
    =========================================================
    ❌ ERRO CRÍTICO: A PORTA ${PORT} JÁ ESTÁ SENDO USADA!
    =========================================================
    Parece que você já tem uma instância do servidor rodando.
    
    SOLUÇÃO:
    1. Feche outros terminais abertos.
    2. Se persistir, abra o Gerenciador de Tarefas e feche "Node.js".
    3. Tente rodar 'npm start' novamente.
    `);
    process.exit(1);
  } else {
    console.error('Erro no servidor:', e);
  }
});

// Graceful Shutdown
process.on('SIGINT', () => {
    console.log('Encerrando servidor...');
    server.close(() => {
        console.log('Porta liberada.');
        process.exit(0);
    });
});

// ESCUTAR EM TODAS AS INTERFACES
server.listen(PORT, '0.0.0.0', () => {
    console.clear();
    console.log('\x1b[32m%s\x1b[0m', `
    =====================================================
       ✅ NEXUS BRIDGE ONLINE (MODO HÍBRIDO)
    =====================================================
    `);
    console.log(`📡 Backend pronto: http://127.0.0.1:${PORT}`);
    console.log(`🛡️  Segurança PNA: Ativada.`);
});
