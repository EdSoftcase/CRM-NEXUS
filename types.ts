
export type Role = 'admin' | 'executive' | 'sales' | 'support' | 'dev' | 'finance' | 'client';

export enum LeadStatus {
  NEW = 'Novo',
  QUALIFIED = 'Qualificado',
  PROPOSAL = 'Proposta',
  NEGOTIATION = 'Negociação',
  CLOSED_WON = 'Ganho',
  CLOSED_LOST = 'Perdido',
  CANCELLED = 'Cancelado'
}

export enum TicketPriority {
  LOW = 'Baixa',
  MEDIUM = 'Média',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export enum TicketStatus {
  OPEN = 'Aberto',
  IN_PROGRESS = 'Em Andamento',
  RESOLVED = 'Resolvido',
  CLOSED = 'Fechado'
}

export enum InvoiceStatus {
  DRAFT = 'Rascunho',
  PENDING = 'Pendente',
  SENT = 'Enviado',
  PAID = 'Pago',
  OVERDUE = 'Atrasado',
  CANCELLED = 'Cancelado'
}

export type ProposalStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  groupName?: string;
  status?: 'pending' | 'active' | 'suspended'; 
  plan: 'Trial' | 'Standard' | 'Enterprise';
  subscription_status?: string;
  licenseExpiresAt?: string;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email?: string;
  organizationId?: string;
  isGroupManager?: boolean;
  managedGroupName?: string;
  groupId?: string; 
  active?: boolean;
  relatedClientId?: string;
  xp?: number;
  level?: number;
}

export interface Client {
  id: string;
  name: string; 
  contactPerson: string;
  document?: string;
  email: string;
  phone: string;
  segment: string;
  since: string;
  status: 'Active' | 'Churn Risk' | 'Inactive';
  ltv: number;
  healthScore?: number;
  organizationId?: string;
  groupName?: string;
  groupId?: string; 
  contractedProducts?: string[];
  unit?: string;
  lastContact?: string;
  address?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  contractEndDate?: string;
  onboardingStatus?: string;
  nps?: number;
  totalSpecialPrice?: number;
  portalEmail?: string;
  portalPassword?: string;
}

export interface ProposalItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    discount?: number;
    category: 'Product' | 'Service' | 'Subscription';
}

export interface Proposal {
  id: string;
  title: string;
  clientEmail?: string; 
  clientName: string;
  companyName: string;
  createdDate: string;
  validUntil: string;
  status: ProposalStatus;
  price: number; 
  monthlyCost?: number; 
  organizationId?: string;
  unit?: string;
  leadId?: string;
  clientId?: string;
  setupCost?: number;
  includesDevelopment?: boolean;
  introduction?: string;
  scope?: string[];
  timeline?: string;
  terms?: string;
  items?: ProposalItem[];
  customClause?: string;
  signature?: string;
  signedAt?: string;
  signedByIp?: string;
  consultantName?: string;
  consultantEmail?: string;
  consultantPhone?: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: 'Service' | 'Product' | 'Subscription';
    active: boolean;
    organizationId?: string;
    sku?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  value: number;
  status: LeadStatus;
  createdAt: string;
  organizationId?: string;
  phone?: string;
  source?: string;
  probability?: number;
  lastContact?: string;
  lostReason?: string;
  address?: string;
  productInterest?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  cep?: string;
}

export interface TicketResponse {
    id: string;
    text: string;
    author: string;
    role: 'client' | 'agent';
    date: string;
}

export interface Ticket {
  id: string;
  subject: string;
  customer: string; 
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  description?: string;
  responses?: TicketResponse[];
  organizationId?: string;
  channel?: string;
  resolvedAt?: string;
}

export interface Invoice {
  id: string;
  customer: string;
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  organizationId?: string;
  metadata?: any;
  type?: 'Income' | 'Expense';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  action: string;
  details: string;
  module: string;
  userId?: string;
  organizationId?: string;
}

export interface SystemNotification {
    id: string;
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success' | 'alert';
    timestamp: string;
    read: boolean;
    relatedTo?: string;
    organizationId?: string;
}

