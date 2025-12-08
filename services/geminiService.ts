


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

// --- FALLBACK MOCKS (Used when API fails or Quota exceeded) ---
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

const MOCK_AUDIO_NOTE = `[Transcrição IA]
Resumo: Reunião produtiva sobre a expansão das licenças. O cliente demonstrou interesse no plano Enterprise.
Próximos Passos: Enviar proposta atualizada até sexta-feira.
Sentimento: Positivo`;

const MOCK_BI_ANALYSIS = "Com base nos dados apresentados, sua taxa de conversão de leads (20%) está saudável, mas o volume de tickets críticos aumentou na última semana. Recomendo investigar se a última atualização do produto causou instabilidade, pois isso pode impactar o Churn no próximo mês. O segmento de Tecnologia representa 60% da sua receita, sugerindo uma forte aderência neste nicho.";

const MOCK_OBJECTION_SCRIPT = "Entendo perfeitamente sua preocupação com o orçamento. Muitos de nossos clientes atuais, como a [Empresa Parecida], tiveram esse mesmo receio inicial. O que eles descobriram, no entanto, foi que a automação do Nexus reduziu o custo operacional deles em 20% logo nos primeiros 3 meses, pagando o investimento. Se conseguirmos provar um ROI similar para você, faria sentido revisarmos os números?";

const MOCK_MARKETING_COPY = `🚀 Transforme sua Gestão com Nexus CRM!

Cansado de perder leads e não saber onde focar seus esforços? 🤯 O Nexus CRM Enterprise chegou para revolucionar sua operação.

✅ Visão 360° dos clientes
✅ Automação com IA Gemini
✅ Pipeline visual e intuitivo

Não deixe dinheiro na mesa. Teste agora e veja a mágica acontecer! ✨

#CRM #Inovação #Vendas #Gestão #Nexus`;

const MOCK_PROJECT_TASKS = JSON.stringify([
    { title: "Reunião de Kickoff e Alinhamento", status: "Pending" },
    { title: "Configuração do Ambiente", status: "Pending" },
    { title: "Importação de Dados Legados", status: "Pending" },
    { title: "Treinamento dos Usuários Chave", status: "Pending" },
    { title: "Go-Live e Acompanhamento", status: "Pending" }
]);

// Mock para comando quando a API falha
const MOCK_COMMAND_RESPONSE = JSON.stringify({
    action: "create_lead",
    data: {
        name: "Lead Exemplo IA",
        company: "Empresa Teste",
        value: 1000,
        email: "contato@teste.com"
    },
    message: "Entendi! Criando um lead de exemplo para você."
});

const MOCK_CALL_ANALYSIS = JSON.stringify({
    transcript: "Simulação de chamada. O vendedor apresentou a proposta de valor e o cliente demonstrou interesse no módulo financeiro, mas achou o preço um pouco alto.",
    summary: "Chamada de apresentação comercial com foco em negociação de valores.",
    sentiment: "Neutro",
    nextSteps: "Enviar comparativo de mercado e agendar nova reunião em 3 dias."
});

const MOCK_ENRICHMENT = JSON.stringify({
    description: "Empresa líder em varejo com foco em expansão digital e forte presença física.",
    revenue: "R$ 50M - R$ 100M",
    techStack: ["AWS", "Salesforce", "React", "Node.js"],
    competitors: ["Competidor A", "Competidor B", "Competidor C"]
});

const MOCK_POTENTIAL_LEADS = JSON.stringify([
    {
        companyName: "TechSolutions Brasil",
        industry: "Tecnologia",
        location: "São Paulo, SP",
        matchScore: 95,
        estimatedSize: "50-200 funcionários",
        reason: "Alta sinergia com soluções digitais. Setor em expansão na região indicada.",
        suggestedApproach: "Focar em automação e redução de custos operacionais.",
        email: "contato@techsolutions.com.br",
        phone: "(11) 3000-1234"
    },
    {
        companyName: "Inova Retail Ltda",
        industry: "Varejo",
        location: "São Paulo, SP",
        matchScore: 88,
        estimatedSize: "20-50 funcionários",
        reason: "Varejo físico buscando digitalização. Ideal para o módulo de CRM omnichannel.",
        suggestedApproach: "Oferecer demo focada em integração WhatsApp e gestão de estoque.",
        email: "comercial@inovaretail.com.br",
        phone: "(11) 3000-5678"
    }
]);

