
const PROXY_URL = '/api-bridge';
const DIRECT_URL = 'http://127.0.0.1:3001';

const fetchBridge = async (endpoint: string, options: RequestInit = {}, timeoutMs: number = 8000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs); 
    
    const headers = { 
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}) 
    };

    const fetchOptions = {
        ...options,
        headers,
        signal: controller.signal
    };

    try {
        // Tenta via Proxy do Vite (Geralmente em desenvolvimento)
        const res = await fetch(`${PROXY_URL}${endpoint}`, fetchOptions);
        clearTimeout(timeoutId);
        return await res.json();
    } catch (e) {
        // Fallback para conexão direta se o proxy falhar ou em produção local
        try {
            const resDirect = await fetch(`${DIRECT_URL}${endpoint}`, { 
                ...fetchOptions, 
                mode: 'cors' 
            });
            return await resDirect.json();
        } catch (directErr) {
            throw new Error("Bridge desconectado");
        }
    }
};

export const checkBridgeStatus = async () => {
    try { return await fetchBridge('/status', { method: 'GET' }, 2000); } 
    catch (error) { return { whatsapp: 'OFFLINE', server: 'OFFLINE' }; }
};

export const configureIugu = async (token: string, accountId: string) => {
    return await fetchBridge('/config/iugu', {
        method: 'POST',
        body: JSON.stringify({ token, accountId })
    });
};

export const createIuguInvoice = async (data: any) => {
    return await fetchBridge('/iugu/create-invoice', {
        method: 'POST',
        body: JSON.stringify(data)
    }, 15000);
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
