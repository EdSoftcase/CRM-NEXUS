
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
    Lead, Client, Ticket, Invoice, Product, Project, 
    Workflow, AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, Proposal, Organization,
    Activity, TriggerType, TechnicalVisit, VisitStatus
} from '../types';
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
  campaigns: any[];
  marketingContents: any[];
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
  technicalVisits: TechnicalVisit[];
  isSyncing: boolean;
  lastSyncTime: Date | null;
  theme: 'light' | 'dark';
  refreshData: () => Promise<void>;
  toggleTheme: () => void;
  addLead: (user: User | null, lead: Lead) => Promise<void>;
  updateLead: (user: User | null, lead: Lead) => Promise<void>;
  updateLeadStatus: (user: User | null, leadId: string, status: LeadStatus) => Promise<void>;
  addClient: (user: User | null, client: Client) => Promise<void>;
  updateClient: (user: User | null, client: Client) => Promise<void>;
  removeClient: (user: User | null, clientId: string, reason: string) => Promise<void>;
  updateClientContact: (client: Client, activity?: Activity) => Promise<void>;
  addTicket: (user: User | null, ticket: Ticket) => Promise<void>;
  updateTicket: (user: User | null, ticketId: string, data: Partial<Ticket>) => Promise<void>;
  addInvoice: (user: User | null, invoice: Invoice) => Promise<void>;
  addActivity: (user: User | null, activity: Activity) => Promise<void>;
  toggleActivity: (user: User | null, activityId: string) => Promise<void>;
  addProduct: (user: User | null, product: Product) => Promise<void>;
  updateProduct: (user: User | null, product: Product) => Promise<void>;
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
  addToast: (message: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  addCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  updateCompetitor: (user: User | null, competitor: Competitor) => Promise<void>;
  deleteCompetitor: (user: User | null, competitorId: string) => Promise<void>;
  setMarketTrends: (trends: MarketTrend[]) => void;
  addProspectingHistory: (item: ProspectingHistoryItem) => Promise<void>;
  clearProspectingHistory: () => void;
  addProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  updateProposal: (user: User | null, proposal: Proposal) => Promise<void>;
  removeProposal: (user: User | null, id: string, reason: string) => void;
  addInboxInteraction: (contactName: string, type: string, text: string, contactIdentifier: string) => void;
  addTechnicalVisit: (user: User | null, visit: TechnicalVisit) => Promise<void>;
  updateTechnicalVisit: (user: User | null, visit: TechnicalVisit) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);
const MASTER_ORG_ID = 'org-1';

const mapToApp = (data: any[] | null | undefined): any[] => {
    if (!data || !Array.isArray(data)) return [];
    return data.map(item => {
        if (!item) return null;
        const newItem = { ...item };
        if (newItem.organization_id) newItem.organizationId = newItem.organization_id;
        const safeDate = (d: any) => {
            if (!d) return new Date().toISOString();
            const date = new Date(d);
            return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
        };
        if (newItem.created_at) newItem.createdAt = safeDate(newItem.created_at);
        if (newItem.created_date) newItem.createdDate = safeDate(newItem.created_date);
        if (newItem.valid_until) newItem.validUntil = safeDate(newItem.valid_until);
        if (newItem.due_date) newItem.dueDate = safeDate(newItem.due_date);
        if (newItem.last_contact) newItem.lastContact = safeDate(newItem.last_contact);
        if (newItem.scheduled_date) newItem.scheduledDate = safeDate(newItem.scheduled_date);
        if (newItem.group_name) newItem.groupName = newItem.group_name;
        if (newItem.group_id) newItem.groupId = newItem.group_id;
        if (newItem.company_name) newItem.companyName = newItem.company_name;
        if (newItem.client_name) newItem.clientName = newItem.client_name;
        if (newItem.client_email) newItem.clientEmail = newItem.client_email;
        if (newItem.lead_id) newItem.leadId = newItem.lead_id;
        if (newItem.client_id) newItem.clientId = newItem.client_id;
        if (newItem.setup_cost) newItem.setupCost = newItem.setup_cost;
        if (newItem.monthly_cost) newItem.monthlyCost = newItem.monthly_cost;
        if (newItem.signed_at) newItem.signedAt = newItem.signed_at;
        if (newItem.signed_by_ip) newItem.signedByIp = newItem.signed_by_ip;
        if (newItem.target_id) newItem.targetId = newItem.target_id;
        if (newItem.target_name) newItem.targetName = newItem.target_name;
        if (newItem.target_type) newItem.targetType = newItem.target_type;
        if (newItem.technician_name) newItem.technicianName = newItem.technician_name;
        if (newItem.infrastructure_notes) newItem.infrastructureNotes = newItem.infrastructure_notes;
        if (newItem.suggested_items) newItem.suggestedItems = newItem.suggested_items;
        if (newItem.user_id) newItem.userId = newItem.user_id;
        if (newItem.user_name) newItem.userName = newItem.user_name;
        if (newItem.technical_specs) newItem.technicalSpecs = typeof newItem.technical_specs === 'string' ? JSON.parse(newItem.technical_specs) : newItem.technical_specs;

        const parseJson = (val: any) => {
            if (!val) return [];
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch (e) { return []; }
            }
            return Array.isArray(val) ? val : [];
        };

        newItem.items = parseJson(newItem.items);
        newItem.scope = parseJson(newItem.scope);
        newItem.tasks = parseJson(newItem.tasks);
        newItem.products = parseJson(newItem.products);
        newItem.suggestedItems = parseJson(newItem.suggestedItems);
        return newItem;
    }).filter(Boolean);
};

