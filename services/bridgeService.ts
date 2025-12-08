
// Serviço de Ponte com Backend Local
// Usa Fallback: Proxy -> Direto

const PROXY_URL = '/api-bridge';
const DIRECT_URL = 'http://127.0.0.1:3001';

// Função auxiliar para fetch com tratamento de erro
const fetchBridge = async (endpoint: string, options: RequestInit = {}) => {
    // Configurações base
    const defaultOptions: RequestInit = {
        ...options,
        mode: 'cors',
        // credentials: 'omit', // Removido para testar permissividade total
        cache: 'no-store',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };

    // 1. Tentativa via Proxy (Vite - Localhost)
    // Tenta usar o proxy configurado no vite.config.ts para contornar CORS
    try {
        // Usar 'same-origin' ajuda se o proxy estiver funcionando corretamente
        const resProxy = await fetch(`${PROXY_URL}${endpoint}`, { ...defaultOptions, mode: 'same-origin' });
        if (resProxy.ok) return await resProxy.json();
    } catch (e) {
        // Silencioso: Proxy falhou, tentar direto
    }

    // 2. Tentativa Direta (Fallback)
    // Se o proxy falhar (ex: em produção build ou erro de config), tenta bater direto no IP
    // Nota: Isso geralmente requer que o backend aceite CORS/PNA
    try {
        const resDirect = await fetch(`${DIRECT_URL}${endpoint}`, defaultOptions);
        if (!resDirect.ok) {
            // Se respondeu mas com erro (ex: 500), lança
            throw new Error(`Erro HTTP: ${resDirect.status}`);
        }
        return await resDirect.json();
    } catch (e: any) {
        console.warn("Falha na conexão Bridge:", e.message);
        // Retorna um erro formatado para a UI não quebrar totalmente
        throw new Error("Bridge desconectado");
    }
};

export const checkBridgeStatus = async () => {
    // Adiciona timestamp para evitar cache agressivo do navegador em caso de erro anterior
    try {
        return await fetchBridge(`/status?t=${Date.now()}`);
    } catch (error) {
        // Retorna status offline padrão se falhar
        return { whatsapp: 'OFFLINE', smtp: 'OFFLINE', server: 'OFFLINE' };
    }
};

export const getBridgeQR = async () => {
    try {
        return await fetchBridge(`/qr?t=${Date.now()}`);
    } catch (error) {
        return null;
    }
};

export const configureBridgeSMTP = async (config: { host: string, port: number, user: string, pass: string }) => {
    return await fetchBridge('/config/smtp', {
        method: 'POST',
        body: JSON.stringify(config)
    });
};

export const sendBridgeWhatsApp = async (phone: string, message: string) => {
    return await fetchBridge('/send-whatsapp', {
        method: 'POST',
        body: JSON.stringify({ number: phone, message })
    });
};

export const sendBridgeEmail = async (to: string, subject: string, html: string, fromName: string) => {
    return await fetchBridge('/send-email', {
        method: 'POST',
        body: JSON.stringify({ to, subject, html, fromName })
    });
};
