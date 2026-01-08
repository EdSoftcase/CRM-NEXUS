# SOFT-CRM Enterprise - Documento de Arquitetura de Software

## 1. Visão Geral do Sistema
O **SOFT-CRM Enterprise** é uma aplicação web do tipo SPA (Single Page Application) projetada para gestão corporativa (ERP/CRM). A arquitetura prioriza a experiência do usuário com navegação instantânea (State-based Routing) e funcionamento **Offline-First**, utilizando sincronização robusta com a nuvem e capacidades avançadas de IA Generativa.

---

## 2. Stack Tecnológico

### 2.1. Frontend (Client-Side)
*   **Core:** React 18 (TypeScript 5.4).
*   **Build & Tooling:** Vite (ESBuild).
*   **Estilização:** Tailwind CSS v3 (Suporte nativo a Dark Mode).
*   **Gerenciamento de Estado:**
    *   **Context API:** Utilizado para estados globais da aplicação (`AuthContext` para sessão/permissões, `DataContext` para entidades de negócio).
    *   **TanStack Query (React Query):** Utilizado para data fetching, caching e estados assíncronos (`useLeads`, `useActivities`).
*   **Persistência:** `localStorage` atua como Cache L1, permitindo persistência de sessão e dados críticos offline.
*   **UI Components:** Lucide React (Ícones), Recharts (Dashboards), Leaflet (Mapas).

### 2.2. Backend & Cloud (BaaS)
*   **Plataforma:** Supabase.
*   **Banco de Dados:** PostgreSQL 15+.
*   **Autenticação:** Supabase Auth (JWT).
*   **Segurança:** RLS (Row Level Security) para isolamento multi-tenant (dados segregados por `organization_id`).
*   **Edge Functions:** Deno (utilizado para integrações server-side como envio de e-mails via Resend).

### 2.3. Inteligência Artificial (AI Engine)
Integração direta via `@google/genai` SDK:
*   **Gemini 3 Flash Preview:** Processamento de texto rápido (resumos de tickets, categorização).
*   **Gemini 3 Pro Preview:** Raciocínio complexo (prospecção de leads, análise de mercado, geração de conteúdo de marketing).
*   **Gemini 2.5 Flash Native Audio:** Processamento de áudio em tempo real para o módulo **Nexus Voice** (análise de chamadas).

### 2.4. Integração Local (Nexus Bridge)
Servidor Node.js/Express auxiliar rodando localmente (porta 3001) para transpor limitações do navegador:
*   **Função:** Proxy para hardware e protocolos legados.
*   **Recursos:**
    *   Envio de E-mail via SMTP local/legado.
    *   Automação de WhatsApp via `whatsapp-web.js` (Puppeteer).
    *   Comunicação com dispositivos de hardware (futuro).

---

## 3. Estrutura de Navegação e Layout

A aplicação utiliza uma abordagem híbrida de navegação:

1.  **App Shell (Aplicação Principal):**
    *   Gerenciada pelo componente `App.tsx`.
    *   Utiliza navegação baseada em estado (`activeModule`) para troca instantânea de telas sem reload ou roteamento pesado.
    *   Layout composto por `Sidebar` (navegação), `CommandPalette` (ações rápidas) e Área Principal.

2.  **Portal do Cliente:**
    *   Detectado via `currentUser.role === 'client'`.
    *   Renderiza o `PortalLayout` isolado, com rotas limitadas e interface simplificada para o consumidor final.

---

## 4. Fluxo de Dados e Sincronização

O `DataContext` é o coração da aplicação, implementando o padrão **Optimistic UI**:

1.  **Inicialização:** Ao carregar, o sistema hidrata o estado imediatamente lendo do `localStorage` (Latência Zero).
2.  **Background Sync:** O método `refreshData()` conecta ao Supabase para buscar atualizações (deltas).
3.  **Mutações (Create/Update/Delete):**
    *   A UI é atualizada imediatamente.
    *   A persistência no `localStorage` ocorre em tempo real.
    *   A requisição ao Supabase (`dbUpsert` / `dbDelete`) é enviada em segundo plano.
    *   Falhas de rede não bloqueiam o usuário; o sistema assume consistência eventual.

---

## 5. Diagrama de Módulos

```mermaid
graph TD
    Root[App.tsx]
    
    subgraph Contexts
        Auth[AuthContext: Sessão/Permissões]
        Data[DataContext: Regras de Negócio/Sync]
    end
    
    subgraph Views
        Dash[Dashboard & B.I.]
        CRM[Comercial / CRM]
        Ops[Operações / Projetos]
        Fin[Financeiro]
        Supp[Suporte / Tickets]
        Mkt[Marketing Hub]
        Geo[Geo Intelligence]
    end
    
    subgraph External
        Gemini[Google Gemini API]
        Supa[Supabase Cloud]
        Bridge[Nexus Bridge (Local)]
    end

    Root --> Auth
    Root --> Data
    Data --> Gemini
    Data --> Supa
    Data --> Bridge
    
    Auth --> Dash
    Auth --> CRM
    Auth --> Ops
```

---

## 6. Segurança

*   **RBAC (Role-Based Access Control):** Matriz de permissões definida no frontend (`AuthContext`) controla a visibilidade de módulos e ações (View, Create, Edit, Delete).
*   **RLS (Row Level Security):** O banco de dados garante que nenhuma query, mesmo que maliciosa, acesse dados de outra `organization_id`.
*   **Sanitização:** Inputs de IA e queries SQL são parametrizados ou validados via SDKs seguros.
