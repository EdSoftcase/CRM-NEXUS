
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Competitor, MarketTrend } from '../types';
import { analyzeCompetitor, fetchMarketTrends } from '../services/geminiService';
import { Sword, Globe, Plus, X, Zap, Shield, TrendingUp, TrendingDown, RefreshCw, Trash2, Eye, Building2, BrainCircuit, Loader2, Sparkles, Clock, CheckCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../components/Widgets';

export const CompetitiveIntelligence: React.FC = () => {
    const { competitors, marketTrends, addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends, addSystemNotification, isSyncing, refreshData } = useData();
    const { currentUser } = useAuth();

    // UI States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUpdatingRadar, setIsUpdatingRadar] = useState(false);
    
    // Form State
    const [newCompForm, setNewCompForm] = useState({ name: '', website: '', sector: '' });

    const handleAddCompetitor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompForm.name) return;

        const newCompetitor: Competitor = {
            id: `COMP-${Date.now()}`,
            name: newCompForm.name,
            website: newCompForm.website,
            sector: newCompForm.sector || 'Tecnologia',
            organizationId: currentUser?.organizationId
        };

        await addCompetitor(currentUser, newCompetitor);
        setIsAddModalOpen(false);
        setNewCompForm({ name: '', website: '', sector: '' });
        addSystemNotification("Monitoramento Ativo", `${newCompetitor.name} adicionado.`, "success");
    };

    const handleUpdateRadar = async () => {
        setIsUpdatingRadar(true);
        try {
            const trends = await fetchMarketTrends(currentUser?.managedGroupName || "Tecnologia de Automação");
            setMarketTrends(trends);
            addSystemNotification("Radar Atualizado", "Tendências mapeadas via IA.", "success");
        } catch (error) {
            addSystemNotification("Falha no Radar", "Erro ao conectar com a IA.", "alert");
        } finally {
            setIsUpdatingRadar(false);
        }
    };

    const handleRunAnalysis = async (comp: Competitor) => {
        setIsAnalyzing(true);
        setSelectedCompetitor(comp);
        setIsAnalysisModalOpen(true);

        try {
            const analysisResult = await analyzeCompetitor(comp.name, comp.website || '', comp.sector || '');
            if (analysisResult && Object.keys(analysisResult).length > 0) {
                const updatedCompetitor = {
                    ...comp,
                    ...analysisResult,
                    lastAnalysis: new Date().toISOString()
                };
                
                // Persiste no banco de dados
                await updateCompetitor(currentUser, updatedCompetitor);
                setSelectedCompetitor(updatedCompetitor);
            }
        } catch (error) {
            console.error("Analysis Error:", error);
            addSystemNotification("Erro na Análise", "Falha ao processar inteligência.", "alert");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Helper crucial: Garante que o retorno nunca seja um objeto sendo renderizado como texto
    const safeArray = (val: any): string[] => {
        if (!val) return [];
        if (Array.isArray(val)) return val.map(v => typeof v === 'object' ? JSON.stringify(v) : String(v));
        if (typeof val === 'string') return [val];
        return [];
    };

    const safeString = (val: any): string => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
    };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sword className="text-red-600 dark:text-red-500" /> Nexus Spy
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Inteligência Competitiva e Radar de Mercado.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button onClick={() => refreshData()} className="p-2 text-slate-400 hover:text-indigo-500 transition-colors" title="Sincronizar Banco">
                        <RefreshCw size={18} className={isSyncing ? 'animate-spin' : ''}/>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/20 transition">
                        <Plus size={18}/> Monitorar Empresa
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl h-full border border-slate-800 overflow-hidden relative flex flex-col">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-slate-800 pb-4">
                            <BrainCircuit className="text-red-400" size={20}/> Radar de Mercado
                        </h3>
                        
                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-1">
                            {marketTrends.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 text-center">
                                    <Sparkles size={40} className="mb-4" />
                                    <p className="text-xs italic">Atualize o radar para mapear o setor.</p>
                                </div>
                            ) : (
                                marketTrends.map((trend, i) => (
                                    <div key={trend.id || i} className="bg-white/5 border border-white/10 rounded-2xl p-4 transition hover:bg-white/10">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-xs text-red-400 leading-tight pr-2">{safeString(trend.title)}</h4>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${trend.sentiment === 'Positive' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                                {safeString(trend.impact)}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-3">{safeString(trend.description)}</p>
                                    </div>
                                ))
                            )}
                        </div>

                        <button 
                            onClick={handleUpdateRadar}
                            disabled={isUpdatingRadar}
                            className="mt-6 w-full bg-white text-slate-900 font-black py-4 rounded-2xl hover:scale-[1.02] transition shadow-xl flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest disabled:opacity-50"
                        >
                            {isUpdatingRadar ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="text-red-600" />}
                            {isUpdatingRadar ? "ESCANEANDO..." : "ATUALIZAR RADAR IA"}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    {competitors.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-400 p-12 text-center opacity-50">
                            <Sword size={64} className="mb-6"/>
                            <h3 className="font-black text-xl uppercase tracking-tighter mb-2">Sem Monitoramento</h3>
                            <p className="text-sm max-w-xs">Adicione concorrentes para gerar Battlecards automatizados.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {competitors.map(comp => (
                                <div key={comp.id} className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col group">
                                    <div className="p-8 flex-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-200 dark:border-slate-600">{comp.name?.charAt(0) || '?'}</div>
                                            {comp.lastAnalysis ? <Badge color="green">IA OK</Badge> : <Badge color="yellow">ANALISAR</Badge>}
                                        </div>
                                        <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight uppercase tracking-tighter truncate">{safeString(comp.name)}</h3>
                                        <p className="text-xs text-blue-500 font-bold truncate mt-1 flex items-center gap-1"><Globe size={12}/> {safeString(comp.website) || 'Sem site'}</p>
                                        <div className="mt-6 flex flex-col gap-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vertical</p>
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{safeString(comp.sector)}</p>
                                        </div>
                                        {comp.lastAnalysis && (
                                            <p className="text-[10px] text-slate-400 font-black uppercase mt-6 pt-6 border-t border-slate-50 dark:border-slate-700 flex items-center gap-2">
                                                <Clock size={12}/> {new Date(comp.lastAnalysis).toLocaleDateString()}
                                            </p>
                                        )}
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                                        <button onClick={() => handleRunAnalysis(comp)} className="flex-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl py-3 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition shadow-sm">
                                            {comp.lastAnalysis ? <Eye size={16}/> : <Zap size={16} className="text-amber-500"/>}
                                            {comp.lastAnalysis ? "Ver Battlecard" : "Analisar IA"}
                                        </button>
                                        <button onClick={() => { if(confirm(`Remover ${comp.name}?`)) deleteCompetitor(currentUser, comp.id); }} className="p-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: ANÁLISE DETALHADA */}
            {isAnalysisModalOpen && selectedCompetitor && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col border border-slate-700">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">{selectedCompetitor.name?.charAt(0) || '?'}</div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">{safeString(selectedCompetitor.name)}</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{safeString(selectedCompetitor.website)} • Intelligence</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                            {isAnalyzing ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                                    <Loader2 size={48} className="text-red-600 animate-spin"/>
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">Gerando Inteligência...</h3>
                                    <p className="text-slate-500 max-w-xs">A IA está analisando os dados públicos e preparando os kill-points comerciais.</p>
                                </div>
                            ) : selectedCompetitor.swot || selectedCompetitor.battlecard ? (
                                <div className="space-y-12 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm">
                                            <h4 className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-xs mb-4 flex items-center gap-2"><TrendingUp size={16}/> Pontos Fortes</h4>
                                            <ul className="space-y-2">
                                                {safeArray(selectedCompetitor.swot?.strengths).map((s, i) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div> {s}</li>)}
                                                {safeArray(selectedCompetitor.swot?.strengths).length === 0 && <li className="text-xs italic text-slate-400">Aguardando dados...</li>}
                                            </ul>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-800 shadow-sm">
                                            <h4 className="font-black text-red-700 dark:text-red-400 uppercase text-xs mb-4 flex items-center gap-2"><TrendingDown size={16}/> Pontos Fracos</h4>
                                            <ul className="space-y-2">
                                                {safeArray(selectedCompetitor.swot?.weaknesses).map((w, i) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div> {w}</li>)}
                                                {safeArray(selectedCompetitor.swot?.weaknesses).length === 0 && <li className="text-xs italic text-slate-400">Aguardando dados...</li>}
                                            </ul>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px]"></div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                            <Shield size={24} className="text-red-500"/> Battlecard de Vendas
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-4">Kill Points</p>
                                                    <div className="space-y-3">
                                                        {safeArray(selectedCompetitor.battlecard?.killPoints).map((p, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                <ArrowRight size={16} className="text-red-500 mt-1 shrink-0"/>
                                                                <p className="text-sm font-bold text-slate-200">{p}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-4">Diferenciais Nexus</p>
                                                    <div className="space-y-3">
                                                        {safeArray(selectedCompetitor.battlecard?.defensePoints).map((p, i) => (
                                                            <div key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                <CheckCircle size={16} className="text-emerald-500 mt-1 shrink-0"/>
                                                                <p className="text-sm font-bold text-slate-200">{p}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Preço</p>
                                                    <p className="text-lg font-black text-indigo-400">{safeString(selectedCompetitor.battlecard?.pricing) || "Não analisado"}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
