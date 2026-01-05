
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
    Lead, Client, Ticket, Issue, Invoice, Activity, Product, Project, 
    Campaign, MarketingContent, Workflow, ClientDocument, PortalSettings, 
    AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, TriggerType, Proposal, FinancialCategory, Organization, InboxMessage
} from '../types';
import { getSupabase } from '../services/supabaseClient';
import { useAuth, SUPER_ADMIN_EMAILS } from './AuthContext';
import { sendEmail } from '../services/emailService';

interface DataContextType {
  leads: Lead[]; clients: Client[]; tickets: Ticket[]; issues: Issue[];
  invoices: Invoice[]; activities: Activity[]; products: Product[];
  projects: Project[]; campaigns: Campaign[]; marketingContents: MarketingContent[];
  workflows: Workflow[]; clientDocuments: ClientDocument[]; portalSettings: PortalSettings;
  logs: AuditLog[]; notifications: SystemNotification[]; toasts: ToastMessage[];
  competitors: Competitor[]; marketTrends: MarketTrend[]; prospectingHistory: ProspectingHistoryItem[];
  disqualifiedProspects: string[]; customFields: CustomFieldDefinition[]; webhooks: WebhookConfig[];
  inboxConversations: InboxConversation[]; proposals: Proposal[]; financialCategories: FinancialCategory[];
  allOrganizations: Organization[];
  isSyncing: boolean; lastSyncTime: Date | null; theme: 'light' | 'dark'; pushEnabled: boolean;
  refreshData: () => Promise<void>; syncLocalToCloud: () => Promise<void>;
  toggleTheme: () => void; togglePushNotifications: () => Promise<void>; restoreDefaults: () => void;
  addLead: (user: User | null, lead: Lead) => void; updateLead: (user: User | null, lead: Lead) => void;
  updateLeadStatus: (user: User | null, leadId: string, status: LeadStatus) => void;
  addClient: (user: User | null, client: Client) => void; updateClient: (user: User | null, client: Client) => void;
  removeClient: (user: User | null, clientId: string, reason: string) => void;
  addClientsBulk: (user: User | null, clients: Client[]) => void;
  updateClientContact: (client: Client, activity?: Activity) => void;
  addTicket: (user: User | null, ticket: Ticket) => void; updateTicket: (user: User | null, ticketId: string, data: Partial<Ticket>) => void;
  addInvoice: (user: User | null, invoice: Invoice) => void; updateInvoice: (user: User | null, invoice: Invoice) => void;
  updateInvoiceStatus: (user: User | null, invoiceId: string, status: InvoiceStatus) => void;
  addInvoicesBulk: (user: User | null, invoices: Invoice[]) => void;
  addActivity: (user: User | null, activity: Activity) => void; updateActivity: (user: User | null, activity: Activity) => void;
  toggleActivity: (user: User | null, activityId: string) => void;
  addProduct: (user: User | null, product: Product) => void; updateProduct: (user: User | null, product: Product) => void;
  removeProduct: (user: User | null, productId: string, reason?: string) => void;
  addProject: (user: User | null, project: Project) => void; updateProject: (user: User | null, project: Project) => void;
  deleteProject: (user: User | null, projectId: string) => void;
  addIssue: (user: User | null, issue: Issue) => void; updateIssue: (user: User | null, issueId: string, data: Partial<Issue>) => void;
  addIssueNote: (user: User | null, issueId: string, text: string) => void;
  addCampaign: (user: User | null, campaign: Campaign) => void; updateCampaign: (user: User | null, campaign: Campaign) => void;
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
  logAction: (user: User | null, action: string, details: string, module: string) => void;
  addSystemNotification: (title: string, message: string, type?: 'info'|'warning'|'success'|'alert', relatedTo?: string) => void;
  markNotificationRead: (id: string) => void;
  addToast: (message: Omit<ToastMessage, 'id'>) => void; removeToast: (id: string) => void;
  addCompetitor: (user: User | null, competitor: Competitor) => void;
  updateCompetitor: (user: User | null, competitor: Competitor) => void;
  deleteCompetitor: (user: User | null, competitorId: string) => void;
  setMarketTrends: (trends: MarketTrend[]) => void;
  addProspectingHistory: (item: ProspectingHistoryItem) => void;
  clearProspectingHistory: () => void; disqualifyProspect: (companyName: string) => void;
  addCustomField: (field: CustomFieldDefinition) => void; deleteCustomField: (id: string) => void;
  addWebhook: (webhook: WebhookConfig) => void; updateWebhook: (webhook: WebhookConfig) => void;
  deleteWebhook: (id: string) => void;
  addProposal: (user: User | null, proposal: Proposal) => void;
  updateProposal: (user: User | null, proposal: Proposal) => void;
  removeProposal: (user: User | null, id: string, reason: string) => void;
  addFinancialCategory: (user: User | null, category: FinancialCategory) => void;
  deleteFinancialCategory: (user: User | null, id: string) => void;
  addInboxInteraction: (contactName: string, type: 'WhatsApp' | 'Email' | 'Ticket', text: string, contactIdentifier?: string, sender?: 'user' | 'agent' | 'system') => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const mapKeysToApp = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mapKeysToApp);
    const mapped: any = {};
    for (const key in obj) {
        let newKey = key;
        if (key === 'organization_id') newKey = 'organizationId';
        else if (key === 'created_at') newKey = 'createdAt';
        else if (key === 'user_id') newKey = 'userId';
        else if (key === 'user_name') newKey = 'userName';
        else if (key === 'last_run') newKey = 'lastRun';
        else if (key === 'last_analysis') newKey = 'lastAnalysis';
        else if (key === 'company_name') newKey = 'companyName';
        else if (key === 'match_score') newKey = 'matchScore';
        else if (key === 'suggest_approach') newKey = 'suggestedApproach';
        else if (key === 'contact_person') newKey = 'contactPerson';
        else if (key === 'health_score') newKey = 'healthScore';
        else if (key === 'last_contact') newKey = 'lastContact';
        else if (key === 'due_date') newKey = 'dueDate';
        else if (key === 'related_to') newKey = 'relatedTo';
        else if (key === 'total_special_price') newKey = 'totalSpecialPrice';
        else if (key === 'total_table_price') newKey = 'totalTablePrice';
        else if (key === 'special_price') newKey = 'specialPrice';
        else if (key === 'table_price') newKey = 'tablePrice';
        else if (key === 'special_day') newKey = 'specialDay';
        else if (key === 'pricing_table') newKey = 'pricingTable';
        else if (key === 'cost_center_id') newKey = 'costCenterId';
        else if (key === 'lead_id') newKey = 'leadId';
        else if (key === 'client_id') newKey = 'clientId';
        else if (key === 'client_email') newKey = 'clientEmail';
        else if (key === 'client_name') newKey = 'clientName';
        else if (key === 'created_date') newKey = 'createdDate';
        else if (key === 'valid_until') newKey = 'validUntil';
        else if (key === 'signed_at') newKey = 'signedAt';
        else if (key === 'signed_by_ip') newKey = 'signedByIp';
        else if (key === 'monthly_cost') newKey = 'monthlyCost';
        else if (key === 'setup_cost') newKey = 'setupCost';
        else if (key === 'last_message_at') newKey = 'lastMessageAt';
        else if (key === 'contact_identifier') newKey = 'contactIdentifier';
        else if (key === 'unread_count') newKey = 'unreadCount';
        else if (key === 'last_message') newKey = 'lastMessage';
        mapped[newKey] = mapKeysToApp(obj[key]);
    }
    return mapped;
};

