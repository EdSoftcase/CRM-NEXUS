

import { Lead, Ticket, Issue, Invoice, LeadStatus, TicketPriority, TicketStatus, User, InvoiceStatus, Client, Activity, AuditLog, Proposal, Product, ClientDocument, Organization, Campaign, MarketingContent, Workflow, Project, Competitor, MarketTrend, CustomFieldDefinition, WebhookConfig, InboxConversation, FinancialCategory } from './types';

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
        id: 'org-1', // CHANGED from 'org-softcase' to 'org-1' to match your Supabase data
        name: 'Soft Case Tecnologia', 
        slug: 'softcase', 
        plan: 'Enterprise',
        licenseExpiresAt: daysFromNow(3650) // 10 anos
    },
];

// --- USUÁRIOS DO SISTEMA ---
// Mantidos para fallback caso auth falhe
export const MOCK_USERS: User[] = [
  { 
      id: 'u-master', 
      name: 'Edson SoftCase', 
      role: 'admin', 
      avatar: 'ES', 
      email: 'edson.softcase@gmail.com', 
      organizationId: 'org-1', // Changed to match Org ID
      active: true 
  },
  { id: 'u1', name: 'Admin Demo', role: 'admin', avatar: 'AD', email: 'admin@nexus.com', organizationId: 'org-1' },
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

// Atualizado com campo type
export const MOCK_INVOICES: Invoice[] = [
    { 
        id: 'INV-001', 
        type: 'Income',
        customer: 'Cliente Exemplo', 
        amount: 1500, 
        dueDate: daysFromNow(5), 
        status: InvoiceStatus.PENDING, 
        description: 'Mensalidade', 
        organizationId: 'org-1' 
    }
];

export const MOCK_ACTIVITIES: Activity[] = [];
export const MOCK_LOGS: AuditLog[] = [];
export const MOCK_PROPOSALS: Proposal[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_DOCUMENTS: ClientDocument[] = [];

// --- DADOS DE MARKETING ---
export const MOCK_CAMPAIGNS: Campaign[] = [];
export const MOCK_CONTENTS: MarketingContent[] = [];

// --- DADOS DE AUTOMAÇÃO (NEXUS FLOW) ---
export const MOCK_WORKFLOWS: Workflow[] = [];

export const MOCK_PROJECTS: Project[] = [];

// --- NEXUS SPY (COMPETITIVE INTELLIGENCE) ---
export const MOCK_COMPETITORS: Competitor[] = [];

export const MOCK_MARKET_TRENDS: MarketTrend[] = [];

// --- SETTINGS (CUSTOM FIELDS & WEBHOOKS) ---
export const MOCK_CUSTOM_FIELDS: CustomFieldDefinition[] = [];

export const MOCK_WEBHOOKS: WebhookConfig[] = [];

// --- INBOX ---
export const MOCK_CONVERSATIONS: InboxConversation[] = [];

// --- FINANCIAL CATEGORIES (PLANO DE CONTAS DRE) ---
export const MOCK_CATEGORIES: FinancialCategory[] = [
    // 1. RECEITAS (ENTRADAS)
    { id: 'cat-101', name: 'Receita Operacional Bruta', code: '1.01', type: 'Revenue', description: 'Venda de produtos e serviços', organizationId: 'org-1', budget: 100000 },
    { id: 'cat-102', name: 'Outras Receitas', code: '1.02', type: 'Revenue', description: 'Receitas financeiras, aluguéis', organizationId: 'org-1' },
    
    // 2. DEDUÇÕES (IMPOSTOS SOBRE VENDAS)
    { id: 'cat-201', name: 'Impostos s/ Notas (Simples/ISS)', code: '2.01', type: 'Expense', description: 'Simples Nacional, ISS, ICMS', organizationId: 'org-1', budget: 6000 },
    { id: 'cat-202', name: 'Devoluções e Cancelamentos', code: '2.02', type: 'Expense', description: 'Estornos e cancelamentos', organizationId: 'org-1' },

    // 3. CUSTOS VARIÁVEIS (DIRETOS)
    { id: 'cat-301', name: 'Materiais de Instalação (CMV)', code: '3.01', type: 'Expense', description: 'Insumos diretos aplicados', organizationId: 'org-1', budget: 15000 },
    { id: 'cat-302', name: 'Mão de Obra Terceirizada', code: '3.02', type: 'Expense', description: 'Técnicos freelancers / Parceiros', organizationId: 'org-1', budget: 5000 },
    { id: 'cat-303', name: 'Comissões de Venda', code: '3.03', type: 'Expense', description: 'Pagamento variável comercial', organizationId: 'org-1', budget: 3000 },
    
    // 4. DESPESAS OPERACIONAIS (FIXAS)
    // 4.1 Pessoal
    { id: 'cat-401', name: 'Salários e Ordenados', code: '4.01', type: 'Expense', description: 'Folha de pagamento mensal', organizationId: 'org-1', budget: 30000 },
    { id: 'cat-402', name: 'Encargos Trabalhistas (FGTS/INSS)', code: '4.02', type: 'Expense', description: 'Impostos sobre folha', organizationId: 'org-1', budget: 8000 },
    { id: 'cat-403', name: 'Benefícios (VR/VA/VT/Saúde)', code: '4.03', type: 'Expense', description: 'Benefícios colaboradores', organizationId: 'org-1', budget: 4000 },
    { id: 'cat-404', name: 'Pró-labore', code: '4.04', type: 'Expense', description: 'Retirada dos sócios', organizationId: 'org-1', budget: 10000 },
    
    // 4.2 Administrativo
    { id: 'cat-501', name: 'Aluguel e Condomínio', code: '5.01', type: 'Expense', description: 'Custo de ocupação', organizationId: 'org-1', budget: 2500 },
    { id: 'cat-502', name: 'Utilidades (Água/Luz/Internet)', code: '5.02', type: 'Expense', description: 'Contas de consumo', organizationId: 'org-1', budget: 800 },
    { id: 'cat-503', name: 'Softwares e Licenças', code: '5.03', type: 'Expense', description: 'Nexus CRM, Office, Servidores', organizationId: 'org-1', budget: 1200 },
    { id: 'cat-504', name: 'Serviços de Terceiros (Contabilidade)', code: '5.04', type: 'Expense', description: 'Contador, Jurídico', organizationId: 'org-1', budget: 1000 },
    
    // 4.3 Marketing
    { id: 'cat-601', name: 'Mídia Paga (Ads)', code: '6.01', type: 'Expense', description: 'Google Ads, Meta Ads', organizationId: 'org-1', budget: 2000 },

    // 5. DESPESAS FINANCEIRAS
    { id: 'cat-701', name: 'Tarifas Bancárias', code: '7.01', type: 'Expense', description: 'Taxas de boletos e manutenção', organizationId: 'org-1', budget: 200 },
];
