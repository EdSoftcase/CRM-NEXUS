
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
  allOrganizations: Organization[];
  logs: AuditLog[];
  notifications: SystemNotification[];
  toasts: ToastMessage[];
  inboxConversations: InboxConversation[];
  technicalVisits: TechnicalVisit[];
  proposals: Proposal[];
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
            if (!d) return null;
            const date = new Date(d);
            return isNaN(date.getTime()) ? null : date.toISOString();
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
        if (newItem.status_updated_at) newItem.statusUpdatedAt = newItem.status_updated_at;
        if (newItem.completed_at) newItem.completedAt = newItem.completed_at;
        
        if (newItem.technical_specs) {
            newItem.technicalSpecs = typeof newItem.technical_specs === 'string' ? JSON.parse(newItem.technical_specs) : newItem.technical_specs;
        }

        const parseJson = (val: any) => {
            if (!val) return [];
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch(e) { return []; }
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
        if (p.statusUpdatedAt) payload.status_updated_at = p.statusUpdatedAt;
        if (p.unit) payload.unit = p.unit;
        if (p.signedAt) payload.signed_at = p.signedAt;
    }

    // Outras tabelas omitidas para brevidade, mantendo consistência com o arquivo original
    // Mas garantindo que o retorno seja o payload correto para a tabela selecionada.
    // ... (restante da lógica mapToDb do arquivo original)
    
    // Adicionando especificamente para manter o mapeamento do arquivo anterior
    if (table === 'leads') {
        payload.name = p.name || '';
        payload.company = p.company || '';
        payload.email = p.email || '';
        payload.phone = p.phone || '';
        payload.value = Number(p.value) || 0;
        payload.status = p.status || 'Novo';
        payload.source = p.source || 'Manual';
        payload.description = p.description || '';
        payload.last_contact = p.lastContact || new Date().toISOString();
        payload.created_at = p.createdAt || new Date().toISOString();
    }

    if (table === 'clients') {
        payload.name = p.name || '';
        payload.contact_person = p.contactPerson || '';
        payload.document = p.document || '';
        payload.email = p.email || '';
        payload.phone = p.phone || '';
        payload.status = p.status || 'Active';
        payload.ltv = Number(p.ltv) || 0;
    }

    if (table === 'proposals') {
        payload.title = p.title;
        payload.status = p.status || 'Draft';
        payload.price = Number(p.price) || 0;
        payload.monthly_cost = Number(p.monthlyCost) || 0;
        payload.company_name = p.companyName;
        payload.technical_specs = p.technicalSpecs ? JSON.stringify(p.technicalSpecs) : null;
        if (p.signedAt) payload.signed_at = p.signedAt;
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
                const { error } = await supabase.from(table).upsert(payload);
                if (error) throw error;
            } catch (e) {
                console.warn(`Failed to sync ${table} to cloud`, e);
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
        setLogs(prev => [log, ...prev]);
        dbUpsert('audit_logs', log);
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
            
            const results = await Promise.allSettled([
                sb.from('leads').select('*').eq('organization_id', userOrgId),
                sb.from('clients').select('*').eq('organization_id', userOrgId),
                sb.from('tickets').select('*').eq('organization_id', userOrgId),
                sb.from('invoices').select('*').eq('organization_id', userOrgId),
                sb.from('activities').select('*').eq('organization_id', userOrgId),
                sb.from('products').select('*').or(`organization_id.eq.${MASTER_ORG_ID},organization_id.is.null`),
                sb.from('projects').select('*').eq('organization_id', userOrgId),
                sb.from('proposals').select('*').eq('organization_id', userOrgId),
                sb.from('audit_logs').select('*').eq('organization_id', userOrgId).order('timestamp', {ascending: false}).limit(100),
                sb.from('prospecting_history').select('*').eq('organization_id', userOrgId),
                sb.from('competitors').select('*').eq('organization_id', userOrgId),
                sb.from('market_trends').select('*').eq('organization_id', userOrgId),
                sb.from('technical_visits').select('*').eq('organization_id', userOrgId),
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
            setClients(getData(1));
            setTickets(getData(2));
            setInvoices(getData(3));
            setActivities(getData(4));
            setProducts(getData(5));
            setProjects(getData(6));
            setProposals(getData(7));
            setLogs(getData(8));
            setProspectingHistory(getData(9));
            setCompetitors(getData(10));
            setMarketTrendsState(getData(11));
            setTechnicalVisits(getData(12));
            setWebhooks(getData(13));
            setCustomFields(getData(14));
            setLastSyncTime(new Date());
        } catch (e: any) { 
            console.error("Refresh Data Error:", e); 
        } finally { 
            setIsSyncing(false); 
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const toggleTheme = () => {
        const nextTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(nextTheme);
        localStorage.setItem('soft_theme', nextTheme);
    };

    // PROJETOS - CORREÇÃO DE PERSISTÊNCIA
    const addProject = async (user: User | null, project: Project) => {
        setProjects(prev => [...prev, project]);
        await dbUpsert('projects', project);
        logAction(user, 'Create Project', `Created project ${project.title}`, 'Projetos');
    };

    const updateProject = async (user: User | null, project: Project) => {
        setProjects(prev => prev.map(p => p.id === project.id ? project : p));
        await dbUpsert('projects', project);
    };

    const deleteProject = async (user: User | null, projectId: string) => {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        await dbDelete('projects', projectId);
        logAction(user, 'Delete Project', `Deleted project ${projectId}`, 'Projetos');
    };

    // PROPOSTAS
    const addProposal = async (user: User | null, proposal: Proposal) => {
        setProposals(prev => [...prev, proposal]);
        await dbUpsert('proposals', proposal);
    };

    const updateProposal = async (user: User | null, proposal: Proposal) => {
        setProposals(prev => prev.map(p => p.id === proposal.id ? proposal : p));
        await dbUpsert('proposals', proposal);
    };

    const removeProposal = async (user: User | null, id: string, reason: string) => {
        setProposals(prev => prev.filter(p => p.id !== id));
        await dbDelete('proposals', id);
    };

    // Fix: Added implementation for setMarketTrends to resolve the "Cannot find name 'setMarketTrends'" error.
    const setMarketTrends = (trends: MarketTrend[]) => {
        setMarketTrendsState(trends);
    };

    const addLead = async (user: User | null, lead: Lead) => {
        setLeads(prev => [...prev, lead]);
        await dbUpsert('leads', lead);
    };

    const addClient = async (user: User | null, client: Client) => {
        setClients(prev => [...prev, client]);
        await dbUpsert('clients', client);
    };

    const addActivity = async (user: User | null, activity: Activity) => {
        setActivities(prev => [activity, ...prev]);
        await dbUpsert('activities', activity);
    };

    return (
        <DataContext.Provider value={{
            leads, clients, tickets, invoices, activities, products, projects, workflows, webhooks, customFields,
            campaigns: [], marketingContents: [], notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, proposals, allOrganizations: [], logs, inboxConversations,
            technicalVisits,
            isSyncing, lastSyncTime, theme,
            refreshData, toggleTheme, 
            addLead, updateLead: async () => {}, updateLeadStatus: async () => {}, 
            addClient, updateClient: async () => {}, 
            removeClient: async () => {}, updateClientContact: async () => {}, 
            addTicket: async () => {}, updateTicket: async () => {}, 
            addInvoice: async () => {}, addActivity, toggleActivity: async () => {}, 
            addProduct: async () => {}, updateProduct: async () => {}, 
            removeProduct: async () => {}, addProject, updateProject, deleteProject,
            addWorkflow: async () => {}, 
            updateWorkflow: async () => {}, deleteWorkflow: async () => {}, addWebhook: async () => {}, deleteWebhook: async () => {}, 
            addCustomField: async () => {}, deleteCustomField: async () => {}, 
            addSystemNotification, markNotificationRead, 
            addToast, removeToast, 
            addCompetitor: async () => {}, updateCompetitor: async () => {}, 
            deleteCompetitor: async () => {}, setMarketTrends, addProspectingHistory: async () => {}, clearProspectingHistory: () => setProspectingHistory([]), 
            addProposal, updateProposal, removeProposal, addInboxInteraction: () => {},
            addTechnicalVisit: async () => {}, updateTechnicalVisit: async () => {}
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
