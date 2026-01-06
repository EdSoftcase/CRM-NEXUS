
// Fix: Added React import to resolve "Cannot find namespace 'React'" errors in JSX usage.
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { 
    Lead, Client, Ticket, Issue, Invoice, Activity, Product, Project, 
    Campaign, MarketingContent, Workflow, ClientDocument, PortalSettings, 
    AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, TriggerType, Proposal, FinancialCategory, Organization, InboxMessage, ProjectTask
} from '../types';
import { getSupabase } from '../services/supabaseClient';
import { useAuth, SUPER_ADMIN_EMAILS } from './AuthContext';

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
    const mapping: Record<string, string> = {
        'organization_id': 'organizationId',
        'created_at': 'createdAt',
        'user_id': 'userId',
        'user_name': 'userName',
        'company_name': 'companyName',
        'contact_person': 'contactPerson',
        'health_score': 'healthScore',
        'last_contact': 'lastContact',
        'due_date': 'dueDate',
        'related_to': 'relatedTo',
        'total_special_price': 'totalSpecialPrice',
        'total_table_price': 'totalTablePrice',
        'special_price': 'specialPrice',
        'table_price': 'tablePrice',
        'special_day': 'specialDay',
        'pricing_table': 'pricingTable',
        'lead_id': 'leadId',
        'client_id': 'clientId',
        'client_email': 'clientEmail',
        'client_name': 'clientName',
        'created_date': 'createdDate',
        'valid_until': 'validUntil',
        'signed_at': 'signedAt',
        'signed_by_ip': 'signedByIp',
        'monthly_cost': 'monthlyCost',
        'setup_cost': 'setupCost',
        'custom_clause': 'customClause',
        'consultant_name': 'consultantName',
        'consultant_email': 'consultantEmail',
        'consultant_phone': 'consultantPhone',
        'includes_development': 'includesDevelopment',
        'contracted_products': 'contractedProducts',
        'proposal_id': 'proposalId',
        'completed_at': 'completedAt',
        'start_date': 'startDate',
        'lost_reason': 'lostReason',
        'status_updated_at': 'statusUpdatedAt'
    };

    for (const key in obj) {
        const newKey = mapping[key] || key;
        mapped[newKey] = mapKeysToApp(obj[key]);
    }
    return mapped;
};

