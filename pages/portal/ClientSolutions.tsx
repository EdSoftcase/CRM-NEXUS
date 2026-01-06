
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Package, Sparkles, Send, CheckCircle, Info, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Lead, LeadStatus } from '../../types';
// Fix: Added missing import for Badge component
import { Badge } from '../../components/Widgets';

export const ClientSolutions: React.FC = () => {
    const { currentUser } = useAuth();
    const { products, clients, addLead, addSystemNotification } = useData();
    const [sendingId, setSendingId] = useState<string | null>(null);

    const currentClient = useMemo(() => {
        if (!currentUser) return null;
        return clients.find(c => c.id === currentUser.relatedClientId) || 
               clients.find(c => c.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
    }, [clients, currentUser]);

    // Filtrar apenas produtos que o cliente ainda NÃO possui
    const recommendations = useMemo(() => {
        if (!currentClient) return [];
        const owned = currentClient.contractedProducts || [];
        return products.filter(p => !owned.includes(p.name) && p.active);
    }, [products, currentClient]);

    const handleInterest = async (productName: string) => {
        if (!currentClient || !currentUser) return;
        
        setSendingId(productName);
        
        // Simular criação de lead de Upsell
        const upsellLead: Lead = {
            id: `L-UP-${Date.now()}`,
            name: currentUser.name || 'Contato do Portal',
            company: currentClient.name,
            email: currentUser.email || '',
            phone: currentClient.phone || '',
            value: 0,
            status: LeadStatus.NEW,
            source: 'Portal do Cliente (Upsell)',
            probability: 40,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            description: `Interesse demonstrado via portal no produto: ${productName}. Cliente já possui: ${(currentClient.contractedProducts || []).join(', ')}`
        };

        try {
            await addLead(currentUser, upsellLead);
            addSystemNotification("Solicitação Enviada", `Recebemos seu interesse em ${productName}. Um consultor entrará em contato em breve.`, "success");
            alert("Solicitação registrada! Nosso time comercial entrará em contato.");
        } catch (e) {
            alert("Erro ao processar solicitação.");
        } finally {
            setSendingId(null);
        }
    };

    if (!currentClient) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Catálogo de Soluções</h1>
                    <p className="text-slate-500 font-medium">Expanda sua operação com o que há de mais moderno em automação.</p>
                </div>
                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
                    <Sparkles className="text-indigo-600" size={24}/>
                    <p className="text-xs font-bold text-indigo-900 max-w-[200px]">Sugestões baseadas no seu perfil de uso atual.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Meus Produtos Atuais */}
                <div className="lg:col-span-1 space-y-6">
                    <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                        <Package size={24} className="text-slate-400"/> Sua Solução Atual
                    </h3>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-4">
                        {(currentClient.contractedProducts || []).length > 0 ? (
                            (currentClient.contractedProducts || []).map((p, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-md">
                                        <CheckCircle size={16}/>
                                    </div>
                                    <span className="font-bold text-slate-700 uppercase text-xs">{p}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm">Nenhum produto registrado no inventário.</p>
                        )}
                        <div className="pt-6 border-t mt-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Precisa de manutenção?</p>
                            <button className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-2">Falar com Suporte Técnico <ArrowRight size={14}/></button>
                        </div>
                    </div>
                </div>

                {/* Recomendações (Upsell) */}
                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                        <Zap size={24} className="text-amber-500"/> Recomendado para você
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recommendations.length === 0 ? (
                            <div className="col-span-2 bg-slate-50 rounded-3xl p-10 text-center border border-dashed border-slate-200">
                                <p className="text-slate-500 font-bold uppercase text-xs">Sua unidade já está com o portfólio completo!</p>
                            </div>
                        ) : (
                            recommendations.map(prod => (
                                <div key={prod.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col group hover:border-indigo-500 transition-all hover:shadow-xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Package size={24}/>
                                        </div>
                                        <Badge color="blue">NOVO</Badge>
                                    </div>
                                    <h4 className="font-black text-xl text-slate-900 uppercase tracking-tighter mb-2">{prod.name}</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed flex-1">{prod.description || 'Tecnologia de ponta para otimizar sua gestão de pátio e aumentar a segurança.'}</p>
                                    
                                    <button 
                                        onClick={() => handleInterest(prod.name)}
                                        disabled={sendingId === prod.name}
                                        className="mt-8 w-full py-4 bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-600 transition flex items-center justify-center gap-2"
                                    >
                                        {sendingId === prod.name ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                        {sendingId === prod.name ? 'PROCESSANDO...' : 'Tenho Interesse'}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
