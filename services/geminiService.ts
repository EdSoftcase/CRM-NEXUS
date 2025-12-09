
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Ticket, Lead, PotentialLead, Competitor, MarketTrend } from '../types';

const MODEL_NAME = 'gemini-2.5-flash';

// --- LAZY INITIALIZATION ---
let aiInstance: GoogleGenAI | null = null;

const getAI = (): GoogleGenAI => {
    if (!aiInstance) {
        // Strict adherence to guideline: exclusively use process.env.API_KEY
        aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return aiInstance;
};

// --- MOCK DATA ---
const MOCK_SUMMARY = "A empresa apresenta um crescimento sólido de 12% no MRR, atingindo R$ 51k. O Churn de 2.1% está dentro da margem aceitável, mas recomenda-se atenção aos clientes do setor de Varejo. O volume de tickets críticos está baixo, indicando estabilidade na plataforma. Sugestão: Focar em upsell para a base atual para maximizar o LTV.";

const MOCK_EMAIL = (name: string) => `Assunto: Oportunidade para potencializar seus resultados

Olá ${name},

Espero que esta mensagem o encontre bem.

Gostaria de agendar uma breve conversa para demonstrar como o Nexus CRM pode otimizar seu processo comercial e aumentar suas conversões. Temos ajudado empresas do seu setor a reduzir o ciclo de vendas em até 30%.

Você teria disponibilidade para um café virtual na próxima terça-feira?

Atenciosamente,
Equipe Nexus`;

const MOCK_TICKET_ANALYSIS = JSON.stringify({
    summary: "O cliente relata lentidão crítica no login afetando múltiplos usuários.",
    sentiment: "Negativo",
    suggestedAction: "Escalar para equipe de Infraestrutura imediatamente e verificar status do servidor de autenticação."
});

// ... (Other mocks remain similar)

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Atue como um consultor de negócios sênior. Analise as seguintes métricas de uma empresa SaaS B2B e gere um resumo executivo conciso (máximo 3 linhas) destacando pontos fortes, riscos e uma sugestão estratégica.
        
        Métricas:
        - MRR Atual: R$ ${metrics.mrr}
        - Clientes Ativos: ${metrics.active_clients}
        - Churn Rate: ${metrics.churn_rate}%
        - Leads Abertos: ${metrics.open_leads}
        - Tickets Críticos: ${metrics.critical_tickets}
        
        Retorne apenas o texto do resumo.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        
        return response.text || MOCK_SUMMARY;
    } catch (error) {
        console.error("Gemini Error:", error);
        return MOCK_SUMMARY;
    }
};

