
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

// --- UTILS: CASE CONVERTER ---
const toSnakeCase = (str: string) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const toCamelCase = (str: string) => str.replace(/([-_][a-z])/ig, ($1) => $1.toUpperCase().replace('-', '').replace('_', ''));

const convertKeys = (obj: any, converter: (s: string) => string): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) return obj.map(v => convertKeys(v, converter));
    if (typeof obj === 'object' && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => ({
            ...acc, [converter(key)]: convertKeys(obj[key], converter)
        }), {});
    }
    return obj;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [leads, setLeads] = useState<Lead[]>(() => JSON.parse(localStorage.getItem('nexus_leads') || '[]') || MOCK_LEADS);
    const [clients, setClients] = useState<Client[]>(() => JSON.parse(localStorage.getItem('nexus_clients') || '[]') || MOCK_CLIENTS);
    const [tickets, setTickets] = useState<Ticket[]>(() => JSON.parse(localStorage.getItem('nexus_tickets') || '[]') || MOCK_TICKETS);
    const [issues, setIssues] = useState<Issue[]>(() => JSON.parse(localStorage.getItem('nexus_issues') || '[]') || MOCK_ISSUES);
    const [invoices, setInvoices] = useState<Invoice[]>(() => JSON.parse(localStorage.getItem('nexus_invoices') || '[]') || MOCK_INVOICES);
    const [activities, setActivities] = useState<Activity[]>(() => JSON.parse(localStorage.getItem('nexus_activities') || '[]') || MOCK_ACTIVITIES);
    const [products, setProducts] = useState<Product[]>(() => JSON.parse(localStorage.getItem('nexus_products') || '[]') || MOCK_PRODUCTS);
    const [projects, setProjects] = useState<Project[]>(() => JSON.parse(localStorage.getItem('nexus_projects') || '[]') || MOCK_PROJECTS);
    const [campaigns, setCampaigns] = useState<Campaign[]>(() => JSON.parse(localStorage.getItem('nexus_campaigns') || '[]') || MOCK_CAMPAIGNS);
    const [marketingContents, setMarketingContents] = useState<MarketingContent[]>(() => JSON.parse(localStorage.getItem('nexus_contents') || '[]') || MOCK_CONTENTS);
    const [workflows, setWorkflows] = useState<Workflow[]>(() => JSON.parse(localStorage.getItem('nexus_workflows') || '[]') || MOCK_WORKFLOWS);
    const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>(() => JSON.parse(localStorage.getItem('nexus_documents') || '[]') || MOCK_DOCUMENTS);
    const [logs, setLogs] = useState<AuditLog[]>(() => JSON.parse(localStorage.getItem('nexus_logs') || '[]') || MOCK_LOGS);
    const [competitors, setCompetitors] = useState<Competitor[]>(() => JSON.parse(localStorage.getItem('nexus_competitors') || '[]') || MOCK_COMPETITORS);
    const [marketTrends, setMarketTrendsState] = useState<MarketTrend[]>(() => JSON.parse(localStorage.getItem('nexus_market_trends') || '[]') || MOCK_MARKET_TRENDS);
    const [proposals, setProposals] = useState<Proposal[]>(() => JSON.parse(localStorage.getItem('nexus_proposals') || '[]') || MOCK_PROPOSALS);
    const [portalSettings, setPortalSettings] = useState<PortalSettings>(() => JSON.parse(localStorage.getItem('nexus_portal_settings') || '{}') || { organizationId: 'org-1', portalName: 'Portal do Cliente', primaryColor: '#4f46e5', allowInvoiceDownload: true, allowTicketCreation: true });
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => JSON.parse(localStorage.getItem('nexus_custom_fields') || '[]') || MOCK_CUSTOM_FIELDS);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => JSON.parse(localStorage.getItem('nexus_webhooks') || '[]') || MOCK_WEBHOOKS);
    const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>(() => JSON.parse(localStorage.getItem('nexus_financial_categories') || '[]') || MOCK_CATEGORIES);
    
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('nexus_theme') as 'light'|'dark') || 'light');
    const [pushEnabled, setPushEnabled] = useState(() => localStorage.getItem('nexus_push_enabled') === 'true');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>(() => JSON.parse(localStorage.getItem('nexus_prospecting_history') || '[]'));
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>(() => JSON.parse(localStorage.getItem('nexus_disqualified_prospects') || '[]'));
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>(MOCK_CONVERSATIONS);

    const refreshData = useCallback(async () => {
        setIsSyncing(true);
        const supabase = getSupabase();
        if (!supabase) { setLastSyncTime(new Date()); setIsSyncing(false); return; }
        try {
            const tables = ['leads', 'clients', 'tickets', 'invoices', 'activities', 'products', 'projects', 'competitors', 'audit_logs', 'custom_fields', 'webhooks', 'proposals', 'financial_categories'];
            const promises = tables.map(t => supabase.from(t).select('*'));
            const results = await Promise.allSettled(promises);
            const setters: any = { leads: setLeads, clients: setClients, tickets: setTickets, invoices: setInvoices, activities: setActivities, products: setProducts, projects: setProjects, competitors: setCompetitors, audit_logs: setLogs, custom_fields: setCustomFields, webhooks: setWebhooks, proposals: setProposals, financial_categories: setFinancialCategories };
            results.forEach((res, idx) => {
                const tableName = tables[idx];
                if (res.status === 'fulfilled' && res.value.data) {
                    const data = convertKeys(res.value.data, toCamelCase);
                    setters[tableName](data);
                }
            });
            setLastSyncTime(new Date());
        } catch (error: any) { console.error("Sync Failure", error); } finally { setIsSyncing(false); }
    }, []);

    useEffect(() => { refreshData(); }, [refreshData]);

    const dbUpsert = async (table: string, data: any) => {
        const supabase = getSupabase();
        if (!supabase) return;
        try {
            const payload = convertKeys(data, toSnakeCase);
            const { error } = await supabase.from(table).upsert(payload);
            if (error) {
                console.error(`DB Upsert Error [${table}]:`, error.message || error);
                if (error.message?.includes('violates row-level security')) {
                   addSystemNotification('Erro de Permissão', 'Seu usuário não tem permissão para gravar na tabela ' + table + '. Verifique o Patch SQL.', 'alert');
                } else if (error.message?.includes('proposal_id')) {
                    addSystemNotification('Banco Desatualizado', 'A coluna proposal_id está ausente na tabela projects. Vá em Configurações > Patch SQL e execute o script atualizado.', 'alert');
                }
                throw error;
            }
        } catch (e: any) { 
            console.error(`DB Upsert Exception [${table}]:`, e?.message || e); 
        }
    };

    const dbDelete = async (table: string, id: string) => {
        const supabase = getSupabase();
        if (!supabase) return;
        try { await supabase.from(table).delete().eq('id', id); } catch (e) { console.warn(`DB Delete Error [${table}]`, e); }
    };

    const addLead = (user: User | null, lead: Lead) => { setLeads(prev => [...(prev || []), lead]); dbUpsert('leads', lead); };
    const updateLead = (user: User | null, lead: Lead) => { setLeads(prev => (prev || []).map(l => l.id === lead.id ? lead : l)); dbUpsert('leads', lead); };
    const updateLeadStatus = (user: User | null, leadId: string, status: LeadStatus) => { const lead = leads.find(l => l.id === leadId); if (lead) { const updatedLead = { ...lead, status }; updateLead(user, updatedLead); } };
    const addClient = (user: User | null, client: Client) => { setClients(prev => [...(prev || []), client]); dbUpsert('clients', client); };
    const updateClient = (user: User | null, client: Client) => { setClients(prev => (prev || []).map(c => c.id === client.id ? client : c)); dbUpsert('clients', client); };
    const removeClient = (user: User | null, clientId: string, reason: string) => { setClients(prev => (prev || []).filter(c => c.id !== clientId)); dbDelete('clients', clientId); };
    const addClientsBulk = async (user: User | null, newClients: Client[]) => {
        setClients(prev => [...(prev || []), ...newClients]);
        const supabase = getSupabase();
        if (supabase) {
            try {
                const payloads = convertKeys(newClients.map(c => ({ ...c, organizationId: user?.organizationId })), toSnakeCase);
                await supabase.from('clients').upsert(payloads);
                addSystemNotification("Sucesso", "Importação sincronizada.", "success");
            } catch (e: any) { console.error("Bulk Sync Error:", e); }
        }
    };
    const updateClientContact = (client: Client, activity?: Activity) => { const updatedClient = { ...client, lastContact: new Date().toISOString() }; setClients(prev => (prev || []).map(c => c.id === client.id ? updatedClient : c)); dbUpsert('clients', updatedClient); if (activity) addActivity(null, activity); };
    const addTicket = (user: User | null, ticket: Ticket) => { setTickets(prev => [...(prev || []), ticket]); dbUpsert('tickets', ticket); };
    const updateTicket = (user: User | null, ticketId: string, data: Partial<Ticket>) => { setTickets(prev => (prev || []).map(t => t.id === ticketId ? { ...t, ...data } : t)); const ticket = tickets.find(t => t.id === ticketId); if (ticket) dbUpsert('tickets', { ...ticket, ...data }); };
    const addInvoice = (user: User | null, invoice: Invoice) => { setInvoices(prev => [...(prev || []), invoice]); dbUpsert('invoices', invoice); };
    const updateInvoice = (user: User | null, invoice: Invoice) => { setInvoices(prev => (prev || []).map(i => i.id === invoice.id ? invoice : i)); dbUpsert('invoices', invoice); };
    const updateInvoiceStatus = (user: User | null, invoiceId: string, status: InvoiceStatus) => { setInvoices(prev => (prev || []).map(i => i.id === invoiceId ? { ...i, status } : i)); const invoice = invoices.find(i => i.id === invoiceId); if (invoice) dbUpsert('invoices', { ...invoice, status }); };
    const addInvoicesBulk = (user: User | null, newInvoices: Invoice[]) => { setInvoices(prev => [...(prev || []), ...newInvoices]); newInvoices.forEach(i => dbUpsert('invoices', i)); };
    const addActivity = (user: User | null, activity: Activity) => { setActivities(prev => [activity, ...(prev || [])]); dbUpsert('activities', activity); };
    const updateActivity = (user: User | null, activity: Activity) => { setActivities(prev => (prev || []).map(a => a.id === activity.id ? activity : a)); dbUpsert('activities', activity); };
    const toggleActivity = (user: User | null, activityId: string) => { setActivities(prev => (prev || []).map(a => { if (a.id === activityId) { const updated = { ...a, completed: !a.completed }; dbUpsert('activities', updated); return updated; } return a; })); };
    const addProduct = (user: User | null, product: Product) => { setProducts(prev => [...(prev || []), product]); dbUpsert('products', product); };
    const updateProduct = (user: User | null, product: Product) => { setProducts(prev => (prev || []).map(p => p.id === product.id ? product : p)); dbUpsert('products', product); };
    const removeProduct = (user: User | null, productId: string) => { setProducts(prev => (prev || []).filter(p => p.id !== productId)); dbDelete('products', productId); };
    const addProject = (user: User | null, project: Project) => { setProjects(prev => [...(prev || []), project]); dbUpsert('projects', project); };
    const updateProject = (user: User | null, project: Project) => { setProjects(prev => (prev || []).map(p => p.id === project.id ? project : p)); dbUpsert('projects', project); };
    const deleteProject = (user: User | null, projectId: string) => { setProjects(prev => (prev || []).filter(p => p.id !== projectId)); dbDelete('projects', projectId); };
    const addIssue = (user: User | null, issue: Issue) => { setIssues(prev => [...(prev || []), issue]); dbUpsert('issues', issue); };
    const updateIssue = (user: User | null, issueId: string, data: Partial<Issue>) => { setIssues(prev => (prev || []).map(i => i.id === issueId ? { ...i, ...data } : i)); const issue = issues.find(i => i.id === issueId); if(issue) dbUpsert('issues', {...issue, ...data}); };
    const addIssueNote = (user: User | null, issueId: string, text: string) => { setIssues(prev => (prev || []).map(i => { if (i.id === issueId) { const note = { id: `note-${Date.now()}`, text, author: user?.name || 'Unknown', created_at: new Date().toISOString() }; return { ...i, notes: [...i.notes, note] }; } return i; })); };
    const addCampaign = (user: User | null, campaign: Campaign) => { setCampaigns(prev => [...(prev || []), campaign]); };
    const updateCampaign = (user: User | null, campaign: Campaign) => { setCampaigns(prev => (prev || []).map(c => c.id === campaign.id ? campaign : c)); };
    const addMarketingContent = (user: User | null, content: MarketingContent) => { setMarketingContents(prev => [...(prev || []), content]); };
    const updateMarketingContent = (user: User | null, content: MarketingContent) => { setMarketingContents(prev => (prev || []).map(c => c.id === content.id ? content : c)); };
    const deleteMarketingContent = (user: User | null, contentId: string) => { setMarketingContents(prev => (prev || []).filter(c => c.id !== contentId)); };
    const addWorkflow = (user: User | null, workflow: Workflow) => { setWorkflows(prev => [...(prev || []), workflow]); };
    const updateWorkflow = (user: User | null, workflow: Workflow) => { setWorkflows(prev => (prev || []).map(w => w.id === workflow.id ? workflow : w)); };
    const deleteWorkflow = (user: User | null, workflowId: string) => { setWorkflows(prev => (prev || []).filter(w => w.id !== workflowId)); };
    const triggerAutomation = (trigger: TriggerType, data: any) => { /* RPA simulation */ };
    const addClientDocument = (user: User | null, doc: ClientDocument) => { setClientDocuments(prev => [...(prev || []), doc]); dbUpsert('client_documents', doc); };
    const removeClientDocument = (user: User | null, docId: string) => { setClientDocuments(prev => (prev || []).filter(d => d.id !== docId)); dbDelete('client_documents', docId); };
    const updatePortalSettings = (user: User | null, settings: PortalSettings) => { setPortalSettings(settings); };
    const addLog = (log: AuditLog) => { setLogs(prev => [log, ...(prev || [])]); dbUpsert('audit_logs', log); };
    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert'|'info' = 'info', relatedTo?: string) => { const notif: SystemNotification = { id: `NOTIF-${Date.now()}`, title, message, type, timestamp: new Date().toISOString(), read: false, relatedTo, organizationId: 'org-1' }; setNotifications(prev => [notif, ...(prev || [])]); addToast({ title, message, type }); };
    const markNotificationRead = (id: string) => { setNotifications(prev => (prev || []).map(n => n.id === id ? { ...n, read: true } : n)); };
    const addToast = (message: Omit<ToastMessage, 'id'>) => { const id = `TOAST-${Date.now()}`; setToasts(prev => [...(prev || []), { ...message, id }]); };
    const removeToast = (id: string) => { setToasts(prev => (prev || []).filter(t => t.id !== id)); };
    const addCompetitor = (user: User | null, competitor: Competitor) => { setCompetitors(prev => [...(prev || []), competitor]); dbUpsert('competitors', competitor); };
    const updateCompetitor = (user: User | null, competitor: Competitor) => { setCompetitors(prev => (prev || []).map(c => c.id === competitor.id ? competitor : c)); dbUpsert('competitors', competitor); };
    const deleteCompetitor = (user: User | null, competitorId: string) => { setCompetitors(prev => (prev || []).filter(c => c.id !== competitorId)); dbDelete('competitors', competitorId); };
    const setMarketTrends = (trends: MarketTrend[]) => { setMarketTrendsState(trends); };
    const addProspectingHistory = (item: ProspectingHistoryItem) => { setProspectingHistory(prev => [item, ...(prev || [])].slice(0, 50)); dbUpsert('prospecting_history', item); };
    const clearProspectingHistory = () => setProspectingHistory([]);
    const disqualifyProspect = (companyName: string) => { setDisqualifiedProspects(prev => [...(prev || []), companyName.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")]); };
    const addCustomField = (field: CustomFieldDefinition) => { setCustomFields(prev => [...(prev || []), field]); dbUpsert('custom_fields', field); };
    const deleteCustomField = (id: string) => { setCustomFields(prev => (prev || []).filter(f => f.id !== id)); dbDelete('custom_fields', id); };
    const addWebhook = (webhook: WebhookConfig) => { setWebhooks(prev => [...(prev || []), webhook]); dbUpsert('webhooks', webhook); };
    const updateWebhook = (webhook: WebhookConfig) => { setWebhooks(prev => (prev || []).map(w => w.id === webhook.id ? webhook : w)); dbUpsert('webhooks', webhook); };
    const deleteWebhook = (id: string) => { setWebhooks(prev => (prev || []).filter(w => w.id !== id)); dbDelete('webhooks', id); };
    
    const addProposal = (user: User | null, proposal: Proposal) => { 
        setProposals(prev => [...(prev || []), proposal]); 
        dbUpsert('proposals', proposal); 
    };
    
    const updateProposal = (user: User | null, proposal: Proposal) => { 
        setProposals(prev => (prev || []).map(p => p.id === proposal.id ? proposal : p)); 
        dbUpsert('proposals', proposal); 
    };

    const removeProposal = (user: User | null, id: string, reason: string) => { setProposals(prev => (prev || []).filter(p => p.id !== id)); dbDelete('proposals', id); };
    const addFinancialCategory = (category: FinancialCategory) => { setFinancialCategories(prev => [...(prev || []), category]); dbUpsert('financial_categories', category); };
    const deleteFinancialCategory = (id: string) => { setFinancialCategories(prev => (prev || []).filter(c => c.id !== id)); dbDelete('financial_categories', id); };
    const addInboxInteraction = (contactName: string, type: 'WhatsApp' | 'Email', text: string, contactIdentifier: string = '') => { };

    const syncLocalToCloud = async () => { await refreshData(); };
    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
    const togglePushNotifications = async () => { if (!('Notification' in window)) return; const permission = await Notification.requestPermission(); if (permission === 'granted') { setPushEnabled(true); localStorage.setItem('nexus_push_enabled', 'true'); } };
    const restoreDefaults = () => { if(confirm("Apagar tudo e restaurar demos?")) { localStorage.clear(); window.location.reload(); } };

    return (
        <DataContext.Provider value={{
            leads: leads || [], clients: clients || [], tickets: tickets || [], issues: issues || [], invoices: invoices || [], activities: activities || [], products: products || [], projects: projects || [], campaigns: campaigns || [], marketingContents: marketingContents || [], workflows: workflows || [], clientDocuments: clientDocuments || [], portalSettings, logs: logs || [], notifications: notifications || [], toasts: toasts || [], competitors: competitors || [], marketTrends: marketTrends || [], prospectingHistory: prospectingHistory || [], disqualifiedProspects: disqualifiedProspects || [], customFields: customFields || [], webhooks: webhooks || [], inboxConversations: inboxConversations || [], proposals: proposals || [], financialCategories: financialCategories || [],
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
