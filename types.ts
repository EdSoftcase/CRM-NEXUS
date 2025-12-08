
export type Role = 'admin' | 'executive' | 'sales' | 'support' | 'dev' | 'finance' | 'client';

export enum LeadStatus {
  NEW = 'Novo',
  QUALIFIED = 'Qualificado',
  PROPOSAL = 'Proposta',
  NEGOTIATION = 'Negociação',
  CLOSED_WON = 'Ganho',
  CLOSED_LOST = 'Perdido'
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
  plan: 'Trial' | 'Standard' | 'Enterprise';
  licenseExpiresAt?: string;
  subscription_status?: 'active' | 'blocked' | 'trial' | 'expired';
}

export interface PortalSettings {
  organizationId: string;
  portalName: string;
  logoUrl?: string;
  primaryColor: string;
  welcomeMessage?: string;
  allowInvoiceDownload: boolean;
  allowTicketCreation: boolean;
}

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email?: string;
  cpf?: string;
  phone?: string;
  password?: string;
  organizationId?: string;
  relatedClientId?: string;
  xp?: number;
  level?: number;
  active?: boolean; // New field for user status
}

export interface Note {
  id: string;
  text: string;
  author: string;
  created_at: string;
}

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    sku: string;
    category: 'Service' | 'Product' | 'Subscription';
    active: boolean;
    organizationId?: string;
}

export interface ClientDocument {
    id: string;
    clientId: string;
    title: string;
    type: 'Contract' | 'Proposal' | 'NDA' | 'Image' | 'Other';
    url: string;
    uploadedBy: string;
    uploadDate: string;
    size: string;
}

export type CustomFieldType = 'text' | 'number' | 'date' | 'select' | 'boolean';

export interface CustomFieldDefinition {
    id: string;
    label: string;
    key: string;
    type: CustomFieldType;
    module: 'leads' | 'clients';
    options?: string[];
    required?: boolean;
    organizationId?: string;
}

export interface Lead {
  id: string;
  name: string;
  company: string;
  email: string;
  value: number;
  status: LeadStatus;
  source: string;
  probability: number;
  createdAt: string;
  lastContact: string;
  organizationId?: string;
  phone?: string;
  cep?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  parkingSpots?: number; 
  productInterest?: string; 
  techStack?: string[];
  estimatedRevenue?: string;
  competitors?: string[];
  description?: string;
  metadata?: Record<string, any>;
}

export interface PotentialLead {
    id: string;
    companyName: string;
    industry: string;
    location: string;
    matchScore: number;
    reason: string;
    suggestedApproach: string;
    estimatedSize: string;
    email?: string;
    phone?: string;
}

export interface ProspectingHistoryItem {
    id: string;
    timestamp: string;
    industry: string;
    location: string;
    keywords?: string;
    results: PotentialLead[];
}

export interface Competitor {
    id: string;
    name: string;
    website: string;
    sector: string;
    lastAnalysis?: string;
    swot?: {
        strengths: string[];
        weaknesses: string[];
        opportunities: string[];
        threats: string[];
    };
    battlecard?: {
        killPoints: string[];
        defensePoints: string[];
        pricing?: string;
    };
    organizationId?: string;
}

export interface MarketTrend {
    id: string;
    title: string;
    description: string;
    impact: 'High' | 'Medium' | 'Low';
    sentiment: 'Positive' | 'Negative' | 'Neutral';
    date: string;
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
  nps?: number;
  healthScore?: number;
  onboardingStatus?: 'Pending' | 'In Progress' | 'Completed';
  lastContact?: string;
  organizationId?: string;
  contractedProducts?: string[];
  cep?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  productInterest?: string;
  contractId?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  unit?: string;
  parkingSpots?: number;
  exemptSpots?: number;
  vehicleCount?: number;
  credentialCount?: number;
  pricingTable?: string;
  tablePrice?: number;
  totalTablePrice?: number;
  specialDay?: string;
  specialPrice?: number;
  totalSpecialPrice?: number;
  metadata?: Record<string, any>;
}

export interface TicketResponse {
  id: string;
  text: string;
  author: string;
  role: 'agent' | 'client';
  date: string;
}

export interface Ticket {
  id: string;
  subject: string;
  customer: string; 
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  resolvedAt?: string;
  description: string;
  channel: 'Email' | 'Chat' | 'Phone';
  organizationId?: string;
  responses?: TicketResponse[];
}

