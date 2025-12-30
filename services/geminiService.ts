
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend, Client } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Você é um redator sênior da Soft Case Tecnologia, especialista em LPR e automação B2B.
        Escreva um conteúdo para "${channel}" com tom "${tone}". TEMA: ${topic}.
        Inclua benefícios de redução de perdas operacionais e gestão centralizada.`;
        const response = await ai.models.generateContent({ model: PRO_MODEL, contents: prompt });
        return response.text || "Erro ao gerar cópia.";
    } catch (error) { return "Erro no motor Soft IA."; }
};

export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Como analista de inteligência da Soft Case Tecnologia, realize análise profunda do concorrente "${name}" (${website}).
        Retorne SWOT e Battlecard em JSON estruturado para nossos vendedores ganharem o negócio.`;

        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        swot: {
                            type: Type.OBJECT,
                            properties: {
                                strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
                                weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
                                opportunities: { type: Type.ARRAY, items: { type: Type.STRING } },
                                threats: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        },
                        battlecard: {
                            type: Type.OBJECT,
                            properties: {
                                pricing: { type: Type.STRING },
                                killPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                defensePoints: { type: Type.ARRAY, items: { type: Type.STRING } }
                            }
                        }
                    }
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Soft Prospect: Localize 10 empresas reais do setor de "${industry}" em "${location}" que poderiam usar sistemas de automação de estacionamento.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { companyName: { type: Type.STRING }, industry: { type: Type.STRING }, location: { type: Type.STRING }, matchScore: { type: Type.NUMBER }, reason: { type: Type.STRING }, suggestedApproach: { type: Type.STRING }, email: { type: Type.STRING }, phone: { type: Type.STRING } } } }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ 
            model: PRO_MODEL, 
            contents: `Você é o Soft BI. Contexto do Dashboard: ${JSON.stringify(context)}. Pergunta: ${question}. Responda de forma estratégica.` 
        });
        return response.text || "";
    } catch (error) { return ""; }
};

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({ model: MODEL_NAME, contents: `Soft BI: Resumo executivo baseado em MRR R$${metrics.mrr}, Churn ${metrics.churn_rate}%. Foco em saúde do negócio.` });
        return response.text || "Dados estáveis.";
    } catch (error) { return "Dados estáveis."; }
};

// Fix: Added missing analyzeTicket function to resolve module export error
export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Analise o seguinte ticket de suporte da Soft Case:
        Assunto: ${ticket.subject}
        Descrição: ${ticket.description}
        Prioridade: ${ticket.priority}
        
        Retorne um JSON com "sentiment" (Positivo, Neutro, Negativo) e "suggestedAction".`;
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text || "{}";
    } catch (error) { return "{}"; }
};

// Fix: Added missing fetchMarketTrends function to resolve module export error
export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Soft BI: Liste 5 tendências de mercado atuais para o setor de "${sector}".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, sentiment: { type: Type.STRING }, impact: { type: Type.STRING } } } }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let contents: any = `Soft AI Command: ${command}`;
        if (audioBase64) { 
            contents = { 
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, 
                    { text: "Interprete como comando para o Soft CRM." }
                ] 
            }; 
        }
        const response = await ai.models.generateContent({ model: PRO_MODEL, contents, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            contents: { parts: [{ inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, { text: "Soft Voice Analysis: Resuma esta chamada de vendas da Soft Case em JSON." }] },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Soft Flow: Checklist de 5 passos para o projeto operacional "${title}". Desc: ${description}`,
            config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { title: { type: Type.STRING } } } } }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};
