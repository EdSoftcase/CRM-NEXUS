
import React, { useState, useEffect } from 'react';
import { X, Send, FileText, CheckCircle, AlertCircle, Loader2, Server } from 'lucide-react';
import { Lead } from '../types';
import { EMAIL_TEMPLATES, sendEmail } from '../services/emailService';
import { sendBridgeEmail } from '../services/bridgeService';
import { useAuth } from '../context/AuthContext';

interface SendEmailModalProps {
    lead: Lead;
    onClose: () => void;
    onSuccess: (message: string) => void;
}

export const SendEmailModal: React.FC<SendEmailModalProps> = ({ lead, onClose, onSuccess }) => {
    const { currentUser } = useAuth();
    const [selectedTemplate, setSelectedTemplate] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    // PERSISTENT BRIDGE PREFERENCE
    const [useBridge, setUseBridge] = useState(() => {
        return localStorage.getItem('nexus_pref_bridge_email') === 'true';
    });

    const toggleBridge = () => {
        const newVal = !useBridge;
        setUseBridge(newVal);
        localStorage.setItem('nexus_pref_bridge_email', String(newVal));
    };

    // Preencher o template quando selecionado
    useEffect(() => {
        if (selectedTemplate) {
            const template = EMAIL_TEMPLATES.find(t => t.id === selectedTemplate);
            if (template) {
                setSubject(template.subject);
                // Replace variáveis simples
                const personalizedBody = template.body
                    .replace('[Nome]', lead.name.split(' ')[0])
                    .replace('[Seu Nome]', currentUser?.name || 'Equipe Nexus');
                setBody(personalizedBody);
            }
        }
    }, [selectedTemplate, lead, currentUser]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject || !body) {
            setError("Assunto e Mensagem são obrigatórios.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            if (useBridge) {
                // Send via Local Bridge (SMTP)
                await sendBridgeEmail(lead.email, subject, body.replace(/\n/g, '<br/>'), currentUser?.name || 'Vendedor');
            } else {
                // Send via API (Resend/Supabase Function)
                await sendEmail(
                    lead.name, 
                    lead.email, 
                    subject, 
                    body, 
                    currentUser?.name || 'Vendedor'
                );
            }
            
            onSuccess(`Email enviado para ${lead.email}: "${subject}" (${useBridge ? 'SMTP' : 'API'})`);
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Falha ao enviar e-mail.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                            <Send size={20} className="text-blue-600 dark:text-blue-400"/> Enviar E-mail
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Para: {lead.name} ({lead.email})</p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition">
                        <X size={20}/>
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSend} className="p-6 overflow-y-auto flex-1 space-y-4">
                    
                    {/* Bridge Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer" onClick={toggleBridge}>
                        <div className="flex items-center gap-2">
                            <Server size={16} className={useBridge ? 'text-green-600' : 'text-slate-400'}/>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar Nexus Bridge (SMTP Próprio)</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${useBridge ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${useBridge ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    {/* Template Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Usar Modelo (Template)</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {EMAIL_TEMPLATES.map(tmpl => (
                                <button
                                    key={tmpl.id}
                                    type="button"
                                    onClick={() => setSelectedTemplate(tmpl.id)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium border whitespace-nowrap transition flex items-center gap-2
                                        ${selectedTemplate === tmpl.id 
                                            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' 
                                            : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600 hover:border-blue-300'}
                                    `}
                                >
                                    <FileText size={14}/> {tmpl.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Assunto</label>
                        <input 
                            type="text" 
                            required
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            placeholder="Assunto do email..."
                            value={subject}
                            onChange={e => setSubject(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mensagem</label>
                        <textarea 
                            required
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm h-48 resize-none focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white leading-relaxed"
                            placeholder="Escreva sua mensagem aqui..."
                            value={body}
                            onChange={e => setBody(e.target.value)}
                        />
                    </div>

                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs p-3 rounded-lg border border-red-100 dark:border-red-800 flex items-center gap-2">
                            <AlertCircle size={14} className="shrink-0"/> <span>{error}</span>
                        </div>
                    )}
                </form>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleSend} 
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? <Loader2 size={18} className="animate-spin"/> : <Send size={18}/>}
                        {loading ? 'Enviando...' : `Enviar (${useBridge ? 'Bridge' : 'API'})`}
                    </button>
                </div>
            </div>
        </div>
    );
};
