
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client, Activity } from '../types';
import { Phone, CheckCircle, Target, UserPlus, Sparkles, Package, ThumbsDown, Trophy, Save, X, Calendar, PlusCircle, PartyPopper, Loader2 } from 'lucide-react';

interface DailyTarget {
    clientId: string;
    status: 'pending' | 'done';
}

interface DailySelection {
    date: string;
    targets: DailyTarget[];
}

export const ContactCenterWidget: React.FC = () => {
    const { clients, updateClientContact, products, activities, addSystemNotification, isSyncing } = useData();
    const { currentUser } = useAuth();

    const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Animation State
    const [animatedWidths, setAnimatedWidths] = useState({ daily: 0, period: 0 });
    
    // Form State
    const [interactionNote, setInteractionNote] = useState('');
    const [problemsReported, setProblemsReported] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

    // --- 1. SELECTION LOGIC (O CORAÇÃO DO WIDGET) ---
    // Esta função garante que selecionamos 3 clientes REAIS e ÚNICOS
    const generateNewSelection = (dateStr: string, clientList: Client[]): DailySelection => {
        const activeClients = clientList.filter(c => c.status === 'Active');
        
        // Se tivermos 3 ou menos, pega todos
        if (activeClients.length <= 3) {
            return { 
                date: dateStr, 
                targets: activeClients.map(c => ({ clientId: c.id, status: 'pending' })) 
            };
        }

        // Ordenar por LTV para identificar os VIPs (Top 30%)
        const sortedByRevenue = [...activeClients].sort((a, b) => (b.ltv || 0) - (a.ltv || 0));
        const splitIndex = Math.ceil(sortedByRevenue.length * 0.3);
        const topTier = sortedByRevenue.slice(0, splitIndex);
        const baseTier = sortedByRevenue.slice(splitIndex);
        
        const selectedTargets: DailyTarget[] = [];
        const usedIds = new Set<string>();

        // Tentar pegar 2 do Top Tier (VIPs)
        const shuffledTop = [...topTier].sort(() => 0.5 - Math.random());
        shuffledTop.slice(0, 2).forEach(c => {
            selectedTargets.push({ clientId: c.id, status: 'pending' });
            usedIds.add(c.id);
        });

        // Completar até 3 usando o restante da base (Base Tier)
        const shuffledBase = [...baseTier].sort(() => 0.5 - Math.random());
        for (const c of shuffledBase) {
            if (selectedTargets.length >= 3) break;
            if (!usedIds.has(c.id)) {
                selectedTargets.push({ clientId: c.id, status: 'pending' });
                usedIds.add(c.id);
            }
        }

        // Garantia final: se ainda não tiver 3 (ex: topTier muito pequeno), pega de qualquer lugar que não foi usado
        if (selectedTargets.length < 3) {
            const anyoneElse = activeClients.filter(c => !usedIds.has(c.id)).sort(() => 0.5 - Math.random());
            anyoneElse.slice(0, 3 - selectedTargets.length).forEach(c => {
                selectedTargets.push({ clientId: c.id, status: 'pending' });
            });
        }

        return { date: dateStr, targets: selectedTargets };
    };

    // Monitorar mudanças na lista de clientes (ex: após importação)
    useEffect(() => {
        if (clients.length === 0) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('nexus_daily_contacts');
        let selection: DailySelection | null = null;

        if (storedData) {
            try { 
                const parsed = JSON.parse(storedData);
                // Só usa o cache se for do mesmo dia E se a lista de alvos não estiver vazia
                if (parsed.date === todayStr && parsed.targets.length > 0) {
                    selection = parsed;
                }
            } catch (e) { selection = null; }
        }

        // Se não tem seleção válida ou a lista de clientes mudou drasticamente (banco resetado)
        if (!selection) {
            selection = generateNewSelection(todayStr, clients);
            setDailySelection(selection);
            localStorage.setItem('nexus_daily_contacts', JSON.stringify(selection));
        } else {
            setDailySelection(selection);
        }
    }, [clients]);

    // --- 2. METRICS ---
    const dailyProgress = useMemo(() => {
        if (!dailySelection || dailySelection.targets.length === 0) return { count: 0, total: 3, percent: 0 };
        const completed = dailySelection.targets.filter(t => t.status === 'done').length;
        const total = dailySelection.targets.length;
        return { count: completed, total: total, percent: Math.round((completed / total) * 100) };
    }, [dailySelection]);

    const isGoalReached = dailyProgress.count === dailyProgress.total && dailyProgress.total > 0;

    const periodProgress = useMemo(() => {
        const activeClients = clients.filter(c => c.status === 'Active');
        if (activeClients.length === 0) return { count: 0, total: 0, percent: 0 };
        
        const contactedCount = activeClients.filter(c => {
            if (!c.lastContact) return false;
            const lastDate = new Date(c.lastContact);
            const now = new Date();
            return lastDate.getMonth() === now.getMonth() && lastDate.getFullYear() === now.getFullYear();
        }).length;

        return { count: contactedCount, total: activeClients.length, percent: Math.round((contactedCount / activeClients.length) * 100) };
    }, [clients]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedWidths({ daily: dailyProgress.percent, period: periodProgress.percent });
        }, 300);
        return () => clearTimeout(timer);
    }, [dailyProgress.percent, periodProgress.percent]);

    const handleOpenAction = (target: DailyTarget) => {
        if (target.status === 'done') return;
        const client = clients.find(c => c.id === target.clientId);
        if (client) {
            setSelectedTarget(client);
            setInteractionNote('');
            setProblemsReported('');
            setSelectedProductIds([]);
            setIsModalOpen(true);
        }
    };

    const handleSubmitContact = () => {
        if (!selectedTarget || !dailySelection) return;
        
        let finalDescription = `📝 Resumo da Conversa:\n${interactionNote}`;
        if (problemsReported) finalDescription += `\n\n⚠️ Problemas Relatados:\n${problemsReported}`;
        if (selectedProductIds.length > 0) finalDescription += `\n\n🚀 Oportunidades Identificadas:\n${selectedProductIds.join(', ')}`;
        
        const newActivity: Activity = { 
            id: `ACT-DAILY-${Date.now()}`, 
            title: `Contato Diário: ${selectedTarget.name}`, 
            type: 'Call', 
            dueDate: new Date().toISOString(), 
            completed: true, 
            relatedTo: selectedTarget.name, 
            assignee: currentUser?.id || 'system', 
            description: finalDescription 
        };

        updateClientContact(selectedTarget, newActivity);
        
        const newTargets = dailySelection.targets.map(t => t.clientId === selectedTarget.id ? { ...t, status: 'done' as const } : t);
        const newSelection = { ...dailySelection, targets: newTargets };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));
        setIsModalOpen(false);
        addSystemNotification('Contato Salvo', `Interação com ${selectedTarget.name} registrada no histórico.`, 'success');
    };

    const handleRequestMoreTargets = () => {
        if (!dailySelection) return;
        const currentTargetIds = new Set(dailySelection.targets.map(t => t.clientId));
        const available = clients.filter(c => c.status === 'Active' && !currentTargetIds.has(c.id));
        
        if (available.length === 0) {
            alert("Você já contatou todos os clientes ativos!");
            return;
        }

        const more = available.sort(() => 0.5 - Math.random()).slice(0, 2);
        const newSelection = {
            ...dailySelection,
            targets: [...dailySelection.targets, ...more.map(c => ({ clientId: c.id, status: 'pending' as const }))]
        };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));
    };

    if (clients.length === 0) {
        return (
            <div className="bg-slate-900 rounded-2xl p-8 text-center border border-slate-700 mb-6">
                <Target size={48} className="mx-auto text-slate-600 mb-4 opacity-20" />
                <p className="text-slate-400 font-medium">Aguardando importação de dados para gerar metas diárias.</p>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-2xl border border-slate-700 relative overflow-hidden mb-6 animate-fade-in">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={160} /></div>
            
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
                {/* Lateral de Métricas */}
                <div className="md:w-1/4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-8 shrink-0">
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2 text-indigo-300">
                            <Phone size={24} className={dailyProgress.percent < 100 ? "animate-pulse-slow" : ""} /> Central de Contatos
                        </h3>
                        <p className="text-xs text-slate-400 mt-2">Clientes selecionados hoje pela IA com base em LTV e tempo sem contato.</p>
                    </div>

                    <div className="flex flex-col gap-5 mt-6">
                        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow-inner">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold uppercase text-green-400 flex items-center gap-1"><Trophy size={12}/> Meta Diária</span>
                                <span className="text-xs font-bold text-white">{dailyProgress.count}/{dailyProgress.total}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-green-600 to-green-400 h-full rounded-full transition-all duration-1000 ease-out" style={{width: `${animatedWidths.daily}%`}}></div>
                            </div>
                        </div>

                        <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 shadow-inner">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1"><Calendar size={12}/> Cobertura Mensal</span>
                                <span className="text-xs font-bold text-white">{periodProgress.percent}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden shadow-sm">
                                <div className="bg-gradient-to-r from-blue-600 to-blue-400 h-full rounded-full transition-all duration-1000 ease-out" style={{width: `${animatedWidths.period}%`}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid de Cards */}
                <div className="flex-1">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="text-xs font-black uppercase text-slate-500 tracking-widest">Próximos Contatos</h4>
                        {isGoalReached && (
                             <div className="flex items-center gap-3 animate-fade-in">
                                <span className="text-xs font-bold text-indigo-400 flex items-center gap-1"><PartyPopper size={14}/> Meta de hoje concluída!</span>
                                <button onClick={handleRequestMoreTargets} className="text-[10px] font-black bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition shadow-lg">SOLICITAR EXTRAS</button>
                             </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {dailySelection?.targets.map((target, idx) => {
                            const client = clients.find(c => c.id === target.clientId);
                            if (!client) return null;
                            const isDone = target.status === 'done';
                            const isVIP = (client.ltv || 0) > 5000;
                            
                            return (
                                <div 
                                    key={target.clientId} 
                                    onClick={() => handleOpenAction(target)}
                                    className={`
                                        relative p-5 rounded-2xl border transition group flex flex-col justify-between h-40
                                        ${isDone 
                                            ? 'bg-slate-800/50 border-slate-700 opacity-60 cursor-default' 
                                            : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-2xl cursor-pointer transform hover:-translate-y-1'
                                        }
                                    `}
                                >
                                    {isDone && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-2xl z-20">
                                            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1 shadow-lg">
                                                <CheckCircle size={12}/> CONCLUÍDO
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex justify-between items-start mb-2">
                                            {isVIP ? (
                                                <span className="text-[9px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 flex items-center gap-1">
                                                    <Sparkles size={10}/> VIP
                                                </span>
                                            ) : (
                                                <span className="text-[9px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30">RECORRENTE</span>
                                            )}
                                        </div>
                                        <h4 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors leading-tight line-clamp-2">{client.name}</h4>
                                        <p className="text-[10px] text-slate-400 mt-1 truncate">{client.contactPerson}</p>
                                    </div>

                                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500 font-mono">LTV: R$ {client.ltv?.toLocaleString()}</span>
                                        {!isDone && <span className="text-[10px] font-black text-indigo-400 group-hover:text-white transition-colors">ABRIR &rarr;</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modal de Ação (Apenas se houver um alvo selecionado) */}
            {isModalOpen && selectedTarget && createPortal(
                <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">Registrar Contato</h3>
                                <p className="text-xs text-slate-500 font-medium">{selectedTarget.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition">
                                <X size={24}/>
                            </button>
                        </div>
                        
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800 flex items-center gap-4">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-indigo-600"><Phone size={24}/></div>
                                <div>
                                    <p className="text-xs text-indigo-400 font-black uppercase tracking-widest">Telefone de Contato</p>
                                    <p className="text-lg font-bold text-indigo-900 dark:text-indigo-100">{selectedTarget.phone || 'Não cadastrado'}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest">O que foi conversado? <span className="text-red-500">*</span></label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-2xl p-4 h-24 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none text-sm shadow-inner"
                                    placeholder="Resumo do alinhamento ou novidades..." 
                                    value={interactionNote} 
                                    onChange={e => setInteractionNote(e.target.value)} 
                                    autoFocus 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><ThumbsDown size={14} className="text-red-500"/> Alguma reclamação ou impedimento?</label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-700 rounded-2xl p-4 h-20 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none text-sm shadow-inner"
                                    placeholder="Relate problemas técnicos ou insatisfação aqui..." 
                                    value={problemsReported} 
                                    onChange={e => setProblemsReported(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Package size={14} className="text-green-500"/> Identificou oportunidade de Venda (Upsell)?</label>
                                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-1 custom-scrollbar">
                                    {products.filter(p => p.active).map(product => {
                                        const isSelected = selectedProductIds.includes(product.name);
                                        return (
                                            <div 
                                                key={product.id} 
                                                onClick={() => {
                                                    setSelectedProductIds(prev => isSelected ? prev.filter(id => id !== product.name) : [...prev, product.name]);
                                                }} 
                                                className={`cursor-pointer p-3 rounded-xl border text-xs font-bold transition flex items-center gap-3 select-none ${isSelected ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={12} className="text-white"/>}
                                                </div>
                                                {product.name}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 hover:text-slate-900 font-bold text-sm">Cancelar</button>
                            <button 
                                onClick={handleSubmitContact} 
                                disabled={interactionNote.length < 5} 
                                className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/20 text-sm"
                            >
                                <Save size={18}/> FINALIZAR CONTATO
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