const MOCK_SWOT_ANALYSIS = JSON.stringify({
    swot: {
        strengths: ["Marca forte", "Rede de distribuição ampla"],
        weaknesses: ["Tecnologia legada", "Atendimento lento"],
        opportunities: ["Expansão para novos mercados", "Digitalização"],
        threats: ["Novos entrantes ágeis", "Mudanças regulatórias"]
    },
    battlecard: {
        killPoints: ["Nossa solução é 3x mais rápida", "Atendimento humanizado 24/7"],
        defensePoints: ["Eles cobram por usuário, nós por empresa", "Nossa fidelidade é menor"],
        pricing: "Modelo Premium (Alto Custo)"
    }
});

const MOCK_MARKET_TRENDS_RES = JSON.stringify([
    {
        title: "Ascensão da IA Generativa",
        description: "Empresas do setor estão investindo pesado em automação de atendimento.",
        impact: "High",
        sentiment: "Neutral"
    },
    {
        title: "Sustentabilidade como Diferencial",
        description: "Consumidores preferem marcas com selo verde.",
        impact: "Medium",
        sentiment: "Positive"
    }
]);

export const analyzeTicket = async (ticket: Ticket): Promise<string> => {
  try {
    const prompt = `
      Atue como um agente de suporte técnico sênior.
      Analise o seguinte ticket de suporte e forneça um resumo estruturado em JSON com:
      1. Resumo conciso (max 2 frases)
      2. Sentimento (Positivo, Neutro, Negativo)
      3. Sugestão de ação imediata.
      
      Ticket Info:
      Assunto: ${ticket.subject}
      Descrição: ${ticket.description}
      Prioridade: ${ticket.priority}
    `;

    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    return response.text || MOCK_TICKET_ANALYSIS;
  } catch (error) {
    console.warn("Gemini API Fallback (Analyze Ticket):", error);
    return MOCK_TICKET_ANALYSIS;
  }
};

export const generateLeadEmail = async (lead: Lead): Promise<string> => {
  try {
    const prompt = `
      Escreva um e-mail comercial formal, porém amigável, para o lead abaixo.
      O objetivo é agendar uma demonstração do nosso produto "Nexus CRM".
      
      Lead: ${lead.name}
      Empresa: ${lead.company}
      Status: ${lead.status}
      Último contato: ${lead.lastContact}
    `;

    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
    });

    return response.text || MOCK_EMAIL(lead.name);
  } catch (error) {
    console.warn("Gemini API Fallback (Generate Email):", error);
    return MOCK_EMAIL(lead.name);
  }
};

export const generateExecutiveSummary = async (metrics: any): Promise<string> => {
    try {
        const prompt = `
          Atue como um consultor financeiro. Analise estas métricas mensais e dê um feedback executivo de 1 parágrafo sobre a saúde da empresa.
          
          Métricas: ${JSON.stringify(metrics)}
        `;
    
        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: MODEL_NAME,
          contents: prompt,
        });
    
        return response.text || MOCK_SUMMARY;
      } catch (error) {
        console.warn("Gemini API Fallback (Exec Summary):", error);
        return MOCK_SUMMARY;
      }
}

export const processAudioNote = async (audioBase64: string): Promise<string> => {
  try {
    // Remove header do base64 se existir (data:audio/webm;base64,)
    const cleanBase64 = audioBase64.split(',')[1] || audioBase64;

    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/wav", // Gemini suporta wav, mp3, aac, flac
              data: cleanBase64
            }
          },
          {
            text: "Atue como um assistente de vendas. Transcreva este áudio da reunião e, em seguida, extraia: 1. Um resumo curto. 2. Ação sugerida (Next Step). 3. Sentimento do cliente. Formate a saída como texto limpo e estruturado."
          }
        ]
      }
    });

    return response.text || MOCK_AUDIO_NOTE;
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    return MOCK_AUDIO_NOTE;
  }
};

