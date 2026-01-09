
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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultPortalSettings: PortalSettings = {
    organizationId: 'org-1',
    portalName: 'Portal do Cliente',
    primaryColor: '#4f46e5',
    allowInvoiceDownload: true,
    allowTicketCreation: true
};

// Fix: Declared missing MASTER_ORG_ID
const MASTER_ORG_ID = 'org-1';

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
        if (newItem.portal_email) newItem.portalEmail = newItem.portal_email;
        if (newItem.portal_password) newItem.portalPassword = newItem.portal_password;
        if (newItem.timestamp) newItem.timestamp = newItem.timestamp;
        if (newItem.last_analysis) newItem.lastAnalysis = newItem.last_analysis;
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
        timestamp: 'timestamp',
        lastAnalysis: 'last_analysis'
    };
    const payload: any = {};
    Object.keys(data).forEach(key => {
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
            console.error(`Error upserting to ${table}:`, err?.message || err);
        }
    };

    const refreshData = useCallback(async () => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        setIsSyncing(true);
        try {
            const userOrgId = currentUser.organizationId || 'org-1';

            const [l, c, t, inv, act, pj, pr, comp, tr, cf, wh, prop, hist] = await Promise.all([
                sb.from('leads').select('*').eq('organization_id', userOrgId),
                sb.from('clients').select('*').eq('organization_id', userOrgId),
                sb.from('tickets').select('*').eq('organization_id', userOrgId),
                sb.from('invoices').select('*').eq('organization_id', userOrgId),
                sb.from('activities').select('*').eq('organization_id', userOrgId),
                sb.from('projects').select('*').eq('organization_id', userOrgId),
                sb.from('products').select('*').eq('organization_id', MASTER_ORG_ID || 'org-1'),
                sb.from('competitors').select('*').eq('organization_id', userOrgId),
                sb.from('market_trends').select('*').eq('organization_id', userOrgId),
                sb.from('custom_fields').select('*').eq('organization_id', userOrgId),
                sb.from('webhooks').select('*').eq('organization_id', userOrgId),
                sb.from('proposals').select('*').eq('organization_id', userOrgId),
                sb.from('prospecting_history').select('*').eq('organization_id', userOrgId).order('timestamp', { ascending: false })
            ]);

            setLeads(mapKeysToApp(l.data));
            setClients(mapKeysToApp(c.data));
            setTickets(mapKeysToApp(t.data));
            setInvoices(mapKeysToApp(inv.data));
            setActivities(mapKeysToApp(act.data));
            setProjects(mapKeysToApp(pj.data));
            setProducts(mapKeysToApp(pr.data));
            setCompetitors(mapKeysToApp(comp.data));
            setMarketTrendsState(mapKeysToApp(tr.data));
            setCustomFields(mapKeysToApp(cf.data));
            setWebhooks(mapKeysToApp(wh.data));
            setProposals(mapKeysToApp(prop.data));
            setProspectingHistory(mapKeysToApp(hist.data));
            
            setLastSyncTime(new Date());
        } catch (e: any) {
            console.error("Refresh Data Error:", e?.message || e);
        } finally {
            setIsSyncing(false);
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('soft_theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const togglePushNotifications = async () => {
        if (!('Notification' in window)) {
            alert("Este navegador não suporta notificações.");
            return;
        }
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            setPushEnabled(true);
            localStorage.setItem('nexus_push_enabled', 'true');
            new Notification("Nexus CRM", { body: "Notificações ativadas!" });
        } else {
            setPushEnabled(false);
            localStorage.setItem('nexus_push_enabled', 'false');
        }
    };

    const addCompetitor = async (user: User | null, competitor: Competitor) => {
        setCompetitors(prev => [...prev, competitor]);
        await dbUpsert('competitors', competitor);
    };

    const updateCompetitor = async (user: User | null, competitor: Competitor) => {
        setCompetitors(prev => prev.map(c => c.id === competitor.id ? competitor : c));
        await dbUpsert('competitors', competitor);
    };

    const deleteCompetitor = async (user: User | null, competitorId: string) => {
        const sb = getSupabase();
        if (sb) {
            await sb.from('competitors').delete().eq('id', competitorId);
        }
        setCompetitors(prev => prev.filter(c => c.id !== competitorId));
    };

    const addLead = async (u: User|null, l: Lead) => { setLeads(p=>[...p,l]); await dbUpsert('leads', l); };
    const updateLead = async (u: User|null, l: Lead) => { setLeads(p=>p.map(x=>x.id===l.id?l:x)); await dbUpsert('leads', l); };
    const addProposal = async (u: User|null, p: Proposal) => { setProposals(prev => [...prev, p]); await dbUpsert('proposals', p); };
    const updateProposal = async (u: User|null, p: Proposal) => { setProposals(prev => prev.map(x => x.id === p.id ? p : x)); await dbUpsert('proposals', p); };
    const updateClientContact = async (client: Client, activity?: Activity) => {
        const updatedClient = { ...client, lastContact: new Date().toISOString() };
        setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
        await dbUpsert('clients', updatedClient);
        if (activity) {
            setActivities(prev => [activity, ...prev]);
            await dbUpsert('activities', activity);
        }
    };

    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert' = 'info') => {
        const notif: SystemNotification = { id: `NOTIF-${Date.now()}`, title, message, type, timestamp: new Date().toISOString(), read: false, organizationId: 'org-1' };
        setNotifications(prev => [notif, ...prev]);
    };

    // Fix: Added missing addProspectingHistory implementation
    const addProspectingHistory = async (item: ProspectingHistoryItem) => {
        setProspectingHistory(prev => [item, ...prev].slice(0, 50));
        await dbUpsert('prospecting_history', item);
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, issues, invoices, activities, products, projects, 
            campaigns, marketingContents, workflows, clientDocuments, portalSettings, 
            logs, notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, customFields, webhooks, inboxConversations, proposals, allOrganizations,
            isSyncing, lastSyncTime, theme, pushEnabled, activeOrgFilter, setActiveOrgFilter,
            refreshData, syncLocalToCloud: async () => {}, toggleTheme, togglePushNotifications, restoreDefaults: () => {},
            addLead, updateLead, updateLeadStatus: async () => {}, addClient: async () => {}, updateClient: async () => {}, removeClient: async () => {}, addClientsBulk: async () => {}, updateClientContact,
            addTicket: async () => {}, updateTicket: async () => {}, addInvoice: async () => {}, updateInvoiceStatus: async () => {}, addInvoicesBulk: async () => {},
            addActivity: async () => {}, updateActivity: async () => {}, toggleActivity: async () => {}, addProduct: async () => {}, updateProduct: async () => {}, removeProduct: async () => {},
            addProject: async () => {}, updateProject: async () => {}, deleteProject: async () => {}, addIssue: async () => {}, updateIssue: async () => {}, addIssueNote: async () => {},
            addCampaign: async () => {}, updateCampaign: async () => {}, addMarketingContent: async () => {}, updateMarketingContent: async () => {}, deleteMarketingContent: async () => {},
            addWorkflow: async () => {}, updateWorkflow: async () => {}, deleteWorkflow: async () => {}, triggerAutomation: () => {}, addClientDocument: async () => {}, removeClientDocument: async () => {},
            updatePortalSettings: async () => {}, addLog: async () => {}, logAction: () => {}, addSystemNotification, markNotificationRead: (id) => setNotifications(p=>p.map(n=>n.id===id?{...n,read:true}:n)), addToast: () => {}, removeToast: () => {},
            addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends: (trends) => setMarketTrendsState(trends), addProspectingHistory, clearProspectingHistory: () => setProspectingHistory([]), disqualifyProspect: () => {},
            addCustomField: async () => {}, deleteCustomField: async () => {}, addWebhook: async () => {}, updateWebhook: async () => {}, deleteWebhook: async () => {}, addProposal, updateProposal, removeProposal: async () => {}, addInboxInteraction: () => {}
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
