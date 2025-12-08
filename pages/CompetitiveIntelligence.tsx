import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Competitor, MarketTrend } from '../types';
import { analyzeCompetitor, fetchMarketTrends } from '../services/geminiService';
import { Sword, Globe, Plus, X, Search, Zap, Shield, TrendingUp, RefreshCw, Trash2, Eye, Building2, BrainCircuit, AlertTriangle } from 'lucide-react';
import { Badge } from '../components/Widgets';

export const CompetitiveIntelligence: React.FC = () => {
    const { competitors, marketTrends, addCompetitor, updateCompetitor, deleteCompetitor, setMarketTrends } = useData();
    const { currentUser } = useAuth();

    // UI States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAnalysisModalOpen, setIsAnalysisModalOpen] = useState(false);
    const [selectedCompetitor, setSelectedCompetitor] = useState<Competitor | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isRefreshingTrends, setIsRefreshingTrends] = useState(false);
    
    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [competitorToDelete, setCompetitorToDelete] = useState<Competitor | null>(null);

    // Form State
    const [newCompForm, setNewCompForm] = useState({ name: '', website: '', sector: '' });

    // Mock refreshing trends on load if empty
    useEffect(() => {
        if (marketTrends.length === 0) {
            handleRefreshTrends();
        }
    }, []);

    const handleAddCompetitor = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCompForm.name || !newCompForm.sector) return;

        const newCompetitor: Competitor = {
            id: `COMP-${Date.now()}`,
            name: newCompForm.name,
            website: newCompForm.website,
            sector: newCompForm.sector,
            // Initial empty data
            swot: undefined,
            battlecard: undefined
        };

        addCompetitor(currentUser, newCompetitor);
        setIsAddModalOpen(false);
        setNewCompForm({ name: '', website: '', sector: '' });
        
        // Trigger analysis automatically
        handleRunAnalysis(newCompetitor);
    };

    const handleRunAnalysis = async (comp: Competitor) => {
        setIsAnalyzing(true);
        // Open modal if not open
        if (!isAnalysisModalOpen) {
            setSelectedCompetitor(comp);
            setIsAnalysisModalOpen(true);
        }

        try {
            const analysisResult = await analyzeCompetitor(comp.name, comp.website, comp.sector);
            const updatedCompetitor = {
                ...comp,
                ...analysisResult,
                lastAnalysis: new Date().toISOString()
            };
            updateCompetitor(currentUser, updatedCompetitor);
            setSelectedCompetitor(updatedCompetitor); // Update modal view
        } catch (error) {
            console.error("Analysis Failed", error);
            alert("Erro ao analisar concorrente. Tente novamente.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRefreshTrends = async () => {
        setIsRefreshingTrends(true);
        // Use the sector from the first competitor, or a default
        const sector = competitors.length > 0 ? competitors[0].sector : "Tecnologia B2B";
        try {
            const trends = await fetchMarketTrends(sector);
            setMarketTrends(trends);
        } catch (error) {
            console.error("Trend Fetch Failed", error);
        } finally {
            setIsRefreshingTrends(false);
        }
    };

    const handleDeleteClick = (comp: Competitor) => {
        setCompetitorToDelete(comp);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = () => {
        if (competitorToDelete) {
            deleteCompetitor(currentUser, competitorToDelete.id);
            setIsDeleteModalOpen(false);
            setCompetitorToDelete(null);
            // Se estiver com o modal de análise aberto desse item, fecha também
            if (selectedCompetitor?.id === competitorToDelete.id) {
                setIsAnalysisModalOpen(false);
            }
        }
    };

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Sword className="text-red-600 dark:text-red-500" /> Nexus Spy
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Inteligência Competitiva e Battlecards de Vendas.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleRefreshTrends}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 transition"
                    >
                        <RefreshCw size={18} className={isRefreshingTrends ? "animate-spin" : ""}/> 
                        {isRefreshingTrends ? 'Atualizando Radar...' : 'Atualizar Radar'}
                    </button>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/20 transition"
                    >
                        <Plus size={18}/> Novo Concorrente
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0">
                {/* LEFT: Market Radar (Trends) */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-xl shadow-lg text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500 opacity-10 rounded-full -mr-10 -mt-10 blur-2xl animate-pulse-slow"></div>
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <BrainCircuit className="text-red-400"/> Radar de Mercado
                        </h3>
                        
                        <div className="space-y-4">
                            {marketTrends.length === 0 ? (
                                <p className="text-slate-400 text-sm italic">Nenhuma tendência detectada ainda.</p>
                            ) : (
                                marketTrends.map(trend => (
                                    <div key={trend.id} className="bg-white/5 p-3 rounded-lg border border-white/10 hover:bg-white/10 transition relative">
                                        <div className="flex justify-center mb-4 mt-1">
                                            <h4 className="font-bold text-sm text-red-200 text-center px-4">{trend.title}</h4>
                                            <span className={`absolute top-3 right-3 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${trend.sentiment === 'Positive' ? 'bg-green-500/20 text-green-300' : trend.sentiment === 'Negative' ? 'bg-red-500/20 text-red-300' : 'bg-slate-500/20 text-slate-300'}`}>
                                                {trend.sentiment}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 leading-snug">{trend.description}</p>
                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                                            <TrendingUp size={10}/> Impacto: <span className="text-white">{trend.impact}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Competitor Grid */}
                <div className="lg:col-span-2 overflow-y-auto custom-scrollbar">
                    {competitors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 dark:text-slate-500">
                            <Sword size={48} className="mb-2 opacity-20"/>
                            <p>Adicione concorrentes para gerar inteligência.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {competitors.map(comp => (
                                <div key={comp.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition group">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-300 font-bold">
                                                    {comp.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-900 dark:text-white">{comp.name}</h3>
                                                    <a href={`https://${comp.website}`} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                                        <Globe size={10}/> {comp.website}
                                                    </a>
                                                </div>
                                            </div>
                                            {comp.lastAnalysis && (
                                                <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded font-bold">
                                                    Analisado
                                                </span>
                                            )}
                                        </div>

                                        <div className="mt-4 space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-500 dark:text-slate-400">Setor</span>
                                                <span className="font-medium text-slate-700 dark:text-slate-200">{comp.sector}</span>
                                            </div>
                                            {comp.battlecard && (
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-slate-500 dark:text-slate-400">Preço Est.</span>
                                                    <span className="font-medium text-slate-700 dark:text-slate-200">{comp.battlecard.pricing}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-700/30 p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                                        <button 
                                            onClick={() => { setSelectedCompetitor(comp); setIsAnalysisModalOpen(true); }}
                                            className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
                                        >
                                            <Eye size={16}/> Ver Análise
                                        </button>
                                        <button 
                                            onClick={() => handleDeleteClick(comp)}
                                            className="p-2 text-slate-400 hover:text-red-500 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
                                            title="Excluir Concorrente"
                                        >
                                            <Trash2 size={18}/>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ADD MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Adicionar Concorrente</h3>
                            <button onClick={() => setIsAddModalOpen(false)}><X className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleAddCompetitor} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome da Empresa</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500" value={newCompForm.name} onChange={e => setNewCompForm({...newCompForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Site</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="exemplo.com.br" value={newCompForm.website} onChange={e => setNewCompForm({...newCompForm, website: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Setor</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-red-500" placeholder="Ex: Fintech, Varejo" value={newCompForm.sector} onChange={e => setNewCompForm({...newCompForm, sector: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-red-600 text-white font-bold py-3 rounded-lg hover:bg-red-700 shadow-md transition">
                                Salvar e Analisar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {isDeleteModalOpen && competitorToDelete && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/30 flex justify-between items-start">
                            <div className="flex gap-4">
                                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full text-red-600 dark:text-red-300 h-fit">
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Concorrente</h2>
                                    <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Esta ação é irreversível.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition"><X size={20}/></button>
                        </div>
                        
                        <div className="p-6 space-y-4">
                            <p className="text-slate-600 dark:text-slate-300 text-sm">
                                Tem certeza que deseja excluir <strong>{competitorToDelete.name}</strong>? Todos os dados de inteligência (SWOT, Battlecard) serão perdidos.
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                            <button 
                                onClick={() => setIsDeleteModalOpen(false)}
                                className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition flex items-center gap-2"
                            >
                                <Trash2 size={16}/> Confirmar Exclusão
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ANALYSIS / BATTLECARD MODAL */}
            {isAnalysisModalOpen && selectedCompetitor && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-scale-in relative">
                        {/* Loading Overlay */}
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 z-20 flex flex-col items-center justify-center">
                                <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white">Gerando Inteligência...</h3>
                                <p className="text-slate-500">Analisando site, mercado e diferenciais.</p>
                            </div>
                        )}

                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-2xl font-bold flex items-center gap-3">
                                    {selectedCompetitor.name} <span className="text-sm font-normal opacity-70 bg-white/10 px-2 py-0.5 rounded">Battlecard</span>
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">{selectedCompetitor.sector} • {selectedCompetitor.website}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRunAnalysis(selectedCompetitor)} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition" title="Refazer Análise">
                                    <RefreshCw size={20} />
                                </button>
                                <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900 custom-scrollbar">
                            {selectedCompetitor.swot ? (
                                <div className="space-y-8">
                                    {/* Battlecard Section (Top Priority) */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-green-50 dark:bg-green-900/20 p-5 rounded-xl border border-green-200 dark:border-green-800 shadow-sm">
                                            <h3 className="font-bold text-green-800 dark:text-green-300 text-lg mb-4 flex items-center gap-2">
                                                <Zap className="fill-green-600 dark:fill-green-400"/> Como Vencer (Kill Points)
                                            </h3>
                                            <ul className="space-y-3">
                                                {selectedCompetitor.battlecard?.killPoints.map((point, i) => (
                                                    <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-200 text-sm">
                                                        <div className="w-5 h-5 rounded-full bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300 flex items-center justify-center text-xs font-bold shrink-0">{i+1}</div>
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <div className="bg-red-50 dark:bg-red-900/20 p-5 rounded-xl border border-red-200 dark:border-red-800 shadow-sm">
                                            <h3 className="font-bold text-red-800 dark:text-red-300 text-lg mb-4 flex items-center gap-2">
                                                <Shield className="fill-red-600 dark:fill-red-400"/> Contra-Argumentos (Defesa)
                                            </h3>
                                            <ul className="space-y-3">
                                                {selectedCompetitor.battlecard?.defensePoints.map((point, i) => (
                                                    <li key={i} className="flex gap-3 text-slate-700 dark:text-slate-200 text-sm">
                                                        <div className="w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 flex items-center justify-center text-xs font-bold shrink-0">!</div>
                                                        {point}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* SWOT Matrix */}
                                    <div>
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 text-center text-lg">Análise SWOT Completa</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-blue-600 dark:text-blue-400 uppercase text-xs mb-3 border-b pb-2">Forças (Strengths)</h4>
                                                <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                    {selectedCompetitor.swot.strengths.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-orange-600 dark:text-orange-400 uppercase text-xs mb-3 border-b pb-2">Fraquezas (Weaknesses)</h4>
                                                <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                    {selectedCompetitor.swot.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-green-600 dark:text-green-400 uppercase text-xs mb-3 border-b pb-2">Oportunidades (Opportunities)</h4>
                                                <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                    {selectedCompetitor.swot.opportunities.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
                                                <h4 className="font-bold text-red-600 dark:text-red-400 uppercase text-xs mb-3 border-b pb-2">Ameaças (Threats)</h4>
                                                <ul className="list-disc pl-4 text-sm text-slate-600 dark:text-slate-300 space-y-1">
                                                    {selectedCompetitor.swot.threats.map((s, i) => <li key={i}>{s}</li>)}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-20 text-slate-400">
                                    <p>Clique em "Atualizar" para gerar a análise inicial.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};