export const analyzePhoneCall = async (audioBase64: string, duration: string): Promise<any> => {
    try {
        // Check for API key before call to avoid crashing if env is missing
        if (!process.env.API_KEY) return JSON.parse(MOCK_CALL_ANALYSIS);

        const cleanBase64 = audioBase64.split(',')[1] || audioBase64;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [
                    { inlineData: { mimeType: "audio/wav", data: cleanBase64 } },
                    { 
                        text: `
                        Atue como um Supervisor de Qualidade de Call Center (QA).
                        Analise esta gravação de chamada de vendas (Duração: ${duration}).
                        
                        Retorne um JSON com os campos:
                        - transcript: Transcrição resumida do que foi falado.
                        - summary: Resumo executivo da chamada.
                        - sentiment: 'Positivo', 'Neutro' ou 'Negativo'.
                        - nextSteps: Próximos passos sugeridos.
                        ` 
                    }
                ]
            },
            config: {
                responseMimeType: "application/json"
            }
        });

        return JSON.parse(response.text || MOCK_CALL_ANALYSIS);
    } catch (error) {
        console.error("Gemini Call Analysis Error:", error);
        return JSON.parse(MOCK_CALL_ANALYSIS);
    }
};

export const analyzeBusinessData = async (dataContext: any, userQuery: string): Promise<string> => {
    try {
        if (!process.env.API_KEY) return MOCK_BI_ANALYSIS;

        const prompt = `
          Atue como um Chief Data Officer (CDO) e Analista de BI Sênior.
          Você tem acesso aos seguintes dados consolidados da empresa "Nexus CRM":
          ${JSON.stringify(dataContext)}

          O usuário perguntou: "${userQuery}"

          Responda de forma direta, analítica e estratégica. Use números para embasar sua resposta.
          Se a pergunta for sobre "o que fazer", sugira 3 ações práticas.
          Mantenha o tom profissional e encorajador. Responda em português.
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        return response.text || MOCK_BI_ANALYSIS;
    } catch (error) {
        console.error("Gemini BI Error:", error);
        return MOCK_BI_ANALYSIS;
    }
};

export const generateSalesObjectionResponse = async (lead: Lead, objectionType: string): Promise<string> => {
    try {
        const prompt = `
          Atue como um treinador de vendas de elite especialista em B2B e metodologia SPIN Selling.
          
          Cenário:
          Estou tentando vender o "Nexus CRM Enterprise" (Software de gestão de alto valor).
          O Lead é: ${lead.name}, da empresa ${lead.company}.
          O valor estimado da oportunidade é: R$ ${lead.value}.
          A objeção levantada foi: "${objectionType}".

          Tarefa:
          Gere um script curto de resposta (máximo 3 frases) que eu possa falar ou enviar agora.
          A resposta deve:
          1. Validar a preocupação (Empatia).
          2. Reenquadrar o problema ou oferecer uma prova social.
          3. Terminar com uma pergunta de fechamento ou avanço.
          
          Mantenha o tom profissional, confiante e persuasivo.
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
        });

        return response.text || MOCK_OBJECTION_SCRIPT;
    } catch (error) {
        console.error("Gemini Objection Error:", error);
        return MOCK_OBJECTION_SCRIPT;
    }
};

export const generateMarketingCopy = async (topic: string, channel: string, tone: string): Promise<string> => {
    try {
        if (!process.env.API_KEY) {
            console.warn("Gemini API Key missing. Using Mock.");
            return MOCK_MARKETING_COPY;
        }

        const prompt = `
          Atue como um Copywriter Sênior Especialista em Marketing Digital e Engajamento.
          
          Tarefa: Criar um conteúdo de alta conversão para o canal: ${channel}.
          Tema: ${topic}
          Tom de Voz: ${tone}
          
          Diretrizes por Canal:
          - Instagram: Foco visual, legenda curta e impactante, quebras de linha, emojis, CTA para comentário.
          - LinkedIn: Tom profissional e de liderança, foco em insights de mercado, storytelling corporativo.
          - Email: Assunto irresistível (Subject Line), corpo do email focado em benefício, CTA clara para clique.
          
          O conteúdo deve ser original, criativo e pronto para postar.
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                role: 'user',
                parts: [{ text: prompt }]
            },
            config: {
                temperature: 0.7,
                candidateCount: 1,
            }
        });

        const text = response.text;
        if (!text) throw new Error("Empty response from AI");
        
        return text;
    } catch (error) {
        console.error("Gemini Marketing Error:", error);
        return MOCK_MARKETING_COPY;
    }
};

export const generateProjectTasks = async (projectTitle: string, description: string): Promise<any[]> => {
    try {
        if (!process.env.API_KEY) return JSON.parse(MOCK_PROJECT_TASKS);

        const prompt = `
            Atue como um Gerente de Projetos Sênior.
            Crie uma lista de tarefas (Checklist) para o seguinte projeto:
            Título: ${projectTitle}
            Descrição: ${description}

            Retorne APENAS um Array JSON com objetos contendo 'title' e 'status' (inicialmente 'Pending').
            Gere entre 5 a 8 tarefas essenciais.
            
            Exemplo de saída: [{"title": "Kickoff", "status": "Pending"}, ...]
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || MOCK_PROJECT_TASKS);
    } catch (error) {
        console.error("Gemini Project Error:", error);
        return JSON.parse(MOCK_PROJECT_TASKS);
    }
};

