
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Package, Sparkles, Send, CheckCircle, Info, Zap, ArrowRight, Loader2 } from 'lucide-react';
import { Lead, LeadStatus } from '../../types';
import { Badge } from '../../components/Widgets';

export const ClientSolutions: React.FC = () => {
    const { currentUser } = useAuth();
    const { products, clients, addLead, addSystemNotification } = useData();
    const [sendingId, setSendingId] = useState<string | null>(null);

    // Identificação direta baseada no carregamento do DataContext
    const myPortfolio = useMemo(() => {
        if (!clients || clients.length === 0) return { name: "Cliente", products: [] as string[] };
        
        // Unifica todos os produtos de todas as unidades para recomendação consolidada
        const allOwned = new Set<string>();
        clients.forEach(c => {
            (c.contractedProducts || []).forEach(p => {
                if (p) allOwned.add(p.toUpperCase().trim());
            });
        });

        return {
            name: clients[0].groupName || clients[0].name,
            products: Array.from(allOwned)
        };
    }, [clients]);

    const recommendations = useMemo(() => {
        if (!products) return [];
        // Filtra produtos que NÃO estão no portfólio (comparação case-insensitive)
        return products.filter(p => 
            p.active && 
            !myPortfolio.products.includes(p.name.toUpperCase().trim())
        );
    }, [products, myPortfolio]);

    const handleInterest = async (productName: string) => {
        if (!currentUser || clients.length === 0) return;
        
        setSendingId(productName);
        
        const upsellLead: Lead = {
            id: `L-UP-${Date.now()}`,
            name: currentUser.name || 'Gestor do Portal',
            company: myPortfolio.name,
            email: currentUser.email || '',
            phone: clients[0].phone || '',
            value: 0,
            status: LeadStatus.NEW,
            source: 'Portal do Cliente (Upsell)',
            probability: 40,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            description: `Interesse em: ${productName}. Grupo: ${currentUser.managedGroupName || 'N/A'}`
        };

        try {
            await addLead(currentUser, upsellLead);
            addSystemNotification("Interesse Registrado", `Recebemos sua solicitação sobre ${productName}.`, "success");
        } catch (e) {
            console.error(e);
        } finally {
            setSendingId(null);
        }
    };

    if (clients.length === 0) {
        return (
            <div className="h-[50vh] flex flex-col items-center justify-center p-10 text-center">
                <Info size={48} className="text-slate-300 mb-4" />
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Aguardando dados da carteira...</p>
            </div>
        );
    }

    return (
        <div className="space-y-10 animate-fade-in font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Soluções e Upgrade</h1>
                    <p className="text-slate-500 font-medium">Expanda a tecnologia de automação em suas unidades.</p>
                </div>
                <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-3 shadow-xl shadow-indigo-600/20">
                    <Sparkles size={20}/>
                    <p className="text-[10px] font-black uppercase tracking-widest">Nexus Intelligence</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-6">
                    <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                        <Package size={24} className="text-slate-400"/> Portfólio Ativo
                    </h3>
                    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 space-y-4">
                        {myPortfolio.products.length > 0 ? (
                            myPortfolio.products.map((p, i) => (
                                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="w-8 h-8 bg-emerald-500 text-white rounded-lg flex items-center justify-center shadow-md">
                                        <CheckCircle size={16}/>
                                    </div>
                                    <span className="font-bold text-slate-700 uppercase text-xs">{p}</span>
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-400 italic text-sm text-center py-4">Nenhum produto listado no inventário principal.</p>
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 space-y-6">
                    <h3 className="font-black text-xl uppercase tracking-tighter flex items-center gap-2">
                        <Zap size={24} className="text-amber-500"/> Sugestões Softpark
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {recommendations.length === 0 ? (
                            <div className="col-span-2 bg-white rounded-[3rem] p-16 text-center border border-slate-200">
                                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4 opacity-50" />
                                <p className="text-slate-500 font-black uppercase text-xs tracking-widest">Sua operação já utiliza todas as nossas soluções ativas!</p>
                            </div>
                        ) : (
                            recommendations.map(prod => (
                                <div key={prod.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-8 flex flex-col group hover:border-indigo-500 transition-all hover:shadow-xl">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                            <Package size={24}/>
                                        </div>
                                        <Badge color="blue">LANÇAMENTO</Badge>
                                    </div>
                                    <h4 className="font-black text-xl text-slate-900 uppercase tracking-tighter mb-2">{prod.name}</h4>
                                    <p className="text-slate-500 text-sm leading-relaxed flex-1">{prod.description || 'Otimize sua gestão de pátio com inteligência artificial e controle de fluxo em tempo real.'}</p>
                                    
                                    <button 
                                        onClick={() => handleInterest(prod.name)}
                                        disabled={sendingId === prod.name}
                                        className="mt-8 w-full py-4 bg-slate-900 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-indigo-600 transition flex items-center justify-center gap-3 disabled:opacity-70"
                                    >
                                        {sendingId === prod.name ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                        {sendingId === prod.name ? 'SOLICITANDO...' : 'SOLICITAR DEMONSTRAÇÃO'}
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
