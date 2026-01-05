
import { Lead, Ticket, Issue, Invoice, LeadStatus, TicketPriority, TicketStatus, User, InvoiceStatus, Client, Activity, AuditLog, Proposal, Product, ClientDocument, Organization, Campaign, MarketingContent, Workflow, Project, Competitor, MarketTrend, CustomFieldDefinition, WebhookConfig, InboxConversation, FinancialCategory } from './types';

export const MOCK_ORGANIZATIONS: Organization[] = [
    { 
        id: 'org-1', 
        name: 'Soft Case Tecnologia', 
        slug: 'softcase', 
        plan: 'Enterprise',
        subscription_status: 'active',
        status: 'active',
        licenseExpiresAt: '2026-12-31T00:00:00Z'
    },
];

export const MOCK_USERS: User[] = [
  { 
      id: 'u-master', 
      name: 'Edson Softcase', 
      role: 'admin', 
      avatar: 'E', 
      email: 'edson.softcase@gmail.com', 
      organizationId: 'org-1',
      active: true 
  },
];

export const MOCK_CLIENTS: Client[] = [];
export const MOCK_LEADS: Lead[] = [];
export const MOCK_TICKETS: Ticket[] = [];
export const MOCK_ISSUES: Issue[] = [];
export const MOCK_INVOICES: Invoice[] = [];
export const MOCK_ACTIVITIES: Activity[] = [];
export const MOCK_LOGS: AuditLog[] = [];
export const MOCK_PROPOSALS: Proposal[] = [];
export const MOCK_PRODUCTS: Product[] = [];
export const MOCK_DOCUMENTS: ClientDocument[] = [];
export const MOCK_CAMPAIGNS: Campaign[] = [];
export const MOCK_CONTENTS: MarketingContent[] = [];
export const MOCK_WORKFLOWS: Workflow[] = [];
export const MOCK_PROJECTS: Project[] = [];
export const MOCK_COMPETITORS: Competitor[] = [];
export const MOCK_MARKET_TRENDS: MarketTrend[] = [];
export const MOCK_CUSTOM_FIELDS: CustomFieldDefinition[] = [];
export const MOCK_WEBHOOKS: WebhookConfig[] = [];
export const MOCK_CONVERSATIONS: InboxConversation[] = [];
export const MOCK_CATEGORIES: FinancialCategory[] = [];