export const interpretCommand = async (command: string, audioBase64?: string): Promise<{ action: string, data: any, message: string }> => {
    try {
        // Se houver API Key, usa Gemini. Senão, mock.
        if (!process.env.API_KEY) return JSON.parse(MOCK_COMMAND_RESPONSE);

        let userContent: any = { text: command };
        
        if (audioBase64) {
            const cleanBase64 = audioBase64.split(',')[1] || audioBase64;
            userContent = {
                parts: [
                    { inlineData: { mimeType: "audio/wav", data: cleanBase64 } },
                    { text: "O usuário falou este comando. Transcreva-o e execute as instruções abaixo." }
                ]
            };
        } else {
            userContent = command;
        }

        const prompt = `
            Você é o cérebro operacional do Nexus CRM.
            Sua função é interpretar comandos em linguagem natural (texto ou áudio transcrito) e transformá-los em ações estruturadas JSON.

            Ações Suportadas:
            1. 'create_lead': Criar novo lead. Campos: name, company, email, value, productInterest.
            2. 'create_task': Criar atividade/tarefa. Campos: title, dueDate (ISO), type ('Call', 'Meeting', 'Task').
            3. 'unknown': Quando não entender ou a ação não for suportada.

            Regras:
            - Extraia o máximo de entidades possíveis.
            - Se o usuário não disser data, assuma 'hoje' ou 'amanhã' conforme contexto, ou null.
            - Se o valor financeiro for mencionado (ex: 50 mil), converta para número (50000).
            - Retorne APENAS o JSON, sem markdown.

            Exemplos:
            User: "Crie um lead para a empresa Acme, falar com John, valor 5000"
            Output: { "action": "create_lead", "data": { "company": "Acme", "name": "John", "value": 5000 }, "message": "Lead para Acme criado." }

            User: "Me lembre de ligar para o cliente X amanhã"
            Output: { "action": "create_task", "data": { "title": "Ligar para cliente X", "type": "Call", "dueDate": "2023-10-27T09:00:00.000Z" }, "message": "Lembrete de ligação agendado." }
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: audioBase64 ? { parts: [...(userContent.parts), { text: prompt }] } : [prompt, userContent],
            config: {
                responseMimeType: "application/json",
            }
        });

        const text = response.text || "";
        return JSON.parse(text);

    } catch (error) {
        console.error("Gemini Command Error:", error);
        return { action: 'unknown', data: {}, message: "Desculpe, não consegui processar seu comando agora." };
    }
};

export const enrichCompanyData = async (companyName: string, website?: string): Promise<any> => {
    try {
        if (!process.env.API_KEY) return JSON.parse(MOCK_ENRICHMENT);

        const prompt = `
            Atue como um analista de inteligência de mercado B2B.
            Analise a empresa: "${companyName}" ${website ? `(Site: ${website})` : ''}.
            
            Retorne um JSON com os seguintes dados estimados:
            - description: Uma breve descrição do negócio (max 2 frases).
            - revenue: Faixa de faturamento anual estimada (ex: R$ 10M - R$ 50M).
            - techStack: Lista de tecnologias prováveis que eles usam (ex: AWS, SAP, VTEX).
            - competitors: Lista de 3 principais concorrentes diretos.

            Se não encontrar dados exatos, faça uma inferência educada baseada no setor e porte.
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || MOCK_ENRICHMENT);
    } catch (error) {
        console.error("Gemini Radar Error:", error);
        return JSON.parse(MOCK_ENRICHMENT);
    }
};

