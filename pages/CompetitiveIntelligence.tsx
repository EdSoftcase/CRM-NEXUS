
import React, { useState } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Competitor, MarketTrend } from '../types';
import { analyzeCompetitor, fetchMarketTrends } from '../services/geminiService';
import { Sword, Globe, Plus, X, Search, Zap, Shield, TrendingUp, RefreshCw, Trash2, Eye, Building2, BrainCircuit, AlertTriangle, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { Badge, SectionTitle } from '../components/Widgets';

export const CompetitiveIntelligence: React.FC = () => {
    const { competitors, marketTrends, addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends, addSystemNotification } = useData();
    const { currentUser } = useAuth();

    // UI States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isUpdatingRadar, setIsUpdatingRadar] = useState(false);
    
    // Form State
    const [newCompForm, setNewCompForm] = useState({ name: '', website: '', sector: '' });

    const handleAddCompetitor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompForm.name) return;

        const newCompetitor: Competitor = {
            id: `COMP-${Date.now()}`,
            name: newCompForm.name,
            website: newCompForm.website,
            sector: newCompForm.sector || 'Tecnologia',
            organizationId: currentUser?.organizationId
        };

        addCompetitor(currentUser, newCompetitor);
        setIsAddModalOpen(false);
        setNewCompForm({ name: '', website: '', sector: '' });
    };

    const handleUpdateRadar = async () => {
        setIsUpdatingRadar(true);
        try {
            const trends = await fetchMarketTrends("Tecnologia de Estacionamentos e LPR");
            setMarketTrends(trends);
            addSystemNotification("Radar Atualizado", "A I.A. mapeou novas tendências para o seu setor.", "success");
        } catch (error) {
            console.error(error);
            addSystemNotification("Falha no Radar", "Não foi possível conectar ao motor de inteligência.", "alert");
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
            const updatedCompetitor = {
                ...comp,
                ...analysisResult,
                lastAnalysis: new Date().toISOString()
            };
            updateCompetitor(currentUser, updatedCompetitor);
            setSelectedCompetitor(updatedCompetitor);
        } catch (error) {
            console.error("Analysis Failed", error);
            alert("Erro ao analisar concorrente via IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sword className="text-red-600 dark:text-red-500" /> Soft Spy
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Inteligência Competitiva e Battlecards Automatizados.</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/20 transition">
                    <Plus size={18}/> Monitorar Concorrente
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 flex-1 min-h-0">
                <div className="lg:col-span-1">
                    <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-2xl h-full border border-slate-800 overflow-hidden relative flex flex-col">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 blur-3xl rounded-full"></div>
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2 border-b border-slate-800 pb-4 relative z-10">
                            <BrainCircuit className="text-red-400" size={20}/> Radar de Mercado
                        </h3>
                        
                        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar relative z-10 pr-1">
                            {marketTrends.length === 0 ? (
                                <p className="text-xs text-slate-500 italic text-center py-10 leading-relaxed">Clique abaixo para que o Nexus Spy mapeie movimentos do setor via I.A.</p>
                            ) : (
                                marketTrends.map((trend, i) => (
                                    <div key={trend.id || i} className="bg-white/5 border border-white/10 rounded-xl p-3 animate-fade-in">
                                        <div className="flex justify-between items-start mb-1">
                                            <h4 className="font-bold text-xs text-red-400 leading-tight pr-2">{trend.title}</h4>
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${trend.sentiment === 'Positive' ? 'bg-emerald-500/20 text-emerald-400' : trend.sentiment === 'Negative' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'}`}>
                                                {trend.impact}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 leading-snug line-clamp-3">{trend.description}</p>
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
                            {isUpdatingRadar ? "PROCESSANDO..." : "Atualizar Radar com IA"}
                        </button>
                    </div>
                </div>

                <div className="lg:col-span-3">
                    {competitors.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-slate-400">
                            <Sword size={48} className="mb-4 opacity-10"/>
                            <p className="font-bold uppercase text-xs tracking-widest">Base de Concorrentes Vazia</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {competitors.map(comp => (
                                <div key={comp.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition flex flex-col">
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-xl flex items-center justify-center font-black text-xl text-slate-400">{comp.name.charAt(0)}</div>
                                            {comp.lastAnalysis ? <Badge color="green">Analisado</Badge> : <Badge color="yellow">Pendente</Badge>}
                                        </div>
                                        <h3 className="font-bold text-lg text-slate-900 dark:text-white leading-tight">{comp.name}</h3>
                                        <p className="text-xs text-blue-500 font-medium truncate mb-4">{comp.website}</p>
                                    </div>
                                    <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t flex gap-2">
                                        <button onClick={() => handleRunAnalysis(comp)} className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition"><Eye size={14}/> DETALHES</button>
                                        <button onClick={() => deleteCompetitor(currentUser, comp.id)} className="p-2 text-slate-400 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {isAnalysisModalOpen && selectedCompetitor && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9000] p-4 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col border border-slate-700 animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
                            <div>
                                <h2 className="text-2xl font-black">{selectedCompetitor.name}</h2>
                                <p className="text-slate-400 text-xs mt-1">{selectedCompetitor.website} • Soft Spy Engine</p>
                            </div>
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="text-slate-400 hover:text-white"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                            {isAnalyzing ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4">
                                    <Loader2 size={48} className="text-red-600 animate-spin"/>
                                    <h3 className="font-bold text-xl text-slate-800 dark:text-white">Gerando Inteligência Competitiva...</h3>
                                </div>
                            ) : selectedCompetitor.swot ? (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-800 shadow-sm">
                                            <h3 className="font-black text-emerald-800 dark:text-emerald-400 text-sm uppercase mb-4 flex items-center gap-2"><Zap size={16}/> Kill Points</h3>
                                            <ul className="space-y-3">{selectedCompetitor.battlecard?.killPoints?.map((p, i) => <li key={i} className="flex gap-3 text-xs font-bold text-slate-700 dark:text-slate-200"><ArrowRight className="text-emerald-500 shrink-0" size={14}/> {p}</li>)}</ul>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-2xl border border-red-200 dark:border-red-800 shadow-sm">
                                            <h3 className="font-black text-red-800 dark:text-red-400 text-sm uppercase mb-4 flex items-center gap-2"><Shield size={16}/> Pontos de Defesa</h3>
                                            <ul className="space-y-3">{selectedCompetitor.battlecard?.defensePoints?.map((p, i) => <li key={i} className="flex gap-3 text-xs font-bold text-slate-700 dark:text-slate-200"><AlertTriangle className="text-red-500 shrink-0" size={14}/> {p}</li>)}</ul>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-[10px] font-black text-blue-600 uppercase mb-2">Forças</h4><ul className="text-[10px] text-slate-500 space-y-1">{selectedCompetitor.swot?.strengths?.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-[10px] font-black text-orange-600 uppercase mb-2">Fraquezas</h4><ul className="text-[10px] text-slate-500 space-y-1">{selectedCompetitor.swot?.weaknesses?.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-[10px] font-black text-green-600 uppercase mb-2">Oportunidades</h4><ul className="text-[10px] text-slate-500 space-y-1">{selectedCompetitor.swot?.opportunities?.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm"><h4 className="text-[10px] font-black text-red-600 uppercase mb-2">Ameaças</h4><ul className="text-[10px] text-slate-500 space-y-1">{selectedCompetitor.swot?.threats?.map((s,i)=><li key={i}>• {s}</li>)}</ul></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400"><RefreshCw size={48} className="mx-auto mb-4 opacity-10"/><p>Clique em analisar para carregar os dados via I.A.</p></div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b flex justify-between bg-slate-50 dark:bg-slate-900/50">
                            <h3 className="font-bold text-xl uppercase tracking-tighter">Novo Concorrente</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                        </div>
                        <form onSubmit={handleAddCompetitor} className="p-8 space-y-6">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Empresa</label><input required className="w-full border rounded-xl p-3 bg-white dark:bg-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-red-500" value={newCompForm.name} onChange={e => setNewCompForm({...newCompForm, name: e.target.value})} placeholder="Ex: Softpark Inc" /></div>
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Website</label><input className="w-full border rounded-xl p-3 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-red-500" value={newCompForm.website} onChange={e => setNewCompForm({...newCompForm, website: e.target.value})} placeholder="www.concorrente.com" /></div>
                            <button className="w-full bg-red-600 text-white font-black py-4 rounded-xl hover:bg-red-700 transition shadow-lg shadow-red-500/20 uppercase tracking-widest text-xs">Salvar</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
