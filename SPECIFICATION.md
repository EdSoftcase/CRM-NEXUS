# SOFT-CRM Enterprise - Especificação Funcional

## 1. Objetivo do Produto
Fornecer uma plataforma unificada de gestão para empresas de tecnologia e serviços, integrando CRM, ERP, Helpdesk e Inteligência Artificial para automatizar processos operacionais e estratégicos.

---

## 2. Perfis de Acesso (Roles)

| Perfil | Descrição | Permissões Chave |
| :--- | :--- | :--- |
| **Admin** | Gestor da Organização | Acesso irrestrito a todos os módulos, configurações e gestão de usuários. |
| **Executive** | Diretoria / C-Level | Foco em B.I., Relatórios, Financeiro e Dashboards estratégicos. Acesso somente leitura em áreas operacionais. |
| **Sales** | Consultor Comercial | Gestão de Leads, Agenda, Propostas, Prospecção IA e Inbox. |
| **Support** | Analista de Suporte | Gestão de Tickets, Base de Conhecimento e visualização de clientes. |
| **Finance** | Analista Financeiro | Contas a Pagar/Receber, Faturamento em Lote e Integrações Bancárias. |
| **Dev** | Desenvolvedor / Técnico | Gestão de Projetos, Issues (Tarefas Técnicas) e Evolução de Produtos. |
| **Client** | Cliente Final | Acesso restrito ao **Portal do Cliente** (Faturas, Contratos, Chamados). |

---

## 3. Módulos do Sistema

### 3.1. Comercial & CRM
*   **Pipeline de Vendas:** Kanban com estágios (Novo, Qualificado, Proposta, Negociação, Ganho/Perdido).
*   **Soft Prospect:** Ferramenta de prospecção ativa que utiliza IA para encontrar leads qualificados baseados em setor e geolocalização.
*   **Nexus Voice:** Interface de discador telefônico com gravação de áudio e transcrição/análise de sentimento via IA.
*   **Automação:** Disparo de mensagens (WhatsApp/Email) via templates pré-definidos.

### 3.2. Operações & Projetos
*   **Gestão de Projetos:** Kanban de produção (Kitting -> Montagem -> Execução -> Concluído).
*   **Cálculo de Progresso:** O % de conclusão do projeto é derivado automaticamente do status das tarefas e da fase atual.
*   **Documentação:** Geração automática de Termos de Aceite e Contratos com assinatura digital (Canvas).

### 3.3. Financeiro
*   **Contas a Receber/Pagar:** Gestão de fluxo de caixa.
*   **Faturamento em Lote:** Seleção múltipla de clientes para geração massiva de faturas recorrentes.
*   **Integração Iugu:** Geração de boletos e Pix diretamente pela interface (via Bridge).

### 3.4. Suporte (Helpdesk)
*   **Gestão de Tickets:** Classificação por prioridade (Baixa a Crítica) e Status.
*   **IA Assistiva:** O sistema analisa a descrição do problema e sugere respostas ou classifica o sentimento do cliente.
*   **Histórico:** Timeline completa de interações.

### 3.5. Inteligência & Marketing
*   **Marketing Hub:** Gerador de Copywriting assistido por IA para redes sociais e e-mails.
*   **Nexus Spy:** Módulo de inteligência competitiva que analisa concorrentes e tendências de mercado.
*   **Geo-Intelligence:** Visualização de clientes e leads em mapa interativo (Leaflet) para roteirização e análise de território.

### 3.6. Portal do Cliente
Ambiente externo onde o cliente final pode:
*   Visualizar e baixar faturas (PDF).
*   Assinar propostas e contratos digitalmente.
*   Abrir e acompanhar chamados de suporte.

---

## 4. Regras de Negócio

1.  **Multi-Tenancy:** O sistema deve garantir isolamento total de dados entre organizações diferentes.
2.  **Integridade de Dados:**
    *   Um Lead convertido em Cliente deve manter histórico.
    *   Faturas não podem ser excluídas se estiverem com status "Pago".
3.  **Dependência da IA:**
    *   Funcionalidades como "Soft Prospect" e "Nexus Voice Analysis" dependem de conexão ativa com a API do Google Gemini. Em caso de falha, o sistema deve degradar graciosamente (permitir operação manual).
4.  **Integração Local:**
    *   Envios de E-mail via SMTP e WhatsApp dependem do **Nexus Bridge** estar rodando na máquina do operador (localhost:3001). O frontend deve testar essa conexão periodicamente.

---

## 5. Entidades de Dados Principais

### `Lead`
Entidade de pré-venda.
*   Campos: Nome, Empresa, Email, Telefone, Valor Estimado, Probabilidade, Status, Origem.

### `Client`
Entidade de carteira ativa.
*   Campos: Razão Social, CNPJ, Endereço (Lat/Lng), LTV (Valor Mensal), Health Score, Produtos Contratados.

### `Proposal`
Documento comercial.
*   Campos: Itens (Produtos/Serviços), Valores (Capex/Opex), Validade, Assinatura Digital (Base64).

### `Activity`
Registro de interação.
*   Campos: Tipo (Call, Meeting, Email), Data, Responsável, Vínculo (Cliente/Lead), Status.