const mapKeysToDb = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(mapKeysToDb);
    const mapped: any = {};
    const mapping: Record<string, string> = {
        'organizationId': 'organization_id',
        'createdAt': 'created_at',
        'userId': 'user_id',
        'userName': 'user_name',
        'companyName': 'company_name',
        'contactPerson': 'contact_person',
        'healthScore': 'health_score',
        'lastContact': 'last_contact',
        'dueDate': 'due_date',
        'relatedTo': 'related_to',
        'totalSpecialPrice': 'total_special_price',
        'totalTablePrice': 'total_table_price',
        'specialPrice': 'special_price',
        'tablePrice': 'table_price',
        'specialDay': 'special_day',
        'pricingTable': 'pricing_table',
        'leadId': 'lead_id',
        'clientId': 'client_id',
        'clientEmail': 'client_email',
        'clientName': 'client_name',
        'createdDate': 'created_date',
        'validUntil': 'valid_until',
        'signedAt': 'signed_at',
        'signedByIp': 'signed_by_ip',
        'monthlyCost': 'monthly_cost',
        'setupCost': 'setup_cost',
        'customClause': 'custom_clause',
        'consultantName': 'consultant_name',
        'consultantEmail': 'consultant_email',
        'consultantPhone': 'consultant_phone',
        'includesDevelopment': 'includes_development',
        'contractedProducts': 'contracted_products',
        'proposalId': 'proposal_id',
        'completedAt': 'completed_at',
        'startDate': 'start_date',
        'lostReason': 'lost_reason',
        'statusUpdatedAt': 'status_updated_at'
    };

    for (const key in obj) {
        const newKey = mapping[key] || key;
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

            const { error } = await sb.from(table).upsert(payload);
            if (error) {
                const errorMessage = error.message || JSON.stringify(error);
                
                if (errorMessage.includes("row-level security policy")) {
                    console.error(`RLS Violation on ${table}. Please run SQL MASTER RESET v56.0 in Settings > SQL Patch.`);
                }

                if (errorMessage.includes("column") || errorMessage.includes("cache") || errorMessage.includes("schema")) {
                   const { proposal_id, lost_reason, status_updated_at, metadata, type, ...safePayload } = payload;
                   const { error: retryError } = await sb.from(table).upsert(safePayload);
                   if (retryError) throw retryError;
                } else {
                   throw error;
                }
            }
        } catch (e: any) { 
            console.error(`Upsert sync failed on ${table}. Local data preserved.`, e.message || e);
        }
    };

    // --- AUTO CONVERSION & INVENTORY UPDATE ---
    useEffect(() => {
        const autoConvertProposals = async () => {
            if (!currentUser || proposals.length === 0 || isSyncing) return;

            const signedWithoutProject = proposals.filter(p => 
                p.status === 'Accepted' && 
                !projects.some(proj => proj.proposalId === p.id)
            );

            if (signedWithoutProject.length > 0) {
                for (const proposal of signedWithoutProject) {
                    // 1. EXTRAIR PRODUTOS PARA PROJETO E INVENTÁRIO
                    const productItems = (proposal.items || [])
                        .filter(i => i.category === 'Product')
                        .map(i => `${i.quantity}x ${i.name}`);
                    
                    const productNamesOnly = (proposal.items || [])
                        .map(i => i.name);

                    // 2. ATUALIZAR INVENTÁRIO DO CLIENTE (PARA APARECER NA ABA SOLUÇÕES)
                    const targetClient = clients.find(c => 
                        (proposal.clientId && c.id === proposal.clientId) || 
                        (c.name.toLowerCase() === proposal.companyName.toLowerCase())
                    );

                    if (targetClient) {
                        const currentContracted = targetClient.contractedProducts || [];
                        const updatedContracted = Array.from(new Set([...currentContracted, ...productNamesOnly]));
                        
                        const updatedClient = {
                            ...targetClient,
                            contractedProducts: updatedContracted
                        };
                        
                        setClients(prev => prev.map(c => c.id === targetClient.id ? updatedClient : c));
                        await dbUpsert('clients', updatedClient);
                        console.log(`Inventory updated for client ${targetClient.name}`);
                    }

                    // 3. CRIAR PROJETO
                    const tasks: ProjectTask[] = [
                        { id: `tk-1-${Date.now()}`, title: 'Kitting: Separar e validar equipamentos', status: 'Pending' },
                        ...productItems.map((p, i) => ({ id: `tk-p-${i}-${Date.now()}`, title: `Montagem: ${p}`, status: 'Pending' })),
                        { id: `tk-last-${Date.now()}`, title: 'Go-Live: Configuração final e treinamento', status: 'Pending' }
                    ];

                    const newProject: Project = {
                        id: `PROJ-AUTO-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                        title: `Implantação: ${proposal.title}`,
                        clientName: proposal.companyName, 
                        status: 'Kitting', 
                        progress: 25,
                        startDate: new Date().toISOString(),
                        deadline: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), 
                        manager: 'Nexus Auto-Flow', 
                        description: `Projeto gerado automaticamente via Assinatura Digital.`,
                        tasks, 
                        products: productItems,
                        proposalId: proposal.id,
                        organizationId: proposal.organizationId || currentUser.organizationId,
                        statusUpdatedAt: new Date().toISOString()
                    };

                    setProjects(prev => [...prev, newProject]);
                    try {
                        await dbUpsert('projects', newProject);
                    } catch (e) {
                        console.warn("Auto-convert project cloud sync failed, kept locally.", e);
                    }
                }
            }
        };

        const timer = setTimeout(autoConvertProposals, 3000); 
        return () => clearTimeout(timer);
    }, [proposals, projects, clients, currentUser, isSyncing]);

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
            updateClientContact: (client, activity) => { if(activity) { setActivities(p=>[activity, ...p]); dbUpsert('activities', activity); } },
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
            deleteWorkflow: (u,id) => { setWorkflows(prev => prev.filter(x => x.id !== id)); getSupabase()?.from('projects').delete().eq('id', id); },
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
            updateProposal: async (u,proposal) => { 
                const original = proposals.find(p => p.id === proposal.id);
                const isNewlyAccepted = proposal.status === 'Accepted' && original?.status !== 'Accepted';
                
                const finalProposal = {
                    ...proposal,
                    organizationId: proposal.organizationId || original?.organizationId || u?.organizationId
                };
                
                setProposals(prev=>prev.map(x=>x.id===proposal.id ? finalProposal : x)); 
                await dbUpsert('proposals', finalProposal); 

                if (isNewlyAccepted) {
                    const productItems = (proposal.items || [])
                        .filter(i => i.category === 'Product')
                        .map(i => `${i.quantity}x ${i.name}`);

                    // ATUALIZAÇÃO MANUAL IMEDIATA DO INVENTÁRIO
                    const productNamesOnly = (proposal.items || [])
                        .map(i => i.name);

                    const targetClient = clients.find(c => 
                        (proposal.clientId && c.id === proposal.clientId) || 
                        (c.name.toLowerCase() === proposal.companyName.toLowerCase())
                    );

                    if (targetClient) {
                        const currentContracted = targetClient.contractedProducts || [];
                        const updatedContracted = Array.from(new Set([...currentContracted, ...productNamesOnly]));
                        const updatedClient = { ...targetClient, contractedProducts: updatedContracted };
                        setClients(prev => prev.map(c => c.id === targetClient.id ? updatedClient : c));
                        await dbUpsert('clients', updatedClient);
                    }
                    
                    const tasks: ProjectTask[] = [
                        { id: `tk-1-${Date.now()}`, title: 'Kitting: Separar e validar equipamentos', status: 'Pending' },
                        ...productItems.map((p, i) => ({ id: `tk-p-${i}-${Date.now()}`, title: `Montagem: ${p}`, status: 'Pending' })),
                        { id: `tk-last-${Date.now()}`, title: 'Go-Live: Configuração final e treinamento', status: 'Pending' }
                    ];

                    const newProject: Project = {
                        id: `PROJ-${Date.now()}`,
                        title: `Implantação: ${proposal.title}`,
                        clientName: proposal.companyName, 
                        status: 'Kitting', 
                        progress: 25,
                        startDate: new Date().toISOString(),
                        deadline: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), 
                        manager: 'Operações Softpark', 
                        description: `Projeto gerado via assinatura digital.`,
                        tasks, 
                        products: productItems,
                        proposalId: proposal.id,
                        organizationId: finalProposal.organizationId,
                        statusUpdatedAt: new Date().toISOString()
                    };

                    setProjects(prev => [...prev, newProject]);
                    try {
                        await dbUpsert('projects', newProject);
                    } catch (e) {
                        console.warn("Auto-convert project sync error", e);
                    }
                }
            },
            removeProposal: (u,id) => { setProposals(p=>p.filter(x=>x.id!==id)); getSupabase()?.from('proposals').delete().eq('id', id); },
            addFinancialCategory: (user, category) => { setFinancialCategories(prev => [...prev, category]); dbUpsert('financial_categories', category); },
            deleteFinancialCategory: (user, id) => { setFinancialCategories(prev => prev.filter(c => c.id !== id)); getSupabase()?.from('financial_categories').delete().eq('id', id); },
            addInboxInteraction: (contactName, type, text, contactIdentifier, sender = 'agent') => {
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
