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
    const dailyProgress = useMemo(() => {
        if (!dailySelection || dailySelection.targets.length === 0) return { count: 0, total: 3, percent: 0 };
        const completed = dailySelection.targets.filter(t => t.status === 'done').length;
        const total = dailySelection.targets.length;
        return { count: completed, total: total, percent: Math.round((completed / total) * 100) };
    }, [dailySelection]);

    const periodProgress = useMemo(() => {
        const activeClients = clients.filter(c => c.status === 'Active');
        if (activeClients.length === 0) return { count: 0, total: 0, percent: 0 };
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const activeClientNames = new Set(activeClients.map(c => c.name));
        const contactedClientsSet = new Set<string>();
        activities.forEach(act => {
            if (act.completed) {
                const actDate = new Date(act.dueDate);
                if (actDate.getMonth() === currentMonth && actDate.getFullYear() === currentYear) {
                    if (activeClientNames.has(act.relatedTo)) {
                        contactedClientsSet.add(act.relatedTo);
                    }
                }
            }
        });
        const count = contactedClientsSet.size;
        return { count: count, total: activeClients.length, percent: Math.round((count / activeClients.length) * 100) };
    }, [clients, activities]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setAnimatedWidths({ daily: dailyProgress.percent, period: periodProgress.percent });
        }, 100);
        return () => clearTimeout(timer);
    }, [dailyProgress.percent, periodProgress.percent]);

    // --- 2. SELECTION LOGIC ---
    useEffect(() => {
        if (clients.length === 0) return;
        const todayStr = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('nexus_daily_contacts');
        let selection: DailySelection | null = null;
        if (storedData) {
            try { selection = JSON.parse(storedData); } catch (e) { selection = null; }
        }
        if (!selection || selection.date !== todayStr || selection.targets.length === 0) {
            selection = generateNewSelection(todayStr);
        }
        setDailySelection(selection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(selection));
    }, [clients.length]);

    const generateNewSelection = (dateStr: string): DailySelection => {
        const activeClients = clients.filter(c => c.status === 'Active');
        if (activeClients.length <= 3) {
            return { date: dateStr, targets: activeClients.map(c => ({ clientId: c.id, status: 'pending' })) };
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
                    if (!usedIds.has(selected.id)) { targets.push({ clientId: selected.id, status: 'pending' }); usedIds.add(selected.id); break; }
                    attempts++;
                }
            }
        }
        if (baseTier.length > 0) {
            let attempts = 0;
            while(targets.length < 3 && attempts < 20) {
                const randomIndex = Math.floor(Math.random() * baseTier.length);
                const selected = baseTier[randomIndex];
                if (!usedIds.has(selected.id)) { targets.push({ clientId: selected.id, status: 'pending' }); usedIds.add(selected.id); break; }
                attempts++;
            }
        }
        return { date: dateStr, targets };
    };

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

    // FIX: Added toggleProductSelection to handle interest selection in the contact modal
    const toggleProductSelection = (productName: string) => {
        setSelectedProductIds(prev => 
            prev.includes(productName) 
                ? prev.filter(p => p !== productName) 
                : [...prev, productName]
        );
    };

    const handleSubmitContact = () => {
        if (!selectedTarget || !dailySelection) return;
        let finalDescription = `📝 Resumo da Conversa:\n${interactionNote}`;
        if (problemsReported) finalDescription += `\n\n⚠️ Problemas Relatados:\n${problemsReported}`;
        if (selectedProductIds.length > 0) finalDescription += `\n\n🚀 Oportunidades Identificadas:\n${selectedProductIds.join(', ')}`;
        const newActivity: Activity = { id: `ACT-DAILY-${Date.now()}`, title: `Contato Diário: ${selectedTarget.name}`, type: 'Call', dueDate: new Date().toISOString(), completed: true, relatedTo: selectedTarget.name, assignee: currentUser?.id || 'system', description: finalDescription };
        updateClientContact(selectedTarget, newActivity);
        const newTargets = dailySelection.targets.map(t => t.clientId === selectedTarget.id ? { ...t, status: 'done' as const } : t);
        const newSelection = { ...dailySelection, targets: newTargets };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));
        setIsModalOpen(false);
    };

    if (!dailySelection) return null;

    return (
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-2xl border border-slate-700 relative overflow-hidden mb-6 animate-fade-in">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Target size={160} /></div>
            <div className="flex flex-col md:flex-row gap-8 relative z-10">
                <div className="md:w-1/4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-700 pb-4 md:pb-0 md:pr-8">
                    <div>
                        <h3 className="font-bold text-xl flex items-center gap-2 text-indigo-300">
                            <Phone size={24} className="animate-pulse-slow"/> Central de Contatos
                        </h3>
                        <p className="text-xs text-slate-400 mt-2">Relacionamento proativo diário.</p>
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

                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
                    {dailySelection.targets.map((target, idx) => {
                        const client = clients.find(c => c.id === target.clientId);
                        if (!client) return null;
                        const isDone = target.status === 'done';
                        const isHighValue = idx < 2;
                        return (
                            <div key={target.clientId} onClick={() => handleOpenAction(target)} className={`relative p-5 rounded-2xl border transition cursor-pointer group flex flex-col justify-between ${isDone ? 'bg-slate-800/50 border-slate-700 opacity-60' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50 hover:shadow-2xl transform hover:-translate-y-1'}`}>
                                {isDone && <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] rounded-2xl z-20"><div className="bg-green-500 text-white px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-lg transform scale-110"><CheckCircle size={14}/> FEITO</div></div>}
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        {isHighValue ? <span className="text-[10px] font-black bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/40 flex items-center gap-1"><Sparkles size={10}/> VIP</span> : <span className="text-[10px] font-black bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/40">CARTEIRA</span>}
                                        {!isDone && <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping"></div>}
                                    </div>
                                    <h4 className="font-bold text-base text-white group-hover:text-indigo-300 transition-colors">{client.name}</h4>
                                    <p className="text-xs text-slate-400 mt-1">{client.contactPerson}</p>
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-500 font-mono">LTV: R$ {client.ltv?.toLocaleString()}</span>
                                    <span className="text-xs font-black text-indigo-400 group-hover:text-white transition-colors">CONTATAR &rarr;</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {isModalOpen && selectedTarget && createPortal(
                <div className="fixed inset-0 bg-black/80 z-[10000] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800 flex flex-col max-h-[95vh]">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div><h3 className="font-black text-xl text-slate-900 dark:text-white">Concluir Relacionamento</h3><p className="text-xs text-slate-500 font-medium">{selectedTarget.name}</p></div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition"><X size={24}/></button>
                        </div>
                        <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">
                            <div><label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest">O que foi conversado? <span className="text-red-500">*</span></label><textarea className="w-full border border-slate-300 dark:border-slate-700 rounded-2xl p-4 h-24 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none text-sm shadow-inner" placeholder="Ponto principal do contato..." value={interactionNote} onChange={e => setInteractionNote(e.target.value)} autoFocus /></div>
                            <div><label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><ThumbsDown size={14} className="text-red-500"/> Algum problema relatado?</label><textarea className="w-full border border-slate-300 dark:border-slate-700 rounded-2xl p-4 h-20 outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none text-sm shadow-inner" placeholder="Ex: Lentidão no sistema, dúvida técnica..." value={problemsReported} onChange={e => setProblemsReported(e.target.value)} /></div>
                            <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase mb-3 tracking-widest flex items-center gap-2"><Package size={14} className="text-green-500"/> Interesse em Expansão (Upsell)</label>
                                <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto p-1">{products.filter(p => p.active).map(product => { const isSelected = selectedProductIds.includes(product.name); return ( <div key={product.id} onClick={() => toggleProductSelection(product.name)} className={`cursor-pointer p-3 rounded-xl border text-xs font-bold transition flex items-center gap-3 select-none ${isSelected ? 'bg-green-50 dark:bg-green-900/30 border-green-500 text-green-700 dark:text-green-300 shadow-md' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-indigo-400'}`} > <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isSelected ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>{isSelected && <CheckCircle size={12} className="text-white"/>}</div> {product.name} </div> ); })}</div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
                            <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-500 hover:text-slate-900 font-bold text-sm">Descartar</button>
                            <button onClick={handleSubmitContact} disabled={interactionNote.length < 5} className="px-8 py-3 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-indigo-600/20 text-sm" > <Save size={18}/> SALVAR CONTATO </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};