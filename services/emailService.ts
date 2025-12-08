
import { getSupabase } from './supabaseClient';

export interface EmailTemplate {
    id: string;
    label: string;
    subject: string;
    body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'intro',
        label: 'Apresentação Comercial',
        subject: 'Oportunidade de Parceria - Nexus CRM',
        body: `Olá [Nome],\n\nEspero que esteja bem.\n\nGostaria de apresentar o Nexus CRM, uma solução focada em otimizar processos comerciais e aumentar a produtividade da sua equipe.\n\nPodemos agendar uma breve demonstração?\n\nAtenciosamente,\n[Seu Nome]`
    },
    {
        id: 'followup',
        label: 'Follow-up (Cobrança suave)',
        subject: 'Acompanhamento - Proposta Nexus',
        body: `Olá [Nome],\n\nGostaria de saber se você teve tempo de analisar a proposta que enviamos anteriormente.\n\nEstou à disposição para esclarecer qualquer dúvida.\n\nAbs,\n[Seu Nome]`
    },
    {
        id: 'meeting',
        label: 'Agendamento de Reunião',
        subject: 'Convite para Reunião',
        body: `Oi [Nome],\n\nConforme conversamos, gostaria de confirmar nossa reunião para apresentar os detalhes do projeto.\n\nQual o melhor horário para você na próxima semana?\n\nObrigado.`
    }
];

export const sendEmail = async (toName: string, toEmail: string, subject: string, message: string, fromName: string) => {
    const supabase = getSupabase();
    
    if (!supabase) {
        console.warn("Supabase não inicializado ou offline.");
        throw new Error("Erro de conexão com o servidor. Verifique suas configurações.");
    }

    // Convert text newlines to HTML breaks for basic formatting
    const htmlContent = `
        <div style="font-family: sans-serif; color: #333;">
            ${message.replace(/\n/g, '<br/>')}
            <br/><br/>
            <hr style="border: 0; border-top: 1px solid #eee;"/>
            <p style="font-size: 12px; color: #888;">Enviado por <strong>${fromName}</strong> via Nexus CRM</p>
        </div>
    `;

    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: {
                to: [toEmail], // Resend expects an array of recipients
                subject: subject,
                html: htmlContent
            }
        });

        if (error) {
            console.error('Supabase Edge Function Error:', error);
            throw new Error(`Erro no envio: ${error.message}`);
        }

        // Resend API returns an ID on success
        if (data && data.id) {
            return { success: true, id: data.id };
        } else if (data && data.error) {
             throw new Error(data.message || data.name || "Erro desconhecido do Resend");
        }

        return { success: true };
    } catch (err: any) {
        console.error('Email Service Error:', err);
        // Better error message for common issues
        if (err.message && err.message.includes('FunctionsFetchError')) {
            throw new Error("A função de e-mail não foi encontrada. Verifique se o deploy foi realizado no Supabase.");
        }
        throw err;
    }
};