const mapKeysToDb = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mapKeysToDb);
    const mapped: any = {};
    for (const key in obj) {
        let newKey = key;
        if (key === 'organizationId') newKey = 'organization_id';
        else if (key === 'createdAt') newKey = 'created_at';
        else if (key === 'userId') newKey = 'user_id';
        else if (key === 'userName') newKey = 'user_name';
        else if (key === 'lastRun') newKey = 'last_run';
        else if (key === 'lastAnalysis') newKey = 'last_analysis';
        else if (key === 'companyName') newKey = 'company_name';
        else if (key === 'matchScore') newKey = 'match_score';
        else if (key === 'suggestedApproach') newKey = 'suggest_approach';
        else if (key === 'contactPerson') newKey = 'contact_person';
        else if (key === 'healthScore') newKey = 'health_score';
        else if (key === 'lastContact') newKey = 'last_contact';
        else if (key === 'dueDate') newKey = 'due_date';
        else if (key === 'relatedTo') newKey = 'related_to';
        else if (key === 'totalSpecialPrice') newKey = 'total_special_price';
        else if (key === 'totalTablePrice') newKey = 'total_table_price';
        else if (key === 'specialPrice') newKey = 'special_price';
        else if (key === 'tablePrice') newKey = 'table_price';
        else if (key === 'specialDay') newKey = 'special_day';
        else if (key === 'pricingTable') newKey = 'pricing_table';
        else if (key === 'costCenterId') newKey = 'cost_center_id';
        else if (key === 'leadId') newKey = 'lead_id';
        else if (key === 'clientId') newKey = 'client_id';
        else if (key === 'clientEmail') newKey = 'client_email';
        else if (key === 'clientName') newKey = 'client_name';
        else if (key === 'createdDate') newKey = 'created_date';
        else if (key === 'validUntil') newKey = 'valid_until';
        else if (key === 'signedAt') newKey = 'signed_at';
        else if (key === 'signedByIp') newKey = 'signed_by_ip';
        else if (key === 'monthlyCost') newKey = 'monthly_cost';
        else if (key === 'setupCost') newKey = 'setup_cost';
        else if (key === 'lastMessageAt') newKey = 'last_message_at';
        else if (key === 'contactIdentifier') newKey = 'contact_identifier';
        else if (key === 'unreadCount') newKey = 'unread_count';
        else if (key === 'lastMessage') newKey = 'last_message';
        mapped[newKey] = mapKeysToDb(obj[key]);
    }
    return mapped;
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
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>([]);
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>([]);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
    const [financialCategories, setFinancialCategories] = useState<FinancialCategory[]>([]);
    
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('soft_theme') as 'light'|'dark') || 'light');

    const refreshData = useCallback(async () => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        setIsSyncing(true);
        const userEmail = (currentUser.email || '').toLowerCase().trim();
        const isMaster = SUPER_ADMIN_EMAILS.some(e => e.toLowerCase() === userEmail);
        try {
            const tables = [
                'leads', 'clients', 'tickets', 'invoices', 'activities', 
                'products', 'projects', 'workflows', 'competitors', 
                'proposals', 'custom_fields', 'webhooks', 'prospecting_history', 
                'disqualified_prospects', 'audit_logs', 'market_trends', 
                'inbox_conversations', 'financial_categories'
            ];
            if (isMaster) tables.push('organizations');
            const results = await Promise.allSettled(tables.map(t => {
                let query = sb.from(t).select('*');
                if (!isMaster && t !== 'organizations') query = query.eq('organization_id', currentUser.organizationId);
                if (t === 'audit_logs') query = query.order('timestamp', { ascending: false }).limit(100);
                return query;
            }));
            const setters: any = { 
                leads: setLeads, clients: setClients, tickets: setTickets, invoices: setInvoices, 
                activities: setActivities, products: setProducts, projects: setProjects, 
                workflows: setWorkflows, competitors: setCompetitors, proposals: setProposals, 
                organizations: setAllOrganizations, custom_fields: setCustomFields, 
                webhooks: setWebhooks, prospecting_history: setProspectingHistory, 
                audit_logs: setLogs, market_trends: setMarketTrends,
                inbox_conversations: setInboxConversations,
                financial_categories: setFinancialCategories,
                disqualified_prospects: (data: any[]) => setDisqualifiedProspects(data.map(d => d.company_name))
            };
            results.forEach((res, idx) => {
                const tableName = tables[idx];
                if (res.status === 'fulfilled' && res.value.data) {
                    setters[tableName](mapKeysToApp(res.value.data));
                }
            });
            setLastSyncTime(new Date());
        } catch (error: any) { console.error("Sync Failure", error); } finally { setIsSyncing(false); }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const dbUpsert = async (table: string, data: any) => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        try {
            const payload = mapKeysToDb({ 
                ...data, 
                organizationId: data.organizationId || currentUser.organizationId 
            });
            await sb.from(table).upsert(payload);
        } catch (e) { console.error(`Upsert fail on ${table}`, e); }
    };

    const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

    useEffect(() => {
        document.documentElement.classList.toggle('dark', theme === 'dark');
        localStorage.setItem('soft_theme', theme);
    }, [theme]);

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, issues: [], invoices, activities, products, projects, campaigns: [], marketingContents: [], workflows, clientDocuments: [], portalSettings: {} as any, logs, notifications, toasts, competitors, marketTrends, prospectingHistory, disqualifiedProspects, customFields, webhooks, inboxConversations, proposals, financialCategories, allOrganizations,
            isSyncing, lastSyncTime, theme, pushEnabled: false, refreshData, syncLocalToCloud: refreshData, toggleTheme, restoreDefaults: () => {}, 
            addLead: async (u,l) => { setLeads(p=>[...p,l]); await dbUpsert('leads', l); },
            updateLead: async (u,l) => { setLeads(p=>p.map(x=>x.id===l.id?l:x)); await dbUpsert('leads', l); },
            updateLeadStatus: async (u,id,s) => { const l = leads.find(x=>x.id===id); if(l){ const n = {...l, status: s}; setLeads(p=>p.map(x=>x.id===id?n:x)); await dbUpsert('leads', n); } },
            addClient: (u,c) => { setClients(p=>[...p,c]); dbUpsert('clients', c); },
            updateClient: (u,c) => { setClients(p=>p.map(x=>x.id===c.id?c:x)); dbUpsert('clients', c); },
            removeClient: (u,id) => { setClients(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('clients').delete().eq('id', id); },
            addClientsBulk: (u, list) => { setClients(p=>[...p, ...list]); list.forEach(item => dbUpsert('clients', item)); },
            updateClientContact: (c, a) => { if(a) { setActivities(p=>[a, ...p]); dbUpsert('activities', a); } },
            addTicket: (u,t) => { setTickets(p=>[...p,t]); dbUpsert('tickets', t); },
            updateTicket: (u,id,d) => { const t = tickets.find(x=>x.id===id); if(t){ const n = {...t, ...d}; setTickets(p=>p.map(x=>x.id===id?n:x)); dbUpsert('tickets', n); } },
            addInvoice: (u,i) => { setInvoices(p=>[...p,i]); dbUpsert('invoices', i); },
            updateInvoice: (u,i) => { setInvoices(p=>p.map(x=>x.id===i.id?i:x)); dbUpsert('invoices', i); },
            updateInvoiceStatus: (u,id,s) => { const i = invoices.find(x=>x.id===id); if(i){ const n = {...i, status: s}; setInvoices(p=>p.map(x=>x.id===id?n:x)); dbUpsert('invoices', n); } },
            addInvoicesBulk: (u,list) => { setInvoices(p=>[...p, ...list]); list.forEach(item => dbUpsert('invoices', item)); },
            addActivity: (u,a) => { setActivities(p=>[a, ...p]); dbUpsert('activities', a); },
            updateActivity: (u,a) => { setActivities(p=>p.map(x=>x.id===a.id?a:x)); dbUpsert('activities', a); },
            toggleActivity: (u,id) => { const a = activities.find(x=>x.id===id); if(a){ const n = {...a, completed: !a.completed}; setActivities(p=>p.map(x=>x.id===id?n:x)); dbUpsert('activities', n); } },
            addProduct: (u,product) => { setProducts(prev=>[...prev,product]); dbUpsert('products', product); },
            updateProduct: (u,product) => { setProducts(prev=>prev.map(x=>x.id===product.id?product:x)); dbUpsert('products', product); },
            removeProduct: (u,id) => { setProducts(prev => prev.filter(x => x.id !== id)); getSupabase()?.from('products').delete().eq('id', id); },
            addProject: (u,project) => { setProjects(prev=>[...prev,project]); dbUpsert('projects', project); },
            updateProject: (u,project) => { setProjects(prev=>prev.map(x=>x.id===project.id?project:x)); dbUpsert('projects', project); },
            deleteProject: (u,id) => { setProjects(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('projects').delete().eq('id', id); },
            addWorkflow: (u,wf) => { setWorkflows(prev => [...prev, wf]); dbUpsert('workflows', wf); },
            updateWorkflow: (u,wf) => { setWorkflows(prev => prev.map(x => x.id === wf.id ? wf : x)); dbUpsert('workflows', wf); },
            deleteWorkflow: (u,id) => { setWorkflows(prev => prev.filter(x => x.id !== id)); getSupabase()?.from('workflows').delete().eq('id', id); },
            triggerAutomation: () => {},
            addIssue: () => {}, updateIssue: () => {}, addIssueNote: () => {}, addCampaign: () => {}, updateCampaign: () => {}, addMarketingContent: () => {}, updateMarketingContent: () => {}, deleteMarketingContent: () => {}, addClientDocument: () => {}, removeClientDocument: () => {}, updatePortalSettings: () => {}, 
            addLog: (log) => { setLogs(p=>[log, ...p]); dbUpsert('audit_logs', log); }, 
            logAction: (user, action, details, module) => { 
                const log: AuditLog = { id: `LOG-${Date.now()}`, timestamp: new Date().toISOString(), userId: user?.id || 'sys', userName: user?.name || 'System', action, details, module, organizationId: user?.organizationId };
                setLogs(p=>[log, ...p]); dbUpsert('audit_logs', log);
            },
            addSystemNotification: (t,m,tp) => { const n = { id: Date.now().toString(), title: t, message: m, type: tp as any, timestamp: new Date().toISOString(), read: false }; setNotifications(p=>[n,...p]); }, markNotificationRead: (id) => { setNotifications(p=>p.map(x=>x.id===id?({...x,read:true}):x)); }, addToast: (m) => { const t = {...m, id: Date.now().toString()}; setToasts(p=>[...p,t]); }, removeToast: (id) => { setToasts(p=>p.filter(x=>x.id!==id)); }, 
            addCompetitor: (u,c) => { setCompetitors(p=>[...p,c]); dbUpsert('competitors', c); },
            updateCompetitor: (u,c) => { setCompetitors(p=>p.map(x=>x.id===c.id?c:x)); dbUpsert('competitors', c); },
            deleteCompetitor: (u,id) => { setCompetitors(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('competitors').delete().eq('id', id); },
            setMarketTrends: async (t) => { setMarketTrends(t); }, 
            addProspectingHistory: (item) => { setProspectingHistory(p => [item, ...p]); dbUpsert('prospecting_history', item); },
            clearProspectingHistory: () => { setProspectingHistory([]); },
            disqualifyProspect: (name) => { setDisqualifiedProspects(p => [...p, name]); },
            addCustomField: (f) => { setCustomFields(p=>[...p,f]); dbUpsert('custom_fields', f); }, 
            deleteCustomField: (id) => { setCustomFields(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('custom_fields').delete().eq('id', id); }, 
            addWebhook: (w) => { setWebhooks(p=>[...p,w]); dbUpsert('webhooks', w); }, 
            updateWebhook: (w) => { setWebhooks(p=>p.map(x=>x.id===w.id?w:x)); dbUpsert('webhooks', w); }, 
            deleteWebhook: (id) => { setWebhooks(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('webhooks').delete().eq('id', id); },
            addProposal: (u,proposal) => { setProposals(prev=>[...prev,proposal]); dbUpsert('proposals', proposal); },
            updateProposal: (u,proposal) => { setProposals(prev=>prev.map(x=>x.id===proposal.id?proposal:x)); dbUpsert('proposals', proposal); },
            removeProposal: (u,id) => { setProposals(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('proposals').delete().eq('id', id); },
            addFinancialCategory: (user, category) => { setFinancialCategories(prev => [...prev, category]); dbUpsert('financial_categories', category); },
            deleteFinancialCategory: (user, id) => { setFinancialCategories(prev => prev.filter(c => c.id !== id)); getSupabase()?.from('financial_categories').delete().eq('id', id); },
            addInboxInteraction: (contactName, type, text, contactIdentifier, sender = 'agent') => {
                // Fix: Explicitly casting sender to the expected union type '"user" | "agent" | "system"'
                const newMessage: InboxMessage = { id: `msg-${Date.now()}`, text, sender: sender as 'user' | 'agent' | 'system', timestamp: new Date().toISOString() };
                setInboxConversations(prev => {
                    const existingIdx = prev.findIndex(c => c.contactName === contactName);
                    if (existingIdx > -1) {
                        const updated = [...prev];
                        updated[existingIdx] = { 
                            ...updated[existingIdx], 
                            lastMessage: text, 
                            lastMessageAt: newMessage.timestamp,
                            messages: [...(updated[existingIdx].messages || []), newMessage]
                        };
                        dbUpsert('inbox_conversations', updated[existingIdx]);
                        return updated;
                    } else {
                        const newConvo: InboxConversation = {
                            id: `conv-${Date.now()}`,
                            contactName,
                            contactIdentifier: contactIdentifier || '',
                            type,
                            lastMessage: text,
                            lastMessageAt: newMessage.timestamp,
                            unreadCount: 0,
                            status: 'Open',
                            messages: [newMessage]
                        };
                        dbUpsert('inbox_conversations', newConvo);
                        return [newConvo, ...prev];
                    }
                });
            }
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
