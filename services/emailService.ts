
import { getSupabase } from './supabaseClient';
import { sendBridgeEmail } from './bridgeService';

export interface EmailTemplate {
    id: string;
    label: string;
    subject: string;
    body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
    {
        id: 'intro',
        label: 'Apresentação Softcase (LPR)',
        subject: 'Automação e Controle para seu Estacionamento',
        body: `Olá [Nome],\n\nGerenciar um estacionamento exige controle, agilidade e decisões baseadas em dados confiáveis. A **Softcase** oferece soluções de automação que eliminam processos manuais, reduzem fraudes e aumentam a fluidez de entrada e saída de veículos.\n\nCom reconhecimento automático de placas (LPR), integração com cancelas e gestão centralizada, ajudamos gestores a ganhar previsibilidade operacional e segurança no dia a dia.\n\nNossa solução pode ser contratada por **venda ou locação**, adaptando-se à realidade do seu negócio.\n\nQue tal conversarmos para avaliar oportunidades de melhoria na sua operação?\n\nAtenciosamente,\n[Seu Nome]`
    },
    {
        id: 'followup',
        label: 'Follow-up (Pós-proposta)',
        subject: 'Acompanhamento - Proposta Softcase',
        body: `Olá [Nome],\n\nGostaria de saber se você teve tempo de analisar a proposta de automação que enviamos anteriormente.\n\nEstou à disposição para esclarecer qualquer dúvida sobre o funcionamento do LPR ou das modalidades de contratação.\n\nAbs,\n[Seu Nome]`
    }
];

export const sendEmail = async (toName: string, toEmail: string, subject: string, message: string, fromName: string) => {
    const supabase = getSupabase();
    
    const htmlContent = `
        <div style="font-family: sans-serif; color: #333; line-height: 1.6;">
            ${message.replace(/\n/g, '<br/>')}
            <br/><br/>
            <hr style="border: 0; border-top: 1px solid #eee;"/>
            <p style="font-size: 12px; color: #888;">Enviado por <strong>${fromName}</strong> via Softcase Enterprise</p>
        </div>
    `;

    // 1. TENTATIVA VIA SUPABASE (CLOUD REAL)
    if (supabase) {
        try {
            const { data, error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: [toEmail],
                    subject: subject,
                    html: htmlContent,
                    from: 'Softcase Tecnologia <onboarding@resend.dev>'
                }
            });
            if (!error && data?.id) return { success: true, id: data.id, method: 'CLOUD' };
        } catch (err) { console.warn('Falha em Cloud Email.'); }
    }

    // 2. TENTATIVA VIA NEXUS BRIDGE (SMTP LOCAL)
    try {
        await sendBridgeEmail(toEmail, subject, htmlContent, fromName);
        return { success: true, message: "Enviado via Servidor Local (SMTP)", method: 'BRIDGE' };
    } catch (bridgeErr: any) {
        // 3. FALLBACK: SIMULAÇÃO (MOCK)
        console.log(`[MOCK EMAIL] Destinatário: ${toEmail} | Título: ${subject}`);
        return { 
            success: true, 
            warning: "E-mail simulado.",
            method: 'MOCK'
        };
    }
};
