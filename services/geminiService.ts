
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend, Client } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

// Função para converter texto bruto (OCR/Cópia) em objetos de Cliente estruturados
export const parseRawContactList = async (rawText: string): Promise<Partial<Client>[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analise o seguinte texto bruto que contém uma lista de empresas, CNPJs, e-mails e telefones. 
        Extraia o máximo de informações possibles e retorne um array JSON estruturado.
        
        REGRAS:
        1. "name": Razão Social ou Nome Fantasia.
        2. "document": CNPJ (apenas números).
        3. "email": E-mail de contato.
        4. "phone": Telefone com DDD (apenas números).
        5. Ignore cabeçalhos ou textos irrelevantes.
        6. Se um dado estiver faltando, deixe null.

        TEXTO BRUTO:
        ${rawText}`;

        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            document: { type: Type.STRING },
                            email: { type: Type.STRING },
                            phone: { type: Type.STRING }
                        },
                        required: ["name"]
                    }
                }
            }
        });

        return JSON.parse(response.text || "[]");
    } catch (error) {
        console.error("Erro no parser de IA:", error);
        return [];
    }
};

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise as seguintes métricas de negócio: MRR R$${metrics.mrr}, Clientes Ativos ${metrics.active_clients}, Churn ${metrics.churn_rate}%, Leads Abertos ${metrics.open_leads}, Tickets Críticos ${metrics.critical_tickets}. Resuma em no máximo 3 linhas focando em tendências e alertas.`,
        });
        return response.text || "A empresa apresenta crescimento estável.";
    } catch (error) { return "A empresa apresenta crescimento estável."; }
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Encontre 5 empresas reais no setor de "${industry}" em "${location}". Keywords: ${keywords}.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            companyName: { type: Type.STRING },
                            industry: { type: Type.STRING },
                            location: { type: Type.STRING },
                            matchScore: { type: Type.NUMBER },
                            reason: { type: Type.STRING },
                            suggestedApproach: { type: Type.STRING },
                            email: { type: Type.STRING },
                            phone: { type: Type.STRING }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // Fix: Added responseSchema to analyzeTicket for structured analysis as requested by caller
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise o ticket: ${ticket.subject}. Descrição: ${ticket.description}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sentiment: { type: Type.STRING },
                        suggestedAction: { type: Type.STRING }
                    },
                    required: ["sentiment", "suggestedAction"]
                }
            }
        });
        return response.text || "";
    } catch (error) { return ""; }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            contents: { parts: [{ inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, { text: "Analise esta chamada." }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        // Fix: Corrected interpretCommand to handle multimodal input (audioBase64) following standard part guidelines
        let contents: any = command;
        if (audioBase64) {
            contents = {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } },
                    { text: command || "Interprete o comando de voz." }
                ]
            };
        }

        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Analise o concorrente ${name}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Tendências para ${sector}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: PRO_MODEL, contents: question });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: topic });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateSalesObjectionResponse = async (lead: Lead, objectionType: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: PRO_MODEL, contents: objectionType });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: title,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const enrichCompanyData = async (companyName: string, website?: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: companyName,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const generateLeadEmail = async (lead: Lead): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: lead.name });
        return response.text || "";
    } catch (error) { return ""; }
};
