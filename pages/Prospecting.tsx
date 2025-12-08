






import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Target, Search, MapPin, Briefcase, Plus, UserPlus, Sparkles, Building2, Loader2, CheckCircle, ArrowRight, History, Trash2, X } from 'lucide-react';
import { findPotentialLeads } from '../services/geminiService';
import { PotentialLead, Lead, LeadStatus, ProspectingHistoryItem } from '../types';

export const Prospecting: React.FC = () => {
    const { addLead, leads, clients, prospectingHistory, addProspectingHistory, clearProspectingHistory, disqualifiedProspects, disqualifyProspect } = useData();
    const { currentUser } = useAuth();

    // Search State
    const [industry, setIndustry] = useState('');
    const [location, setLocation] = useState('');
    const [keywords, setKeywords] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    
    // Results State
    const [results, setResults] = useState<PotentialLead[]>([]);
    const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set());

    // --- LOGIC: DEDUPLICATION ---
    const filterNewResults = (rawData: PotentialLead[], ignoreHistory: boolean = false) => {
        // Normalize helper
        const normalize = (str: string) => str.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        // 1. Existing Database (Leads + Clients)
        const existingCompanies = new Set([
            ...leads.map(l => normalize(l.company)),
            ...clients.map(c => normalize(c.name))
        ]);

        // 2. Prospecting History (Avoid showing the same "new lead" twice if user ignored it before)
        // Only apply this filter if we are doing a NEW search, not loading history
        const historicalNames = new Set(
            prospectingHistory.flatMap(h => h.results.map(r => normalize(r.companyName)))
        );

        // 3. Disqualified Prospects (Explicitly discarded by user)
        const disqualifiedSet = new Set(disqualifiedProspects);

        // Filter
        return rawData.filter(item => {
            const normalizedName = normalize(item.companyName);
            const isClientOrLead = existingCompanies.has(normalizedName);
            const isDisqualified = disqualifiedSet.has(normalizedName);
            const isInHistory = !ignoreHistory && historicalNames.has(normalizedName);

            // Must NOT be in DB AND Must NOT be in History (if checking) AND Must NOT be Disqualified
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
        try {
            const rawData = await findPotentialLeads(industry, location, keywords);
            
            const uniqueResults = filterNewResults(rawData);

            // Limit to 10 results and ensure unique IDs
            const safeData = uniqueResults.slice(0, 10).map((item, idx) => ({
                ...item, 
                id: `PROSPECT-${Date.now()}-${idx}`
            }));

            setResults(safeData);
            setConvertedIds(new Set()); // Reset converted state for new search
            
            // Save to History (Even if empty, to record the attempt)
            if (safeData.length > 0) {
                const historyItem: ProspectingHistoryItem = {
                    id: `HIST-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    industry,
                    location,
                    keywords: keywords, // Save keywords
                    results: safeData
                };
                addProspectingHistory(historyItem);
            }
            
            if (safeData.length === 0) {
                alert("A IA buscou empresas, mas todas já constam na sua base de clientes, pipeline, histórico ou lista de desqualificados.");
            }

        } catch (error) {
            console.error(error);
            alert("Erro ao buscar leads. Tente novamente.");
        } finally {
            setIsSearching(false);
        }
    };

    const handleConvertToLead = (prospect: PotentialLead) => {
        // Create new Lead object
        const newLead: Lead = {
            id: `L-${Date.now()}`,
            name: "Contato Comercial", // Default contact name as we might not have it
            company: prospect.companyName,
            email: prospect.email || "", 
            phone: prospect.phone || "", 
            value: 0, // Initial value
            status: LeadStatus.NEW,
            source: "Nexus AI Prospecting",
            probability: prospect.matchScore > 80 ? 30 : 10,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            address: prospect.location,
            productInterest: prospect.reason, // Use the reason as interest context
            description: `**Sugestão IA:** ${prospect.suggestedApproach}\n**Tamanho:** ${prospect.estimatedSize}`
        };

        addLead(currentUser, newLead);
        
        // Mark as converted visually
        setConvertedIds(prev => new Set(prev).add(prospect.id));
    };

    const handleDiscard = (prospect: PotentialLead) => {
        if(window.confirm(`Deseja descartar "${prospect.companyName}"? Ela não aparecerá em buscas futuras.`)) {
            disqualifyProspect(prospect.companyName);
            // Remove from current view immediately
            setResults(prev => prev.filter(p => p.id !== prospect.id));
        }
    };

    const loadHistoryItem = (item: ProspectingHistoryItem) => {
        setIndustry(item.industry);
        setLocation(item.location);
        setKeywords(item.keywords || ''); // Restore keywords
        
        // Re-filter results but IGNORE history check (since we are loading history)
        // Only filter out things that are already in DB or Disqualified
        const filteredHistoricalResults = filterNewResults(item.results, true);
        
        setResults(filteredHistoricalResults);
        setConvertedIds(new Set()); // Reset on reload
    };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Target className="text-red-600 dark:text-red-500" /> Nexus Prospect
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Inteligência Artificial para encontrar seu próximo grande cliente.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                {/* Left Column: Search & History */}
                <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden">
                    {/* Search Box */}
                    <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                        <h3 className="font-bold text-slate-900 dark:text-white mb-4">Nova Busca</h3>
                        <form onSubmit={handleSearch} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                                    <Briefcase size={14}/> Setor / Nicho
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors text-sm"
                                    placeholder="Ex: Varejo, Clínicas"
                                    value={industry}
                                    onChange={e => setIndustry(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                                    <MapPin size={14}/> Localização
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors text-sm"
                                    placeholder="Ex: São Paulo"
                                    value={location}
                                    onChange={e => setLocation(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex items-center gap-2">
                                    <Search size={14}/> Palavras-chave
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white transition-colors text-sm"
                                    placeholder="Opcional"
                                    value={keywords}
                                    onChange={e => setKeywords(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={isSearching}
                                className="w-full bg-red-600 text-white font-bold py-2.5 rounded-lg hover:bg-red-700 transition shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm"
                            >
                                {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                {isSearching ? 'Analisando...' : 'Buscar Leads'}
                            </button>
                        </form>
                    </div>

                    {/* History List */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden transition-colors">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                                <History size={16}/> Histórico Recente
                            </h3>
                            {prospectingHistory.length > 0 && (
                                <button onClick={clearProspectingHistory} className="text-xs text-slate-400 hover:text-red-500 flex items-center gap-1">
                                    <Trash2 size={12}/> Limpar
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                            {prospectingHistory.length === 0 ? (
                                <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs italic">
                                    Nenhuma busca recente.
                                </div>
                            ) : (
                                prospectingHistory.slice(0, 10).map((item) => (
                                    <div 
                                        key={item.id}
                                        onClick={() => loadHistoryItem(item)}
                                        className="p-3 rounded-lg border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition group"
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <p className="font-bold text-slate-800 dark:text-white text-xs truncate">{item.industry}</p>
                                            <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.location}</p>
                                        {item.keywords && <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate italic mt-0.5">Key: {item.keywords}</p>}
                                        <div className="mt-2 flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded w-fit">
                                            <CheckCircle size={10}/> {item.results.length} resultados
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Results Grid */}
                <div className="lg:col-span-3 flex flex-col overflow-hidden h-full">
                    {results.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                Resultados da Busca <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs px-2 py-1 rounded-full">{results.length}</span>
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {results.map((prospect) => {
                                    const isConverted = convertedIds.has(prospect.id);
                                    
                                    return (
                                        <div key={prospect.id} className={`bg-white dark:bg-slate-800 rounded-xl border p-6 flex flex-col transition-all duration-300 relative group ${isConverted ? 'border-green-500 ring-1 ring-green-500 opacity-60' : 'border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-red-300 dark:hover:border-red-500'}`}>
                                            {/* Discard Button (Top Right) */}
                                            {!isConverted && (
                                                <button 
                                                    onClick={() => handleDiscard(prospect)}
                                                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition"
                                                    title="Descartar (Não mostrar novamente)"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}

                                            <div className="flex justify-between items-start mb-4 pr-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300">
                                                        <Building2 size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight line-clamp-1" title={prospect.companyName}>{prospect.companyName}</h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">{prospect.industry} • {prospect.location}</p>
                                                    </div>
                                                </div>
                                                <div className={`flex flex-col items-end shrink-0 ${prospect.matchScore >= 80 ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}`}>
                                                    <span className="text-2xl font-bold">{prospect.matchScore}%</span>
                                                    <span className="text-[10px] uppercase font-bold tracking-wider">Match</span>
                                                </div>
                                            </div>

                                            <div className="space-y-4 flex-1">
                                                <div className="bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold mb-1">Por que prospectar?</p>
                                                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug line-clamp-3" title={prospect.reason}>{prospect.reason}</p>
                                                </div>

                                                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                                                    <span className="font-bold">Porte Estimado:</span> {prospect.estimatedSize}
                                                </div>

                                                {/* Contact Info (If Available) */}
                                                {(prospect.email || prospect.phone) && (
                                                    <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-700 pt-2">
                                                        {prospect.email && <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">@</div> {prospect.email}</div>}
                                                        {prospect.phone && <div className="flex items-center gap-2"><div className="w-4 h-4 bg-slate-100 dark:bg-slate-700 rounded flex items-center justify-center">#</div> {prospect.phone}</div>}
                                                    </div>
                                                )}

                                                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-100 dark:border-blue-800">
                                                    <p className="text-[10px] text-blue-500 dark:text-blue-300 uppercase font-bold mb-1 flex items-center gap-1"><Sparkles size={10}/> Dica de Abordagem</p>
                                                    <p className="text-sm text-blue-800 dark:text-blue-200 italic line-clamp-3" title={prospect.suggestedApproach}>"{prospect.suggestedApproach}"</p>
                                                </div>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                                <button 
                                                    onClick={() => handleConvertToLead(prospect)}
                                                    disabled={isConverted}
                                                    className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition ${isConverted ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 cursor-default' : 'bg-slate-900 dark:bg-slate-700 text-white hover:bg-slate-800 dark:hover:bg-slate-600 shadow-sm'}`}
                                                >
                                                    {isConverted ? (
                                                        <><CheckCircle size={18}/> Adicionado ao Pipeline</>
                                                    ) : (
                                                        <><UserPlus size={18}/> Adicionar Lead</>
                                                    )}
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
                            <p className="text-center max-w-md">Utilize os filtros à esquerda para iniciar a prospecção inteligente. A IA irá ignorar empresas que já constam na sua base, histórico ou lista de exclusão.</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center">
                            <Loader2 size={48} className="text-red-500 animate-spin mb-4"/>
                            <p className="text-slate-500 font-bold">Analisando o mercado...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
