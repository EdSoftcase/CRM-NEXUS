
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
        id: 'org-softcase', 
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
      organizationId: 'org-softcase',
      active: true 
  },
  { id: 'u1', name: 'Admin Demo', role: 'admin', avatar: 'AD', email: 'admin@nexus.com', organizationId: 'org-softcase' },
  { id: 'u-client-1', name: 'Cliente Teste', role: 'client', avatar: 'CT', email: 'client@test.com', organizationId: 'org-softcase', relatedClientId: 'c-nexus-crm' },
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
        organizationId: 'org-softcase',
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
