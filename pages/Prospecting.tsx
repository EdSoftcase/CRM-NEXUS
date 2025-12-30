
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Target, Search, MapPin, Briefcase, Plus, UserPlus, Sparkles, Building2, Loader2, CheckCircle, ArrowRight, History, Trash2, X, AlertCircle, ShieldCheck, Mail, Phone } from 'lucide-react';
import { findPotentialLeads } from '../services/geminiService';
import { PotentialLead, Lead, LeadStatus, ProspectingHistoryItem } from '../types';

export const Prospecting: React.FC = () => {
    const { addLead, leads, clients, prospectingHistory, addProspectingHistory, clearProspectingHistory, disqualifiedProspects, disqualifyProspect } = useData();
    const { currentUser } = useAuth();

    const [industry, setIndustry] = useState('');
    const [location, setLocation] = useState('');
    const [keywords, setKeywords] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [results, setResults] = useState<PotentialLead[]>([]);
    const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!industry || !location) {
            alert("Por favor, preencha o setor e a localização.");
            return;
        }

        setIsSearching(true);
        setResults([]);
        
        try {
            const rawData = await findPotentialLeads(industry, location, keywords);
            
            // Simulação de filtro de duplicatas e blacklist (Scrubbing)
            const safeData = rawData.slice(0, 10).map((item, idx) => ({
                ...item, 
                id: `PROSPECT-${Date.now()}-${idx}`
            }));

            setResults(safeData);
            setConvertedIds(new Set());
            
            if (safeData.length > 0) {
                const historyItem: ProspectingHistoryItem = {
                    id: `HIST-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    industry,
                    location,
                    keywords: keywords,
                    results: safeData,
                    organizationId: currentUser?.organizationId
                };
                addProspectingHistory(historyItem);
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao buscar leads. Tente novamente.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleLoadHistory = (item: ProspectingHistoryItem) => {
        setIndustry(item.industry);
        setLocation(item.location);
        setKeywords(item.keywords || '');
        setResults(item.results);
        setConvertedIds(new Set());
    };

    const handleConvertToLead = (prospect: PotentialLead) => {
        const newLead: Lead = {
            id: `L-${Date.now()}`,
            name: "Decisor / Contato",
            company: prospect.companyName,
            email: prospect.email || "", 
            phone: prospect.phone || "", 
            value: 0,
            status: LeadStatus.NEW,
            source: "Soft Prospect IA",
            probability: prospect.matchScore > 80 ? 30 : 10,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            address: prospect.location,
            productInterest: prospect.reason,
            description: `**Inteligência Prospect:** ${prospect.suggestedApproach}`
        };

        addLead(currentUser, newLead);
        setConvertedIds(prev => new Set(prev).add(prospect.id));
    };

    return (
        <div className="p-4 md:p-8 flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors h-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="text-red-600 dark:text-red-500" /> Soft Prospect
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Busca de leads reais filtrada por integridade de dados.</p>
                </div>
                {prospectingHistory.length > 0 && (
                    <button onClick={clearProspectingHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1 transition">
                        <Trash2 size={14}/> Limpar Histórico
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4 uppercase text-xs tracking-widest text-slate-400">Nova Busca</h3>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2"><Briefcase size={14}/> Setor</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 dark:text-white text-sm" placeholder="Ex: Farmácias" value={industry} onChange={e => setIndustry(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2"><MapPin size={14}/> Cidade/UF</label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 dark:text-white text-sm" placeholder="Ex: Curitiba PR" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isSearching} className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70 text-sm shadow-lg shadow-red-600/20">
                                {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                                {isSearching ? 'Pesquisando...' : 'Buscar'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0 overflow-hidden transition-colors h-full">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2"><History size={16}/> Recentes</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {prospectingHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic">Nenhuma busca salva.</div>
                            ) : (
                                prospectingHistory.map((item) => (
                                    <div key={item.id} onClick={() => handleLoadHistory(item)} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-900 group cursor-pointer transition">
                                        <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{item.industry}</p>
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{item.location}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col overflow-hidden h-full min-h-0">
                    {results.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 h-fit">
                            {results.map((prospect) => (
                                <div key={prospect.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-6 flex flex-col transition-all duration-300 relative group ${convertedIds.has(prospect.id) ? 'border-green-500 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:shadow-xl'}`}>
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0"><Building2 size={20} /></div>
                                        <div className="min-w-0"><h3 className="font-bold text-slate-900 dark:text-white text-lg truncate">{prospect.companyName}</h3><p className="text-xs text-slate-500 truncate">{prospect.industry}</p></div>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 mb-4 flex-1">
                                        <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-4">{prospect.reason}</p>
                                    </div>
                                    <button onClick={() => handleConvertToLead(prospect)} disabled={convertedIds.has(prospect.id)} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${convertedIds.has(prospect.id) ? 'bg-green-100 text-green-700 cursor-default' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 shadow-sm'}`}>
                                        {convertedIds.has(prospect.id) ? <><CheckCircle size={18}/> Na Base</> : <><UserPlus size={18}/> Adicionar Lead</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-60">
                            <Target size={64} className="mb-4 text-slate-300 dark:text-slate-700"/>
                            <p className="text-center max-w-md font-medium px-6">Soft Prospect utiliza IA para buscar empresas reais. O histórico de buscas aparecerá aqui.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
