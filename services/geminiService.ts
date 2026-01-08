
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend, Client } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

// Helper para inicializar a IA com segurança
const getAI = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("Chave de API não configurada");
    return new GoogleGenAI({ apiKey });
};

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: PRO_MODEL, 
            contents: `Gere uma copy de marketing para ${channel} com tom ${tone} sobre: ${topic}` 
        });
        return response.text || "Não foi possível gerar o conteúdo no momento.";
    } catch (error) { 
        console.error("Gemini Error:", error);
        return "O motor de IA está temporariamente indisponível. Por favor, tente novamente em alguns instantes."; 
    }
};

export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        const ai = getAI();
        const prompt = `Analise o concorrente "${name}" (${website}) no setor ${sector}. Retorne um SWOT e Battlecard em JSON.`;

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
    } catch (error) { 
        console.error("Gemini Analysis Error:", error);
        return {}; 
    }
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Localize 5 leads reais para "${industry}" em "${location}" com as palavras-chave: ${keywords}.`,
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
    } catch (error) { 
        console.error("Gemini Prospecting Error:", error);
        return []; 
    }
};

export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: PRO_MODEL, 
            contents: `Você é um analista de BI da Softcase. Dados atuais: ${JSON.stringify(context)}. Pergunta do usuário: ${question}.` 
        });
        return response.text || "Não consegui processar a análise dos dados agora.";
    } catch (error) { return "Erro na conexão com o servidor de inteligência."; }
};

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({ 
            model: MODEL_NAME, 
            contents: `Gere um resumo executivo de uma frase para: MRR R$${metrics.mrr}, Churn ${metrics.churn_rate}%, ${metrics.open_leads} leads novos.` 
        });
        return response.text || "Dados operacionais estáveis.";
    } catch (error) { return "Resumo indisponível no momento."; }
};

export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Analise o sentimento e sugira uma ação para o ticket: "${ticket.subject}". Descrição: ${ticket.description || 'N/A'}. Retorne JSON com sentiment e suggestedAction.`;
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text || "{}";
    } catch (error) { return JSON.stringify({ sentiment: "Neutro", suggestedAction: "Análise manual necessária devido a falha no motor de IA." }); }
};

export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Quais as 3 principais tendências tecnológicas atuais para o setor de ${sector}?`,
            config: {
                responseMimeType: "application/json",
                responseSchema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            title: { type: Type.STRING }, 
                            description: { type: Type.STRING }, 
                            sentiment: { type: Type.STRING }, 
                            impact: { type: Type.STRING } 
                        } 
                    } 
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    try {
        const ai = getAI();
        let contents: any = command;
        if (audioBase64) { 
            contents = { 
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, 
                    { text: "Interprete este comando de voz para o CRM. Retorne JSON com 'action' (create_lead ou create_task), 'data' e 'message'." }
                ] 
            }; 
        }
        const response = await ai.models.generateContent({ model: PRO_MODEL, contents, config: { responseMimeType: "application/json" } });
        return JSON.parse(response.text || "{}");
    } catch (error) { 
        return { action: "none", message: "Falha na interpretação da voz. Tente digitar o comando." }; 
    }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-12-2025',
            contents: { 
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } }, 
                    { text: "Você é um supervisor de qualidade. Transcreva e resuma esta chamada de suporte de ${duration}. Retorne JSON com sentiment, summary e nextSteps." }
                ] 
            },
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { 
        console.error("Voice Analysis Failed:", error);
        return { sentiment: "Indefinido", summary: "Não foi possível analisar o áudio.", nextSteps: "Revisar chamada manualmente." }; 
    }
};

export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    try {
        const ai = getAI();
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Gere um checklist técnico de 5 itens para o projeto: ${title}. Contexto: ${description}`,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: { 
                    type: Type.ARRAY, 
                    items: { 
                        type: Type.OBJECT, 
                        properties: { title: { type: Type.STRING } } 
                    } 
                } 
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};
