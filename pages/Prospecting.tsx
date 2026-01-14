
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Target, Search, MapPin, Briefcase, Plus, UserPlus, Sparkles, Building2, Loader2, CheckCircle, ArrowRight, History, Trash2, X, AlertCircle, ShieldCheck, Mail, Phone } from 'lucide-react';
import { findPotentialLeads } from '../services/geminiService';
import { PotentialLead, Lead, LeadStatus, ProspectingHistoryItem } from '../types';
import { Badge } from '../components/Widgets';

export const Prospecting: React.FC = () => {
    const { addLead, prospectingHistory, addProspectingHistory, clearProspectingHistory, addSystemNotification } = useData();
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
            
            const safeData = (Array.isArray(rawData) ? rawData : []).slice(0, 10).map((item, idx) => ({
                ...item, 
                id: item.id || `PROSPECT-${Date.now()}-${idx}`
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
                    organizationId: currentUser?.organizationId || 'org-1'
                };
                await addProspectingHistory(historyItem);
            }

        } catch (error) {
            console.error(error);
            addSystemNotification("Erro de IA", "Não foi possível buscar leads. Verifique sua cota da API Gemini.", "alert");
        } finally {
            setIsSearching(false);
        }
    };

    const handleLoadHistory = (item: ProspectingHistoryItem) => {
        setIndustry(item.industry);
        setLocation(item.location);
        setKeywords(item.keywords || '');
        setResults(Array.isArray(item.results) ? item.results : []);
        setConvertedIds(new Set());
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleConvertToLead = async (prospect: PotentialLead) => {
        if (!prospect || !currentUser) return;

        // Criar o objeto Lead seguindo estritamente a interface e as necessidades do DataContext
        const newLead: Lead = {
            id: `L-AI-${Date.now()}`,
            name: prospect.companyName || "Contato Principal", // No CRM usamos o nome da empresa se o contato for vago
            company: prospect.companyName || 'Empresa Localizada',
            email: prospect.email || "", 
            phone: prospect.phone || "", 
            value: 0,
            status: LeadStatus.NEW,
            source: "Soft Prospect IA",
            probability: (prospect.matchScore || 50) > 80 ? 30 : 10,
            createdAt: new Date().toISOString(),
            lastContact: new Date().toISOString(),
            address: prospect.location,
            productInterest: prospect.reason,
            description: `**Inteligência Prospect:** ${prospect.suggestedApproach}`,
            organizationId: currentUser.organizationId || 'org-1'
        };

        try {
            await addLead(currentUser, newLead);
            setConvertedIds(prev => new Set(prev).add(prospect.id));
            addSystemNotification("Lead Importado", `${prospect.companyName} foi enviado para o CRM.`, "success");
        } catch (error) {
            console.error("Conversion Error:", error);
            addSystemNotification("Erro na Importação", "Falha ao salvar no banco de dados.", "alert");
        }
    };

    return (
        <div className="p-4 md:p-8 flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors h-full overflow-hidden">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter flex items-center gap-3">
                        <Target className="text-red-600 dark:text-red-500" /> Soft Prospect
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Busca estratégica de leads reais potencializada por Inteligência Artificial.</p>
                </div>
                {prospectingHistory.length > 0 && (
                    <button onClick={() => { if(confirm("Deseja apagar todo o histórico de buscas?")) clearProspectingHistory(); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-1.5 transition tracking-widest">
                        <Trash2 size={14}/> Limpar Histórico
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-1 flex flex-col gap-6 h-full min-h-0">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 transition-colors shrink-0">
                        <h3 className="font-black text-slate-900 dark:text-white mb-6 uppercase text-[10px] tracking-[0.2em] text-slate-400">Nova Varredura</h3>
                        <form onSubmit={handleSearch} className="space-y-5">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2"><Briefcase size={14}/> Setor de Atuação</label>
                                <input type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:border-red-500 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold text-sm" placeholder="Ex: Estacionamentos" value={industry} onChange={e => setIndustry(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase mb-2 ml-1 flex items-center gap-2"><MapPin size={14}/> Região / Cidade</label>
                                <input type="text" className="w-full border-2 border-slate-100 dark:border-slate-700 rounded-2xl p-3.5 outline-none focus:border-red-500 bg-slate-50 dark:bg-slate-900 dark:text-white font-bold text-sm" placeholder="Ex: Santos SP" value={location} onChange={e => setLocation(e.target.value)} />
                            </div>
                            <button type="submit" disabled={isSearching} className="w-full bg-red-600 text-white font-black py-4 rounded-2xl hover:bg-red-700 transition flex items-center justify-center gap-2 disabled:opacity-70 text-xs uppercase tracking-widest shadow-xl shadow-red-600/20">
                                {isSearching ? <Loader2 className="animate-spin" size={18}/> : <Sparkles size={18}/>}
                                {isSearching ? 'IA VARRENDO...' : 'EXECUTAR BUSCA IA'}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 min-h-0 overflow-hidden transition-colors h-full">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center shrink-0">
                            <h3 className="font-black text-slate-900 dark:text-white text-[10px] uppercase tracking-widest flex items-center gap-2 text-slate-400"><History size={16}/> Varreduras Recentes</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3">
                            {prospectingHistory.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase italic tracking-widest">Nenhuma busca salva</div>
                            ) : (
                                prospectingHistory.map((item) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => handleLoadHistory(item)} 
                                        className="p-4 rounded-2xl border-2 border-slate-50 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-900 group cursor-pointer transition-all shadow-sm"
                                    >
                                        <p className="font-black text-slate-800 dark:text-white text-xs uppercase truncate leading-tight mb-1">{item.industry}</p>
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{item.location}</p>
                                            <span className="text-[9px] font-mono text-slate-300">{Array.isArray(item.results) ? item.results.length : 0} L</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-3 flex flex-col overflow-hidden h-full min-h-0">
                    {results.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 h-fit animate-fade-in">
                            {results.map((prospect) => (
                                <div key={prospect.id} className={`bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 p-8 flex flex-col transition-all duration-300 relative group ${convertedIds.has(prospect.id) ? 'border-green-500 opacity-60 scale-95' : 'border-slate-100 dark:border-slate-700 hover:border-red-500 hover:shadow-2xl'}`}>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-inner"><Building2 size={24} /></div>
                                        <div className="min-w-0">
                                            <h3 className="font-black text-slate-900 dark:text-white text-lg truncate uppercase tracking-tighter">{prospect.companyName}</h3>
                                            <Badge color="gray">{prospect.industry?.toUpperCase()}</Badge>
                                        </div>
                                    </div>
                                    
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 mb-6 flex-1 shadow-inner">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Match IA: {prospect.matchScore}%</span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-4">"{prospect.reason}"</p>
                                    </div>

                                    <div className="space-y-2 mb-6">
                                        <div className="flex items-center gap-2 text-[10px] text-slate-500 font-bold uppercase">
                                            <MapPin size={12}/> {prospect.location}
                                        </div>
                                        {prospect.phone && (
                                            <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-black">
                                                <Phone size={12}/> {prospect.phone}
                                            </div>
                                        )}
                                    </div>

                                    <button 
                                        onClick={() => handleConvertToLead(prospect)} 
                                        disabled={convertedIds.has(prospect.id)} 
                                        className={`w-full py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all ${convertedIds.has(prospect.id) ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200 cursor-default' : 'bg-slate-900 dark:bg-white dark:text-slate-900 text-white hover:scale-[1.02] shadow-xl hover:bg-red-600'}`}
                                    >
                                        {convertedIds.has(prospect.id) ? <><CheckCircle size={16}/> IMPORTADO</> : <><UserPlus size={16}/> IMPORTAR PARA CRM</>}
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-400 dark:text-slate-600 opacity-40 p-10 text-center animate-pulse">
                            <Target size={120} className="mb-8 text-slate-200 dark:text-slate-800"/>
                            <h2 className="text-2xl font-black uppercase tracking-widest mb-4">Aguardando Comando</h2>
                            <p className="max-w-md font-bold uppercase text-xs tracking-[0.2em] leading-loose">Soft Prospect utiliza os motores de IA Pro para localizar decisores e empresas reais baseados nos seus critérios de segmentação.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
