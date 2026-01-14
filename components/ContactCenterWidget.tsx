
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Client, Activity } from '../types';
// Fix: Added Plus to the lucide-react import list to resolve the "Cannot find name 'Plus'" error on line 256.
import { Phone, CheckCircle, Target, UserPlus, Sparkles, Package, ThumbsDown, Trophy, Save, X, Calendar, PlusCircle, PartyPopper, Loader2, PhoneForwarded, BarChart3, ShoppingCart, Tag, Plus } from 'lucide-react';

interface DailyTarget {
    clientId: string;
    status: 'pending' | 'done';
}

interface DailySelection {
    date: string;
    targets: DailyTarget[];
}

export const ContactCenterWidget: React.FC = () => {
    const { clients, updateClientContact, addSystemNotification, products } = useData();
    const { currentUser } = useAuth();

    const [dailySelection, setDailySelection] = useState<DailySelection | null>(null);
    const [selectedTarget, setSelectedTarget] = useState<Client | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    const [interactionNote, setInteractionNote] = useState('');
    const [problemsReported, setProblemsReported] = useState('');
    const [futureInterests, setFutureInterests] = useState<string[]>([]);

    // --- LOGICA DE SELEÇÃO INTELIGENTE ---
    useEffect(() => {
        if (clients.length === 0) return;

        const todayStr = new Date().toISOString().split('T')[0];
        const storedData = localStorage.getItem('nexus_daily_contacts');
        let selection: DailySelection | null = null;

        if (storedData) {
            try { 
                const parsed = JSON.parse(storedData);
                if (parsed.date === todayStr && parsed.targets.length > 0) {
                    selection = parsed;
                }
            } catch (e) { selection = null; }
        }

        if (!selection) {
            const active = clients.filter(c => c.status === 'Active');
            const sortedByLastContact = [...active].sort((a, b) => {
                const dateA = a.lastContact ? new Date(a.lastContact).getTime() : 0;
                const dateB = b.lastContact ? new Date(b.lastContact).getTime() : 0;
                return dateA - dateB;
            });

            const top3 = sortedByLastContact.slice(0, 3);
            selection = { 
                date: todayStr, 
                targets: top3.map(c => ({ clientId: c.id, status: 'pending' })) 
            };
            setDailySelection(selection);
            localStorage.setItem('nexus_daily_contacts', JSON.stringify(selection));
        } else {
            setDailySelection(selection);
        }
    }, [clients]);

    // --- CÁLCULO DE MÉTRICAS ---
    const metrics = useMemo(() => {
        const completedDaily = dailySelection?.targets.filter(t => t.status === 'done').length || 0;
        const totalDaily = dailySelection?.targets.length || 0;
        const dailyPercent = totalDaily > 0 ? Math.round((completedDaily / totalDaily) * 100) : 0;
        const activeClients = clients.filter(c => c.status === 'Active');
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const contactedThisMonth = activeClients.filter(c => c.lastContact && new Date(c.lastContact) >= startOfMonth).length;
        const monthlyPercent = activeClients.length > 0 ? Math.round((contactedThisMonth / activeClients.length) * 100) : 0;

        return {
            daily: { count: completedDaily, total: totalDaily, percent: dailyPercent },
            monthly: { count: contactedThisMonth, total: activeClients.length, percent: monthlyPercent }
        };
    }, [dailySelection, clients]);

    const handleOpenAction = (target: DailyTarget) => {
        if (target.status === 'done') return;
        const client = clients.find(c => c.id === target.clientId);
        if (client) {
            setSelectedTarget(client);
            setInteractionNote('');
            setProblemsReported('');
            setFutureInterests([]);
            setIsModalOpen(true);
        }
    };

    const toggleInterest = (productName: string) => {
        setFutureInterests(prev => 
            prev.includes(productName) ? prev.filter(p => p !== productName) : [...prev, productName]
        );
    };

    const handleSubmitContact = async () => {
        if (!selectedTarget || !dailySelection) return;
        
        const interestStr = futureInterests.length > 0 ? ` | INTERESSES FUTUROS: ${futureInterests.join(', ')}` : '';
        const finalDescription = `[CENTRAL] ${interactionNote}${problemsReported ? ` | RECLAMAÇÃO: ${problemsReported}` : ''}${interestStr}`;
        
        const newActivity: Activity = { 
            id: `ACT-DAILY-${Date.now()}`, 
            title: `Central: ${selectedTarget.name}`, 
            type: 'Call', 
            dueDate: new Date().toISOString(), 
            completed: true, 
            relatedTo: selectedTarget.name, 
            assignee: currentUser?.id || 'system', 
            description: finalDescription,
            metadata: {
                interests: futureInterests,
                hasProblems: !!problemsReported
            }
        };

        await updateClientContact(selectedTarget, newActivity);
        
        const newTargets = dailySelection.targets.map(t => t.clientId === selectedTarget.id ? { ...t, status: 'done' as const } : t);
        const newSelection = { ...dailySelection, targets: newTargets };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));
        setIsModalOpen(false);
        addSystemNotification('Sucesso', 'Contato registrado.', 'success');
    };

    const handleRequestMore = () => {
        const currentIds = new Set(dailySelection?.targets.map(t => t.clientId) || []);
        const next = clients
            .filter(c => c.status === 'Active' && !currentIds.has(c.id))
            .sort((a, b) => (a.lastContact ? new Date(a.lastContact).getTime() : 0) - (b.lastContact ? new Date(b.lastContact).getTime() : 0))
            .slice(0, 3);
        if (next.length === 0) return;
        const newSelection = {
            ...dailySelection!,
            targets: [...(dailySelection?.targets || []), ...next.map(c => ({ clientId: c.id, status: 'pending' as const }))]
        };
        setDailySelection(newSelection);
        localStorage.setItem('nexus_daily_contacts', JSON.stringify(newSelection));
    };

    return (
        <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl border border-slate-800 relative overflow-hidden mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="bg-indigo-600 p-2 rounded-xl"><Phone size={20}/></div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter">Central de Relacionamento</h3>
                    </div>
                    <p className="text-slate-400 text-sm font-medium">Foco em manter a carteira ativa e reduzir o Churn.</p>
                </div>

                <div className="flex items-center gap-8 bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Meta Diária</p>
                            <p className="text-lg font-black">{metrics.daily.count} / {metrics.daily.total}</p>
                        </div>
                        <div className="w-12 h-12 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * metrics.daily.percent) / 100} strokeLinecap="round" className="text-indigo-500 transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black">{metrics.daily.percent}%</div>
                        </div>
                    </div>
                    <div className="h-10 w-px bg-slate-700"></div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Cobertura Mês</p>
                            <p className="text-lg font-black">{metrics.monthly.percent}%</p>
                        </div>
                        <div className="w-12 h-12 relative">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-700" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={125.6} strokeDashoffset={125.6 - (125.6 * metrics.monthly.percent) / 100} strokeLinecap="round" className="text-emerald-500 transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-emerald-400"><BarChart3 size={10}/></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-8">
                {dailySelection?.targets.map((target) => {
                    const client = clients.find(c => c.id === target.clientId);
                    if (!client) return null;
                    const isDone = target.status === 'done';
                    return (
                        <div 
                            key={target.clientId} 
                            onClick={() => handleOpenAction(target)}
                            className={`p-6 rounded-[2rem] border-2 transition-all group relative cursor-pointer flex flex-col h-full ${isDone ? 'bg-slate-800/30 border-slate-800 opacity-50' : 'bg-white/5 border-white/10 hover:border-indigo-500 hover:bg-white/10'}`}
                        >
                            {isDone && <CheckCircle className="absolute top-4 right-4 text-emerald-500" size={20}/>}
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">{client.segment}</p>
                            <h4 className="font-bold text-base leading-tight mb-4 line-clamp-1">{client.name}</h4>
                            <div className="mt-auto flex items-center justify-between">
                                <span className="text-[9px] text-slate-500 font-mono">
                                    {client.lastContact ? `Ult: ${new Date(client.lastContact).toLocaleDateString()}` : 'Nunca'}
                                </span>
                                {!isDone && <PhoneForwarded size={16} className="text-slate-500 group-hover:text-indigo-400 transition-colors"/>}
                            </div>
                        </div>
                    );
                })}
                <button onClick={handleRequestMore} className="p-6 rounded-[2rem] border-2 border-dashed border-slate-700 flex flex-col items-center justify-center text-slate-500 hover:text-indigo-400 hover:border-indigo-400 transition-all bg-transparent">
                    <PlusCircle size={24} className="mb-2"/><span className="text-[9px] font-black uppercase tracking-widest">Nomes Extras</span>
                </button>
            </div>

            {isModalOpen && selectedTarget && createPortal(
                <div className="fixed inset-0 bg-slate-950/90 z-[10000] flex items-center justify-center p-4 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                            <div>
                                <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tighter">Registrar Contato</h3>
                                <p className="text-sm text-indigo-600 font-bold">{selectedTarget.name}</p>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="flex items-center gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                                <Phone className="text-indigo-600" size={24}/>
                                <div>
                                    <p className="text-[10px] font-black text-indigo-400 uppercase">Contato Direto</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white">{selectedTarget.phone || '(S/ Telefone)'}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1">Observações da Chamada</label>
                                <textarea className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600 h-24 resize-none" placeholder="O que foi conversado?" value={interactionNote} onChange={e => setInteractionNote(e.target.value)} />
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2">
                                    <Tag size={14} className="text-amber-500"/> Prováveis Contratações (Interesse de Upsell)
                                </label>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {products.filter(p => p.active).map(prod => (
                                        <button
                                            key={prod.id}
                                            type="button"
                                            onClick={() => toggleInterest(prod.name)}
                                            className={`p-3 rounded-xl border-2 text-[10px] font-black uppercase transition-all flex items-center gap-2 ${futureInterests.includes(prod.name) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-400'}`}
                                        >
                                            {futureInterests.includes(prod.name) ? <CheckCircle size={12}/> : <Plus size={12}/>}
                                            <span className="truncate">{prod.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black text-slate-400 uppercase ml-1 flex items-center gap-2"><ThumbsDown size={14} className="text-red-500"/> Pontos de Atenção</label>
                                <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-red-500" placeholder="Alguma queixa ou problema?" value={problemsReported} onChange={e => setProblemsReported(e.target.value)} />
                            </div>

                            <button onClick={handleSubmitContact} disabled={!interactionNote} className="w-full bg-indigo-600 text-white font-black py-5 rounded-[2rem] hover:bg-indigo-700 transition shadow-2xl disabled:opacity-50 uppercase tracking-widest text-xs">SALVAR ATIVIDADE</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
