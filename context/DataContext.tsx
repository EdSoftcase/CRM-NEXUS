
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
    Lead, Client, Ticket, Issue, Invoice, Product, Project, 
    Campaign, MarketingContent, Workflow, PortalSettings, 
    AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, Proposal, Organization, ClientDocument,
    Activity, TriggerType
} from '../types';
import { 
    MOCK_LEADS, MOCK_CLIENTS, MOCK_TICKETS, MOCK_ISSUES, MOCK_INVOICES, 
    MOCK_ACTIVITIES, MOCK_PRODUCTS, MOCK_PROJECTS, MOCK_CAMPAIGNS, 
    MOCK_CONTENTS, MOCK_WORKFLOWS, MOCK_DOCUMENTS, MOCK_LOGS, 
    MOCK_COMPETITORS, MOCK_MARKET_TRENDS, MOCK_CUSTOM_FIELDS, MOCK_WEBHOOKS,
    MOCK_CONVERSATIONS, MOCK_PROPOSALS
} from '../constants';
import { getSupabase } from '../services/supabaseClient';
import { useAuth, SUPER_ADMIN_EMAILS } from './AuthContext';

interface DataContextType {
  leads: Lead[];
  clients: Client[];
  tickets: Ticket[];
  issues: Issue[];
  invoices: Invoice[];
  activities: Activity[];
  products: Product[];
  projects: Project[];
  campaigns: Campaign[];
  marketingContents: MarketingContent[];
  workflows: Workflow[];
  clientDocuments: ClientDocument[];
  portalSettings: PortalSettings;
  logs: AuditLog[];
  notifications: SystemNotification[];
  toasts: ToastMessage[];
  competitors: Competitor[];
  marketTrends: MarketTrend[];
  prospectingHistory: ProspectingHistoryItem[];
  disqualifiedProspects: string[];
  customFields: CustomFieldDefinition[];
  webhooks: WebhookConfig[];
  inboxConversations: InboxConversation[];
  proposals: Proposal[];
  allOrganizations: Organization[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  theme: 'light' | 'dark';
  pushEnabled: boolean;
  activeOrgFilter: string | 'all';
  setActiveOrgFilter: (id: string | 'all') => void;
  refreshData: () => Promise<void>;
  syncLocalToCloud: () => Promise<void>;
  toggleTheme: () => void;
  togglePushNotifications: () => Promise<void>;
  restoreDefaults: () => void;
  addLead: (user: User | null, lead: Lead) => Promise<void>;
  updateLead: (user: User | null, lead: Lead) => Promise<void>;
  updateLeadStatus: (user: User | null, leadId: string, status: LeadStatus) => Promise<void>;
  addClient: (user: User | null, client: Client) => Promise<void>;
  updateClient: (user: User | null, client: Client) => Promise<void>;
  removeClient: (user: User | null, clientId: string, reason: string) => Promise<void>;
  addClientsBulk: (user: User | null, clients: Client[]) => Promise<void>;
  updateClientContact: (client: Client, activity?: Activity) => Promise<void>;
  addTicket: (user: User | null, ticket: Ticket) => Promise<void>;
  updateTicket: (user: User | null, ticketId: string, data: Partial<Ticket>) => Promise<void>;
  addInvoice: (user: User | null, invoice: Invoice) => Promise<void>;
  updateInvoiceStatus: (user: User | null, invoiceId: string, status: InvoiceStatus) => Promise<void>;
  addInvoicesBulk: (user: User | null, invoices: Invoice[]) => Promise<void>;
  addActivity: (user: User | null, activity: Activity) => Promise<void>;
  updateActivity: (user: User | null, activity: Activity) => Promise<void>;
  toggleActivity: (user: User | null, activityId: string) => Promise<void>;
  addProduct: (user: User | null, product: Product) => Promise<void>;
  updateProduct: (user: User | null, product: Product) => Promise<void>;
  removeProduct: (user: User | null, productId: string, reason?: string) => Promise<void>;
  addProject: (user: User | null, project: Project) => Promise<void>;
  updateProject: (user: User | null, project: Project) => Promise<void>;
  deleteProject: (user: User | null, projectId: string) => Promise<void>;
  addIssue: (user: User | null, issue: Issue) => Promise<void>;
  updateIssue: (user: User | null, issueId: string, data: Partial<Issue>) => Promise<void>;
  addIssueNote: (user: User | null, issueId: string, text: string) => Promise<void>;
  addCampaign: (user: User | null, campaign: Campaign) => Promise<void>;
  updateCampaign: (user: User | null, campaign: Campaign) => Promise<void>;
  addMarketingContent: (user: User | null, content: MarketingContent) => Promise<void>;
  updateMarketingContent: (user: User | null, content: MarketingContent) => Promise<void>;
  deleteMarketingContent: (user: User | null, contentId: string) => Promise<void>;
  addWorkflow: (user: User | null, workflow: Workflow) => Promise<void>;
  updateWorkflow: (user: User | null, workflow: Workflow) => Promise<void>;
  deleteWorkflow: (user: User | null, workflowId: string) => Promise<void>;
  triggerAutomation: (trigger: TriggerType, data: any) => void;
  addClientDocument: (user: User | null, doc: ClientDocument) => Promise<void>;
  removeClientDocument: (user: User | null, docId: string) => Promise<void>;
  updatePortalSettings: (user: User | null, settings: PortalSettings) => Promise<void>;
  addLog: (log: AuditLog) => Promise<void>;
  logAction: (user: User | null, action: string, details: string, module: string) => void;
  addSystemNotification: (title: string, message: string, type?: 'info'|'warning'|'success'|'alert', relatedTo?: string) => void;
  markNotificationRead: (id: string) => void;
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  updateCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  deleteCompetitor: (user: User | null, competitorId: string) => Promise<void>;
  setMarketTrends: (trends: MarketTrend[]) => void;
  addProspectingHistory: (item: ProspectingHistoryItem) => Promise<void>;
  clearProspectingHistory: () => void;
  disqualifyProspect: (companyName: string) => void;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  addWebhook: (webhook: WebhookConfig) => Promise<void>;
  updateWebhook: (webhook: WebhookConfig) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  addProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  updateProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  removeProposal: (user: User | null, id: string, reason: string) => Promise<void>;
  addInboxInteraction: (name: string, type: string, text: string, contactId?: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultPortalSettings: PortalSettings = {
    organizationId: 'org-1',
    portalName: 'Portal do Cliente',
    primaryColor: '#4f46e5',
    allowInvoiceDownload: true,
    allowTicketCreation: true
};

const mapKeysToApp = (data: any[] | null): any[] => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => {
        const newItem = { ...item };
        if (newItem.organization_id) newItem.organizationId = newItem.organization_id;
        if (newItem.created_at) newItem.createdAt = newItem.created_at;
        if (newItem.contact_person) newItem.contactPerson = newItem.contact_person;
        if (newItem.health_score) newItem.healthScore = newItem.health_score;
        if (newItem.contracted_products) newItem.contractedProducts = newItem.contracted_products;
        if (newItem.group_id) newItem.groupId = newItem.group_id;
        if (newItem.group_name) newItem.groupName = newItem.group_name;
        if (newItem.last_contact) newItem.lastContact = newItem.last_contact;
        if (newItem.due_date) newItem.dueDate = newItem.due_date;
        if (newItem.company_name) newItem.companyName = newItem.company_name;
        if (newItem.client_name) newItem.clientName = newItem.client_name;
        if (newItem.client_email) newItem.clientEmail = newItem.client_email;
        if (newItem.created_date) newItem.createdDate = newItem.created_date;
        if (newItem.valid_until) newItem.validUntil = newItem.valid_until;
        if (newItem.signed_at) newItem.signedAt = newItem.signed_at;
        if (newItem.signed_by_ip) newItem.signedByIp = newItem.signed_by_ip;
        if (newItem.monthly_cost) newItem.monthlyCost = newItem.monthly_cost;
        if (newItem.setup_cost) newItem.setupCost = newItem.setup_cost;
        if (newItem.includes_development) newItem.includesDevelopment = newItem.includes_development;
        if (newItem.custom_clause) newItem.customClause = newItem.custom_clause;
        
        // Portal fields (Client table only)
        if (newItem.portal_email) newItem.portalEmail = newItem.portal_email;
        if (newItem.portal_password) newItem.portalPassword = newItem.portal_password;
        
        if (newItem.signature) newItem.signature = newItem.signature;
        return newItem;
    });
};

const mapKeysToDb = (data: any) => {
    if (!data) return {};
    const mappings: Record<string, string> = {
        organizationId: 'organization_id',
        createdAt: 'created_at',
        contactPerson: 'contact_person',
        healthScore: 'health_score',
        contractedProducts: 'contracted_products',
        groupId: 'group_id',
        groupName: 'group_name',
        lastContact: 'last_contact',
        dueDate: 'due_date',
        companyName: 'company_name',
        clientName: 'client_name',
        clientEmail: 'client_email',
        createdDate: 'created_date',
        validUntil: 'valid_until',
        signedAt: 'signed_at',
        signedByIp: 'signed_by_ip',
        monthlyCost: 'monthly_cost',
        setupCost: 'setup_cost',
        includesDevelopment: 'includes_development',
        customClause: 'custom_clause',
        portalEmail: 'portal_email',
        portalPassword: 'portal_password',
        signature: 'signature'
    };
    const payload: any = {};
    Object.keys(data).forEach(key => {
        // Apenas mapeia chaves que existem no objeto original e têm mapeamento definido
        if (mappings[key] !== undefined && data[key] !== undefined) {
            payload[mappings[key]] = data[key] === undefined ? null : data[key];
        } else if (!key.match(/[A-Z]/)) {
            payload[key] = data[key] === undefined ? null : data[key];
        }
    });
    return payload;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    const [leads, setLeads] = useState<Lead[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [marketingContents, setMarketingContents] = useState<MarketingContent[]>([]);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [marketTrends, setMarketTrendsState] = useState<MarketTrend[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [portalSettings, setPortalSettings] = useState<PortalSettings>(defaultPortalSettings);
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('soft_theme') as 'light'|'dark') || 'light');
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('nexus_push_enabled') === 'true');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>([]);
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>(MOCK_CONVERSATIONS);
    const [activeOrgFilter, setActiveOrgFilter] = useState<string | 'all'>('all');

