
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
    Lead, Client, Ticket, Issue, Invoice, Activity, Product, Project, 
    Campaign, MarketingContent, Workflow, ClientDocument, PortalSettings, 
    AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, TriggerType, Proposal, FinancialCategory, InboxMessage
} from '../types';
import { 
    MOCK_LEADS, MOCK_CLIENTS, MOCK_TICKETS, MOCK_ISSUES, MOCK_INVOICES, 
    MOCK_ACTIVITIES, MOCK_PRODUCTS, MOCK_PROJECTS, MOCK_CAMPAIGNS, 
    MOCK_CONTENTS, MOCK_WORKFLOWS, MOCK_DOCUMENTS, MOCK_LOGS, 
    MOCK_COMPETITORS, MOCK_MARKET_TRENDS, MOCK_CUSTOM_FIELDS, MOCK_WEBHOOKS,
    MOCK_CONVERSATIONS, MOCK_PROPOSALS, MOCK_CATEGORIES
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
  financialCategories: FinancialCategory[];
  
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
  updateInvoice: (user: User | null, invoice: Invoice) => void;
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

  addSystemNotification: (title: string, message: string, type?: 'info'|'warning'|'success'|'alert'|'info', relatedTo?: string) => void;
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

  addFinancialCategory: (category: FinancialCategory) => void;
  deleteFinancialCategory: (id: string) => void;

  addInboxInteraction: (contactName: string, type: 'WhatsApp' | 'Email', text: string, contactIdentifier?: string) => void;
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
    const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>(() => JSON.parse(localStorage.getItem('nexus_financial_categories') || JSON.stringify(MOCK_CATEGORIES)));
    
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('nexus_theme') as 'light'|'dark') || 'light');
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('nexus_push_enabled') === 'true');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>(() => JSON.parse(localStorage.getItem('nexus_prospecting_history') || '[]'));
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>(() => JSON.parse(localStorage.getItem('nexus_disqualified_prospects') || '[]'));
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>(MOCK_CONVERSATIONS);

    const mapToApp = useCallback((data: any[]) => {
        if (!data || !Array.isArray(data)) return [];
        return data.map(item => {
            const newItem = { ...item };
            if (newItem.organization_id) { newItem.organizationId = newItem.organization_id; delete newItem.organization_id; }
            if (newItem.contract_id) { newItem.contractId = newItem.contract_id; delete newItem.contract_id; }
            if (newItem.contract_start_date) { newItem.contractStartDate = newItem.contract_start_date; delete newItem.contract_start_date; }
            if (newItem.contract_end_date) { newItem.contractEndDate = newItem.contract_end_date; delete newItem.contract_end_date; }
            if (newItem.parking_spots !== undefined) { newItem.parkingSpots = newItem.parking_spots; delete newItem.parking_spots; }
            if (newItem.exempt_spots !== undefined) { newItem.exemptSpots = newItem.exempt_spots; delete newItem.exempt_spots; }
            if (newItem.vehicle_count !== undefined) { newItem.vehicleCount = newItem.vehicle_count; delete newItem.vehicle_count; }
            if (newItem.credential_count !== undefined) { newItem.credentialCount = newItem.credential_count; delete newItem.credential_count; }
            if (newItem.pricing_table) { newItem.pricingTable = newItem.pricing_table; delete newItem.pricing_table; }
            if (newItem.table_price !== undefined) { newItem.tablePrice = newItem.table_price; delete newItem.table_price; }
            if (newItem.total_table_price !== undefined) { newItem.totalTablePrice = newItem.total_table_price; delete newItem.total_table_price; }
            if (newItem.special_day) { newItem.specialDay = newItem.special_day; delete newItem.special_day; }
            if (newItem.special_price !== undefined) { newItem.specialPrice = newItem.special_price; delete newItem.special_price; }
            if (newItem.total_special_price !== undefined) { newItem.totalSpecialPrice = newItem.total_special_price; delete newItem.total_special_price; }
            if (newItem.created_at) { newItem.createdAt = newItem.created_at; delete newItem.created_at; }
            if (newItem.contact_person) { newItem.contactPerson = newItem.contact_person; delete newItem.contact_person; }
            if (newItem.last_contact) { newItem.lastContact = newItem.last_contact; delete newItem.last_contact; }
            if (newItem.due_date) { newItem.dueDate = newItem.due_date; delete newItem.due_date; }
            if (newItem.start_date) { newItem.startDate = newItem.start_date; delete newItem.start_date; }
            if (newItem.user_id) { newItem.userId = newItem.user_id; delete newItem.user_id; }
            if (newItem.user_name) { newItem.userName = newItem.user_name; delete newItem.user_name; }
            if (newItem.trigger_event) { newItem.triggerEvent = newItem.trigger_event; delete newItem.trigger_event; }
            // Mantém document, email e phone se existirem (preserva 1:1)
            return newItem;
        });
    }, []);

    const mapToDb = useCallback((data: any) => {
        const payload: any = { ...data };
        if (data.organizationId) { payload.organization_id = data.organizationId; delete payload.organizationId; }
        if (data.contractId) { payload.contract_id = data.contractId; delete payload.contractId; }
        if (data.contractStartDate) { payload.contract_start_date = data.contractStartDate; delete payload.contractStartDate; }
        if (data.contractEndDate) { payload.contract_end_date = data.contractEndDate; delete payload.contractEndDate; }
        if (data.parkingSpots !== undefined) { payload.parking_spots = Number(data.parkingSpots) || 0; delete payload.parkingSpots; }
        if (data.exemptSpots !== undefined) { payload.exempt_spots = Number(data.exemptSpots) || 0; delete payload.exemptSpots; }
        if (data.vehicleCount !== undefined) { payload.vehicle_count = Number(data.vehicleCount) || 0; delete payload.vehicleCount; }
        if (data.credentialCount !== undefined) { payload.credential_count = Number(data.credentialCount) || 0; delete payload.credentialCount; }
        if (data.pricingTable) { payload.pricing_table = data.pricingTable; delete payload.pricingTable; }
        if (data.tablePrice !== undefined) { payload.table_price = Number(data.tablePrice) || 0; delete payload.tablePrice; }
        if (data.totalTablePrice !== undefined) { payload.total_table_price = Number(data.totalTablePrice) || 0; delete payload.totalTablePrice; }
        if (data.specialDay) { payload.special_day = data.specialDay; delete payload.specialDay; }
        if (data.specialPrice !== undefined) { payload.special_price = Number(data.specialPrice) || 0; delete payload.specialPrice; }
        if (data.totalSpecialPrice !== undefined) { payload.total_special_price = Number(data.totalSpecialPrice) || 0; delete payload.totalSpecialPrice; }
        if (data.createdAt) { payload.created_at = data.createdAt; delete payload.createdAt; }
        if (data.contactPerson) { payload.contact_person = data.contactPerson; delete payload.contactPerson; }
        if (data.lastContact) { payload.last_contact = data.lastContact; delete payload.lastContact; }
        if (data.dueDate) { payload.due_date = data.dueDate; delete payload.dueDate; }
        if (data.startDate) { payload.start_date = data.startDate; delete payload.startDate; }
        if (data.userId) { payload.user_id = data.userId; delete payload.userId; }
        if (data.userName) { payload.user_name = data.userName; delete payload.userName; }
        if (data.triggerEvent) { payload.trigger_event = data.triggerEvent; delete payload.triggerEvent; }
        return payload;
    }, []);

    const refreshData = useCallback(async () => {
        setIsSyncing(true);
        const supabase = getSupabase();
        if (!supabase) { setLastSyncTime(new Date()); setIsSyncing(false); return; }

        try {
            const tables = ['leads', 'clients', 'tickets', 'invoices', 'activities', 'products', 'projects', 'competitors', 'audit_logs', 'custom_fields', 'webhooks', 'proposals', 'financial_categories'];
            const promises = tables.map(t => supabase.from(t).select('*'));
            const results = await Promise.allSettled(promises);

            const setters: Record<string, (data: any[]) => void> = {
                leads: setLeads, clients: setClients, tickets: setTickets, invoices: setInvoices, activities: setActivities, products: setProducts, projects: setProjects, competitors: setCompetitors, audit_logs: setLogs, custom_fields: setCustomFields, webhooks: setWebhooks, proposals: setProposals, financial_categories: setFinancialCategories
            };

            results.forEach((res, idx) => {
                const tableName = tables[idx];
                if (res.status === 'fulfilled' && res.value.data) {
                    setters[tableName](mapToApp(res.value.data));
                }
            });

            setLastSyncTime(new Date());
        } catch (error: any) {
            console.error("Sync Failure", error);
        } finally {
            setIsSyncing(false);
        }
    }, [mapToApp]);

    useEffect(() => { refreshData(); }, [refreshData]);

    const dbUpsert = async (table: string, data: any) => {
        const supabase = getSupabase();
        if (!supabase) return;
        try {
            const payload = mapToDb(data);
            const { error } = await supabase.from(table).upsert(payload);
            if (error) {
                if (error.message?.includes('column')) {
                    console.warn(`[Supabase Patch Required] Tabela ${table} precisa de colunas extras.`);
                } else {
                    throw error;
                }
            }
        } catch (e: any) {
            console.error(`DB Upsert Error [${table}]:`, e.message || e);
        }
    };

    const dbDelete = async (table: string, id: string) => {
        const supabase = getSupabase();
        if (!supabase) return;
        try {
            await supabase.from(table).delete().eq('id', id);
        } catch (e) {
            console.warn(`DB Delete Error [${table}]`, e);
        }
    };

    const addLead = (user: User | null, lead: Lead) => { setLeads(prev => [...prev, lead]); dbUpsert('leads', lead); };
    const updateLead = (user: User | null, lead: Lead) => { setLeads(prev => prev.map(l => l.id === lead.id ? lead : l)); dbUpsert('leads', lead); };
    const updateLeadStatus = (user: User | null, leadId: string, status: LeadStatus) => { const lead = leads.find(l => l.id === leadId); if (lead) { const updatedLead = { ...lead, status }; updateLead(user, updatedLead); } };
    
    const addClient = (user: User | null, client: Client) => { setClients(prev => [...prev, client]); dbUpsert('clients', client); };
    const updateClient = (user: User | null, client: Client) => { setClients(prev => prev.map(c => c.id === client.id ? client : c)); dbUpsert('clients', client); };
    const removeClient = (user: User | null, clientId: string, reason: string) => { setClients(prev => prev.filter(c => c.id !== clientId)); dbDelete('clients', clientId); };
    
    const addClientsBulk = async (user: User | null, newClients: Client[]) => {
        setClients(prev => [...prev, ...newClients]);
        const supabase = getSupabase();
        if (supabase) {
            try {
                const payloads = newClients.map(c => mapToDb({ ...c, organizationId: user?.organizationId }));
                const { error } = await supabase.from('clients').upsert(payloads);
                if (error) throw error;
                addSystemNotification("Sucesso", "Importação sincronizada.", "success");
            } catch (e: any) {
                console.error("Bulk Sync Error:", e);
                addSystemNotification("Banco Desatualizado", "Seu Supabase precisa das colunas document, phone e email. Execute o SQL Schema.", "alert");
            }
        }
    };
    
    const updateClientContact = (client: Client, activity?: Activity) => { const updatedClient = { ...client, lastContact: new Date().toISOString() }; setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c)); dbUpsert('clients', updatedClient); if (activity) addActivity(null, activity); };
    
    const addTicket = (user: User | null, ticket: Ticket) => { setTickets(prev => [...prev, ticket]); dbUpsert('tickets', ticket); };
    const updateTicket = (user: User | null, ticketId: string, data: Partial<Ticket>) => { setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, ...data } : t)); const ticket = tickets.find(t => t.id === ticketId); if (ticket) dbUpsert('tickets', { ...ticket, ...data }); };
    
    const addInvoice = (user: User | null, invoice: Invoice) => { setInvoices(prev => [...prev, invoice]); dbUpsert('invoices', invoice); };
    const updateInvoice = (user: User | null, invoice: Invoice) => { setInvoices(prev => prev.map(i => i.id === invoice.id ? invoice : i)); dbUpsert('invoices', invoice); };
    const updateInvoiceStatus = (user: User | null, invoiceId: string, status: InvoiceStatus) => { setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status } : i)); const invoice = invoices.find(i => i.id === invoiceId); if (invoice) dbUpsert('invoices', { ...invoice, status }); };
    const addInvoicesBulk = (user: User | null, newInvoices: Invoice[]) => { setInvoices(prev => [...prev, ...newInvoices]); newInvoices.forEach(i => dbUpsert('invoices', i)); };
    
    const addActivity = (user: User | null, activity: Activity) => { setActivities(prev => [activity, ...prev]); dbUpsert('activities', activity); };
    const updateActivity = (user: User | null, activity: Activity) => { setActivities(prev => prev.map(a => a.id === activity.id ? activity : a)); dbUpsert('activities', activity); };
    const toggleActivity = (user: User | null, activityId: string) => { setActivities(prev => prev.map(a => { if (a.id === activityId) { const updated = { ...a, completed: !a.completed }; dbUpsert('activities', updated); return updated; } return a; })); };
    
    const addProduct = (user: User | null, product: Product) => { setProducts(prev => [...prev, product]); dbUpsert('products', product); };
    const updateProduct = (user: User | null, product: Product) => { setProducts(prev => prev.map(p => p.id === product.id ? product : p)); dbUpsert('products', product); };
    const removeProduct = (user: User | null, productId: string) => { setProducts(prev => prev.filter(p => p.id !== productId)); dbDelete('products', productId); };
    
    const addProject = (user: User | null, project: Project) => { setProjects(prev => [...prev, project]); dbUpsert('projects', project); };
    const updateProject = (user: User | null, project: Project) => { setProjects(prev => prev.map(p => p.id === project.id ? project : p)); dbUpsert('projects', project); };
    const deleteProject = (user: User | null, projectId: string) => { setProjects(prev => prev.filter(p => p.id !== projectId)); dbDelete('projects', projectId); };
    
    const addIssue = (user: User | null, issue: Issue) => { setIssues(prev => [...prev, issue]); dbUpsert('issues', issue); };
    const updateIssue = (user: User | null, issueId: string, data: Partial<Issue>) => { setIssues(prev => prev.map(i => i.id === issueId ? { ...i, ...data } : i)); const issue = issues.find(i => i.id === issueId); if(issue) dbUpsert('issues', {...issue, ...data}); };
    const addIssueNote = (user: User | null, issueId: string, text: string) => { setIssues(prev => prev.map(i => { if (i.id === issueId) { const note = { id: `note-${Date.now()}`, text, author: user?.name || 'Unknown', created_at: new Date().toISOString() }; return { ...i, notes: [...i.notes, note] }; } return i; })); };
    
    const addCampaign = (user: User | null, campaign: Campaign) => { setCampaigns(prev => [...prev, campaign]); };
    const updateCampaign = (user: User | null, campaign: Campaign) => { setCampaigns(prev => prev.map(c => c.id === campaign.id ? campaign : c)); };
    const addMarketingContent = (user: User | null, content: MarketingContent) => { setMarketingContents(prev => [...prev, content]); };
    const updateMarketingContent = (user: User | null, content: MarketingContent) => { setMarketingContents(prev => prev.map(c => c.id === content.id ? content : c)); };
    const deleteMarketingContent = (user: User | null, contentId: string) => { setMarketingContents(prev => prev.filter(c => c.id !== contentId)); };
    
    const addWorkflow = (user: User | null, workflow: Workflow) => { setWorkflows(prev => [...prev, workflow]); };
    const updateWorkflow = (user: User | null, workflow: Workflow) => { setWorkflows(prev => prev.map(w => w.id === workflow.id ? workflow : w)); };
    const deleteWorkflow = (user: User | null, workflowId: string) => { setWorkflows(prev => prev.filter(w => w.id !== workflowId)); };
    const triggerAutomation = (trigger: TriggerType, data: any) => { /* RPA simulation */ };
    
    const addClientDocument = (user: User | null, doc: ClientDocument) => { setClientDocuments(prev => [...prev, doc]); dbUpsert('client_documents', doc); };
    const removeClientDocument = (user: User | null, docId: string) => { setClientDocuments(prev => prev.filter(d => d.id !== docId)); dbDelete('client_documents', docId); };
    const updatePortalSettings = (user: User | null, settings: PortalSettings) => { setPortalSettings(settings); };
    const addLog = (log: AuditLog) => { setLogs(prev => [log, ...prev]); dbUpsert('audit_logs', log); };
    
    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert'|'info' = 'info', relatedTo?: string) => { const notif: SystemNotification = { id: `NOTIF-${Date.now()}`, title, message, type, timestamp: new Date().toISOString(), read: false, relatedTo, organizationId: 'org-1' }; setNotifications(prev => [notif, ...prev]); addToast({ title, message, type }); };
    const markNotificationRead = (id: string) => { setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); };
    const addToast = (message: Omit<ToastMessage, 'id'>) => { const id = `TOAST-${Date.now()}`; setToasts(prev => [...prev, { ...message, id }]); };
    const removeToast = (id: string) => { setToasts(prev => prev.filter(t => t.id !== id)); };
    
    const addCompetitor = (user: User | null, competitor: Competitor) => { setCompetitors(prev => [...prev, competitor]); dbUpsert('competitors', competitor); };
    const updateCompetitor = (user: User | null, competitor: Competitor) => { setCompetitors(prev => prev.map(c => c.id === competitor.id ? competitor : c)); dbUpsert('competitors', competitor); };
    const deleteCompetitor = (user: User | null, competitorId: string) => { setCompetitors(prev => prev.filter(c => c.id !== competitorId)); dbDelete('competitors', competitorId); };
    const setMarketTrends = (trends: MarketTrend[]) => { setMarketTrendsState(trends); };
    const addProspectingHistory = (item: ProspectingHistoryItem) => { setProspectingHistory(prev => [item, ...prev].slice(0, 50)); dbUpsert('prospecting_history', item); };
    const clearProspectingHistory = () => setProspectingHistory([]);
    const disqualifyProspect = (companyName: string) => { setDisqualifiedProspects(prev => [...prev, companyName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")]); };
    
    const addCustomField = (field: CustomFieldDefinition) => { setCustomFields(prev => [...prev, field]); dbUpsert('custom_fields', field); };
    const deleteCustomField = (id: string) => { setCustomFields(prev => prev.filter(f => f.id !== id)); dbDelete('custom_fields', id); };
    const addWebhook = (webhook: WebhookConfig) => { setWebhooks(prev => [...prev, webhook]); dbUpsert('webhooks', webhook); };
    const updateWebhook = (webhook: WebhookConfig) => { setWebhooks(prev => prev.map(w => w.id === webhook.id ? webhook : w)); dbUpsert('webhooks', webhook); };
    const deleteWebhook = (id: string) => { setWebhooks(prev => prev.filter(w => w.id !== id)); dbDelete('webhooks', id); };
    
    const addProposal = (user: User | null, proposal: Proposal) => { setProposals(prev => [...prev, proposal]); dbUpsert('proposals', proposal); };
    const updateProposal = (user: User | null, proposal: Proposal) => { setProposals(prev => prev.map(p => p.id === proposal.id ? proposal : p)); dbUpsert('proposals', proposal); };
    const removeProposal = (user: User | null, id: string, reason: string) => { setProposals(prev => prev.filter(p => p.id !== id)); dbDelete('proposals', id); };
    
    const addFinancialCategory = (category: FinancialCategory) => { setFinancialCategories(prev => [...prev, category]); dbUpsert('financial_categories', category); };
    const deleteFinancialCategory = (id: string) => { setFinancialCategories(prev => prev.filter(c => c.id !== id)); dbDelete('financial_categories', id); };
    const addInboxInteraction = (contactName: string, type: 'WhatsApp' | 'Email', text: string, contactIdentifier: string = '') => { };

    const syncLocalToCloud = async () => { await refreshData(); };
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const togglePushNotifications = async () => { if (!('Notification' in window)) { alert("Este navegador não suporta notificações."); return; } const permission = await Notification.requestPermission(); if (permission === 'granted') { setPushEnabled(true); localStorage.setItem('nexus_push_enabled', 'true'); } else { setPushEnabled(false); localStorage.setItem('nexus_push_enabled', 'false'); } };
    const restoreDefaults = () => { if(confirm("Restaurar dados de exemplo? Isso apagará seus dados locais.")) { localStorage.clear(); window.location.reload(); } };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, issues, invoices, activities, products, projects, campaigns, marketingContents, workflows, clientDocuments, portalSettings, logs, notifications, toasts, competitors, marketTrends, prospectingHistory, disqualifiedProspects, customFields, webhooks, inboxConversations, proposals, financialCategories,
            isSyncing, lastSyncTime, theme, pushEnabled, refreshData, syncLocalToCloud, toggleTheme, togglePushNotifications, restoreDefaults, addLead, updateLead, updateLeadStatus, addClient, updateClient, removeClient, addClientsBulk, updateClientContact, addTicket, updateTicket, addInvoice, updateInvoice, updateInvoiceStatus, addInvoicesBulk, addActivity, updateActivity, toggleActivity, addProduct, updateProduct, removeProduct, addProject, updateProject, deleteProject, addIssue, updateIssue, addIssueNote, addCampaign, updateCampaign, addMarketingContent, updateMarketingContent, deleteMarketingContent, addWorkflow, updateWorkflow, deleteWorkflow, triggerAutomation, addClientDocument, removeClientDocument, updatePortalSettings, addLog, addSystemNotification, markNotificationRead, addToast, removeToast, addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends, addProspectingHistory, clearProspectingHistory, disqualifyProspect, addCustomField, deleteCustomField, addWebhook, updateWebhook, deleteWebhook, addProposal, updateProposal, removeProposal, addFinancialCategory, deleteFinancialCategory, addInboxInteraction
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) { throw new Error('useData must be used within a DataProvider'); }
    return context;
};
