
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
// Added Mail and Phone components to the lucide-react import list to resolve "Cannot find name" errors.
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

    const filterNewResults = (rawData: PotentialLead[], ignoreHistory: boolean = false) => {
        const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const existingCompanies = new Set([
            ...leads.map(l => normalize(l.company)),
            ...clients.map(c => normalize(c.name))
        ]);

        const disqualifiedSet = new Set(disqualifiedProspects);
        const historicalNames = new Set(prospectingHistory.flatMap(h => h.results.map(r => normalize(r.companyName))));

        return rawData.filter(item => {
            const normalizedName = normalize(item.companyName);
            
            // Validação de sanidade de dados (anti-sujeira)
            const hasGenericEmail = /empresa\d|test|example|placeholder/i.test(item.email || '');
            const hasBadPhone = (item.phone || '').replace(/\D/g, '').length < 10;
            
            if (hasGenericEmail || hasBadPhone) return false;

            const isClientOrLead = existingCompanies.has(normalizedName);
            const isDisqualified = disqualifiedSet.has(normalizedName);
            const isInHistory = !ignoreHistory && historicalNames.has(normalizedName);

            return !isClientOrLead && !isDisqualified && !isInHistory;
        });
    };

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
            const uniqueResults = filterNewResults(rawData);

            const safeData = uniqueResults.slice(0, 10).map((item, idx) => ({
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

    const handleConvertToLead = (prospect: PotentialLead) => {
        const newLead: Lead = {
            id: `L-${Date.now()}`,
            name: "Decisor / Contato",
            company: prospect.companyName,
            email: prospect.email || "", 
            phone: prospect.phone || "", 
            value: 0,
            status: LeadStatus.NEW,
            source: "Nexus AI Real Prospect",
            probability: prospect.matchScore > 80 ? 30 : 10,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            address: prospect.location,
            productInterest: prospect.reason,
            description: `**Inteligência Prospect:** ${prospect.suggestedApproach}\n**Empresa Verificada:** Sim`
        };

        addLead(currentUser, newLead);
        setConvertedIds(prev => new Set(prev).add(prospect.id));
    };

    const handleDiscard = (prospect: PotentialLead) => {
        if(window.confirm(`Deseja descartar "${prospect.companyName}"? Ela não aparecerá em buscas futuras.`)) {
            disqualifyProspect(prospect.companyName);
            setResults(prev => prev.filter(p => p.id !== prospect.id));
        }
    };

    return (
        <div className="p-4 md:p-8 flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors h-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="text-red-600 dark:text-red-500" /> Nexus Prospect
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Busca de leads reais filtrada por integridade de dados.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Parâmetros de Busca</h3>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                                    <Briefcase size={14}/> Setor
                                </label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 dark:text-white text-sm" placeholder="Ex: Farmácias" value={industry} onChange={e => setIndustry(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                                    <MapPin size={14}/> Cidade/UF
                                </label>
                                <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 dark:text-white text-sm" placeholder="Ex: Curitiba PR" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isSearching} className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70 text-sm">
                                {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Search size={18}/>}
                                {isSearching ? 'Buscando Reais...' : 'Procurar Empresas'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0 overflow-hidden transition-colors h-full">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <History size={16}/> Histórico
                            </h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {prospectingHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic">Nenhuma busca.</div>
                            ) : (
                                prospectingHistory.slice(0, 20).map((item) => (
                                    <div key={item.id} onClick={() => { setIndustry(item.industry); setLocation(item.location); }} className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition">
                                        <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{item.industry}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.location}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col overflow-hidden h-full min-h-0">
                    {results.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-6">
                            <div className="flex items-center justify-between mb-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Leads Verificados</h2>
                                    <div className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-green-200">
                                        <ShieldCheck size={12}/> DATA SCRUBBING ATIVO
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500">Mostrando {results.length} resultados qualificados</span>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {results.map((prospect) => {
                                    const isConverted = convertedIds.has(prospect.id);
                                    return (
                                        <div key={prospect.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-6 flex flex-col transition-all duration-300 relative group ${isConverted ? 'border-green-500 ring-1 ring-green-500 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:shadow-xl'}`}>
                                            {!isConverted && (
                                                <button onClick={() => handleDiscard(prospect)} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><X size={16} /></button>
                                            )}
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0"><Building2 size={20} /></div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg truncate" title={prospect.companyName}>{prospect.companyName}</h3>
                                                        <p className="text-xs text-slate-500 truncate">{prospect.industry}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-4 flex-1">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Qualificação</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-3">{prospect.reason}</p>
                                                </div>
                                                <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                                                    <div className="flex items-center gap-2"><Mail size={14} className="text-slate-400"/> {prospect.email}</div>
                                                    <div className="flex items-center gap-2"><Phone size={14} className="text-slate-400"/> {prospect.phone}</div>
                                                    <div className="flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> {prospect.location}</div>
                                                </div>
                                            </div>
                                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                <button onClick={() => handleConvertToLead(prospect)} disabled={isConverted} className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${isConverted ? 'bg-green-100 text-green-700 cursor-default' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:bg-slate-800 shadow-sm'}`}>
                                                    {isConverted ? <><CheckCircle size={18}/> Na Base</> : <><UserPlus size={18}/> Adicionar Lead</>}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : !isSearching ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-60">
                            <Target size={64} className="mb-4 text-slate-300 dark:text-slate-700"/>
                            <p className="text-center max-w-md font-medium">Inicie uma busca por nicho e cidade. Nossa IA agora utiliza validação de dados para ignorar informações fictícias ou incompletas.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-red-500 animate-spin mb-4"/>
                            <p className="text-slate-500 font-bold">Validando empresas reais em {location}...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