export interface ToastMessage {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
}

export interface Campaign {
    id: string;
    name: string;
    status: string;
    channel: string;
    budget: number;
    spend: number;
    organizationId?: string;
    leadsGenerated?: number;
    salesGenerated?: number;
    startDate?: string;
    endDate?: string;
}

export interface MarketingContent {
    id: string;
    title: string;
    content: string;
    channel: string;
    createdAt: string;
    tone: string;
    status?: string;
    organizationId?: string;
}

export type TriggerType = 'lead_created' | 'lead_qualified' | 'deal_won' | 'deal_lost' | 'ticket_created' | 'client_churn_risk' | 'project_stagnated';
export type ActionType = 'create_task' | 'send_email' | 'notify_slack' | 'update_field';

export interface WorkflowAction {
    id: string;
    type: ActionType;
    config: any;
}

export interface Workflow {
    id: string;
    name: string;
    active: boolean;
    trigger: TriggerType;
    actions: WorkflowAction[];
    runs: number;
    organizationId?: string;
    lastRun?: string;
}

export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    active: boolean;
    triggerEvent: string;
    method: 'POST' | 'GET';
    headers?: any;
}

export interface InboxMessage {
    id: string;
    text: string;
    sender: 'user' | 'agent' | 'system';
    timestamp: string;
}

export interface InboxConversation {
    id: string;
    contactName: string;
    contactIdentifier?: string;
    type: string;
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    messages: InboxMessage[];
    status?: string;
}

export interface ProjectTask {
    id: string;
    title: string;
    status: 'Pending' | 'Done';
}

export interface ProjectNote {
    id: string;
    text: string;
    author: string;
    created_at: string;
}

export interface Project {
    id: string;
    title: string;
    clientName: string;
    status: string;
    progress: number;
    startDate: string;
    deadline: string;
    archived?: boolean;
    completedAt?: string;
    products?: string[];
    manager?: string;
    description?: string;
    tasks: ProjectTask[];
    organizationId?: string;
    installAddress?: string;
    statusUpdatedAt?: string;
}

export interface IssueNote {
    id: string;
    text: string;
    author: string;
    created_at: string;
}

export interface Issue {
    id: string;
    title: string;
    project: string;
    type: 'Bug' | 'Feature' | 'Task';
    status: 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
    progress: number;
    assignee: string;
    points: number;
    notes: IssueNote[];
}

export interface PortalSettings {
  organizationId: string;
  portalName: string;
  primaryColor: string;
  allowInvoiceDownload: boolean;
  allowTicketCreation: boolean;
}

export interface CustomFieldDefinition {
    id: string;
    label: string;
    key: string;
    type: string;
    module: 'leads' | 'clients';
    options?: string[];
    required?: boolean;
}

export interface Competitor {
    id: string;
    name: string;
    website: string;
    sector: string;
    swot?: any;
    battlecard?: any;
    lastAnalysis?: string;
    organizationId?: string;
}

export interface MarketTrend {
    id: string;
    title: string;
    description: string;
    sentiment: string;
    impact: string;
}

export interface PotentialLead {
    id: string;
    companyName: string;
    industry: string;
    location: string;
    matchScore: number;
    reason: string;
    suggestedApproach: string;
    email?: string;
    phone?: string;
}

export interface ProspectingHistoryItem {
    id: string;
    timestamp: string;
    industry: string;
    location: string;
    results: PotentialLead[];
    keywords?: string;
    organizationId?: string;
}

export interface FinancialCategory {
    id: string;
    name: string;
    type: 'Revenue' | 'Expense';
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete';

export interface PermissionMatrix {
  [role: string]: {
    [module: string]: {
      view: boolean;
      create: boolean;
      edit: boolean;
      delete: boolean;
    }
  }
}

export interface Activity {
    id: string;
    title: string;
    type: string;
    dueDate: string;
    completed: boolean;
    relatedTo: string;
    assignee: string;
    description?: string;
    metadata?: any;
}

export interface ClientDocument {
    id: string;
    clientId: string;
    title: string;
    url: string;
    type: string;
    createdAt: string;
}
