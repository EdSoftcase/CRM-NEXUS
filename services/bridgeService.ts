
// Serviço de Ponte com Backend Local
// Estratégia: Prioridade Proxy (evita CORS/HTTPS mixto) -> Fallback Direto

const PROXY_URL = '/api-bridge';
const DIRECT_URL = 'http://127.0.0.1:3001';

// Função auxiliar para fetch com tratamento de erro e TIMEOUT
const fetchBridge = async (endpoint: string, options: RequestInit = {}) => {
    const controller = new AbortController();
    // Timeout curto para não travar a interface se o servidor não responder
    const timeoutId = setTimeout(() => controller.abort(), 3000); 

    const defaultOptions: RequestInit = {
        ...options,
        signal: controller.signal,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    };

    // 1. TENTATIVA VIA PROXY (Preferencial para evitar erros de CORS no navegador)
    try {
        const resProxy = await fetch(`${PROXY_URL}${endpoint}`, defaultOptions);
        clearTimeout(timeoutId);

        if (resProxy.ok) {
            return await resProxy.json();
        }
    } catch (proxyError: any) {
        // Falha silenciosa no proxy, tenta a conexão direta
        clearTimeout(timeoutId); 
    }

    // 2. TENTATIVA DIRETA (Fallback Local - caso o proxy do Vite não esteja ativo)
    try {
        const controllerDirect = new AbortController();
        const timeoutDirect = setTimeout(() => controllerDirect.abort(), 2000); // 2s timeout
        
        const resDirect = await fetch(`${DIRECT_URL}${endpoint}`, {
            ...options,
            signal: controllerDirect.signal,
            mode: 'cors' 
        });
        
        clearTimeout(timeoutDirect);

        if (resDirect.ok) {
            return await resDirect.json();
        }
    } catch (directError: any) {
        // Se ambos falharem, lançamos um erro genérico tratado
        // Isso evita o spam de "Critical Failure" no console do navegador
        throw new Error("Bridge desconectado");
    }

    throw new Error("Bridge desconectado");
};

export const checkBridgeStatus = async () => {
    try {
        // Timestamp evita cache do navegador
        return await fetchBridge(`/status?t=${Date.now()}`);
    } catch (error) {
        // Retorna status offline graciosamente para a UI
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
