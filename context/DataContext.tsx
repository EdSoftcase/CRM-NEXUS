
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { 
    Lead, Client, Ticket, Invoice, Product, Project, 
    Workflow, AuditLog, SystemNotification, ToastMessage, Competitor, MarketTrend, 
    ProspectingHistoryItem, CustomFieldDefinition, WebhookConfig, InboxConversation,
    User, LeadStatus, InvoiceStatus, TicketStatus, Proposal, Organization,
    Activity, TriggerType
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
        return newItem;
    }).filter(Boolean);
};

const mapToDb = (data: any, table: string) => {
    const p = { ...data };
    const payload: any = {
        id: p.id,
        organization_id: p.organizationId || MASTER_ORG_ID
    };

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
        if (p.completedAt) payload.completed_at = p.completedAt;
        if (p.unit) payload.unit = p.unit;
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
    const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
    
    const processedProposalsRef = useRef<Set<string>>(new Set());

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

    const addProject = async (user: User | null, project: Project) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(project, 'projects');
            const { error } = await sb.from('projects').insert(payload);
            if (error) throw error;
            setProjects(prev => [...prev, project]);
        }
    };

    const updateProject = async (user: User | null, project: Project) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(project, 'projects');
            const { error } = await sb.from('projects').upsert(payload);
            if (error) throw error;
            setProjects(prev => prev.map(p => p.id === project.id ? project : p));
        }
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

            if (isClient && myClientIds.length > 0) {
                const idFilter = `client_id.in.(${myClientIds.map(id => `"${id}"`).join(',')})`;
                const groupFilter = groupName ? `,group_name.eq."${groupName}"` : '';
                invoiceQuery = invoiceQuery.or(`${idFilter}${groupFilter}`);
                proposalQuery = proposalQuery.or(`${idFilter}${groupFilter}`);
                const nameFilter = `customer.in.(${myClients.map(c => `"${c.name}"`).join(',')})`;
                ticketQuery = ticketQuery.or(nameFilter);
            }

            const results = await Promise.allSettled([
                sb.from('leads').select('*').or(`organization_id.eq.${userOrgId},organization_id.is.null`),
                invoiceQuery,
                ticketQuery,
                sb.from('activities').select('*').eq('organization_id', userOrgId),
                projectQuery,
                sb.from('products').select('*').or(`organization_id.eq.${MASTER_ORG_ID},organization_id.is.null`),
                proposalQuery,
                sb.from('audit_logs').select('*').eq('organization_id', userOrgId).limit(50),
                sb.from('prospecting_history').select('*').eq('organization_id', userOrgId),
                sb.from('competitors').select('*').eq('organization_id', userOrgId),
                sb.from('market_trends').select('*').eq('organization_id', userOrgId)
            ]);

            const getData = (index: number) => {
                const res = results[index];
                if (res && res.status === 'fulfilled') {
                  const data = (res.value as any).data;
                  return mapToApp(Array.isArray(data) ? data : []);
                }
                return [];
            };

            const fetchedLeads = getData(0);
            const fetchedInvoices = getData(1);
            const fetchedTickets = getData(2);
            const fetchedActivities = getData(3);
            const fetchedProjects = getData(4);
            const fetchedProducts = getData(5);
            const fetchedProposals = getData(6);

            // --- RECONCILIAÇÃO AUTOMÁTICA COM REGRA DE SLA (45 DIAS APÓS ASSINATURA) ---
            if (currentUser.role !== 'client') {
                const acceptedProposals = fetchedProposals.filter(p => p.status === 'Accepted');
                
                const existingProjectRefIds = new Set(fetchedProjects.map(p => {
                    const match = p.description?.match(/Referência: (PC-\d+)/);
                    if (match) return match[1];
                    const idMatch = p.id?.match(/PROJ-(PC-\d+)/);
                    if (idMatch) return idMatch[1];
                    return null;
                }).filter(Boolean));

                for (const prop of acceptedProposals) {
                    if (!existingProjectRefIds.has(prop.id) && !processedProposalsRef.current.has(prop.id)) {
                        processedProposalsRef.current.add(prop.id);

                        const scopeItems = prop.scope && prop.scope.length > 0 
                            ? prop.scope 
                            : ["Instalação de Equipamentos", "Configuração de Software LPR", "Treinamento Operacional"];

                        // SLA: 45 dias cravados a partir de signedAt
                        const signatureDate = prop.signedAt ? new Date(prop.signedAt) : new Date();
                        const deadlineDate = new Date(signatureDate);
                        deadlineDate.setDate(signatureDate.getDate() + 45);

                        const newProj: Project = {
                            id: `PROJ-${prop.id}`, 
                            title: `${prop.title} (Ref: ${prop.id})`,
                            clientName: prop.companyName,
                            status: 'Kitting', 
                            progress: 20,      
                            startDate: signatureDate.toISOString(), 
                            deadline: deadlineDate.toISOString(),    
                            manager: 'Automático (Provisionamento SLA)',
                            description: `Projeto gerado automaticamente. Referência Comercial: ${prop.id}. Aceite Digital em: ${signatureDate.toLocaleDateString()}. Prazo de implantação: 45 dias.`,
                            products: prop.items?.map(item => item.name) || [],
                            tasks: scopeItems.map((s, idx) => ({ 
                                id: `t-${idx}-${Date.now()}`, 
                                title: s, 
                                status: 'Pending' 
                            })),
                            organizationId: prop.organizationId || userOrgId,
                            archived: false,
                            unit: prop.unit
                        };
                        
                        const payload = mapToDb(newProj, 'projects');
                        const { error: insertError } = await sb.from('projects').insert(payload);
                        
                        if (!insertError) {
                            fetchedProjects.push(newProj);
                        }
                    }
                }
            }

            setLeads(fetchedLeads);
            setInvoices(fetchedInvoices);
            setTickets(fetchedTickets);
            setActivities(fetchedActivities);
            setProjects(fetchedProjects);
            setProducts(fetchedProducts);
            setProposals(fetchedProposals);
            setLogs(getData(7));
            setProspectingHistory(getData(8));
            setCompetitors(getData(9));
            setMarketTrends(getData(10));
            setClients(myClients);
            setLastSyncTime(new Date());
        } catch (e: any) { 
            console.error("Refresh Data Error:", e); 
        } finally { 
            setIsSyncing(false); 
        }
    }, [currentUser]);

    useEffect(() => { if (currentUser) refreshData(); }, [currentUser, refreshData]);

    const addProduct = async (user: User | null, product: Product) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(product, 'products');
            const { error } = await sb.from('products').insert(payload);
            if (error) throw error;
            setProducts(prev => [...prev, product]);
        }
    };

    const updateProduct = async (user: User | null, product: Product) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(product, 'products');
            const { error } = await sb.from('products').upsert(payload);
            if (error) throw error;
            setProducts(prev => prev.map(p => p.id === product.id ? product : p));
        }
    };

    const removeProduct = async (user: User | null, productId: string, reason?: string) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('products').delete().eq('id', productId);
            if (error) throw error;
            setProducts(prev => prev.filter(p => p.id !== productId));
        }
    };

    const addProposal = async (user: User | null, proposal: Proposal) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(proposal, 'proposals');
            const { error } = await sb.from('proposals').insert(payload);
            if (error) throw error;
            setProposals(prev => [...prev, proposal]);
        }
    };

    const updateProposal = async (user: User | null, proposal: Proposal) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(proposal, 'proposals');
            const { error } = await sb.from('proposals').upsert(payload);
            if (error) throw error;
            setProposals(prev => prev.map(p => p.id === proposal.id ? proposal : p));
        }
    };

    const addLead = async (user: User | null, lead: Lead) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(lead, 'leads');
            const { error } = await sb.from('leads').insert(payload);
            if (error) throw error;
            setLeads(prev => [...prev, lead]);
        }
    };

    const updateLead = async (user: User | null, lead: Lead) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(lead, 'leads');
            const { error } = await sb.from('leads').upsert(payload);
            if (error) throw error;
            setLeads(prev => prev.map(l => l.id === lead.id ? lead : l));
        }
    };

    const updateLeadStatus = async (user: User | null, leadId: string, status: LeadStatus) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('leads').update({ status }).eq('id', leadId);
            if (error) throw error;
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status } : l));
        }
    };

    const addClient = async (user: User | null, client: Client) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(client, 'clients');
            const { error } = await sb.from('clients').insert(payload);
            if (error) throw error;
            setClients(prev => [...prev, client]);
        }
    };

    const updateClient = async (user: User | null, client: Client) => {
        const sb = getSupabase();
        if (sb) {
            const payload = mapToDb(client, 'clients');
            const { error } = await sb.from('clients').upsert(payload);
            if (error) throw error;
            setClients(prev => prev.map(c => c.id === client.id ? client : c));
        }
    };

    const updateClientContact = async (client: Client, activity?: Activity) => {
        const sb = getSupabase();
        if (sb) {
            const updatedClient = { ...client, lastContact: new Date().toISOString() };
            const payload = mapToDb(updatedClient, 'clients');
            await sb.from('clients').upsert(payload);
            setClients(prev => prev.map(c => c.id === client.id ? updatedClient : c));
            if (activity) {
                await sb.from('activities').insert({ ...activity, organization_id: currentUser?.organizationId || MASTER_ORG_ID });
                setActivities(prev => [activity, ...prev]);
            }
        }
    };

    const addActivity = async (user: User | null, activity: Activity) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('activities').insert({ ...activity, organization_id: currentUser?.organizationId || MASTER_ORG_ID });
            if (error) throw error;
            setActivities(prev => [activity, ...prev]);
        }
    };

    const toggleActivity = async (user: User | null, activityId: string) => {
        const sb = getSupabase();
        if (sb) {
            const act = activities.find(a => a.id === activityId);
            if (!act) return;
            const updated = { ...act, completed: !act.completed };
            const { error } = await sb.from('activities').upsert(updated);
            if (error) throw error;
            setActivities(prev => prev.map(a => a.id === activityId ? updated : a));
        }
    };

    const addCompetitor = async (user: User | null, competitor: Competitor) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('competitors').insert(competitor);
            if (error) throw error;
            setCompetitors(prev => [...prev, competitor]);
        }
    };

    const updateCompetitor = async (user: User | null, competitor: Competitor) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('competitors').upsert(competitor);
            if (error) throw error;
            setCompetitors(prev => prev.map(c => c.id === competitor.id ? competitor : c));
        }
    };

    const deleteCompetitor = async (user: User | null, competitorId: string) => {
        const sb = getSupabase();
        if (sb) {
            const { error } = await sb.from('competitors').delete().eq('id', competitorId);
            if (error) throw error;
            setCompetitors(prev => prev.filter(c => c.id !== competitorId));
        }
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
            campaigns: [], marketingContents: [], notifications, toasts, competitors, marketTrends, prospectingHistory,
            disqualifiedProspects, proposals, allOrganizations: [], logs, inboxConversations,
            isSyncing, lastSyncTime, theme,
            refreshData, toggleTheme, 
            addLead, updateLead, updateLeadStatus, addClient, updateClient, 
            removeClient: async () => {}, updateClientContact, addTicket: async () => {}, updateTicket: async () => {}, 
            addInvoice: async () => {}, addActivity, toggleActivity, addProduct, updateProduct, 
            removeProduct, addProject, updateProject, addWorkflow: async () => {}, 
            updateWorkflow: async () => {}, deleteWorkflow: async () => {}, addWebhook: async () => {}, deleteWebhook: async () => {}, 
            addCustomField: async () => {}, deleteCustomField: async () => {}, 
            addSystemNotification, markNotificationRead, 
            addToast, removeToast, 
            addCompetitor, updateCompetitor, 
            deleteCompetitor, setMarketTrends: () => {}, addProspectingHistory: async () => {}, clearProspectingHistory: () => {}, 
            addProposal, updateProposal, removeProposal: async () => {}, addInboxInteraction: () => {}
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
