
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
    MOCK_CONVERSATIONS
} from '../constants';
import { getSupabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface DataContextType {
  leads: Lead[];
  clients: Client[];
  tickets: Ticket[];
  invoices: Invoice[];
  activities: Activity[];
  products: Product[];
  projects: Project[];
  workflows: Workflow[];
  webhooks: WebhookConfig[];
  customFields: CustomFieldDefinition[];
  campaigns: Campaign[];
  marketingContents: MarketingContent[];
  competitors: Competitor[];
  marketTrends: MarketTrend[];
  prospectingHistory: ProspectingHistoryItem[];
  disqualifiedProspects: string[];
  proposals: Proposal[];
  allOrganizations: Organization[];
  logs: AuditLog[];
  notifications: SystemNotification[];
  toasts: ToastMessage[];
  inboxConversations: InboxConversation[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  theme: 'light' | 'dark';
  refreshData: () => Promise<void>;
  toggleTheme: () => void;
  addLead: (user: User | null, lead: Lead) => Promise<void>;
  updateLead: (user: User | null, lead: Lead) => Promise<void>;
  addClient: (user: User | null, client: Client) => Promise<void>;
  updateClient: (user: User | null, client: Client) => Promise<void>;
  updateClientContact: (client: Client, activity?: Activity) => Promise<void>;
  addTicket: (user: User | null, ticket: Ticket) => Promise<void>;
  updateTicket: (user: User | null, ticketId: string, data: Partial<Ticket>) => Promise<void>;
  addInvoice: (user: User | null, invoice: Invoice) => Promise<void>;
  addActivity: (user: User | null, activity: Activity) => Promise<void>;
  toggleActivity: (user: User | null, activityId: string) => Promise<void>;
  addProduct: (user: User | null, product: Product) => Promise<void>;
  removeProduct: (user: User | null, productId: string, reason?: string) => Promise<void>;
  addProject: (user: User | null, project: Project) => Promise<void>;
  updateProject: (user: User | null, project: Project) => Promise<void>;
  addWorkflow: (user: User | null, workflow: Workflow) => Promise<void>;
  updateWorkflow: (user: User | null, workflow: Workflow) => Promise<void>;
  deleteWorkflow: (user: User | null, workflowId: string) => Promise<void>;
  addWebhook: (webhook: WebhookConfig) => Promise<void>;
  deleteWebhook: (id: string) => Promise<void>;
  addCustomField: (field: CustomFieldDefinition) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  addSystemNotification: (title: string, message: string, type?: 'info'|'warning'|'success'|'alert') => void;
  markNotificationRead: (id: string) => void;
  addCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  updateCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  deleteCompetitor: (user: User | null, competitorId: string) => Promise<void>;
  setMarketTrends: (trends: MarketTrend[]) => void;
  addProspectingHistory: (item: ProspectingHistoryItem) => Promise<void>;
  addProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  updateProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  addInboxInteraction: (contactName: string, type: string, text: string, contactIdentifier: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const MASTER_ORG_ID = 'org-1';

const mapKeysToApp = (data: any[] | null | undefined): any[] => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => {
        if (!item) return null;
        const newItem = { ...item };
        if (newItem.organization_id) newItem.organizationId = newItem.organization_id;
        if (newItem.created_at) newItem.createdAt = newItem.created_at;
        if (newItem.contact_person) newItem.contactPerson = newItem.contact_person;
        if (newItem.health_score) newItem.healthScore = newItem.health_score;
        if (newItem.contracted_products) newItem.contractedProducts = Array.isArray(newItem.contracted_products) ? newItem.contracted_products : [];
        if (newItem.last_contact) newItem.lastContact = newItem.last_contact;
        if (newItem.due_date) newItem.dueDate = newItem.due_date;
        if (newItem.company_name) newItem.companyName = newItem.company_name;
        if (newItem.client_name) newItem.clientName = newItem.client_name;
        if (newItem.group_name) newItem.groupName = newItem.group_name;
        if (newItem.created_date) newItem.createdDate = newItem.created_date;
        if (newItem.valid_until) newItem.validUntil = newItem.valid_until;
        if (newItem.signed_at) newItem.signedAt = newItem.signed_at;
        if (newItem.last_analysis) newItem.lastAnalysis = newItem.last_analysis;
        if (newItem.client_email) newItem.clientEmail = newItem.client_email;
        if (newItem.contact_identifier) newItem.contactIdentifier = newItem.contact_identifier;
        if (newItem.contact_name) newItem.contactName = newItem.contact_name;
        if (newItem.last_message) newItem.lastMessage = newItem.last_message;
        if (newItem.last_message_at) newItem.lastMessageAt = newItem.last_message_at;
        if (newItem.unread_count) newItem.unreadCount = newItem.unread_count;
        if (newItem.trigger_event) newItem.triggerEvent = newItem.trigger_event;
        if (newItem.start_date) newItem.startDate = newItem.start_date;
        if (newItem.completed_at) newItem.completedAt = newItem.completed_at;
        if (newItem.status_updated_at) newItem.statusUpdatedAt = newItem.status_updated_at;

        if (newItem.actions) {
            if (typeof newItem.actions === 'string') {
                try { newItem.actions = JSON.parse(newItem.actions); } catch (e) { newItem.actions = []; }
            }
        }

        if (newItem.messages && !Array.isArray(newItem.messages)) {
            try { newItem.messages = typeof newItem.messages === 'string' ? JSON.parse(newItem.messages) : []; } 
            catch (e) { newItem.messages = []; }
        }

        if (newItem.tasks) {
            if (typeof newItem.tasks === 'string') {
                try { newItem.tasks = JSON.parse(newItem.tasks); } catch (e) { newItem.tasks = []; }
            }
        }

        return newItem;
    }).filter(Boolean);
};

const mapToDb = (data: any) => {
    const payload = { ...data };
    if (payload.organizationId) { payload.organization_id = payload.organizationId; delete payload.organizationId; }
    if (payload.createdAt) { payload.created_at = payload.createdAt; delete payload.createdAt; }
    if (payload.contactPerson) { payload.contact_person = payload.contactPerson; delete payload.contactPerson; }
    if (payload.healthScore) { payload.health_score = payload.healthScore; delete payload.healthScore; }
    if (payload.contractedProducts) { payload.contracted_products = payload.contractedProducts; delete payload.contractedProducts; }
    if (payload.lastContact) { payload.last_contact = payload.lastContact; delete payload.lastContact; }
    if (payload.dueDate) { payload.due_date = payload.dueDate; delete payload.dueDate; }
    if (payload.relatedTo) { payload.related_to = payload.relatedTo; delete payload.relatedTo; }
    if (payload.startDate) { payload.start_date = payload.startDate; delete payload.startDate; }
    if (payload.companyName) { payload.company_name = payload.companyName; delete payload.companyName; }
    if (payload.clientName) { payload.client_name = payload.clientName; delete payload.clientName; }
    if (payload.completedAt) { payload.completed_at = payload.completedAt; delete payload.completedAt; }
    if (payload.statusUpdatedAt) { payload.status_updated_at = payload.statusUpdatedAt; delete payload.statusUpdatedAt; }
    
    // Crucial: Manter como JSON ou converter para string se a coluna for TEXT
    // Supabase lida bem com JSONB, mas se for String no App e JSONB no banco, precisa converter
    if (payload.tasks && Array.isArray(payload.tasks)) {
        // Se sua coluna for JSONB, não precisa de stringify. Se for TEXT, precisa.
        // Assumindo que a maioria usa JSONB para facilidade.
        payload.tasks = payload.tasks; 
    }
    
    return payload;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { currentUser } = useAuth();
    
    const [leads, setLeads] = useState<Lead[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [activities, setActivities] = useState<Activity[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [campaigns, setCampaigns] = useState<Campaign[]>([]);
    const [marketingContents, setMarketingContents] = useState<MarketingContent[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [marketTrends, setMarketTrendsState] = useState<MarketTrend[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('soft_theme') as 'light'|'dark') || 'light');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>([]);
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);

    const refreshData = useCallback(async () => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        setIsSyncing(true);
        try {
            const userOrgId = currentUser.organizationId || MASTER_ORG_ID;

            const results = await Promise.allSettled([
                sb.from('leads').select('*').eq('organization_id', userOrgId),
                sb.from('clients').select('*').eq('organization_id', userOrgId),
                sb.from('tickets').select('*').eq('organization_id', userOrgId),
                sb.from('invoices').select('*').eq('organization_id', userOrgId),
                sb.from('activities').select('*').eq('organization_id', userOrgId),
                sb.from('projects').select('*').eq('organization_id', userOrgId),
                sb.from('products').select('*').eq('organization_id', MASTER_ORG_ID),
                sb.from('competitors').select('*').eq('organization_id', userOrgId),
                sb.from('proposals').select('*').eq('organization_id', userOrgId),
                sb.from('prospecting_history').select('*').eq('organization_id', userOrgId).order('timestamp', { ascending: false }),
                sb.from('organizations').select('*'),
                sb.from('audit_logs').select('*').eq('organization_id', userOrgId).limit(50),
                sb.from('market_trends').select('*'),
                sb.from('inbox_conversations').select('*').eq('organization_id', userOrgId),
                sb.from('workflows').select('*').eq('organization_id', userOrgId),
                sb.from('webhooks').select('*').eq('organization_id', userOrgId),
                sb.from('custom_fields').select('*').eq('organization_id', userOrgId)
            ]);

            const getData = (index: number) => {
                const res = results[index];
                if (res && res.status === 'fulfilled') {
                  const data = (res.value as any).data;
                  return mapKeysToApp(Array.isArray(data) ? data : []);
                }
                return [];
            };

            setLeads(getData(0));
            setClients(getData(1));
            setTickets(getData(2));
            setInvoices(getData(3));
            setActivities(getData(4));
            setProjects(getData(5));
            setProducts(getData(6));
            setCompetitors(getData(7));
            setProposals(getData(8));
            setProspectingHistory(getData(9));
            setAllOrganizations(getData(10));
            setLogs(getData(11));
            setMarketTrendsState(getData(12));
            setInboxConversations(getData(13).length > 0 ? getData(13) : MOCK_CONVERSATIONS);
            setWorkflows(getData(14));
            setWebhooks(getData(15));
            setCustomFields(getData(16));
            
            setLastSyncTime(new Date());
        } catch (e: any) {
            console.error("Refresh Data Error:", e.message);
        } finally {
            setIsSyncing(false);
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const updateProject = async (user: User | null, project: Project) => {
        // 1. Atualizar Estado Global (Obrigatório para persistência em memória)
        setProjects(prev => prev.map(p => p.id === project.id ? project : p));
        
        // 2. Persistência em Nuvem
        const sb = getSupabase();
        if (sb) {
            try {
                const payload = mapToDb(project);
                const { error } = await sb.from('projects').upsert(payload);
                if (error) throw error;
            } catch (e) {
                console.error("Error updating project in Supabase:", e);
                addToast({ title: 'Erro de Sincronização', message: 'O projeto foi movido mas não pôde ser salvo na nuvem.', type: 'warning' });
            }
        }
    };

    const addToast = (message: Omit<ToastMessage, 'id'>) => {
        const id = `TOAST-${Date.now()}`;
        setToasts(prev => [...prev, { ...message, id }]);
    };

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        localStorage.setItem('soft_theme', newTheme);
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, invoices, activities, products, projects, workflows, webhooks, customFields,
            campaigns, marketingContents, notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, proposals, allOrganizations, logs, inboxConversations,
            isSyncing, lastSyncTime, theme,
            refreshData, toggleTheme, 
            addLead: async (u, l) => { /* logic */ },
            updateLead: async (u, l) => { /* logic */ },
            addClient: async (u, c) => { /* logic */ },
            updateClient: async (u, c) => { /* logic */ },
            updateClientContact: async (c, a) => { /* logic */ },
            addTicket: async (u, t) => { /* logic */ },
            updateTicket: async (u, id, d) => { /* logic */ },
            addInvoice: async (u, i) => { /* logic */ },
            addActivity: async (u, a) => { /* logic */ },
            toggleActivity: async (u, id) => { /* logic */ },
            addProduct: async (u, p) => { /* logic */ },
            removeProduct: async (u, id) => { /* logic */ },
            addProject: async (u, p) => { /* logic */ },
            updateProject,
            addWorkflow: async (u, w) => { /* logic */ },
            updateWorkflow: async (u, w) => { /* logic */ },
            deleteWorkflow: async (u, id) => { /* logic */ },
            addWebhook: async (w) => { /* logic */ },
            deleteWebhook: async (id) => { /* logic */ },
            addCustomField: async (f) => { /* logic */ },
            deleteCustomField: async (id) => { /* logic */ },
            addSystemNotification: (t, m, tp) => setNotifications(p => [{ id: `NOTIF-${Date.now()}`, title: t, message: m, type: tp || 'info', timestamp: new Date().toISOString(), read: false }, ...p]),
            markNotificationRead: (id) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n)),
            addToast, 
            removeToast: (id) => setToasts(prev => prev.filter(t => t.id !== id)),
            addCompetitor: async (u, c) => { /* logic */ },
            updateCompetitor: async (u, c) => { /* logic */ },
            deleteCompetitor: async (u, id) => { /* logic */ },
            setMarketTrends: (t) => setMarketTrendsState(t),
            addProspectingHistory: async (i) => { /* logic */ },
            addProposal: async (u, p) => { /* logic */ },
            updateProposal: async (u, p) => { /* logic */ },
            addInboxInteraction: (cn, ty, tx, ci) => { /* logic */ }
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