export interface Issue {
  id: string;
  title: string;
  type: 'Bug' | 'Feature' | 'Task';
  status: 'Backlog' | 'To Do' | 'In Progress' | 'Review' | 'Done';
  points: number;
  assignee: string;
  sprint: string;
  project: string;
  progress: number;
  notes: Note[];
  organizationId?: string;
}

export interface Invoice {
  id: string;
  customer: string; 
  amount: number;
  dueDate: string;
  status: InvoiceStatus;
  description: string;
  organizationId?: string;
}

export interface Proposal {
  id: string;
  title: string;
  leadId?: string; 
  clientName: string;
  companyName: string;
  createdDate: string;
  validUntil: string;
  status: ProposalStatus;
  introduction: string;
  scope: string[];
  price: number;
  timeline: string;
  terms: string;
  organizationId?: string;
  signature?: string;
  signedAt?: string;
  signedByIp?: string;
}

export interface Activity {
  id: string;
  title: string;
  type: 'Call' | 'Meeting' | 'Email' | 'Task';
  dueDate: string;
  completed: boolean;
  relatedTo: string; 
  assignee: string;
  organizationId?: string;
  description?: string;
  metadata?: any;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  module: string;
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
    status: 'Planned' | 'Active' | 'Completed' | 'Paused';
    channel: 'LinkedIn' | 'Instagram' | 'Email' | 'Google Ads' | 'Meta Ads';
    budget: number;
    spend: number;
    leadsGenerated: number;
    salesGenerated: number;
    startDate: string;
    endDate: string;
    organizationId?: string;
}

export interface MarketingContent {
    id: string;
    title: string;
    content: string;
    channel: 'LinkedIn' | 'Instagram' | 'Email' | 'Blog';
    status: 'Draft' | 'Scheduled' | 'Published';
    tone: string;
    createdAt: string;
    organizationId?: string;
}

export type TriggerType = 'lead_created' | 'deal_won' | 'deal_lost' | 'ticket_created' | 'client_churn_risk';
export type ActionType = 'send_email' | 'create_task' | 'notify_slack' | 'update_field';

export interface WorkflowAction {
    id: string;
    type: ActionType;
    config: {
        target?: string;
        template?: string;
        field?: string;
        value?: string;
    };
}

export interface WorkflowLog {
    id: string;
    workflowId: string;
    timestamp: string;
    status: 'success' | 'failed';
    details: string;
}

export interface Workflow {
    id: string;
    name: string;
    active: boolean;
    trigger: TriggerType;
    actions: WorkflowAction[];
    runs: number;
    lastRun?: string;
    logs?: WorkflowLog[];
    organizationId?: string;
}

export interface WebhookConfig {
    id: string;
    name: string;
    url: string;
    triggerEvent: TriggerType;
    method: 'POST' | 'GET';
    active: boolean;
    headers?: Record<string, string>;
    organizationId?: string;
}

export interface InboxConversation {
    id: string;
    contactName: string;
    contactIdentifier: string;
    type: 'WhatsApp' | 'Email' | 'Ticket';
    lastMessage: string;
    lastMessageAt: string;
    unreadCount: number;
    status: 'Open' | 'Closed' | 'Archived';
    messages: InboxMessage[];
    relatedEntityId?: string;
}

export interface InboxMessage {
    id: string;
    text: string;
    sender: 'user' | 'agent' | 'system';
    timestamp: string;
    attachmentUrl?: string;
}

export interface ProjectTask {
    id: string;
    title: string;
    status: 'Pending' | 'In Progress' | 'Done';
    dueDate?: string;
    assignee?: string;
}

export interface ProjectNote {
    id: string;
    text: string;
    author: string;
    timestamp: string;
    stage: string;
}

export interface Project {
    id: string;
    title: string;
    clientName: string;
    status: 'Planning' | 'Execution' | 'Review' | 'Completed';
    progress: number;
    startDate: string;
    deadline: string;
    manager: string;
    tasks: ProjectTask[];
    organizationId?: string;
    description?: string;
    installAddress?: string;
    photos?: string[];
    notes?: ProjectNote[];
    archived?: boolean; // New: Archived status
    completedAt?: string; // New: Completion date
}

export interface KPIMetric {
  label: string;
  value: string;
  trend: number;
  trendLabel: string;
  color: 'blue' | 'green' | 'red' | 'yellow';
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
