import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
    Lead, Client, Ticket, Issue, Invoice, Activity, Product, Project, 
    Campaign, MarketingContent, Workflow, ClientDocument, PortalSettings, 
    AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, TriggerType, Proposal
} from '../types';
import { 
    MOCK_LEADS, MOCK_CLIENTS, MOCK_TICKETS, MOCK_ISSUES, MOCK_INVOICES, 
    MOCK_ACTIVITIES, MOCK_PRODUCTS, MOCK_PROJECTS, MOCK_CAMPAIGNS, 
    MOCK_CONTENTS, MOCK_WORKFLOWS, MOCK_DOCUMENTS, MOCK_LOGS, 
    MOCK_COMPETITORS, MOCK_MARKET_TRENDS, MOCK_CUSTOM_FIELDS, MOCK_WEBHOOKS,
    MOCK_CONVERSATIONS, MOCK_PROPOSALS
} from '../constants';
import { getSupabase } from '../services/supabaseClient';

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
  
  isSyncing: boolean;
  lastSyncTime: Date | null;
  theme: 'light' | 'dark';
  pushEnabled: boolean;

  refreshData: () => Promise<void>;
  syncLocalToCloud: () => Promise<void>;
  toggleTheme: () => void;
  togglePushNotifications: () => Promise<void>;
  restoreDefaults: () => void;

  addLead: (user: User | null, lead: Lead) => void;
  updateLead: (user: User | null, lead: Lead) => void;
  updateLeadStatus: (user: User | null, leadId: string, status: LeadStatus) => void;

  addClient: (user: User | null, client: Client) => void;
  updateClient: (user: User | null, client: Client) => void;
  removeClient: (user: User | null, clientId: string, reason: string) => void;
  addClientsBulk: (user: User | null, clients: Client[]) => void;
  updateClientContact: (client: Client, activity?: Activity) => void;

  addTicket: (user: User | null, ticket: Ticket) => void;
  updateTicket: (user: User | null, ticketId: string, data: Partial<Ticket>) => void;

  addInvoice: (user: User | null, invoice: Invoice) => void;
  updateInvoiceStatus: (user: User | null, invoiceId: string, status: InvoiceStatus) => void;
  addInvoicesBulk: (user: User | null, invoices: Invoice[]) => void;

  addActivity: (user: User | null, activity: Activity) => void;
  updateActivity: (user: User | null, activity: Activity) => void;
  toggleActivity: (user: User | null, activityId: string) => void;

  addProduct: (user: User | null, product: Product) => void;
  updateProduct: (user: User | null, product: Product) => void;
  removeProduct: (user: User | null, productId: string, reason?: string) => void;

  addProject: (user: User | null, project: Project) => void;
  updateProject: (user: User | null, project: Project) => void;
  deleteProject: (user: User | null, projectId: string) => void;

  addIssue: (user: User | null, issue: Issue) => void;
  updateIssue: (user: User | null, issueId: string, data: Partial<Issue>) => void;
  addIssueNote: (user: User | null, issueId: string, text: string) => void;

  addCampaign: (user: User | null, campaign: Campaign) => void;
  updateCampaign: (user: User | null, campaign: Campaign) => void;

  addMarketingContent: (user: User | null, content: MarketingContent) => void;
  updateMarketingContent: (user: User | null, content: MarketingContent) => void;
  deleteMarketingContent: (user: User | null, contentId: string) => void;

  addWorkflow: (user: User | null, workflow: Workflow) => void;
  updateWorkflow: (user: User | null, workflow: Workflow) => void;
  deleteWorkflow: (user: User | null, workflowId: string) => void;
  triggerAutomation: (trigger: TriggerType, data: any) => void;

  addClientDocument: (user: User | null, doc: ClientDocument) => void;
  removeClientDocument: (user: User | null, docId: string) => void;

  updatePortalSettings: (user: User | null, settings: PortalSettings) => void;

  addLog: (log: AuditLog) => void;

  addSystemNotification: (title: string, message: string, type?: 'info'|'warning'|'success'|'alert', relatedTo?: string) => void;
  markNotificationRead: (id: string) => void;

  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  addCompetitor: (user: User | null, competitor: Competitor) => void;
  updateCompetitor: (user: User | null, competitor: Competitor) => void;
  deleteCompetitor: (user: User | null, competitorId: string) => void;

  setMarketTrends: (trends: MarketTrend[]) => void;

  addProspectingHistory: (item: ProspectingHistoryItem) => void;
  clearProspectingHistory: () => void;
  disqualifyProspect: (companyName: string) => void;

  addCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;

  addWebhook: (webhook: WebhookConfig) => void;
  updateWebhook: (webhook: WebhookConfig) => void;
  deleteWebhook: (id: string) => void;
  
  addProposal: (user: User | null, proposal: Proposal) => void;
  updateProposal: (user: User | null, proposal: Proposal) => void;
  removeProposal: (user: User | null, id: string, reason: string) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const defaultPortalSettings: PortalSettings = {
    organizationId: 'org-1',
    portalName: 'Portal do Cliente',
    primaryColor: '#4f46e5',
    allowInvoiceDownload: true,
    allowTicketCreation: true
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // --- STATE DEFINITIONS ---
    const [leads, setLeads] = useState<Lead[]>(() => JSON.parse(localStorage.getItem('nexus_leads') || JSON.stringify(MOCK_LEADS)));
    const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem('nexus_clients') || JSON.stringify(MOCK_CLIENTS)));
    const [tickets, setTickets] = useState<Ticket[]>(() => JSON.parse(localStorage.getItem('nexus_tickets') || JSON.stringify(MOCK_TICKETS)));
    const [issues, setIssues] = useState<Issue[]>(() => JSON.parse(localStorage.getItem('nexus_issues') || JSON.stringify(MOCK_ISSUES)));
    const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem('nexus_invoices') || JSON.stringify(MOCK_INVOICES)));
    const [activities, setActivities] = useState<Activity[]>(() => JSON.parse(localStorage.getItem('nexus_activities') || JSON.stringify(MOCK_ACTIVITIES)));
    const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('nexus_products') || JSON.stringify(MOCK_PRODUCTS)));
    const [projects, setProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('nexus_projects') || JSON.stringify(MOCK_PROJECTS)));
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => JSON.parse(localStorage.getItem('nexus_campaigns') || JSON.stringify(MOCK_CAMPAIGNS)));
    const [marketingContents, setMarketingContents] = useState<MarketingContent[]>(() => JSON.parse(localStorage.getItem('nexus_contents') || JSON.stringify(MOCK_CONTENTS)));
    const [workflows, setWorkflows] = useState<Workflow[]>(() => JSON.parse(localStorage.getItem('nexus_workflows') || JSON.stringify(MOCK_WORKFLOWS)));
    const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>(() => JSON.parse(localStorage.getItem('nexus_documents') || JSON.stringify(MOCK_DOCUMENTS)));
    const [logs, setLogs] = useState<AuditLog[]>(() => JSON.parse(localStorage.getItem('nexus_logs') || JSON.stringify(MOCK_LOGS)));
    const [competitors, setCompetitors] = useState<Competitor[]>(() => JSON.parse(localStorage.getItem('nexus_competitors') || JSON.stringify(MOCK_COMPETITORS)));
    const [marketTrends, setMarketTrendsState] = useState<MarketTrend[]>(() => JSON.parse(localStorage.getItem('nexus_market_trends') || JSON.stringify(MOCK_MARKET_TRENDS)));
    const [proposals, setProposals] = useState<Proposal[]>(() => JSON.parse(localStorage.getItem('nexus_proposals') || JSON.stringify(MOCK_PROPOSALS)));
    const [portalSettings, setPortalSettings] = useState<PortalSettings>(() => JSON.parse(localStorage.getItem('nexus_portal_settings') || JSON.stringify(defaultPortalSettings)));
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => JSON.parse(localStorage.getItem('nexus_custom_fields') || JSON.stringify(MOCK_CUSTOM_FIELDS)));
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => JSON.parse(localStorage.getItem('nexus_webhooks') || JSON.stringify(MOCK_WEBHOOKS)));
    
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('nexus_theme') as 'light'|'dark') || 'light');
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('nexus_push_enabled') === 'true');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>(() => JSON.parse(localStorage.getItem('nexus_prospecting_history') || '[]'));
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>(() => JSON.parse(localStorage.getItem('nexus_disqualified_prospects') || '[]'));
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>(MOCK_CONVERSATIONS);

    // --- MAPPING HELPERS (CamelCase <-> SnakeCase) ---
    const mapToApp = (data: any[]) => {
        return data.map(item => {
            const newItem = { ...item };
            // Common
            if (newItem.organization_id) { newItem.organizationId = newItem.organization_id; delete newItem.organization_id; }
            if (newItem.created_at) { newItem.createdAt = newItem.created_at; delete newItem.created_at; }
            
            // Clients
            if (newItem.contact_person) { newItem.contactPerson = newItem.contact_person; delete newItem.contact_person; }
            if (newItem.health_score) { newItem.healthScore = newItem.health_score; delete newItem.health_score; }
            if (newItem.contracted_products) { newItem.contractedProducts = newItem.contracted_products; delete newItem.contracted_products; }
            
            // Leads
            if (newItem.last_contact) { newItem.lastContact = newItem.last_contact; delete newItem.last_contact; }
            if (newItem.product_interest) { newItem.productInterest = newItem.product_interest; delete newItem.product_interest; }
            if (newItem.parking_spots) { newItem.parkingSpots = newItem.parking_spots; delete newItem.parking_spots; }
            
            // Activities
            if (newItem.due_date) { newItem.dueDate = newItem.due_date; delete newItem.due_date; }
            if (newItem.related_to) { newItem.relatedTo = newItem.related_to; delete newItem.related_to; }
            
            // Invoices (Fix for date mapping)
            if (newItem.due_date) { newItem.dueDate = newItem.due_date; delete newItem.due_date; }

            // Projects (Fix for date mapping)
            if (newItem.start_date) { newItem.startDate = newItem.start_date; delete newItem.start_date; }
            if (newItem.client_name) { newItem.clientName = newItem.client_name; delete newItem.client_name; }
            if (newItem.completed_at) { newItem.completedAt = newItem.completed_at; delete newItem.completed_at; }

            // Competitors
            if (newItem.last_analysis) { newItem.lastAnalysis = newItem.last_analysis; delete newItem.last_analysis; }

            // Webhooks
            if (newItem.trigger_event) { newItem.triggerEvent = newItem.trigger_event; delete newItem.trigger_event; }

            // Proposals
            if (newItem.lead_id) { newItem.leadId = newItem.lead_id; delete newItem.lead_id; }
            if (newItem.client_name) { newItem.clientName = newItem.client_name; delete newItem.client_name; }
            if (newItem.company_name) { newItem.companyName = newItem.company_name; delete newItem.company_name; }
            if (newItem.created_date) { newItem.createdDate = newItem.created_date; delete newItem.created_date; }
            if (newItem.valid_until) { newItem.validUntil = newItem.valid_until; delete newItem.valid_until; }
            if (newItem.signed_at) { newItem.signedAt = newItem.signed_at; delete newItem.signed_at; }
            if (newItem.signed_by_ip) { newItem.signedByIp = newItem.signed_by_ip; delete newItem.signed_by_ip; }
            // Mapeamento novos campos proposta
            if (newItem.setup_cost) { newItem.setupCost = newItem.setup_cost; delete newItem.setup_cost; }
            if (newItem.monthly_cost) { newItem.monthlyCost = newItem.monthly_cost; delete newItem.monthly_cost; }
            if (newItem.consultant_name) { newItem.consultantName = newItem.consultant_name; delete newItem.consultant_name; }
            if (newItem.consultant_email) { newItem.consultantEmail = newItem.consultant_email; delete newItem.consultant_email; }
            if (newItem.consultant_phone) { newItem.consultantPhone = newItem.consultant_phone; delete newItem.consultant_phone; }

            // Audit Logs
            if (newItem.user_id) { newItem.userId = newItem.user_id; delete newItem.user_id; }
            if (newItem.user_name) { newItem.userName = newItem.user_name; delete newItem.user_name; }
            
            return newItem;
        });
    };

    const mapToDb = (data: any, tableName: string) => {
        const payload = { ...data };
        
        // Helper to clean empty strings into null for DB safety
        const cleanEmpty = (val: any) => (val === '' ? null : val);

        // --- Common Transformations ---
        if (payload.organizationId) { payload.organization_id = payload.organizationId; delete payload.organizationId; }
        if (payload.createdAt) { payload.created_at = payload.createdAt; delete payload.createdAt; }

        // --- Table Specific Transformations ---
        
        if (tableName === 'clients') {
             if (payload.contactPerson) { payload.contact_person = payload.contactPerson; delete payload.contactPerson; }
             if (payload.healthScore !== undefined) { payload.health_score = payload.healthScore; delete payload.healthScore; }
             if (payload.contractedProducts) { payload.contracted_products = payload.contractedProducts; delete payload.contractedProducts; }
        }

        if (tableName === 'leads') {
             if (payload.lastContact) { payload.last_contact = payload.lastContact; delete payload.lastContact; }
             if (payload.productInterest) { payload.product_interest = payload.productInterest; delete payload.productInterest; }
             if (payload.parkingSpots) { payload.parking_spots = payload.parkingSpots; delete payload.parkingSpots; }
        }

        if (tableName === 'activities' || tableName === 'invoices') {
            if (payload.dueDate) { payload.due_date = payload.dueDate; delete payload.dueDate; }
            if (payload.relatedTo) { payload.related_to = payload.relatedTo; delete payload.relatedTo; }
        }

        if (tableName === 'projects') {
             if (payload.startDate) { payload.start_date = payload.startDate; delete payload.startDate; }
             if (payload.clientName) { payload.client_name = payload.clientName; delete payload.clientName; }
             if (payload.completedAt) { payload.completed_at = payload.completedAt; delete payload.completedAt; }
        }
        
        if (tableName === 'proposals') {
             if (payload.leadId !== undefined) { 
                 payload.lead_id = cleanEmpty(payload.leadId); 
                 delete payload.leadId; 
             }
             if (payload.clientName) { payload.client_name = payload.clientName; delete payload.clientName; }
             if (payload.companyName) { payload.company_name = payload.companyName; delete payload.companyName; }
             if (payload.createdDate) { payload.created_date = payload.createdDate; delete payload.createdDate; }
             if (payload.validUntil) { payload.valid_until = payload.validUntil; delete payload.validUntil; }
             if (payload.signedAt) { payload.signed_at = payload.signedAt; delete payload.signedAt; }
             if (payload.signedByIp) { payload.signed_by_ip = payload.signedByIp; delete payload.signedByIp; }

             if (payload.setupCost !== undefined) { payload.setup_cost = payload.setupCost; delete payload.setupCost; }
             if (payload.monthlyCost !== undefined) { payload.monthly_cost = payload.monthlyCost; delete payload.monthlyCost; }
             if (payload.consultantName !== undefined) { payload.consultant_name = payload.consultantName; delete payload.consultantName; }
             if (payload.consultantEmail !== undefined) { payload.consultant_email = payload.consultantEmail; delete payload.consultantEmail; }
             if (payload.consultantPhone !== undefined) { payload.consultant_phone = payload.consultantPhone; delete payload.consultantPhone; }
        }

        if (tableName === 'competitors') {
             if (payload.lastAnalysis) { payload.last_analysis = payload.lastAnalysis; delete payload.lastAnalysis; }
        }

        if (tableName === 'webhooks') {
             if (payload.triggerEvent) { payload.trigger_event = payload.triggerEvent; delete payload.triggerEvent; }
        }

        // Fix for Audit Logs - ensure consistent mapping
        if (tableName === 'audit_logs') {
             // REMOVED user_id mapping to prevent PGRST204 if schema is outdated/missing
             if (payload.userId) delete payload.userId; // Don't send user_id to DB for now
             if (payload.userName) { payload.user_name = payload.userName; delete payload.userName; }
        }

        // ONLY apply this for PROFILES to prevent overwriting 'name' in products/leads
        if (tableName === 'profiles') {
             if (payload.name && !payload.full_name) { payload.full_name = payload.name; delete payload.name; }
        }

        return payload;
    };

    // --- EFFECTS ---
    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('nexus_theme', theme);
    }, [theme]);

    useEffect(() => { localStorage.setItem('nexus_leads', JSON.stringify(leads)); }, [leads]);
    useEffect(() => { localStorage.setItem('nexus_clients', JSON.stringify(clients)); }, [clients]);
    useEffect(() => { localStorage.setItem('nexus_tickets', JSON.stringify(tickets)); }, [tickets]);
    useEffect(() => { localStorage.setItem('nexus_issues', JSON.stringify(issues)); }, [issues]);
    useEffect(() => { localStorage.setItem('nexus_invoices', JSON.stringify(invoices)); }, [invoices]);
    useEffect(() => { localStorage.setItem('nexus_activities', JSON.stringify(activities)); }, [activities]);
    useEffect(() => { localStorage.setItem('nexus_products', JSON.stringify(products)); }, [products]);
    useEffect(() => { localStorage.setItem('nexus_projects', JSON.stringify(projects)); }, [projects]);
    useEffect(() => { localStorage.setItem('nexus_campaigns', JSON.stringify(campaigns)); }, [campaigns]);
    useEffect(() => { localStorage.setItem('nexus_contents', JSON.stringify(marketingContents)); }, [marketingContents]);
    useEffect(() => { localStorage.setItem('nexus_workflows', JSON.stringify(workflows)); }, [workflows]);
    useEffect(() => { localStorage.setItem('nexus_documents', JSON.stringify(clientDocuments)); }, [clientDocuments]);
    useEffect(() => { localStorage.setItem('nexus_logs', JSON.stringify(logs)); }, [logs]);
    useEffect(() => { localStorage.setItem('nexus_competitors', JSON.stringify(competitors)); }, [competitors]);
    useEffect(() => { localStorage.setItem('nexus_market_trends', JSON.stringify(marketTrends)); }, [marketTrends]);
    useEffect(() => { localStorage.setItem('nexus_proposals', JSON.stringify(proposals)); }, [proposals]);
    useEffect(() => { localStorage.setItem('nexus_portal_settings', JSON.stringify(portalSettings)); }, [portalSettings]);
    useEffect(() => { localStorage.setItem('nexus_custom_fields', JSON.stringify(customFields)); }, [customFields]);
    useEffect(() => { localStorage.setItem('nexus_webhooks', JSON.stringify(webhooks)); }, [webhooks]);
    useEffect(() => { localStorage.setItem('nexus_prospecting_history', JSON.stringify(prospectingHistory)); }, [prospectingHistory]);
    useEffect(() => { localStorage.setItem('nexus_disqualified_prospects', JSON.stringify(disqualifiedProspects)); }, [disqualifiedProspects]);
    
    // --- LOAD AND SUBSCRIBE TO AUTH CHANGES ---
    useEffect(() => {
        const init = async () => {
            const supabase = getSupabase();
            if(supabase) {
                // Initial fetch
                await refreshData();
                
                // Listener for auth changes (Login, Logout, etc.)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
                    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                        // Refresh data immediately when user signs in or token updates
                        await refreshData();
                    }
                    if (event === 'SIGNED_OUT') {
                        // Clear data if needed or handle logout
                    }
                });
                
                return () => {
                    subscription.unsubscribe();
                };
            }
        };
        init();
    }, []);

    const dbUpsert = async (table: string, data: any) => {
        const supabase = getSupabase();
        if (supabase) {
            // Check for active session before attempting write
            const { data: sessionData } = await supabase.auth.getSession();
            
            // If offline/no session, we just return (data is already in local state)
            if (!sessionData.session) {
                console.warn("Sem sessão ativa no Supabase. Salvando apenas localmente.");
                return;
            }

            try {
                // Se o objeto 'data' não tiver organizationId, tentamos pegar do usuário logado na hora
                // Isso resolve o problema de dados criados antes de o contexto carregar 100%
                let payload = mapToDb(data, table);
                
                if (!payload.organization_id) {
                     // Tenta obter o ID da organização do profile local (se disponível no payload, ótimo, senão tenta outra fonte)
                     // O ideal é que 'data' já venha com organizationId, mas como fallback:
                     const { data: profile } = await supabase.from('profiles').select('organization_id').eq('id', sessionData.session.user.id).single();
                     if (profile && profile.organization_id) {
                         payload.organization_id = profile.organization_id;
                     }
                }

                // REMOVED BLOCKING LOGIC FOR ORG-1
                // We now allow org-1 to save if they have a valid session to a valid Supabase instance.
                // This allows users to start testing immediately with the mock data structure on their own DB.

                const { error } = await supabase.from(table).upsert(payload);
                
                if (error) {
                    if (error.code === '42501') {
                         console.error(`[Sync] Erro RLS em ${table}:`, error.message);
                    } else if (error.code === 'PGRST204') {
                         console.warn(`[Sync] Erro Schema em ${table} (Coluna ausente?):`, error.message);
                         // Schema mismatch - silently ignore to allow app to work
                    } else if (error.code === '22P02') {
                         console.warn(`[Sync] Erro UUID em ${table}:`, error.message);
                    } else if (error.code !== '23505') { 
                        console.error(`[Sync] Erro Geral em ${table}:`, error.message);
                    }
                } else {
                    // Success
                    // console.log(`[Sync] Sucesso: ${table} atualizado.`);
                }
            } catch (e: any) {
                console.warn(`Exception syncing ${table} to cloud`, e);
            }
        }
    };

    const dbDelete = async (table: string, id: string) => {
        const supabase = getSupabase();
        if (supabase) {
            try {
                await supabase.from(table).delete().eq('id', id);
            } catch (e) {
                console.warn(`Failed to delete from ${table}`, e);
            }
        }
    };

    const addLog = (log: AuditLog) => {
        setLogs(prev => [log, ...prev]);
        dbUpsert('audit_logs', log);
    };

    const logAction = (user: User | null, action: string, details: string, module: string) => {
        if (!user) return;
        const log: AuditLog = {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: user.id,
            userName: user.name,
            action,
            details,
            module,
            organizationId: user.organizationId
        };
        addLog(log);
    };

    const addToast = (message: Omit<ToastMessage, 'id'>) => {
        const id = `TOAST-${Date.now()}`;
        setToasts(prev => [...prev, { ...message, id }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    };

    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert' = 'info', relatedTo?: string) => {
        const notif: SystemNotification = {
            id: `NOTIF-${Date.now()}`,
            title,
            message,
            type,
            timestamp: new Date().toISOString(),
            read: false,
            relatedTo,
            organizationId: 'org-1'
        };
        setNotifications(prev => [notif, ...prev]);
        addToast({ title, message, type });
        
        if (pushEnabled && 'Notification' in window && Notification.permission === 'granted') {
            new Notification(title, { body: message });
        }
    };

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    // --- SYNC FUNCTION ---
    const refreshData = async () => {
        setIsSyncing(true);
        const supabase = getSupabase();
        
        if (!supabase) {
             setLastSyncTime(new Date());
             setIsSyncing(false);
             return;
        }

        try {
            // Use Promise.allSettled to ensure that one failure (e.g. missing table) doesn't block others
            const results = await Promise.allSettled([
                supabase.from('leads').select('*'),
                supabase.from('clients').select('*'),
                supabase.from('tickets').select('*'),
                supabase.from('invoices').select('*'),
                supabase.from('activities').select('*'),
                supabase.from('products').select('*'),
                supabase.from('projects').select('*'),
                supabase.from('competitors').select('*'),
                supabase.from('market_trends').select('*'),
                supabase.from('audit_logs').select('*').limit(100),
                supabase.from('custom_fields').select('*'),
                supabase.from('webhooks').select('*'),
                supabase.from('proposals').select('*'),
                supabase.from('prospecting_history').select('*').order('timestamp', { ascending: false })
            ]);

            // Helper to extract data or log error
            const processResult = <T,>(result: PromiseSettledResult<{ data: T | null; error: any }>, setter: (data: T[]) => void, tableName: string) => {
                if (result.status === 'fulfilled' && result.value.data) {
                    setter(mapToApp(result.value.data as any[]));
                } else if (result.status === 'fulfilled' && result.value.error) {
                    const errMsg = result.value.error.message || '';
                    console.warn(`Sync Warning: Table '${tableName}' returned error:`, errMsg);
                    
                    // DETECT INFINITE RECURSION AND ALERT USER
                    if (errMsg.includes('infinite recursion')) {
                        addSystemNotification(
                            'Erro Crítico de Banco de Dados',
                            `Recursão infinita detectada na tabela ${tableName}. Por favor, vá em Configurações > Dados e execute o Script SQL de correção.`,
                            'alert'
                        );
                    }
                } else if (result.status === 'rejected') {
                    console.error(`Sync Error: Table '${tableName}' failed to load.`, result.reason);
                }
            };

            processResult(results[0], setLeads, 'leads');
            processResult(results[1], setClients, 'clients');
            processResult(results[2], setTickets, 'tickets');
            processResult(results[3], setInvoices, 'invoices');
            processResult(results[4], setActivities, 'activities');
            processResult(results[5], setProducts, 'products');
            processResult(results[6], setProjects, 'projects');
            processResult(results[7], setCompetitors, 'competitors');
            processResult(results[8], setMarketTrendsState, 'market_trends');
            processResult(results[9], setLogs, 'audit_logs');
            processResult(results[10], setCustomFields, 'custom_fields');
            processResult(results[11], setWebhooks, 'webhooks');
            processResult(results[12], setProposals, 'proposals');
            processResult(results[13], setProspectingHistory, 'prospecting_history');

            setLastSyncTime(new Date());
        } catch (error) {
            console.error("Critical Sync Failure", error);
            addToast({title: "Erro de Sincronização", message: "Falha crítica na conexão com a nuvem.", type: "alert"});
        } finally {
            setIsSyncing(false);
        }
    };

    // --- CRUD HANDLERS ---
    // ... (rest of the file remains similar, with updated dbUpsert usage)

    const addLead = (user: User | null, lead: Lead) => {
        const leadWithOrg = { ...lead, organizationId: user?.organizationId || lead.organizationId };
        setLeads(prev => [...prev, leadWithOrg]);
        dbUpsert('leads', leadWithOrg);
        logAction(user, 'Create Lead', `Created lead ${lead.name}`, 'Comercial');
        triggerAutomation('lead_created', leadWithOrg);
    };

    const updateLead = (user: User | null, lead: Lead) => {
        const leadWithOrg = { ...lead, organizationId: lead.organizationId || user?.organizationId };
        setLeads(prev => prev.map(l => l.id === lead.id ? leadWithOrg : l));
        dbUpsert('leads', leadWithOrg);
        logAction(user, 'Update Lead', `Updated lead ${lead.name}`, 'Comercial');
    };

    const updateLeadStatus = (user: User | null, leadId: string, status: LeadStatus) => {
        const lead = leads.find(l => l.id === leadId);
        if (lead) {
            const updatedLead = { ...lead, status };
            updateLead(user, updatedLead);
            if (status === 'Ganho') triggerAutomation('deal_won', updatedLead);
            if (status === 'Perdido') triggerAutomation('deal_lost', updatedLead);
        }
    };

    const addClient = (user: User | null, client: Client) => {
        const clientWithOrg = { ...client, organizationId: user?.organizationId || client.organizationId };
        setClients(prev => [...prev, clientWithOrg]);
        dbUpsert('clients', clientWithOrg);
        logAction(user, 'Create Client', `Created client ${client.name}`, 'Clientes');
    };

    const updateClient = (user: User | null, client: Client) => {
        const clientWithOrg = { ...client, organizationId: client.organizationId || user?.organizationId };
        setClients(prev => prev.map(c => c.id === client.id ? clientWithOrg : c));
        dbUpsert('clients', clientWithOrg);
        logAction(user, 'Update Client', `Updated client ${client.name}`, 'Clientes');
        if (client.status === 'Churn Risk') triggerAutomation('client_churn_risk', clientWithOrg);
    };

    const removeClient = (user: User | null, clientId: string, reason: string) => {
        const client = clients.find(c => c.id === clientId);
        if (client) {
            setClients(prev => prev.filter(c => c.id !== clientId));
            dbDelete('clients', clientId);
            logAction(user, 'Delete Client', `Deleted client ${client.name}. Reason: ${reason}`, 'Clientes');
        }
    };

    const addClientsBulk = (user: User | null, newClients: Client[]) => {
        const clientsWithOrg = newClients.map(c => ({...c, organizationId: user?.organizationId}));
        setClients(prev => [...prev, ...clientsWithOrg]);
        clientsWithOrg.forEach(c => dbUpsert('clients', c));
        logAction(user, 'Bulk Import', `Imported ${newClients.length} clients`, 'Clientes');
        addSystemNotification('Importação Concluída', `${newClients.length} clientes foram importados com sucesso.`, 'success');
    };

    const updateClientContact = (client: Client, activity?: Activity) => {
        const updatedClient = {
            ...client,
            lastContact: new Date().toISOString()
        };
        // Reuse updated updateClient to handle org logic
        updateClient(null, updatedClient);
        
        if (activity) {
            addActivity(null, activity);
        }
    };

    const addTicket = (user: User | null, ticket: Ticket) => {
        const ticketWithOrg = { ...ticket, organizationId: user?.organizationId || ticket.organizationId };
        setTickets(prev => [...prev, ticketWithOrg]);
        dbUpsert('tickets', ticketWithOrg);
        logAction(user, 'Create Ticket', `Created ticket ${ticket.subject}`, 'Suporte');
        triggerAutomation('ticket_created', ticketWithOrg);
    };

    const updateTicket = (user: User | null, ticketId: string, data: Partial<Ticket>) => {
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
            const ticketWithOrg = { ...ticket, ...data, organizationId: ticket.organizationId || user?.organizationId };
            setTickets(prev => prev.map(t => t.id === ticketId ? ticketWithOrg : t));
            dbUpsert('tickets', ticketWithOrg);
            logAction(user, 'Update Ticket', `Updated ticket ${ticketId}`, 'Suporte');
        }
    };

    const addInvoice = (user: User | null, invoice: Invoice) => {
        const invoiceWithOrg = { ...invoice, organizationId: user?.organizationId || invoice.organizationId };
        setInvoices(prev => [...prev, invoiceWithOrg]);
        dbUpsert('invoices', invoiceWithOrg);
        logAction(user, 'Create Invoice', `Created invoice for ${invoice.customer}`, 'Financeiro');
    };

    const updateInvoiceStatus = (user: User | null, invoiceId: string, status: InvoiceStatus) => {
        const invoice = invoices.find(i => i.id === invoiceId);
        if (invoice) {
            const invoiceWithOrg = { ...invoice, status, organizationId: invoice.organizationId || user?.organizationId };
            setInvoices(prev => prev.map(i => i.id === invoiceId ? invoiceWithOrg : i));
            dbUpsert('invoices', invoiceWithOrg);
            logAction(user, 'Update Invoice', `Updated invoice status to ${status}`, 'Financeiro');
        }
    };

    const addInvoicesBulk = (user: User | null, newInvoices: Invoice[]) => {
        const invoicesWithOrg = newInvoices.map(i => ({...i, organizationId: user?.organizationId}));
        setInvoices(prev => [...prev, ...invoicesWithOrg]);
        invoicesWithOrg.forEach(i => dbUpsert('invoices', i));
        logAction(user, 'Bulk Import Invoices', `Imported ${newInvoices.length} invoices`, 'Financeiro');
    };

    const addActivity = (user: User | null, activity: Activity) => {
        const actWithOrg = { ...activity, organizationId: user?.organizationId || activity.organizationId };
        setActivities(prev => [actWithOrg, ...prev]);
        dbUpsert('activities', actWithOrg);
        if (user) logAction(user, 'Create Activity', `Created ${activity.type}`, 'Agenda');
    };

    const updateActivity = (user: User | null, activity: Activity) => {
        const actWithOrg = { ...activity, organizationId: activity.organizationId || user?.organizationId };
        setActivities(prev => prev.map(a => a.id === activity.id ? actWithOrg : a));
        dbUpsert('activities', actWithOrg);
    };

    const toggleActivity = (user: User | null, activityId: string) => {
        const activity = activities.find(a => a.id === activityId);
        if (activity) {
            const updated = { ...activity, completed: !activity.completed, organizationId: activity.organizationId || user?.organizationId };
            setActivities(prev => prev.map(a => a.id === activityId ? updated : a));
            dbUpsert('activities', updated);
        }
    };

    const addProduct = (user: User | null, product: Product) => {
        // Ensure Org ID is present for RLS
        const productWithOrg = { 
            ...product, 
            organizationId: user?.organizationId || product.organizationId 
        };
        setProducts(prev => [...prev, productWithOrg]);
        dbUpsert('products', productWithOrg);
        logAction(user, 'Create Product', `Created product ${product.name}`, 'Configurações');
    };

    const updateProduct = (user: User | null, product: Product) => {
        // Safe update keeping orgId
        const productWithOrg = { 
            ...product, 
            organizationId: product.organizationId || user?.organizationId 
        };
        setProducts(prev => prev.map(p => p.id === product.id ? productWithOrg : p));
        dbUpsert('products', productWithOrg);
        logAction(user, 'Update Product', `Updated product ${product.name}`, 'Configurações');
    };

    const removeProduct = (user: User | null, productId: string, reason?: string) => {
        setProducts(prev => prev.filter(p => p.id !== productId));
        dbDelete('products', productId);
        logAction(user, 'Delete Product', `Deleted product ${productId}. Reason: ${reason}`, 'Configurações');
    };

    const addProject = (user: User | null, project: Project) => {
        const projWithOrg = { ...project, organizationId: user?.organizationId || project.organizationId };
        setProjects(prev => [...prev, projWithOrg]);
        dbUpsert('projects', projWithOrg);
        logAction(user, 'Create Project', `Created project ${project.title}`, 'Projetos');
    };

    const updateProject = (user: User | null, project: Project) => {
        const projWithOrg = { ...project, organizationId: project.organizationId || user?.organizationId };
        setProjects(prev => prev.map(p => p.id === project.id ? projWithOrg : p));
        dbUpsert('projects', projWithOrg);
        logAction(user, 'Update Project', `Updated project ${project.title}`, 'Projetos');
    };

    const deleteProject = (user: User | null, projectId: string) => {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        dbDelete('projects', projectId);
        logAction(user, 'Delete Project', `Deleted project ${projectId}`, 'Projetos');
    };

    const addIssue = (user: User | null, issue: Issue) => {
        setIssues(prev => [...prev, issue]);
        logAction(user, 'Create Issue', `Created issue ${issue.title}`, 'Dev');
    };

    const updateIssue = (user: User | null, issueId: string, data: Partial<Issue>) => {
        setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ...data } : i));
    };

    const addIssueNote = (user: User | null, issueId: string, text: string) => {
        setIssues(prev => prev.map(i => {
            if (i.id === issueId) {
                const note = { id: `note-${Date.now()}`, text, author: user?.name || 'Unknown', created_at: new Date().toISOString() };
                return { ...i, notes: [...i.notes, note] };
            }
            return i;
        }));
    };

    const addCampaign = (user: User | null, campaign: Campaign) => {
        setCampaigns(prev => [...prev, campaign]);
        logAction(user, 'Create Campaign', `Created campaign ${campaign.name}`, 'Marketing');
    };

    const updateCampaign = (user: User | null, campaign: Campaign) => {
        setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c));
    };

    const addMarketingContent = (user: User | null, content: MarketingContent) => {
        setMarketingContents(prev => [...prev, content]);
    };

    const updateMarketingContent = (user: User | null, content: MarketingContent) => {
        setMarketingContents(prev => prev.map(c => c.id === content.id ? content : c));
    };

    const deleteMarketingContent = (user: User | null, contentId: string) => {
        setMarketingContents(prev => prev.filter(c => c.id !== contentId));
    };

    const addWorkflow = (user: User | null, workflow: Workflow) => {
        setWorkflows(prev => [...prev, workflow]);
    };

    const updateWorkflow = (user: User | null, workflow: Workflow) => {
        setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w));
    };

    const deleteWorkflow = (user: User | null, workflowId: string) => {
        setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    };

    const triggerAutomation = (trigger: TriggerType, data: any) => {
        const matchingWorkflows = workflows.filter(w => w.active && w.trigger === trigger);
        matchingWorkflows.forEach(wf => {
            addSystemNotification('Automação Executada', `Fluxo "${wf.name}" disparado com sucesso.`, 'info');
            setWorkflows(prev => prev.map(w => w.id === wf.id ? { ...w, runs: w.runs + 1, lastRun: new Date().toISOString() } : w));
            
            const hooks = webhooks.filter(wh => wh.active && wh.triggerEvent === trigger);
            hooks.forEach(h => {
                fetch(h.url, { method: h.method, body: JSON.stringify(data), headers: h.headers || {} }).catch(err => console.error("Webhook failed", err));
            });
        });
    };

    const addClientDocument = (user: User | null, doc: ClientDocument) => {
        setClientDocuments(prev => [...prev, doc]);
        dbUpsert('client_documents', doc);
        logAction(user, 'Upload Document', `Uploaded ${doc.title}`, 'Clientes');
    };

    const removeClientDocument = (user: User | null, docId: string) => {
        setClientDocuments(prev => prev.filter(d => d.id !== docId));
        dbDelete('client_documents', docId);
        logAction(user, 'Remove Document', `Removed document ${docId}`, 'Clientes');
    };

    const updatePortalSettings = (user: User | null, settings: PortalSettings) => {
        setPortalSettings(settings);
        dbUpsert('organizations', { id: settings.organizationId, portal_settings: settings });
        logAction(user, 'Update Portal', 'Updated portal settings', 'Configurações');
    };

    const addCompetitor = (user: User | null, competitor: Competitor) => {
        const compWithOrg = { ...competitor, organizationId: user?.organizationId || competitor.organizationId };
        setCompetitors(prev => [...prev, compWithOrg]);
        dbUpsert('competitors', compWithOrg);
        logAction(user, 'Add Competitor', `Added competitor ${competitor.name}`, 'Spy');
    };

    const updateCompetitor = (user: User | null, competitor: Competitor) => {
        setCompetitors(prev => prev.map(c => c.id === competitor.id ? competitor : c));
        dbUpsert('competitors', competitor);
    };

    const deleteCompetitor = (user: User | null, competitorId: string) => {
        setCompetitors(prev => prev.filter(c => c.id !== competitorId));
        dbDelete('competitors', competitorId);
        logAction(user, 'Delete Competitor', `Deleted competitor ${competitorId}`, 'Spy');
    };

    const setMarketTrends = (trends: MarketTrend[]) => {
        setMarketTrendsState(trends);
        // Bulk save trends if needed
    };

    const addProspectingHistory = (item: ProspectingHistoryItem) => {
        setProspectingHistory(prev => [item, ...prev].slice(0, 50));
        dbUpsert('prospecting_history', item);
    };

    const clearProspectingHistory = () => setProspectingHistory([]);

    const disqualifyProspect = (companyName: string) => {
        setDisqualifiedProspects(prev => [...prev, companyName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")]);
    };

    const addCustomField = (field: CustomFieldDefinition) => {
        setCustomFields(prev => [...prev, field]);
        dbUpsert('custom_fields', field);
    };
    
    const deleteCustomField = (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
        dbDelete('custom_fields', id);
    };

    const addWebhook = (webhook: WebhookConfig) => {
        setWebhooks(prev => [...prev, webhook]);
        dbUpsert('webhooks', webhook);
    };
    
    const updateWebhook = (webhook: WebhookConfig) => {
        setWebhooks(prev => prev.map(w => w.id === webhook.id ? webhook : w));
        dbUpsert('webhooks', webhook);
    };
    
    const deleteWebhook = (id: string) => {
        setWebhooks(prev => prev.filter(w => w.id !== id));
        dbDelete('webhooks', id);
    };

    const addProposal = (user: User | null, proposal: Proposal) => {
        const propWithOrg = { ...proposal, organizationId: user?.organizationId || proposal.organizationId };
        setProposals(prev => [...prev, propWithOrg]);
        dbUpsert('proposals', propWithOrg);
        logAction(user, 'Create Proposal', `Created proposal ${proposal.title}`, 'Propostas');
    };

    const updateProposal = (user: User | null, proposal: Proposal) => {
        const propWithOrg = { ...proposal, organizationId: proposal.organizationId || user?.organizationId };
        setProposals(prev => prev.map(p => p.id === proposal.id ? propWithOrg : p));
        dbUpsert('proposals', propWithOrg);
        logAction(user, 'Update Proposal', `Updated proposal ${proposal.title}`, 'Propostas');
    };

    const removeProposal = (user: User | null, id: string, reason: string) => {
        setProposals(prev => prev.filter(p => p.id !== id));
        dbDelete('proposals', id);
        logAction(user, 'Delete Proposal', `Deleted proposal ${id}. Reason: ${reason}`, 'Propostas');
    };

    const syncLocalToCloud = async () => {
        await refreshData();
    };

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
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

    const restoreDefaults = () => {
        if(confirm("Restaurar dados de exemplo? Isso apagará seus dados locais.")) {
            localStorage.clear();
            window.location.reload();
        }
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, issues, invoices, activities, products, projects, 
            campaigns, marketingContents, workflows, clientDocuments, portalSettings, 
            logs, notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, customFields, webhooks, inboxConversations, proposals,
            isSyncing, lastSyncTime, theme, pushEnabled,
            
            refreshData, syncLocalToCloud, toggleTheme, togglePushNotifications, restoreDefaults,

            addLead, updateLead, updateLeadStatus,
            addClient, updateClient, removeClient, addClientsBulk, updateClientContact,
            addTicket, updateTicket,
            addInvoice, updateInvoiceStatus, addInvoicesBulk,
            addActivity, updateActivity, toggleActivity,
            addProduct, updateProduct, removeProduct,
            addProject, updateProject, deleteProject,
            addIssue, updateIssue, addIssueNote,
            addCampaign, updateCampaign,
            addMarketingContent, updateMarketingContent, deleteMarketingContent,
            addWorkflow, updateWorkflow, deleteWorkflow, triggerAutomation,
            addClientDocument, removeClientDocument,
            updatePortalSettings,
            addLog,
            addSystemNotification, markNotificationRead,
            addToast, removeToast,
            addCompetitor, updateCompetitor, deleteCompetitor,
            setMarketTrends,
            addProspectingHistory, clearProspectingHistory, disqualifyProspect,
            addCustomField, deleteCustomField,
            addWebhook, updateWebhook, deleteWebhook,
            addProposal, updateProposal, removeProposal
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};