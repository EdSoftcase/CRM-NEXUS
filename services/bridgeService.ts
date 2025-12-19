
const PROXY_URL = '/api-bridge';
const DIRECT_URL = 'http://127.0.0.1:3001';

/**
 * Sanitiza o número de telefone para o padrão exigido pelo WhatsApp
 */
const sanitizePhone = (phone: string): string => {
    let clean = phone.replace(/\D/g, '');
    if (clean.length >= 10 && clean.length <= 11 && !clean.startsWith('55')) {
        clean = '55' + clean;
    }
    return clean;
};

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
        // Tenta pelo Proxy do Vite (Ambiente de Dev)
        const res = await fetch(`${PROXY_URL}${endpoint}`, fetchOptions);
        const data = await res.json();
        clearTimeout(timeoutId);
        return data;
    } catch (e: any) {
        // Se falhou por timeout ou erro de rede, tenta direto na porta 3001
        try {
            const resDirect = await fetch(`${DIRECT_URL}${endpoint}`, { ...fetchOptions, mode: 'cors' });
            const data = await resDirect.json();
            clearTimeout(timeoutId);
            return data;
        } catch (directErr: any) {
            clearTimeout(timeoutId);
            // Captura "Failed to fetch" e transforma em mensagem amigável
            const isNetworkError = directErr.message === 'Failed to fetch' || directErr.name === 'AbortError';
            throw new Error(isNetworkError 
                ? "Nexus Bridge Offline. Certifique-se que o servidor local (porta 3001) está rodando." 
                : directErr.message
            );
        }
    }
};

export const checkBridgeStatus = async () => {
    try { 
        return await fetchBridge('/status', { method: 'GET' }, 2000); 
    } catch (error) { 
        return { whatsapp: 'OFFLINE', server: 'OFFLINE', error: true }; 
    }
};

export const sendBridgeWhatsApp = async (phone: string, message: string) => {
    const sanitizedNumber = sanitizePhone(phone);
    return await fetchBridge('/send-whatsapp', { 
        method: 'POST', 
        body: JSON.stringify({ number: sanitizedNumber, message }) 
    });
};

export const sendBridgeEmail = async (to: string, subject: string, html: string, fromName: string) => {
    return await fetchBridge('/send-email', { 
        method: 'POST', 
        body: JSON.stringify({ to, subject, html, fromName }) 
    });
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
