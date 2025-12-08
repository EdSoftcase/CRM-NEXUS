
import { Lead, Ticket, Issue, Invoice, LeadStatus, TicketPriority, TicketStatus, User, InvoiceStatus, Client, Activity, AuditLog, Proposal, Product, ClientDocument, Organization, Campaign, MarketingContent, Workflow, Project, Competitor, MarketTrend, CustomFieldDefinition, WebhookConfig, InboxConversation } from './types';

// Helper for dynamic dates
const daysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString();
};

// Helper for future dates (License check)
const daysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString();
}

// --- ORGANIZAÇÕES (SAAS MULTI-TENANT MOCK) ---
export const MOCK_ORGANIZATIONS: Organization[] = [
    { 
        id: 'org-1', 
        name: 'Minha Empresa', 
        slug: 'minha-empresa', 
        plan: 'Standard',
        // MOCK: Vencimento em 4 dias para testar o alerta de "Faltam 5 dias"
        licenseExpiresAt: daysFromNow(365) 
    },
];

// --- USUÁRIOS DO SISTEMA ---
// Mantidos apenas o admin padrão para fallback caso auth falhe, mas idealmente virá do Supabase
export const MOCK_USERS: User[] = [
  { id: 'u1', name: 'Admin', role: 'admin', avatar: 'AD', email: 'admin@nexus.com', organizationId: 'org-1' },
  // MOCK: Usuário Cliente para testes do Portal (usar email: client@test.com)
  { id: 'u-client-1', name: 'Cliente Teste', role: 'client', avatar: 'CT', email: 'client@test.com', organizationId: 'org-1', relatedClientId: 'c-nexus-crm' },
];

// --- DADOS DE NEGÓCIO (ZERADOS PARA PRODUÇÃO/SAAS) ---
// O sistema deve carregar do Supabase ou iniciar vazio.

export const MOCK_CLIENTS: Client[] = [
    {
        id: 'c-nexus-crm',
        name: 'Nexus CRM',
        contactPerson: 'System Administrator',
        document: '00.000.000/0001-00',
        email: 'contact@nexus.com',
        phone: '(11) 99999-9999',
        segment: 'Tecnologia',
        since: daysAgo(365),
        status: 'Inactive', 
        ltv: 0,
        nps: 0,
        healthScore: 0,
        onboardingStatus: 'Completed',
        lastContact: daysAgo(60),
        organizationId: 'org-1',
        address: 'Av. Paulista, 1000 - São Paulo, SP',
        cep: '01310-100'
    }
];
export const MOCK_LEADS: Lead[] = [];
export const MOCK_TICKETS: Ticket[] = [];
export const MOCK_ISSUES: Issue[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_ACTIVITIES: Activity[] = [];
export const MOCK_LOGS: AuditLog[] = [];
export const MOCK_PROPOSALS: Proposal[] = [
    {
        id: 'prop-nexus-1',
        title: 'Implantação Nexus Enterprise',
        clientName: 'System Administrator',
        companyName: 'Nexus CRM',
        createdDate: daysAgo(2),
        validUntil: daysFromNow(15),
        status: 'Sent',
        introduction: 'Proposta comercial para implantação completa do sistema Nexus CRM Enterprise, visando otimização de processos e aumento de vendas.',
        scope: ['Configuração de Funil de Vendas', 'Migração de Dados Legados', 'Treinamento da Equipe Comercial', 'Setup de Automações'],
        price: 12500,
        timeline: '45 dias',
        terms: 'Pagamento: 50% no aceite e 50% na entrega. Validade da proposta: 15 dias.',
        organizationId: 'org-1'
    }
];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_DOCUMENTS: ClientDocument[] = [];

// --- DADOS DE MARKETING ---
export const MOCK_CAMPAIGNS: Campaign[] = [
    { id: 'cmp-1', name: 'Black Friday Antecipada', status: 'Active', channel: 'Instagram', budget: 5000, spend: 1200, leadsGenerated: 45, salesGenerated: 2, startDate: daysAgo(10), endDate: daysFromNow(20), organizationId: 'org-1' }
];

export const MOCK_CONTENTS: MarketingContent[] = [];

// --- DADOS DE AUTOMAÇÃO (NEXUS FLOW) ---
export const MOCK_WORKFLOWS: Workflow[] = [
    {
        id: 'wf-1',
        name: 'Boas-vindas Novo Lead',
        active: false,
        trigger: 'lead_created',
        runs: 124,
        actions: [
            { id: 'act-1', type: 'send_email', config: { template: 'Olá! Bem-vindo à nossa empresa...' } },
            { id: 'act-2', type: 'create_task', config: { template: 'Ligar para novo lead em 24h' } }
        ]
    },
    {
        id: 'wf-2',
        name: 'Alerta de Negócio Ganho',
        active: false,
        trigger: 'deal_won',
        runs: 45,
        actions: [
            { id: 'act-3', type: 'notify_slack', config: { target: '#vendas', template: 'Temos um novo cliente! 🎉' } }
        ]
    }
];

export const MOCK_PROJECTS: Project[] = [];

// --- NEXUS SPY (COMPETITIVE INTELLIGENCE) ---
export const MOCK_COMPETITORS: Competitor[] = [
     {
        id: 'comp-1',
        name: 'Global Solutions Inc',
        website: 'globalsolutions.com',
        sector: 'Tecnologia B2B',
        lastAnalysis: daysAgo(5),
        swot: {
            strengths: ['Presença global', 'Marca forte'],
            weaknesses: ['Preço alto', 'Atendimento lento'],
            opportunities: ['Capturar clientes insatisfeitos'],
            threats: ['Novos produtos lançados']
        },
        battlecard: {
            killPoints: ['Nosso suporte é 24/7 humanizado', 'Implementação 3x mais rápida'],
            defensePoints: ['Temos feature parity no módulo principal'],
            pricing: 'Premium (Alto Custo)'
        }
    }
];

export const MOCK_MARKET_TRENDS: MarketTrend[] = [
    {
        id: 'trend-1',
        title: 'Hiperautomação com IA Generativa',
        description: 'Adoção massiva de copilotos para tarefas complexas.',
        impact: 'High',
        sentiment: 'Positive',
        date: daysAgo(2)
    },
    {
        id: 'trend-2',
        title: 'Embedded Finance (Fintechização)',
        description: 'Softwares de gestão integrando serviços financeiros nativos.',
        impact: 'High',
        sentiment: 'Neutral',
        date: daysAgo(5)
    },
    {
        id: 'trend-3',
        title: 'SaaS Vertical (Verticalização)',
        description: 'Migração para softwares ultra-especializados em nichos.',
        impact: 'High',
        sentiment: 'Neutral',
        date: daysAgo(10)
    }
];

// --- SETTINGS (CUSTOM FIELDS & WEBHOOKS) ---
export const MOCK_CUSTOM_FIELDS: CustomFieldDefinition[] = [
    {
        id: 'cf-1',
        label: 'Data de Aniversário',
        key: 'birthday',
        type: 'date',
        module: 'clients',
        required: false
    }
];

export const MOCK_WEBHOOKS: WebhookConfig[] = [];

// --- INBOX ---
export const MOCK_CONVERSATIONS: InboxConversation[] = [];