
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { Lead, Ticket, Issue, Invoice, LeadStatus, InvoiceStatus, Client, Activity, AuditLog, User, Note, Proposal, SystemNotification, Product, ClientDocument, Campaign, MarketingContent, Workflow, PortalSettings, Project, ProjectTask, TriggerType, TicketStatus, ToastMessage, ProspectingHistoryItem, Competitor, MarketTrend, CustomFieldDefinition, WebhookConfig, InboxConversation } from '../types';
import { MOCK_LEADS, MOCK_TICKETS, MOCK_ISSUES, MOCK_INVOICES, MOCK_CLIENTS, MOCK_LOGS, MOCK_PROPOSALS, MOCK_PRODUCTS, MOCK_DOCUMENTS, MOCK_CAMPAIGNS, MOCK_CONTENTS, MOCK_WORKFLOWS, MOCK_PROJECTS, MOCK_COMPETITORS, MOCK_MARKET_TRENDS, MOCK_CUSTOM_FIELDS, MOCK_WEBHOOKS, MOCK_CONVERSATIONS } from '../constants';
import { getSupabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext'; 
import { useActivities } from '../hooks/useActivities'; 
import { useAuditLogs } from '../hooks/useAuditLogs'; 
import { sendEmail } from '../services/emailService';

const DB_VERSION = 'v29-final-fix';

interface DataContextType {
  leads: Lead[];
  tickets: Ticket[];
  issues: Issue[];
  invoices: Invoice[];
  clients: Client[];
  activities: Activity[];
  logs: AuditLog[];
  proposals: Proposal[];
  notifications: SystemNotification[];
  products: Product[];
  clientDocuments: ClientDocument[];
  campaigns: Campaign[];
  marketingContents: MarketingContent[];
  workflows: Workflow[];
  portalSettings: PortalSettings;
  projects: Project[];
  prospectingHistory: ProspectingHistoryItem[];
  disqualifiedProspects: string[];
  competitors: Competitor[];
  marketTrends: MarketTrend[];
  customFields: CustomFieldDefinition[];
  webhooks: WebhookConfig[];
  inboxConversations: InboxConversation[];
  toasts: ToastMessage[];
  showToast: (title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert') => void;
  removeToast: (id: string) => void;
  pushEnabled: boolean;
  togglePushNotifications: () => Promise<void>;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  updateLeadStatus: (user: User, id: string, newStatus: LeadStatus) => void;
  updateInvoiceStatus: (user: User, id: string, newStatus: InvoiceStatus) => void;
  addLead: (user: User, lead: Lead) => void;
  updateLead: (user: User, lead: Lead) => void;
  addClient: (user: User, client: Client) => void;
  addClientsBulk: (user: User, newClients: Client[]) => void;
  updateClient: (user: User, client: Client) => void;
  removeClient: (user: User, clientId: string, justification: string) => void; 
  addTicket: (user: User, ticket: Ticket) => void; 
  updateTicket: (user: User, id: string, updates: Partial<Ticket>) => void;
  updateIssue: (user: User, id: string, updates: Partial<Issue>) => void;
  addIssueNote: (user: User, issueId: string, text: string) => void;
  toggleActivity: (user: User, id: string) => void;
  addActivity: (user: User, activity: Activity) => void;
  updateActivity: (user: User, activity: Activity) => void; 
  addProposal: (user: User, proposal: Proposal) => void;
  updateProposal: (user: User, proposal: Proposal) => void;
  removeProposal: (user: User, id: string, justification: string) => void;
  addProduct: (user: User, product: Product) => void;
  updateProduct: (user: User, product: Product) => void;
  removeProduct: (user: User, id: string, justification: string) => void;
  addClientDocument: (user: User, doc: ClientDocument) => void;
  removeClientDocument: (user: User, id: string) => void;
  addInvoicesBulk: (user: User, newInvoices: Invoice[]) => void;
  addCampaign: (user: User, campaign: Campaign) => void;
  updateCampaign: (user: User, campaign: Campaign) => void;
  addMarketingContent: (user: User, content: MarketingContent) => void;
  updateMarketingContent: (user: User, content: MarketingContent) => void;
  deleteMarketingContent: (user: User, id: string) => void;
  addWorkflow: (user: User, workflow: Workflow) => void;
  updateWorkflow: (user: User, workflow: Workflow) => void;
  deleteWorkflow: (user: User, id: string) => void;
  triggerAutomation: (trigger: TriggerType, payload: any) => Promise<void>;
  updatePortalSettings: (user: User, settings: PortalSettings) => void;
  addProject: (user: User, project: Project) => void;
  updateProject: (user: User, project: Project) => void;
  deleteProject: (user: User, id: string) => void;
  addProspectingHistory: (item: ProspectingHistoryItem) => void;
  clearProspectingHistory: () => void;
  disqualifyProspect: (companyName: string) => void;
  addCompetitor: (user: User, competitor: Competitor) => void;
  updateCompetitor: (user: User, competitor: Competitor) => void;
  deleteCompetitor: (user: User, id: string) => void;
  setMarketTrends: (trends: MarketTrend[]) => void;
  addCustomField: (field: CustomFieldDefinition) => void;
  deleteCustomField: (id: string) => void;
  addWebhook: (webhook: WebhookConfig) => void;
  deleteWebhook: (id: string) => void;
  updateWebhook: (webhook: WebhookConfig) => void;
  addLog: (log: AuditLog) => void;
  addSystemNotification: (title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert', relatedTo?: string) => void;
  markNotificationRead: (id: string) => void;
  restoreDefaults: (type: 'custom_fields' | 'webhooks' | 'workflows') => void;
  isSyncing: boolean; 
  lastSyncTime: Date | null;
  refreshData: () => Promise<void>; 
  syncLocalToCloud: (specificTable?: string) => Promise<void>; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to load initial state safely
const loadInitialState = <T,>(key: string, fallback: T): T => {
  try {
    const saved = localStorage.getItem(`nexus_${key}`);
    if (!saved || saved === "undefined") return fallback;
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length === 0 && Array.isArray(fallback) && fallback.length > 0) {
        return fallback;
    }
    return parsed;
  } catch (e) {
    return fallback;
  }
};

const safeMerge = <T extends { id: string }>(localData: T[], remoteData: T[] | null): T[] => {
    if (!remoteData || remoteData.length === 0) {
        return localData; 
    }
    const mergedMap = new Map<string, T>();
    // Prioritize remote data updates, but keep local optimistically created items
    localData.forEach(item => mergedMap.set(item.id, item));
    remoteData.forEach(item => mergedMap.set(item.id, item));
    return Array.from(mergedMap.values());
};

const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
    organizationId: 'default',
    portalName: 'Portal do Cliente',
    primaryColor: '#4f46e5',
    welcomeMessage: 'Bem-vindo ao seu portal exclusivo.',
    allowInvoiceDownload: true,
    allowTicketCreation: true
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
      return (localStorage.getItem('nexus_theme') as 'light'|'dark') || 'light';
  });

  const [pushEnabled, setPushEnabled] = useState(() => {
      return localStorage.getItem('nexus_push_enabled') === 'true';
  });

  // State initialization with strong fallback logic
  const [leads, setLeads] = useState<Lead[]>(() => loadInitialState('leads', MOCK_LEADS));
  const [tickets, setTickets] = useState<Ticket[]>(() => loadInitialState('tickets', MOCK_TICKETS));
  const [issues, setIssues] = useState<Issue[]>(() => loadInitialState('issues', MOCK_ISSUES));
  const [invoices, setInvoices] = useState<Invoice[]>(() => loadInitialState('invoices', MOCK_INVOICES));
  const [clients, setClients] = useState<Client[]>(() => loadInitialState('clients', MOCK_CLIENTS));
  const [logs, setLogs] = useState<AuditLog[]>(() => loadInitialState('logs', MOCK_LOGS));
  const [proposals, setProposals] = useState<Proposal[]>(() => loadInitialState('proposals', MOCK_PROPOSALS));
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => loadInitialState('notifications', []));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [products, setProducts] = useState<Product[]>(() => loadInitialState('products', MOCK_PRODUCTS));
  const [clientDocuments, setClientDocuments] = useState<ClientDocument[]>(() => loadInitialState('client_documents', MOCK_DOCUMENTS));
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => loadInitialState('campaigns', MOCK_CAMPAIGNS));
  const [marketingContents, setMarketingContents] = useState<MarketingContent[]>(() => loadInitialState('marketing_contents', MOCK_CONTENTS));
  const [workflows, setWorkflows] = useState<Workflow[]>(() => loadInitialState('workflows', MOCK_WORKFLOWS));
  const [projects, setProjects] = useState<Project[]>(() => loadInitialState('projects', MOCK_PROJECTS));
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(() => loadInitialState('portal_settings', DEFAULT_PORTAL_SETTINGS));
  const [prospectingHistory, setProspectingHistory] = useState<ProspectingHistoryItem[]>(() => loadInitialState('prospecting_history', []));
  const [disqualifiedProspects, setDisqualifiedProspects] = useState<string[]>(() => loadInitialState('disqualified_prospects', []));
  const [competitors, setCompetitors] = useState<Competitor[]>(() => loadInitialState('competitors', MOCK_COMPETITORS));
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>(() => loadInitialState('market_trends', MOCK_MARKET_TRENDS));
  const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>(() => loadInitialState('custom_fields', MOCK_CUSTOM_FIELDS));
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => loadInitialState('webhooks', MOCK_WEBHOOKS));
  const [inboxConversations, setInboxConversations] = useState<InboxConversation[]>(() => loadInitialState('inbox_conversations', MOCK_CONVERSATIONS));

  const { updateUser, currentOrganization, currentUser } = useAuth();
  const { activities, addActivity: addActivityHook, updateActivity: updateActivityHook } = useActivities();

  useEffect(() => {
      const initApp = async () => {
          localStorage.setItem('nexus_db_version', DB_VERSION);
          await fetchRemoteData();
          setIsInitialized(true);
      };
      initApp();
  }, []);

  // Theme
  useEffect(() => {
      const root = window.document.documentElement;
      if (theme === 'dark') { root.classList.add('dark'); } else { root.classList.remove('dark'); }
      localStorage.setItem('nexus_theme', theme);
  }, [theme]);

  const toggleTheme = () => { setTheme(prev => prev === 'light' ? 'dark' : 'light'); };

  const togglePushNotifications = async () => {
      if (pushEnabled) {
          setPushEnabled(false);
          localStorage.setItem('nexus_push_enabled', 'false');
          showToast('Notificações', 'Notificações Push desativadas.', 'info');
      } else {
          if (!("Notification" in window)) return;
          // Use global Notification object for permissions
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
              setPushEnabled(true);
              localStorage.setItem('nexus_push_enabled', 'true');
          }
      }
  };

  const showToast = useCallback((title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert') => {
      const newToast: ToastMessage = { id: `toast-${Date.now()}`, title, message, type };
      setToasts(prev => [newToast, ...prev]);
  }, []);

  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const dbUpsert = async (table: string, data: any) => {
      const supabase = getSupabase();
      if (!supabase || !navigator.onLine) return; // Only sync if connected
      
      const cleanData = JSON.parse(JSON.stringify(data));
      if (!cleanData.organizationId && currentOrganization?.id) cleanData.organizationId = currentOrganization.id;
      try { await supabase.from(table).upsert(cleanData); } catch(e) { console.warn(`Sync error ${table}`); }
  };

  const dbDelete = async (table: string, id: string) => {
      const supabase = getSupabase();
      if (!supabase || !navigator.onLine) return;
      try { await supabase.from(table).delete().eq('id', id); } catch(e) {}
  };

  const addSystemNotification = useCallback((title: string, message: string, type: 'info' | 'warning' | 'success' | 'alert', relatedTo?: string) => {
      const newNotif: SystemNotification = { id: `NOTIF-${Date.now()}`, title, message, type, timestamp: new Date().toISOString(), read: false, relatedTo, organizationId: currentOrganization?.id };
      setNotifications(prev => [newNotif, ...prev]);
      dbUpsert('notifications', newNotif);
      showToast(title, message, type);
  }, [currentOrganization, showToast]);

  const markNotificationRead = (id: string) => { 
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n)); 
      const notif = notifications.find(n => n.id === id);
      if(notif) dbUpsert('notifications', { ...notif, read: true });
  };

  const fireWebhooks = async (trigger: TriggerType, payload: any) => {
      const activeHooks = webhooks.filter(w => w.active && w.triggerEvent === trigger);
      for (const hook of activeHooks) {
          try {
              await fetch(hook.url, { method: hook.method, headers: { 'Content-Type': 'application/json', ...(hook.headers || {}) }, body: hook.method === 'POST' ? JSON.stringify(payload) : undefined });
          } catch (e) {}
      }
  };

  const triggerAutomation = async (trigger: TriggerType, payload: any) => {
      fireWebhooks(trigger, payload);
      const activeWorkflows = workflows.filter(w => w.active && w.trigger === trigger);
      if (activeWorkflows.length > 0) {
          addSystemNotification('🤖 Nexus Flow', `Executando ${activeWorkflows.length} automação(ões)`, 'info');
      }
  };

  const fetchRemoteData = useCallback(async () => {
      const supabase = getSupabase();
      if (!supabase || !navigator.onLine) { 
          setIsSyncing(false); 
          return; 
      }
      setIsSyncing(true);
      try {
          // Fetch critical tables in parallel
          const [
              leadsRes, 
              clientsRes, 
              productsRes, 
              ticketsRes, 
              fieldsRes, 
              webhooksRes,
              proposalsRes,
              projectsRes
          ] = await Promise.all([
              supabase.from('leads').select('*'),
              supabase.from('clients').select('*'),
              supabase.from('products').select('*'),
              supabase.from('tickets').select('*'),
              supabase.from('custom_fields').select('*'),
              supabase.from('webhooks').select('*'),
              supabase.from('proposals').select('*'),
              supabase.from('projects').select('*')
          ]);

          if (leadsRes.data) setLeads(prev => safeMerge(prev, leadsRes.data as Lead[]));
          if (clientsRes.data) setClients(prev => safeMerge(prev, clientsRes.data as Client[]));
          if (productsRes.data) setProducts(prev => safeMerge(prev, productsRes.data as Product[]));
          if (ticketsRes.data) setTickets(prev => safeMerge(prev, ticketsRes.data as Ticket[]));
          if (fieldsRes.data) setCustomFields(prev => safeMerge(prev, fieldsRes.data as CustomFieldDefinition[]));
          if (webhooksRes.data) setWebhooks(prev => safeMerge(prev, webhooksRes.data as WebhookConfig[]));
          if (proposalsRes.data) setProposals(prev => safeMerge(prev, proposalsRes.data as Proposal[]));
          if (projectsRes.data) setProjects(prev => safeMerge(prev, projectsRes.data as Project[]));

          // Fetch single settings
          const { data: portalData } = await supabase.from('portal_settings').select('*').single();
          if (portalData) setPortalSettings(prev => ({ ...prev, ...portalData }));

          setLastSyncTime(new Date());
      } catch (err) {
          console.error("Sync Error (Using Local Data):", err);
      } finally {
          setIsSyncing(false);
      }
  }, []);

  const syncLocalToCloud = async (specificTable?: string) => {
      console.log("Sync triggered", specificTable);
  };

  const restoreDefaults = (type: 'custom_fields' | 'webhooks' | 'workflows') => {
      if (type === 'custom_fields') {
          setCustomFields(MOCK_CUSTOM_FIELDS);
          localStorage.setItem('nexus_custom_fields', JSON.stringify(MOCK_CUSTOM_FIELDS));
          MOCK_CUSTOM_FIELDS.forEach(f => dbUpsert('custom_fields', f));
      } else if (type === 'webhooks') {
          setWebhooks(MOCK_WEBHOOKS);
          localStorage.setItem('nexus_webhooks', JSON.stringify(MOCK_WEBHOOKS));
          MOCK_WEBHOOKS.forEach(w => dbUpsert('webhooks', w));
      } else if (type === 'workflows') {
          setWorkflows(MOCK_WORKFLOWS);
          localStorage.setItem('nexus_workflows', JSON.stringify(MOCK_WORKFLOWS));
          MOCK_WORKFLOWS.forEach(w => dbUpsert('workflows', w));
      }
      showToast('Sucesso', 'Padrões restaurados.', 'success');
  };

  // Local Storage Sync (Always save local changes)
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_clients', JSON.stringify(clients)); }, [clients, isInitialized]);
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_leads', JSON.stringify(leads)); }, [leads, isInitialized]);
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_products', JSON.stringify(products)); }, [products, isInitialized]);
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_tickets', JSON.stringify(tickets)); }, [tickets, isInitialized]);
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_custom_fields', JSON.stringify(customFields)); }, [customFields, isInitialized]);
  useEffect(() => { if(isInitialized) localStorage.setItem('nexus_webhooks', JSON.stringify(webhooks)); }, [webhooks, isInitialized]);

  // CRUD Stubs
  const addLog = (log: AuditLog) => { setLogs(prev => [log, ...prev]); dbUpsert('audit_logs', log); }
  const addLead = (user: User, lead: Lead) => { setLeads(prev => [...prev, lead]); dbUpsert('leads', lead); triggerAutomation('lead_created', lead); };
  const updateLead = (user: User, lead: Lead) => { setLeads(prev => prev.map(l => l.id === lead.id ? lead : l)); dbUpsert('leads', lead); };
  const updateLeadStatus = (user: User, id: string, newStatus: LeadStatus) => { setLeads(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l)); };
  const updateInvoiceStatus = (user: User, id: string, newStatus: InvoiceStatus) => { setInvoices(prev => prev.map(i => i.id === id ? { ...i, status: newStatus } : i)); };
  const addClient = (user: User, client: Client) => { setClients(prev => [...prev, client]); dbUpsert('clients', client); };
  const updateClient = (user: User, client: Client) => { setClients(prev => prev.map(c => c.id === client.id ? client : c)); dbUpsert('clients', client); };
  const removeClient = (user: User, id: string) => { setClients(prev => prev.filter(c => c.id !== id)); dbDelete('clients', id); };
  const addClientsBulk = (user: User, newClients: Client[]) => { setClients(prev => [...prev, ...newClients]); newClients.forEach(c => dbUpsert('clients', c)); };
  const addInvoicesBulk = (user: User, newInvoices: Invoice[]) => { setInvoices(prev => [...prev, ...newInvoices]); newInvoices.forEach(i => dbUpsert('invoices', i)); };
  const addTicket = (user: User, ticket: Ticket) => { setTickets(prev => [...prev, ticket]); dbUpsert('tickets', ticket); triggerAutomation('ticket_created', ticket); };
  const updateTicket = (user: User, id: string, updates: Partial<Ticket>) => { setTickets(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t)); };
  const updateIssue = (user: User, id: string, updates: Partial<Issue>) => { setIssues(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i)); };
  const addIssueNote = (user: User, issueId: string, text: string) => { /* ... */ };
  const toggleActivity = (user: User, id: string) => { const act = activities.find(a => a.id === id); if(act) updateActivityHook({...act, completed: !act.completed}); };
  const addActivity = (user: User, activity: Activity) => { addActivityHook(activity); };
  const updateActivity = (user: User, activity: Activity) => { updateActivityHook(activity); };
  const addProposal = (user: User, p: Proposal) => { setProposals(prev => [...prev, p]); dbUpsert('proposals', p); };
  const updateProposal = (user: User, p: Proposal) => { setProposals(prev => prev.map(prop => prop.id === p.id ? p : prop)); dbUpsert('proposals', p); };
  const removeProposal = (user: User, id: string) => { setProposals(prev => prev.filter(p => p.id !== id)); dbDelete('proposals', id); };
  const addProduct = (user: User, p: Product) => { setProducts(prev => [...prev, p]); dbUpsert('products', p); };
  const updateProduct = (user: User, p: Product) => { setProducts(prev => prev.map(prod => prod.id === p.id ? p : prod)); dbUpsert('products', p); };
  const removeProduct = (user: User, id: string) => { setProducts(prev => prev.filter(p => p.id !== id)); dbDelete('products', id); };
  const addClientDocument = (user: User, d: ClientDocument) => { setClientDocuments(prev => [...prev, d]); dbUpsert('client_documents', d); };
  const removeClientDocument = (user: User, id: string) => { setClientDocuments(prev => prev.filter(d => d.id !== id)); dbDelete('client_documents', id); };
  const addCampaign = (user: User, c: Campaign) => { setCampaigns(prev => [...prev, c]); dbUpsert('campaigns', c); };
  const updateCampaign = (user: User, c: Campaign) => { setCampaigns(prev => prev.map(camp => camp.id === c.id ? c : camp)); dbUpsert('campaigns', c); };
  const addMarketingContent = (user: User, c: MarketingContent) => { setMarketingContents(prev => [...prev, c]); dbUpsert('marketing_contents', c); };
  const updateMarketingContent = (user: User, c: MarketingContent) => { setMarketingContents(prev => prev.map(content => content.id === c.id ? c : content)); dbUpsert('marketing_contents', c); };
  const deleteMarketingContent = (user: User, id: string) => { setMarketingContents(prev => prev.filter(c => c.id !== id)); dbDelete('marketing_contents', id); };
  const addWorkflow = (user: User, w: Workflow) => { setWorkflows(prev => [...prev, w]); dbUpsert('workflows', w); };
  const updateWorkflow = (user: User, w: Workflow) => { setWorkflows(prev => prev.map(wf => wf.id === w.id ? w : wf)); dbUpsert('workflows', w); };
  const deleteWorkflow = (user: User, id: string) => { setWorkflows(prev => prev.filter(w => w.id !== id)); dbDelete('workflows', id); };
  const updatePortalSettings = (user: User, s: PortalSettings) => { setPortalSettings(s); dbUpsert('portal_settings', s); };
  const addProject = (user: User, p: Project) => { setProjects(prev => [...prev, p]); dbUpsert('projects', p); };
  const updateProject = (user: User, p: Project) => { setProjects(prev => prev.map(proj => proj.id === p.id ? p : proj)); dbUpsert('projects', p); };
  const deleteProject = (user: User, id: string) => { setProjects(prev => prev.filter(p => p.id !== id)); dbDelete('projects', id); };
  const addProspectingHistory = (i: ProspectingHistoryItem) => { setProspectingHistory(prev => [i, ...prev]); dbUpsert('prospecting_history', i); };
  const clearProspectingHistory = () => { setProspectingHistory([]); };
  const disqualifyProspect = (c: string) => { setDisqualifiedProspects(prev => [...prev, c]); };
  const addCompetitor = (user: User, c: Competitor) => { setCompetitors(prev => [...prev, c]); dbUpsert('competitors', c); };
  const updateCompetitor = (user: User, c: Competitor) => { setCompetitors(prev => prev.map(comp => comp.id === c.id ? c : comp)); dbUpsert('competitors', c); };
  const deleteCompetitor = (user: User, id: string) => { setCompetitors(prev => prev.filter(c => c.id !== id)); dbDelete('competitors', id); };
  const setMarketTrendsList = (t: MarketTrend[]) => { setMarketTrends(t); };

  const addCustomField = (f: CustomFieldDefinition) => { setCustomFields(prev => [...prev, f]); dbUpsert('custom_fields', f); };
  const deleteCustomField = (id: string) => { setCustomFields(prev => prev.filter(f => f.id !== id)); dbDelete('custom_fields', id); };
  const addWebhook = (w: WebhookConfig) => { setWebhooks(prev => [...prev, w]); dbUpsert('webhooks', w); };
  const deleteWebhook = (id: string) => { setWebhooks(prev => prev.filter(w => w.id !== id)); dbDelete('webhooks', id); };
  const updateWebhook = (w: WebhookConfig) => { setWebhooks(prev => prev.map(hook => hook.id === w.id ? w : hook)); dbUpsert('webhooks', w); };

  return (
    <DataContext.Provider value={{ 
      leads, tickets, issues, invoices, clients, activities, logs, proposals, notifications, products, clientDocuments, campaigns, marketingContents, workflows, portalSettings, projects, prospectingHistory, disqualifiedProspects, competitors, marketTrends,
      customFields, webhooks, inboxConversations,
      toasts, showToast, removeToast,
      pushEnabled, togglePushNotifications,
      theme, toggleTheme,
      updateLeadStatus, updateInvoiceStatus, addLead, updateLead, addClient, addClientsBulk, updateClient, removeClient, addTicket, updateTicket, updateIssue, addIssueNote, toggleActivity, addActivity, updateActivity,
      addProposal, updateProposal, removeProposal, addProduct, updateProduct, removeProduct, addClientDocument, removeClientDocument, addLog, addSystemNotification, markNotificationRead,
      addCampaign, updateCampaign, addMarketingContent, updateMarketingContent, deleteMarketingContent,
      addWorkflow, updateWorkflow, deleteWorkflow, triggerAutomation,
      updatePortalSettings,
      addProject, updateProject, deleteProject,
      addInvoicesBulk,
      addProspectingHistory, clearProspectingHistory, disqualifyProspect,
      addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends: setMarketTrendsList,
      addCustomField, deleteCustomField,
      addWebhook, deleteWebhook, updateWebhook,
      isSyncing, refreshData: fetchRemoteData, syncLocalToCloud, lastSyncTime,
      restoreDefaults
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