export const findPotentialLeads = async (industry: string, location: string, keywords: string): Promise<PotentialLead[]> => {
    try {
        if (!process.env.API_KEY) return JSON.parse(MOCK_POTENTIAL_LEADS);

        const prompt = `
            Atue como um Consultor de Desenvolvimento de Negócios (BDR) Especialista.
            Sua missão é encontrar potenciais clientes (prospects) para uma empresa que vende software/serviços B2B.

            Critérios de Busca:
            - Setor: ${industry}
            - Localização: ${location}
            - Palavras-chave/Contexto: ${keywords}

            Gere uma lista de 15 a 18 empresas REAIS ou PERFIS IDEAIS (Persona) que se encaixam nesses critérios.
            Inclua informações de contato público prováveis (Email genérico ou Telefone) se possível.

            Retorne APENAS um Array JSON com o seguinte formato para cada item:
            {
                "id": "uuid-gerado",
                "companyName": "Nome da Empresa",
                "industry": "Setor Específico",
                "location": "Cidade/Estado",
                "matchScore": 85, (Número de 0 a 100)
                "estimatedSize": "Faixa de funcionários",
                "reason": "Frase curta explicando por que é um bom lead",
                "suggestedApproach": "Frase curta com dica de como abordar (ex: Focar em dor X)",
                "email": "contato@empresa.com.br (ou vazio)",
                "phone": "(XX) XXXX-XXXX (ou vazio)"
            }
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || MOCK_POTENTIAL_LEADS);
    } catch (error) {
        console.error("Gemini Prospecting Error:", error);
        return JSON.parse(MOCK_POTENTIAL_LEADS);
    }
};

// --- NEXUS SPY: COMPETITOR ANALYSIS ---
export const analyzeCompetitor = async (competitorName: string, website: string, sector: string): Promise<Partial<Competitor>> => {
    try {
        if (!process.env.API_KEY) return JSON.parse(MOCK_SWOT_ANALYSIS);

        const prompt = `
            Atue como um Estrategista de Inteligência Competitiva.
            
            Analise o concorrente:
            Nome: ${competitorName}
            Site: ${website}
            Setor: ${sector}

            Realize uma análise SWOT (Forças, Fraquezas, Oportunidades, Ameaças).
            Crie também um "Battlecard" de Vendas com argumentos para vencer este concorrente.

            Retorne APENAS um JSON com o seguinte formato:
            {
                "swot": {
                    "strengths": ["string"],
                    "weaknesses": ["string"],
                    "opportunities": ["string"],
                    "threats": ["string"]
                },
                "battlecard": {
                    "killPoints": ["Argumentos fatais para ganhar a venda"],
                    "defensePoints": ["Como responder aos pontos fortes deles"],
                    "pricing": "Estimativa de modelo de preço (ex: Baixo custo, Premium, Freemium)"
                }
            }
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        return JSON.parse(response.text || MOCK_SWOT_ANALYSIS);
    } catch (error) {
        console.error("Gemini Competitor Analysis Error:", error);
        return JSON.parse(MOCK_SWOT_ANALYSIS);
    }
};

// --- NEXUS SPY: MARKET TRENDS ---
export const fetchMarketTrends = async (sector: string): Promise<MarketTrend[]> => {
    try {
        if (!process.env.API_KEY) {
            // Mock with fake dates relative to now
            const mock = JSON.parse(MOCK_MARKET_TRENDS_RES);
            return mock.map((m: any, i: number) => ({...m, id: `TR-${Date.now()}-${i}`, date: new Date().toISOString() }));
        }

        const prompt = `
            Atue como um Analista de Tendências de Mercado.
            
            Setor Alvo: ${sector}

            Liste 3 a 5 tendências recentes, notícias ou mudanças de mercado REAIS ou altamente prováveis que impactam este setor.
            Foque em tecnologia, regulação e comportamento do consumidor.

            Retorne APENAS um Array JSON:
            [
                {
                    "title": "Título da Tendência",
                    "description": "Breve explicação do impacto.",
                    "impact": "High" | "Medium" | "Low",
                    "sentiment": "Positive" | "Negative" | "Neutral"
                }
            ]
        `;

        const ai = getAI();
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
            }
        });

        const data = JSON.parse(response.text || MOCK_MARKET_TRENDS_RES);
        // Add IDs and dates manually
        return data.map((d: any, i: number) => ({
            ...d,
            id: `TR-${Date.now()}-${i}`,
            date: new Date().toISOString()
        }));

    } catch (error) {
        console.error("Gemini Trends Error:", error);
        const mock = JSON.parse(MOCK_MARKET_TRENDS_RES);
        return mock.map((m: any, i: number) => ({...m, id: `TR-${Date.now()}-${i}`, date: new Date().toISOString() }));
    }
};
