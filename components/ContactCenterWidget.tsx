
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client, Activity } from '../types';
import { Phone, CheckCircle, Target, UserPlus, Sparkles, Package, ThumbsDown, Trophy, Save, X, Calendar } from 'lucide-react';

interface DailyTarget {
    clientId: string;
    status: 'pending' | 'done';
}

interface DailySelection {
    date: string;
    targets: DailyTarget[];
}

export const ContactCenterWidget: React.FC = () => {
    const { clients, updateClientContact, products, activities } = useData();
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

    // --- 1. METRICS CALCULATION ---

    // A. Daily Progress (0% -> 100% based on 3 targets)
    const dailyProgress = useMemo(() => {
        if (!dailySelection || dailySelection.targets.length === 0) return { count: 0, total: 3, percent: 0 };
        
        const completed = dailySelection.targets.filter(t => t.status === 'done').length;
        const total = dailySelection.targets.length;
        
        return {
            count: completed,
            total: total,
            percent: Math.round((completed / total) * 100)
        };
    }, [dailySelection]);

    // B. Monthly Coverage (Percentage of Active Clients CONTACTED THIS MONTH via Activities)
    // Ensures bar starts at 0% and fills up as you work in the current month.
    const periodProgress = useMemo(() => {
        const activeClients = clients.filter(c => c.status === 'Active');
        if (activeClients.length === 0) return { count: 0, total: 0, percent: 0 };

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Optimize lookup
        const activeClientNames = new Set(activeClients.map(c => c.name));
        const contactedClientsSet = new Set<string>();
        
        activities.forEach(act => {
            if (act.completed) {
                const actDate = new Date(act.dueDate);
                // Check if activity is in current month AND belongs to an active client
                if (actDate.getMonth() === currentMonth && actDate.getFullYear() === currentYear) {
                    if (activeClientNames.has(act.relatedTo)) {
                        contactedClientsSet.add(act.relatedTo);
                    }
                }
            }
        });

        const count = contactedClientsSet.size;
        
        return {
            count: count,
            total: activeClients.length,
            percent: Math.round((count / activeClients.length) * 100)
        };
    }, [clients, activities]);

    // Trigger Animations
    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedWidths({
                daily: dailyProgress.percent,
                period: periodProgress.percent
            });
        }, 100);
        return () => clearTimeout(timer);
    }, [dailyProgress.percent, periodProgress.percent]);

    // --- 2. SELECTION LOGIC (2 Top 30% + 1 Base) ---
    useEffect(() => {
        if (clients.length === 0) {
            setDailySelection(null);
            return;
        }

        const todayStr = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('nexus_daily_contacts');
        
        let selection: DailySelection | null = null;

        if (storedData) {
            try {
                selection = JSON.parse(storedData);
            } catch (e) {
                selection = null;
            }
        }

        if (!selection || selection.date !== todayStr || selection.targets.length === 0) {
            selection = generateNewSelection(todayStr);
        } else {
            const validTargets = selection.targets.filter(t => clients.find(c => c.id === t.clientId));
            if (validTargets.length < selection.targets.length) {
                 selection = generateNewSelection(todayStr);
            }
        }

        setDailySelection(selection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(selection));

    }, [clients.length]);

    const generateNewSelection = (dateStr: string): DailySelection => {
        const activeClients = clients.filter(c => c.status === 'Active');
        
        if (activeClients.length <= 3) {
            return {
                date: dateStr,
                targets: activeClients.map(c => ({ clientId: c.id, status: 'pending' }))
            };
        }

        const sortedByRevenue = [...activeClients].sort((a, b) => (b.ltv || 0) - (a.ltv || 0));
        const splitIndex = Math.ceil(sortedByRevenue.length * 0.3);
        const topTier = sortedByRevenue.slice(0, splitIndex);
        const baseTier = sortedByRevenue.slice(splitIndex);

        const targets: DailyTarget[] = [];
        const usedIds = new Set<string>();

        for (let i = 0; i < 2; i++) {
            if (topTier.length > 0) {
                let attempts = 0;
                while (attempts < 20) {
                    const randomIndex = Math.floor(Math.random() * topTier.length);
                    const selected = topTier[randomIndex];
                    if (!usedIds.has(selected.id)) {
                        targets.push({ clientId: selected.id, status: 'pending' });
                        usedIds.add(selected.id);
                        break;
                    }
                    attempts++;
                }
            }
        }

        if (baseTier.length > 0) {
            let attempts = 0;
            while(targets.length < 3 && attempts < 20) {
                const randomIndex = Math.floor(Math.random() * baseTier.length);
                const selected = baseTier[randomIndex];
                if (!usedIds.has(selected.id)) {
                    targets.push({ clientId: selected.id, status: 'pending' });
                    usedIds.add(selected.id);
                    break;
                }
                attempts++;
            }
        } 
        
        if (targets.length < 3) {
             const remaining = activeClients.filter(c => !usedIds.has(c.id));
             for (const c of remaining) {
                 if (targets.length >= 3) break;
                 targets.push({ clientId: c.id, status: 'pending' });
                 usedIds.add(c.id);
             }
        }

        return { date: dateStr, targets };
    };

    // --- 3. ACTIONS ---

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

    const toggleProductSelection = (productName: string) => {
        setSelectedProductIds(prev => 
            prev.includes(productName) 
                ? prev.filter(p => p !== productName)
                : [...prev, productName]
        );
    };

    const handleSubmitContact = () => {
        if (!selectedTarget || !dailySelection) return;
        if (interactionNote.length < 5) {
            alert("Por favor, descreva a conversa com no mínimo 5 caracteres.");
            return;
        }

        let finalDescription = `📝 Resumo da Conversa:\n${interactionNote}`;
        
        if (problemsReported) {
            finalDescription += `\n\n⚠️ Problemas Relatados:\n${problemsReported}`;
        }

        if (selectedProductIds.length > 0) {
            finalDescription += `\n\n🚀 Oportunidades Identificadas:\n${selectedProductIds.join(', ')}`;
        }

        const newActivity: Activity = {
            id: `ACT-DAILY-${Date.now()}`,
            title: `Contato Diário: ${selectedTarget.name}`,
            type: 'Call',
            dueDate: new Date().toISOString(),
            completed: true,
            relatedTo: selectedTarget.name,
            assignee: currentUser?.id || 'system',
            description: finalDescription,
            metadata: {
                source: 'ContactCenter',
                tags: {
                    churn_risk: !!problemsReported,
                    upsell_potential: selectedProductIds.length > 0
                }
            }
        };
        
        updateClientContact(selectedTarget, newActivity);

        const newTargets = dailySelection.targets.map(t => 
            t.clientId === selectedTarget.id ? { ...t, status: 'done' as const } : t
        );
        const newSelection = { ...dailySelection, targets: newTargets };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));

        setIsModalOpen(false);
    };

    if (!dailySelection || dailySelection.targets.length === 0) {
        return (
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-6 text-white shadow-lg border border-slate-700 relative overflow-hidden mb-6 animate-fade-in flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={140} /></div>
                <div className="flex items-center gap-4 relative z-10">
                    <div className="p-4 bg-white/10 rounded-full shadow-inner border border-white/10">
                        <Phone size={32} className="text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2">Central de Contatos</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-lg">
                            Cadastre clientes para ativar as sugestões diárias de contato e retenção.
                        </p>
                    </div>
                </div>
                <div className="relative z-10 flex gap-3">
                    <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-sm shadow-md transition flex items-center gap-2">
                        <UserPlus size={16}/> Cadastrar Clientes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white shadow-lg border border-slate-700 relative overflow-hidden mb-6 animate-fade-in">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={140} /></div>

            <div className="flex flex-col md:flex-row gap-6 relative z-10">
                <div className="md:w-1/4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-6">
                    <div>
                        <h3 className="font-bold text-lg flex items-center gap-2 text-indigo-300">
                            <Phone size={20} className="animate-pulse-slow"/> Central de Contatos
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">Sua central de relacionamento proativo.</p>
                    </div>
                    
                    <div className="flex flex-col gap-4 mt-4">
                        {/* Daily Progress */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] font-bold uppercase text-green-400 flex items-center gap-1"><Trophy size={10}/> Meta Diária</span>
                                <span className="text-xs font-bold text-white">{dailyProgress.count}/{dailyProgress.total}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-green-500 h-full rounded-full transition-all duration-1000 ease-out" style={{width: `${animatedWidths.daily}%`}}></div>
                            </div>
                        </div>

                        {/* Monthly Progress (Previously Annual) */}
                        <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-[10px] font-bold uppercase text-blue-400 flex items-center gap-1"><Calendar size={10}/> Cobertura Mensal</span>
                                <span className="text-xs font-bold text-white">{periodProgress.percent}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-blue-500 h-full rounded-full transition-all duration-1000 ease-out" style={{width: `${animatedWidths.period}%`}}></div>
                            </div>
                            <p className="text-[9px] text-slate-500 mt-1 text-right">{periodProgress.count}/{periodProgress.total} clientes</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                    {dailySelection.targets.map((target, idx) => {
                        const client = clients.find(c => c.id === target.clientId);
                        if (!client) return null;
                        
                        const isDone = target.status === 'done';
                        const isHighValue = idx < 2;

                        return (
                            <div 
                                key={target.clientId}
                                onClick={() => handleOpenAction(target)}
                                className={`relative p-4 rounded-lg border transition cursor-pointer group flex flex-col justify-between ${isDone ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-md'}`}
                            >
                                {isDone && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] rounded-lg z-20 animate-fade-in">
                                        <div className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg transform scale-110">
                                            <CheckCircle size={12} /> Feito
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <div className="flex justify-between items-start mb-2">
                                        {isHighValue ? (
                                            <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-1"><Sparkles size={8}/> VIP</span>
                                        ) : (
                                            <span className="text-[10px] font-bold bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded border border-blue-500/30">Carteira</span>
                                        )}
                                        {!isDone && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                                    </div>
                                    <h4 className="font-bold text-sm truncate text-white">{client.name}</h4>
                                    <p className="text-xs text-slate-400 truncate">{client.contactPerson}</p>
                                </div>

                                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-mono">LTV: R$ {client.ltv?.toLocaleString()}</span>
                                    <span className="text-xs font-bold text-indigo-400 group-hover:underline">Contatar</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* MODAL DE CONCLUSÃO */}
            {isModalOpen && selectedTarget && createPortal(
                <div className="fixed inset-0 bg-black/70 z-[10000] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Concluir Contato</h3>
                                <p className="text-xs text-slate-500">{selectedTarget.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Resumo da Conversa <span className="text-red-500">*</span></label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-20 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none text-sm"
                                    placeholder="Como foi a abordagem? O cliente está satisfeito?"
                                    value={interactionNote}
                                    onChange={e => setInteractionNote(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                    <ThumbsDown size={14} className="text-red-500"/> Principais Problemas Relatados
                                </label>
                                <textarea 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-16 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-800 dark:text-white resize-none text-sm"
                                    placeholder="Alguma reclamação ou ponto de dor? (Opcional)"
                                    value={problemsReported}
                                    onChange={e => setProblemsReported(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2 flex items-center gap-1">
                                    <Package size={14} className="text-green-500"/> Potencial de Compra (Upsell)
                                </label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                                    {products.filter(p => p.active).map(product => {
                                        const isSelected = selectedProductIds.includes(product.name);
                                        return (
                                            <div 
                                                key={product.id}
                                                onClick={() => toggleProductSelection(product.name)}
                                                className={`
                                                    cursor-pointer p-2 rounded-lg border text-xs font-medium transition flex items-center gap-2 select-none
                                                    ${isSelected 
                                                        ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300' 
                                                        : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-indigo-400'
                                                    }
                                                `}
                                            >
                                                <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>
                                                    {isSelected && <CheckCircle size={10} className="text-white"/>}
                                                </div>
                                                {product.name}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[10px] text-slate-400 mt-2">Selecione produtos que o cliente demonstrou interesse.</p>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm">Cancelar</button>
                            <button 
                                onClick={handleSubmitContact}
                                disabled={interactionNote.length < 5}
                                className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-sm text-sm"
                            >
                                <Save size={16}/> Salvar Histórico
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
