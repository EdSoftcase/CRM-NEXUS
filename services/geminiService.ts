
import { GoogleGenAI, Type } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend } from '../types';

const MODEL_NAME = 'gemini-3-flash-preview';
const PRO_MODEL = 'gemini-3-pro-preview';

// --- MOCK DATA PARA FALLBACK ---
const MOCK_SUMMARY = "A empresa apresenta crescimento estável. Foco em retenção.";
const MOCK_TICKET_ANALYSIS = JSON.stringify({ summary: "Ticket padrão", sentiment: "Neutro", suggestedAction: "Atender" });

// Updated to create new GoogleGenAI instance right before making an API call as per guidelines.
export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise as seguintes métricas de negócio: MRR R$${metrics.mrr}, Clientes Ativos ${metrics.active_clients}, Churn ${metrics.churn_rate}%, Leads Abertos ${metrics.open_leads}, Tickets Críticos ${metrics.critical_tickets}. Resuma em no máximo 3 linhas focando em tendências e alertas.`,
        });
        return response.text || MOCK_SUMMARY;
    } catch (error) { return MOCK_SUMMARY; }
};

// Updated to use PRO_MODEL and proper JSON schema for real market intelligence.
export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Aja como um especialista em inteligência de mercado B2B. 
        Encontre 5 empresas REAIS e ATIVAS no setor de "${industry}" localizadas em "${location}".
        Keywords de busca: ${keywords}.
        
        REGRAS CRÍTICAS:
        1. NÃO invente dados. Se não tiver certeza de uma empresa, não a inclua.
        2. O e-mail deve ser um padrão corporativo real ou o site oficial. 
        3. O telefone deve estar no formato brasileiro completo com DDD (ex: 11999999999).
        4. Evite e-mails genéricos como 'contato@empresa1.com'. Procure por padrões reais.
        5. Forneça um motivo de match baseado em dados de mercado atuais.`;

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
                            companyName: { type: Type.STRING },
                            industry: { type: Type.STRING },
                            location: { type: Type.STRING },
                            matchScore: { type: Type.NUMBER },
                            reason: { type: Type.STRING },
                            suggestedApproach: { type: Type.STRING },
                            estimatedSize: { type: Type.STRING },
                            email: { type: Type.STRING },
                            phone: { type: Type.STRING }
                        },
                        required: ["companyName", "industry", "location", "matchScore", "reason", "email", "phone"]
                    }
                }
            }
        });

        const results = JSON.parse(response.text || "[]");
        
        // Validação extra pós-IA para garantir limpeza
        return results.filter((p: PotentialLead) => {
            const isEmailGeneric = /empresa\d|test|example/i.test(p.email || '');
            const isPhoneIncomplete = (p.phone || '').replace(/\D/g, '').length < 10;
            const isCompanyGeneric = /empresa\s\d|company\s[a-z]/i.test(p.companyName);
            
            return !isEmailGeneric && !isPhoneIncomplete && !isCompanyGeneric;
        });

    } catch (error) {
        console.error("Erro na prospecção real:", error);
        return [];
    }
};

// Updated to use responseSchema and proper JSON extraction.
export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Analise o seguinte ticket de suporte e forneça o sentimento predominante e a ação sugerida.\nAssunto: ${ticket.subject}\nDescrição: ${ticket.description}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        sentiment: { type: Type.STRING },
                        suggestedAction: { type: Type.STRING }
                    },
                    required: ["summary", "sentiment", "suggestedAction"]
                }
            }
        });
        return response.text || MOCK_TICKET_ANALYSIS;
    } catch (error) { return MOCK_TICKET_ANALYSIS; }
};

// Implemented real Gemini Audio Analysis for VoIP calls.
export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const audioPart = {
            inlineData: {
                mimeType: 'audio/wav',
                data: audioBase64.split(',')[1] || audioBase64,
            },
        };
        const textPart = {
            text: `Analise esta chamada telefônica de duração ${duration}. Forneça um resumo, o sentimento predominante e os próximos passos sugeridos.`,
        };
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            contents: { parts: [audioPart, textPart] },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        summary: { type: Type.STRING },
                        sentiment: { type: Type.STRING },
                        nextSteps: { type: Type.STRING },
                        transcript: { type: Type.STRING }
                    },
                    required: ["summary", "sentiment", "nextSteps"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        return { summary: "Erro ao analisar chamada", sentiment: "Neutro", nextSteps: "Tentar novamente" };
    }
};

