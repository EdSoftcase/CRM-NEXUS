
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend, Client } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Chave de API não configurada");
    return new GoogleGenAI({ apiKey });
};

export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        const ai = getAI();
        const prompt = `Analise concorrente "${name}" (${website}) no setor ${sector}. 
        Retorne APENAS um objeto JSON com chaves:
        "swot": {"strengths": [], "weaknesses": [], "opportunities": [], "threats": []},
        "battlecard": {"pricing": "", "killPoints": [], "defensePoints": []}.
        Arrays curtos (3 itens). Seja conciso.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { 
        console.error("Gemini Analysis Error:", error);
        return {}; 
    }
};

export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        const ai = getAI();
        const prompt = `Liste as 5 principais tendências tecnológicas atuais para ${sector}. 
        Retorne um array JSON de objetos: id, title, description, sentiment (Positive/Negative), impact (High/Medium/Low).`;
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { 
        console.error("Trends Error:", error);
        return []; 
    }
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Busque 5 leads reais para "${industry}" em "${location}". Filtro: ${keywords}. 
            Retorne array JSON: companyName, industry, location, matchScore (0-100), reason, suggestedApproach, email, phone.`,
            config: {
                responseMimeType: "application/json",
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { 
        console.error("Gemini Prospecting Error:", error);
        return []; 
    }
};

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: PRO_MODEL, 
            contents: `Gere uma copy para ${channel} com tom ${tone} sobre: ${topic}. Seja criativo.` 
        });
        return response.text || "Conteúdo indisponível.";
    } catch (error) { return "Erro no motor de IA."; }
};

export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: MODEL_NAME, 
            contents: `Analista BI. Dados: ${JSON.stringify(context)}. Pergunta: ${question}. Responda de forma executiva.` 
        });
        return response.text || "Análise indisponível.";
    } catch (error) { return "Erro BI."; }
};

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: MODEL_NAME, 
            contents: `Resumo executivo em 1 frase: MRR R$${metrics.mrr}, Churn ${metrics.churn_rate}%, ${metrics.open_leads} leads novos.` 
        });
        return response.text || "Operação estável.";
    } catch (error) { return "Resumo off."; }
};

export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise ticket: ${ticket.subject}. Retorne JSON: {"sentiment": "Positivo/Negativo/Neutro", "suggestedAction": "..."}`,
            config: { responseMimeType: "application/json" }
        });
        return response.text || "{}";
    } catch (error) { return "{}"; }
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    try {
        const ai = getAI();
        let contents: any = command;
        if (audioBase64) { 
            contents = { 
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, 
                    { text: "Interprete comando CRM. Retorne JSON: action (create_lead, create_task, none), data (objeto), message (confirmação)." }
                ] 
            }; 
        }
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || "{}");
    } catch (error) { return { action: "none", message: "Erro voz." }; }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            contents: { 
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, 
                    { text: "Resuma chamada de ${duration}. Retorne JSON: sentiment, summary, nextSteps." }
                ] 
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return { sentiment: "Neutro", summary: "Erro áudio." }; }
};

export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Checklist técnico (5 itens) para projeto: ${title}. Contexto: ${description}. Retorne JSON Array.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};