const mapToDb = (data: any, table: string) => {
    const p = { ...data };
    const payload: any = {
        id: p.id,
        organization_id: p.organizationId || MASTER_ORG_ID
    };

    if (table === 'audit_logs') {
        payload.timestamp = p.timestamp || new Date().toISOString();
        payload.user_id = p.userId || 'system';
        payload.user_name = p.userName || 'System';
        payload.action = p.action;
        payload.details = p.details;
        payload.module = p.module;
    }

    if (table === 'leads') {
        payload.name = p.name || '';
        payload.company = p.company || '';
        payload.email = p.email || '';
        payload.phone = p.phone || '';
        payload.value = Number(p.value) || 0;
        payload.status = p.status || 'Novo';
        payload.source = p.source || 'Manual';
        payload.description = p.description || '';
        payload.last_contact = p.last_contact || new Date().toISOString();
        payload.created_at = p.created_at || new Date().toISOString();
        payload.address = p.address || '';
        payload.cep = p.cep || '';
    }

    if (table === 'clients') {
        payload.name = p.name || '';
        payload.contact_person = p.contactPerson || '';
        payload.document = p.document || '';
        payload.email = p.email || '';
        payload.phone = p.phone || '';
        payload.segment = p.segment || '';
        payload.status = p.status || 'Active';
        payload.ltv = Number(p.ltv) || 0;
        payload.group_id = p.groupId || null;
        payload.group_name = p.groupName || null;
        payload.unit = p.unit || p.name || '';
        payload.health_score = Number(p.healthScore) || 100;
        payload.last_contact = p.lastContact || new Date().toISOString();
        payload.since = p.since || new Date().toISOString();
        if (p.contractedProducts) payload.contracted_products = p.contractedProducts;
    }

    if (table === 'proposals') {
        payload.title = p.title;
        payload.status = p.status || 'Draft';
        payload.price = Number(p.price) || 0;
        payload.monthly_cost = Number(p.monthlyCost) || 0;
        payload.setup_cost = Number(p.setupCost) || 0;
        payload.company_name = p.companyName;
        payload.client_name = p.clientName;
        payload.client_email = p.clientEmail;
        payload.group_name = p.groupName;
        payload.group_id = p.groupId;
        payload.unit = p.unit;
        payload.lead_id = p.leadId || null;
        payload.client_id = p.clientId || null;
        payload.items = JSON.stringify(p.items || []);
        payload.scope = JSON.stringify(p.scope || []);
        payload.created_date = p.createdDate || new Date().toISOString();
        payload.valid_until = p.validUntil || new Date(new Date(p.createdDate || Date.now()).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString();
        payload.technical_specs = p.technicalSpecs ? JSON.stringify(p.technicalSpecs) : null;
        if (p.signature) payload.signature = p.signature;
        if (p.signedAt) payload.signed_at = p.signedAt;
        if (p.signedByIp) payload.signed_by_ip = p.signedByIp;
    }

    if (table === 'projects') {
        payload.title = p.title;
        payload.client_name = p.clientName;
        payload.status = p.status;
        payload.progress = Number(p.progress) || 0;
        payload.start_date = p.startDate;
        payload.deadline = p.deadline;
        payload.manager = p.manager;
        payload.description = p.description || '';
        payload.tasks = JSON.stringify(p.tasks || []);
        payload.products = JSON.stringify(p.products || []);
        payload.scope = JSON.stringify(p.scope || []);
        payload.archived = !!p.archived;
        payload.technical_specs = p.technicalSpecs ? JSON.stringify(p.technicalSpecs) : null;
        if (p.completedAt) payload.completed_at = p.completedAt;
        if (p.unit) payload.unit = p.unit;
    }

    if (table === 'webhooks') {
        payload.name = p.name;
        payload.url = p.url;
        payload.active = !!p.active;
        payload.trigger_event = p.triggerEvent;
    }

    if (table === 'custom_fields') {
        payload.label = p.label;
        payload.key = p.key;
        payload.type = p.type;
        payload.module = p.module;
        payload.required = !!p.required;
    }

    // Fix: Added missing table mappings for technical_visits, competitors, market_trends, prospecting_history, and activities.
    if (table === 'technical_visits') {
        payload.target_id = p.targetId;
        payload.target_name = p.targetName;
        payload.target_type = p.targetType;
        payload.scheduled_date = p.scheduledDate;
        payload.technician_name = p.technicianName;
        payload.status = p.status;
        payload.report = p.report;
        payload.infrastructure_notes = p.infrastructureNotes;
        payload.suggested_items = JSON.stringify(p.suggestedItems || []);
    }

    if (table === 'competitors') {
        payload.name = p.name;
        payload.website = p.website;
        payload.sector = p.sector;
        payload.last_analysis = p.lastAnalysis;
        payload.swot = JSON.stringify(p.swot || {});
        payload.battlecard = JSON.stringify(p.battlecard || {});
    }

    if (table === 'market_trends') {
        payload.title = p.title;
        payload.description = p.description;
        payload.sentiment = p.sentiment;
        payload.impact = p.impact;
    }

    if (table === 'prospecting_history') {
        payload.timestamp = p.timestamp;
        payload.industry = p.industry;
        payload.location = p.location;
        payload.keywords = p.keywords;
        payload.results = JSON.stringify(p.results || []);
    }

    if (table === 'activities') {
        payload.title = p.title;
        payload.type = p.type;
        payload.due_date = p.dueDate;
        payload.completed = !!p.completed;
        payload.related_to = p.relatedTo;
        payload.assignee = p.assignee;
        payload.description = p.description || '';
        payload.metadata = JSON.stringify(p.metadata || {});
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
    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [technicalVisits, setTechnicalVisits] = useState<TechnicalVisit[]>([]);
    const [notifications, setNotifications] = useState<SystemNotification[]>([]);
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('soft_theme') as 'light'|'dark') || 'light');
    const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>([]);
    const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>([]);
    const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>([]);
    const [competitors, setCompetitors] = useState<Competitor[]>([]);
    const [marketTrends, setMarketTrendsState] = useState<MarketTrend[]>([]);
    
    const dbUpsert = async (table: string, data: any) => {
        const supabase = getSupabase();
        if (supabase) {
            try {
                const payload = mapToDb(data, table);
                await supabase.from(table).upsert(payload);
            } catch (e) {
                console.warn(`Failed to sync ${table} to cloud`, e);
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

    const addSystemNotification = (title: string, message: string, type: 'info'|'warning'|'success'|'alert' = 'info') => {
        const notif: SystemNotification = {
            id: `NOTIF-${Date.now()}`,
            title, message, type, timestamp: new Date().toISOString(), read: false,
            organizationId: currentUser?.organizationId || MASTER_ORG_ID
        };
        setNotifications(prev => [notif, ...prev]);
        addToast({ title, message, type });
    };

    const markNotificationRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const refreshData = useCallback(async () => {
        const sb = getSupabase();
        if (!sb || !currentUser) return;
        setIsSyncing(true);
        try {
            const userOrgId = currentUser.organizationId || MASTER_ORG_ID;
            const isClient = currentUser.role === 'client';
            const relatedClientId = currentUser.relatedClientId;
            const groupName = currentUser.managedGroupName;

            let clientQuery = sb.from('clients').select('*').eq('organization_id', userOrgId);
            if (isClient) {
                if (groupName) clientQuery = clientQuery.eq('group_name', groupName);
                else if (relatedClientId) clientQuery = clientQuery.eq('id', relatedClientId);
            }

            const { data: clientsData } = await clientQuery;
            const myClients = mapToApp(clientsData || []);
            const myClientIds = myClients.map(c => c.id);

            let invoiceQuery = sb.from('invoices').select('*').eq('organization_id', userOrgId);
            let proposalQuery = sb.from('proposals').select('*').eq('organization_id', userOrgId);
            let ticketQuery = sb.from('tickets').select('*').eq('organization_id', userOrgId);
            let projectQuery = sb.from('projects').select('*').eq('organization_id', userOrgId);
            let visitQuery = sb.from('technical_visits').select('*').eq('organization_id', userOrgId);

            if (isClient && myClientIds.length > 0) {
                const idFilter = `client_id.in.(${myClientIds.map(id => `"${id}"`).join(',')})`;
                const groupFilter = groupName ? `,group_name.eq."${groupName}"` : '';
                invoiceQuery = invoiceQuery.or(`${idFilter}${groupFilter}`);
                proposalQuery = proposalQuery.or(`${idFilter}${groupFilter}`);
                const nameFilter = `customer.in.(${myClients.map(c => `"${c.name}"`).join(',')})`;
                ticketQuery = ticketQuery.or(nameFilter);
                visitQuery = visitQuery.eq('target_id', relatedClientId || 'none');
            }

            const results = await Promise.allSettled([
                sb.from('leads').select('*').or(`organization_id.eq.${userOrgId},organization_id.is.null`),
                invoiceQuery,
                ticketQuery,
                sb.from('activities').select('*').eq('organization_id', userOrgId),
                projectQuery,
                sb.from('products').select('*').or(`organization_id.eq.${MASTER_ORG_ID},organization_id.is.null`),
                proposalQuery,
                sb.from('audit_logs').select('*').eq('organization_id', userOrgId).order('timestamp', {ascending: false}).limit(100),
                sb.from('prospecting_history').select('*').eq('organization_id', userOrgId),
                sb.from('competitors').select('*').eq('organization_id', userOrgId),
                sb.from('market_trends').select('*').eq('organization_id', userOrgId),
                visitQuery,
                sb.from('webhooks').select('*').eq('organization_id', userOrgId),
                sb.from('custom_fields').select('*').eq('organization_id', userOrgId)
            ]);

            const getData = (index: number) => {
                const res = results[index];
                if (res && res.status === 'fulfilled') {
                  const data = (res.value as any).data;
                  return mapToApp(Array.isArray(data) ? data : []);
                }
                return [];
            };

            setLeads(getData(0));
            setInvoices(getData(1));
            setTickets(getData(2));
            setActivities(getData(3));
            setProjects(getData(4));
            setProducts(getData(5));
            setProposals(getData(6));
            setLogs(getData(7));
            setProspectingHistory(getData(8));
            setCompetitors(getData(9));
            setMarketTrendsState(getData(10));
            setTechnicalVisits(getData(11));
            setWebhooks(getData(12));
            setCustomFields(getData(13));
            setClients(myClients);
            setLastSyncTime(new Date());
        } catch (e: any) { 
            console.error("Refresh Data Error:", e); 
        } finally { 
            setIsSyncing(false); 
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    // Fix: Declared toggleTheme function to resolve scope property error.
    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('soft_theme', nextTheme);
    };

    const addProduct = async (user: User | null, product: Product) => {
        setProducts(prev => [...prev, product]);
        await dbUpsert('products', product);
        logAction(user, 'Create Product', `Created product ${product.name}`, 'Configurações');
    };

    const addProposal = async (user: User | null, proposal: Proposal) => {
        setProposals(prev => [...prev, proposal]);
        await dbUpsert('proposals', proposal);
        logAction(user, 'Create Proposal', `Created proposal ${proposal.title}`, 'Propostas');
    };

    const addLead = async (user: User | null, lead: Lead) => {
        setLeads(prev => [...prev, lead]);
        await dbUpsert('leads', lead);
        logAction(user, 'Create Lead', `Created lead ${lead.name}`, 'Comercial');
    };

    const addClient = async (user: User | null, client: Client) => {
        setClients(prev => [...prev, client]);
        await dbUpsert('clients', client);
        logAction(user, 'Create Client', `Created client ${client.name}`, 'Clientes');
    };

    const addActivity = async (user: User | null, activity: Activity) => {
        setActivities(prev => [activity, ...prev]);
        await dbUpsert('activities', activity);
        logAction(user, 'Create Activity', `Created ${activity.type}`, 'Agenda');
    };

    const addWebhook = async (webhook: WebhookConfig) => {
        setWebhooks(prev => [...prev, webhook]);
        await dbUpsert('webhooks', { ...webhook, organizationId: currentUser?.organizationId });
        logAction(currentUser, 'Create Webhook', `Added webhook ${webhook.name}`, 'Configurações');
    };

    const deleteWebhook = async (id: string) => {
        setWebhooks(prev => prev.filter(w => w.id !== id));
        const sb = getSupabase();
        if (sb) await sb.from('webhooks').delete().eq('id', id);
        logAction(currentUser, 'Delete Webhook', `Deleted webhook ${id}`, 'Configurações');
    };

    const addCustomField = async (field: CustomFieldDefinition) => {
        setCustomFields(prev => [...prev, field]);
        await dbUpsert('custom_fields', { ...field, organizationId: currentUser?.organizationId });
        logAction(currentUser, 'Create Custom Field', `Added field ${field.label}`, 'Configurações');
    };

    const deleteCustomField = async (id: string) => {
        setCustomFields(prev => prev.filter(f => f.id !== id));
        const sb = getSupabase();
        if (sb) await sb.from('custom_fields').delete().eq('id', id);
        logAction(currentUser, 'Delete Custom Field', `Deleted field ${id}`, 'Configurações');
    };

    // Fix: Added missing CRUD and state management functions to resolve "Cannot find name" errors in the provider value.
    const addProject = async (user: User | null, project: Project) => {
        setProjects(prev => [...prev, project]);
        await dbUpsert('projects', project);
        logAction(user, 'Create Project', `Created project ${project.title}`, 'Projetos');
    };

    const addCompetitor = async (user: User | null, competitor: Competitor) => {
        setCompetitors(prev => [...prev, competitor]);
        await dbUpsert('competitors', competitor);
        logAction(user, 'Add Competitor', `Added competitor ${competitor.name}`, 'Spy');
    };

    const setMarketTrends = (trends: MarketTrend[]) => {
        setMarketTrendsState(trends);
    };

    const addProspectingHistory = async (item: ProspectingHistoryItem) => {
        setProspectingHistory(prev => [item, ...prev].slice(0, 50));
        await dbUpsert('prospecting_history', item);
    };

    const addTechnicalVisit = async (user: User | null, visit: TechnicalVisit) => {
        setTechnicalVisits(prev => [...prev, visit]);
        await dbUpsert('technical_visits', visit);
        logAction(user, 'Create Visit', `Scheduled visit for ${visit.targetName}`, 'Vistorias');
    };

    const updateTechnicalVisit = async (user: User | null, visit: TechnicalVisit) => {
        setTechnicalVisits(prev => prev.map(v => v.id === visit.id ? visit : v));
        await dbUpsert('technical_visits', visit);
        logAction(user, 'Update Visit', `Updated visit for ${visit.targetName}`, 'Vistorias');
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, invoices, activities, products, projects, workflows, webhooks, customFields,
            campaigns: [], marketingContents: [], notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, proposals, allOrganizations: [], logs, inboxConversations,
            technicalVisits,
            isSyncing, lastSyncTime, theme,
            refreshData, toggleTheme, 
            addLead, updateLead: async () => {}, updateLeadStatus: async () => {}, addClient, updateClient: async () => {}, 
            removeClient: async () => {}, updateClientContact: async () => {}, addTicket: async () => {}, updateTicket: async () => {}, 
            addInvoice: async () => {}, addActivity, toggleActivity: async () => {}, addProduct, updateProduct: async () => {}, 
            removeProduct: async () => {}, addProject, updateProject: async () => {}, addWorkflow: async () => {}, 
            updateWorkflow: async () => {}, deleteWorkflow: async () => {}, addWebhook, deleteWebhook, 
            addCustomField, deleteCustomField, 
            addSystemNotification, markNotificationRead, 
            addToast, removeToast, 
            addCompetitor, updateCompetitor: async () => {}, 
            deleteCompetitor: async () => {}, setMarketTrends, addProspectingHistory, clearProspectingHistory: () => setProspectingHistory([]), 
            addProposal, updateProposal: async () => {}, removeProposal: async () => {}, addInboxInteraction: () => {},
            addTechnicalVisit, updateTechnicalVisit
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