// Implemented AIAssistant command interpreter.
export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let contents: any;
        if (audioBase64) {
            contents = {
                parts: [
                    { inlineData: { mimeType: 'audio/wav', data: audioBase64.split(',')[1] || audioBase64 } },
                    { text: "Interprete este comando de voz para gerenciar o CRM. Pode ser para criar um lead ou uma tarefa." }
                ]
            };
        } else {
            contents = command;
        }

        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents,
            config: {
                systemInstruction: "Você é um assistente de CRM inteligente. Extraia intenções de criar leads (nome, empresa, email, valor) ou tarefas (titulo, tipo, data). Retorne JSON estruturado.",
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        action: { type: Type.STRING, description: "create_lead, create_task, or unknown" },
                        data: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                company: { type: Type.STRING },
                                email: { type: Type.STRING },
                                value: { type: Type.NUMBER },
                                title: { type: Type.STRING },
                                type: { type: Type.STRING },
                                dueDate: { type: Type.STRING }
                            }
                        },
                        message: { type: Type.STRING }
                    },
                    required: ["action", "message"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) {
        return { action: 'unknown', message: 'Erro ao interpretar comando.' };
    }
};

// Implemented real competitive analysis.
export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Realize uma análise detalhada do concorrente ${name} (${website}) no setor de ${sector}. Forneça uma análise SWOT completa e um Battlecard de vendas.`,
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
                            },
                            required: ["strengths", "weaknesses", "opportunities", "threats"]
                        },
                        battlecard: {
                            type: Type.OBJECT,
                            properties: {
                                killPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                defensePoints: { type: Type.ARRAY, items: { type: Type.STRING } },
                                pricing: { type: Type.STRING }
                            },
                            required: ["killPoints", "defensePoints"]
                        }
                    },
                    required: ["swot", "battlecard"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return {}; }
};

// Implemented real market trends generation.
export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Liste 3 tendências de mercado REAIS e ATUAIS para o setor de "${sector}" no Brasil. Forneça título, descrição, impacto (High, Medium, Low) e sentimento (Positive, Negative, Neutral).`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            title: { type: Type.STRING },
                            description: { type: Type.STRING },
                            impact: { type: Type.STRING },
                            sentiment: { type: Type.STRING }
                        },
                        required: ["title", "description", "impact", "sentiment"]
                    }
                }
            }
        });
        const trends = JSON.parse(response.text || "[]");
        return trends.map((t: any, i: number) => ({ ...t, id: i.toString(), date: new Date().toISOString() }));
    } catch (error) { return []; }
};

// Implemented real BI analysis using Gemini.
export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Você é um Analista de BI especialista. Com base no seguinte contexto de dados do CRM: ${JSON.stringify(context)}, responda à pergunta do usuário: "${question}"`,
            config: {
                systemInstruction: "Sua resposta deve ser executiva, baseada em fatos contidos nos dados e formatada em Markdown para melhor visualização.",
            }
        });
        return response.text || "Não foi possível gerar a análise no momento.";
    } catch (error) { return "Erro na conexão com o motor de inteligência."; }
};

// Implemented real marketing copy generation.
export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Escreva um post de marketing para ${channel} sobre o tema "${topic}". O tom deve ser ${tone}. Use markdown, hashtags relevantes e emojis.`,
        });
        return response.text || "";
    } catch (error) { return "Falha ao gerar cópia de marketing."; }
};

export const generateSalesObjectionResponse = async (lead: Lead, objectionType: string): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `O lead ${lead.name} da empresa ${lead.company} apresentou uma objeção do tipo "${objectionType}". Sugira uma resposta persuasiva para contornar essa situação e avançar no funil de vendas.`,
        });
        return response.text || "";
    } catch (error) { return ""; }
};

// Implemented real project task generation.
export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Crie uma lista de 5 a 8 tarefas essenciais para o projeto de instalação/serviço intitulado "${title}" com a seguinte descrição: "${description}". Retorne um array de objetos JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            title: { type: Type.STRING },
                            status: { type: Type.STRING }
                        },
                        required: ["title", "status"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (error) { return []; }
};

export const enrichCompanyData = async (companyName: string, website?: string): Promise<any> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: PRO_MODEL,
            contents: `Enriqueça os dados da empresa "${companyName}"${website ? ` (site: ${website})` : ''}. Forneça uma breve descrição, receita estimada, número de funcionários e tecnologias utilizadas.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        description: { type: Type.STRING },
                        website: { type: Type.STRING },
                        revenue: { type: Type.STRING },
                        employees: { type: Type.STRING },
                        techStack: { type: Type.ARRAY, items: { type: Type.STRING } }
                    },
                    required: ["description"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    } catch (error) { return { description: "Não foi possível enriquecer os dados." }; }
};

export const generateLeadEmail = async (lead: Lead): Promise<string> => {
    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Escreva um e-mail de prospecção personalizado para ${lead.name} da empresa ${lead.company}. O lead tem interesse em ${lead.productInterest || 'nossas soluções'}.`,
        });
        return response.text || "";
    } catch (error) { return ""; }
};