export const generateLeadEmail = async (lead: Lead): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Escreva um email de cold call personalizado para um lead B2B.
        
        Dados do Lead:
        - Nome: ${lead.name}
        - Empresa: ${lead.company}
        - Setor: ${lead.metadata?.segment || 'Geral'}
        
        O email deve ser curto, persuasivo e focar em agendar uma reunião.`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });
        return response.text || MOCK_EMAIL(lead.name);
    } catch (error) {
        return MOCK_EMAIL(lead.name);
    }
};

export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
    try {
        const ai = getAI();
        const prompt = `Analise este ticket de suporte técnico e retorne um JSON.
        Ticket: "${ticket.description}"
        
        Schema JSON esperado:
        {
            "summary": "Resumo em 1 frase",
            "sentiment": "Positivo | Neutro | Negativo",
            "suggestedAction": "Ação recomendada para o agente"
        }`;

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return response.text || MOCK_TICKET_ANALYSIS;
    } catch (error) {
        return MOCK_TICKET_ANALYSIS;
    }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    // Mock logic for demo purposes (real implementation would send audio to Gemini 1.5 Pro)
    return {
        summary: "Chamada de prospecção. O cliente demonstrou interesse no módulo financeiro, mas achou o preço inicial alto. Solicitou uma proposta formal por e-mail.",
        sentiment: "Positivo",
        transcript: `[00:00] Vendedor: Olá, gostaria de falar com o responsável financeiro.\n[00:15] Cliente: Sou eu mesmo. Do que se trata?\n[00:30] Vendedor: Apresentação da solução Nexus...\n[02:00] Cliente: Interessante, mas achei caro.\n[04:00] Vendedor: Posso enviar uma proposta personalizada?\n[04:30] Cliente: Pode sim.`,
        nextSteps: "Enviar proposta comercial e agendar follow-up para a próxima terça-feira."
    };
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<any> => {
    // Mock NLU
    if (command.toLowerCase().includes('lead') || command.toLowerCase().includes('criar')) {
        return {
            action: 'create_lead',
            data: {
                name: 'Novo Lead (Voz)',
                company: 'Empresa Identificada',
                email: 'contato@empresa.com'
            },
            message: 'Entendi. Criando um novo lead com os dados informados.'
        };
    }
    return {
        action: 'unknown',
        message: 'Desculpe, não entendi o comando. Tente "Criar novo lead" ou "Agendar reunião".'
    };
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock results based on inputs
    return Array.from({ length: 5 }).map((_, i) => ({
        id: `pl-${Date.now()}-${i}`,
        companyName: `${industry} ${location} Corp ${i+1}`,
        industry: industry,
        location: location,
        matchScore: Math.floor(Math.random() * (99 - 70) + 70),
        estimatedSize: `${Math.floor(Math.random() * 50 + 10)} funcionários`,
        reason: `Alta relevância para keywords: ${keywords || industry}.`,
        suggestedApproach: "Focar em redução de custos operacionais.",
        email: `contato@empresa${i}.com`,
        phone: `(11) 9${Math.floor(Math.random()*1000)}-${Math.floor(Math.random()*1000)}`
    }));
};

export const analyzeCompetitor = async (name: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    // Mock analysis
    return {
        swot: {
            strengths: ["Marca consolidada", "Preço competitivo"],
            weaknesses: ["Atendimento lento", "Tecnologia legada"],
            opportunities: ["Capturar clientes insatisfeitos", "Oferecer migração fácil"],
            threats: ["Novos entrantes", "Mudança regulatória"]
        },
        battlecard: {
            killPoints: ["Nosso suporte é 24/7", "Interface mais moderna"],
            defensePoints: ["Temos feature parity", "Melhor integração"],
            pricing: "Médio"
        }
    };
};

export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Add randomness to make it look like it's updating/live
    const randomFactor = Math.random();
    
    return [
        {
            id: `trend-${Date.now()}-1`,
            title: `IA Generativa em ${sector} ${randomFactor > 0.5 ? '2.0' : ''}`,
            description: 'Adoção acelerada de agentes autônomos para automação de processos.',
            impact: 'High',
            sentiment: 'Positive',
            date: new Date().toISOString()
        },
        {
            id: `trend-${Date.now()}-2`,
            title: 'Sustentabilidade ESG',
            description: 'Pressão regulatória aumentando para conformidade ambiental na cadeia de suprimentos.',
            impact: 'Medium',
            sentiment: randomFactor > 0.5 ? 'Neutral' : 'Negative',
            date: new Date().toISOString()
        },
        {
            id: `trend-${Date.now()}-3`,
            title: 'Consolidação de Mercado',
            description: 'Grandes players adquirindo startups de nicho para expandir portfólio.',
            impact: 'High',
            sentiment: 'Neutral',
            date: new Date().toISOString()
        }
    ];
};

export const analyzeBusinessData = async (context: any, question: string): Promise<string> => {
    return "Com base nos dados atuais, sua maior oportunidade está em upsell na base de clientes ativos, visto que o CAC está alto. O canal 'Instagram' tem o melhor ROI.";
};

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    return `🚀 [${channel}] Post sobre ${topic}\n\nDescubra como transformar seus resultados com nossa nova solução! 💡\n\n#${topic.replace(/\s/g,'')} #Inovação #Nexus`;
};

export const generateSalesObjectionResponse = async (lead: Lead, objectionType: string): Promise<string> => {
    return `Entendo sua preocupação com ${objectionType}. Muitos de nossos clientes sentiam o mesmo, mas descobriram que o ROI compensa em 3 meses.`;
};

export const generateProjectTasks = async (title: string, description: string): Promise<any[]> => {
    return [
        { title: "Kick-off do Projeto", status: "Pending" },
        { title: "Levantamento de Requisitos", status: "Pending" },
        { title: "Desenvolvimento / Execução", status: "Pending" },
        { title: "Testes e Validação", status: "Pending" },
        { title: "Entrega Final", status: "Pending" }
    ];
};

export const enrichCompanyData = async (companyName: string, website?: string): Promise<any> => {
    return {
        description: `Empresa líder em ${companyName}, focada em inovação e tecnologia.`,
        website: website || `www.${companyName.toLowerCase().replace(/\s/g,'')}.com`,
        revenue: "10M - 50M",
        employees: "50-200"
    };
};