    const refreshData = useCallback(async () => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        setIsSyncing(true);
        try {
            const isSuper = SUPER_ADMIN_EMAILS.includes(currentUser.email || '');
            const isClient = currentUser.role === 'client';
            const userOrgId = currentUser.organizationId || 'org-1';
            const userEmail = (currentUser.email || '').toLowerCase().trim();
            const gName = (currentUser.managedGroupName || '').toUpperCase().trim();

            // 1. CARREGAMENTO DE CLIENTES
            let clientsQuery = sb.from('clients').select('*');
            if (!isSuper) {
                if (isClient) {
                    const filters = [];
                    if (gName) filters.push(`group_name.eq."${gName}"`);
                    if (userEmail) filters.push(`portal_email.eq."${userEmail}"`);
                    if (filters.length > 0) clientsQuery = clientsQuery.or(filters.join(','));
                    else clientsQuery = clientsQuery.eq('id', 'non-existent');
                } else {
                    clientsQuery = clientsQuery.eq('organization_id', userOrgId);
                }
            }
            const { data: rawClients } = await clientsQuery;
            const mappedClients = mapKeysToApp(rawClients);
            setClients(mappedClients);

            const authorizedUnitNames = mappedClients.map(c => c.name);

            // 2. CARREGAMENTO DE FATURAS
            let invoicesQuery = sb.from('invoices').select('*');
            if (isClient && !isSuper) {
                if (authorizedUnitNames.length > 0) {
                    invoicesQuery = invoicesQuery.in('customer', authorizedUnitNames);
                } else {
                    invoicesQuery = invoicesQuery.eq('id', 'non-existent');
                }
            } else if (!isSuper) {
                invoicesQuery = invoicesQuery.eq('organization_id', userOrgId);
            }
            const { data: invData } = await invoicesQuery;
            setInvoices(mapKeysToApp(invData));

            // 3. CARREGAMENTO DE PROPOSTAS
            let proposalsQuery = sb.from('proposals').select('*');
            if (isClient && !isSuper) {
                const propFilters = [];
                if (gName) propFilters.push(`group_name.eq."${gName}"`);
                if (authorizedUnitNames.length > 0) propFilters.push(`company_name.in.(${authorizedUnitNames.map(n => `"${n}"`).join(',')})`);
                
                if (propFilters.length > 0) proposalsQuery = proposalsQuery.or(propFilters.join(','));
                else proposalsQuery = proposalsQuery.eq('id', 'non-existent');
            } else if (!isSuper) {
                proposalsQuery = proposalsQuery.eq('organization_id', userOrgId);
            }
            const { data: propData } = await proposalsQuery;
            setProposals(mapKeysToApp(propData));

            // 4. CARREGAMENTO DE TICKETS
            let ticketsQuery = sb.from('tickets').select('*');
            if (isClient && !isSuper) {
                if (authorizedUnitNames.length > 0) {
                    ticketsQuery = ticketsQuery.in('customer', authorizedUnitNames);
                } else {
                    ticketsQuery = ticketsQuery.eq('id', 'non-existent');
                }
            } else if (!isSuper) {
                ticketsQuery = ticketsQuery.eq('organization_id', userOrgId);
            }
            const { data: tktData } = await ticketsQuery;
            setTickets(mapKeysToApp(tktData));

            // 5. OUTROS
            if (!isClient) {
                const [l, act, pj, cf, pr] = await Promise.all([
                    sb.from('leads').select('*').eq('organization_id', userOrgId),
                    sb.from('activities').select('*').eq('organization_id', userOrgId),
                    sb.from('projects').select('*').eq('organization_id', userOrgId),
                    sb.from('custom_fields').select('*').eq('organization_id', userOrgId),
                    sb.from('products').select('*').eq('organization_id', 'org-1')
                ]);
                setLeads(mapKeysToApp(l.data));
                setActivities(mapKeysToApp(act.data));
                setProjects(mapKeysToApp(pj.data));
                setCustomFields(mapKeysToApp(cf.data));
                setProducts(mapKeysToApp(pr.data));
            } else {
                const { data: pr } = await sb.from('products').select('*').eq('organization_id', 'org-1');
                setProducts(mapKeysToApp(pr));
            }
            
            setLastSyncTime(new Date());
        } catch (e: any) {
            console.error("Refresh Data Error:", e?.message || e);
        } finally {
            setIsSyncing(false);
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const dbUpsert = async (table: string, data: any) => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        try {
            const payload = mapKeysToDb({ 
                ...data, 
                organizationId: data.organizationId || currentUser.organizationId || 'org-1' 
            });
            const { error } = await sb.from(table).upsert(payload);
            if (error) throw error;
        } catch (err: any) {
            // Garante que o erro retornado seja uma string de mensagem limpa
            const errorMsg = err?.message || err?.error_description || (typeof err === 'string' ? err : 'Erro de comunicação com o banco');
            console.error(`Error upserting to ${table}:`, errorMsg);
            throw new Error(errorMsg);
        }
    };

    const addClient = async (user: User | null, client: Client) => {
        setClients(prev => [...prev, client]);
        await dbUpsert('clients', client);
    };

    const updateClient = async (user: User | null, client: Client) => {
        setClients(prev => prev.map(c => c.id === client.id ? client : c));
        await dbUpsert('clients', client);
    };

    const removeClient = async (user: User | null, clientId: string, reason: string) => {
        const sb = getSupabase();
        if (sb) await sb.from('clients').delete().eq('id', clientId);
        setClients(prev => prev.filter(c => c.id !== clientId));
    };

    const toggleTheme = () => {
        setTheme(prev => {
            const next = prev === 'light' ? 'dark' : 'light';
            localStorage.setItem('soft_theme', next);
            return next;
        });
    };

    const togglePushNotifications = async () => {
        if (!('Notification' in window)) return;
        const permission = await Notification.requestPermission();
        const enabled = permission === 'granted';
        setPushEnabled(enabled);
        localStorage.setItem('nexus_push_enabled', String(enabled));
    };

    const addLead = async (u: User|null, l: Lead) => { setLeads(p=>[...p,l]); await dbUpsert('leads', l); };
    const updateLead = async (u: User|null, l: Lead) => { setLeads(p=>p.map(x=>x.id===l.id?l:x)); await dbUpsert('leads', l); };
    const updateLeadStatus = async (u: User|null, id: string, s: LeadStatus) => { 
        const l=leads.find(x=>x.id===id); if(l){ const n={...l,status:s}; await updateLead(u,n); } 
    };

    const addProposal = async (u: User|null, p: Proposal) => { setProposals(prev => [...prev, p]); await dbUpsert('proposals', p); };
    const updateProposal = async (u: User|null, p: Proposal) => { 
        setProposals(prev => prev.map(x => x.id === p.id ? p : x)); 
        await dbUpsert('proposals', p); 
    };
    const removeProposal = async (u: User|null, id: string, r: string) => { const sb = getSupabase(); if (sb) await sb.from('proposals').delete().eq('id', id); setProposals(prev => prev.filter(x => x.id !== id)); };

    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert' = 'info', relatedTo?: string) => {
        const notif: SystemNotification = {
            id: `NOTIF-${Date.now()}`,
            title, message, type,
            timestamp: new Date().toISOString(),
            read: false, relatedTo, organizationId: 'org-1'
        };
        setNotifications(prev => [notif, ...prev]);
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, issues, invoices, activities, products, projects, 
            campaigns, marketingContents, workflows, clientDocuments, portalSettings, 
            logs, notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, customFields, webhooks, inboxConversations, proposals, allOrganizations,
            isSyncing, lastSyncTime, theme, pushEnabled, activeOrgFilter, setActiveOrgFilter,
            refreshData, syncLocalToCloud: async () => {}, toggleTheme, togglePushNotifications, restoreDefaults: () => {},
            addLead, updateLead, updateLeadStatus, addClient, updateClient, removeClient, addClientsBulk: async () => {}, updateClientContact: async () => {},
            addTicket: async () => {}, updateTicket: async () => {}, addInvoice: async () => {}, updateInvoiceStatus: async () => {}, addInvoicesBulk: async () => {},
            addActivity: async () => {}, updateActivity: async () => {}, toggleActivity: async () => {}, addProduct: async () => {}, updateProduct: async () => {}, removeProduct: async () => {},
            addProject: async () => {}, updateProject: async () => {}, deleteProject: async () => {}, addIssue: async () => {}, updateIssue: async () => {}, addIssueNote: async () => {},
            addCampaign: async () => {}, updateCampaign: async () => {}, addMarketingContent: async () => {}, updateMarketingContent: async () => {}, deleteMarketingContent: async () => {},
            addWorkflow: async () => {}, updateWorkflow: async () => {}, deleteWorkflow: async () => {}, triggerAutomation: () => {}, addClientDocument: async () => {}, removeClientDocument: async () => {},
            updatePortalSettings: async () => {}, addLog: async () => {}, logAction: () => {}, addSystemNotification, markNotificationRead: (id) => setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n)), addToast: () => {}, removeToast: () => {},
            addCompetitor: async () => {}, updateCompetitor: async () => {}, deleteCompetitor: async () => {}, setMarketTrends: () => {}, addProspectingHistory: async () => {}, clearProspectingHistory: () => {}, disqualifyProspect: () => {},
            addCustomField: async () => {}, deleteCustomField: async () => {}, addWebhook: async () => {}, updateWebhook: async () => {}, deleteWebhook: async () => {}, addProposal, updateProposal, removeProposal, addInboxInteraction: () => {}
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) throw new Error('useData must be used within a DataProvider');
    return context;
};
