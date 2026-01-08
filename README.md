# SOFT-CRM Enterprise

Sistema integrado de gestão corporativa (CRM/ERP) com Inteligência Artificial Generativa.

## Pré-requisitos

*   Node.js v18+
*   Chave de API do Google Gemini (GEMINI_API_KEY)
*   Projeto Supabase configurado (URL e Anon Key)

## Instalação e Execução

### 1. Configuração do Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
API_KEY=sua_chave_gemini_aqui
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_KEY=sua_anon_key_supabase
```

### 2. Frontend (Aplicação Principal)

Instale as dependências e inicie o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Acesse: `http://localhost:3000`

### 3. Nexus Bridge (Servidor de Integração Local)

Para funcionalidades avançadas (Envio de E-mail SMTP, Automação WhatsApp), inicie o servidor Bridge:

1.  Navegue para a pasta do servidor:
    ```bash
    cd server
    ```
2.  Instale as dependências do servidor:
    ```bash
    npm install
    ```
3.  Configure o SMTP (opcional) em `server/smtp-config.json`:
    ```json
    {
      "host": "smtp.seuprovedor.com",
      "port": 587,
      "user": "seu@email.com",
      "pass": "sua_senha"
    }
    ```
4.  Inicie o servidor:
    ```bash
    npm start
    ```

O Bridge rodará em `http://localhost:3001`.

## Funcionalidades de IA

O sistema utiliza a Google Gemini API para:
*   **Soft Prospect:** Prospecção de leads via inteligência de mercado.
*   **Nexus Voice:** Análise de sentimento e transcrição de chamadas simuladas.
*   **Marketing Hub:** Geração de copy para campanhas.
*   **Suporte Inteligente:** Análise e sugestão de respostas para tickets.

## Estrutura do Projeto

*   `/src`: Código fonte React/TypeScript.
*   `/server`: Servidor Node.js (Nexus Bridge).
*   `/supabase`: Functions e definições de banco de dados.
