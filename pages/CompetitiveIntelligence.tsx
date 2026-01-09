
import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Competitor, MarketTrend } from '../types';
import { analyzeCompetitor, fetchMarketTrends } from '../services/geminiService';
// Fix: Added missing imports Clock, TrendingDown, and CheckCircle
import { Sword, Globe, Plus, X, Search, Zap, Shield, TrendingUp, RefreshCw, Trash2, Eye, Building2, BrainCircuit, AlertTriangle, ArrowRight, Loader2, Sparkles, Clock, TrendingDown, CheckCircle } from 'lucide-react';
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

    // Forçar sincronização ao montar componente se estiver vazio
    useEffect(() => {
        if (competitors.length === 0 && !isSyncing) {
            refreshData();
        }
    }, [competitors.length, isSyncing, refreshData]);

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
        addSystemNotification("Concorrente Adicionado", `${newCompetitor.name} agora está sob monitoramento comercial.`, "success");
    };

    const handleUpdateRadar = async () => {
        setIsUpdatingRadar(true);
        try {
            const trends = await fetchMarketTrends("Tecnologia de Estacionamentos e LPR");
            setMarketTrends(trends);
            addSystemNotification("Radar Atualizado", "Novas tendências mapeadas via motor de inteligência.", "success");
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
            await updateCompetitor(currentUser, updatedCompetitor);
            setSelectedCompetitor(updatedCompetitor);
        } catch (error) {
            console.error("Analysis Failed", error);
            addSystemNotification("Erro na Análise", "Falha ao processar inteligência via IA.", "alert");
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
                <div className="flex items-center gap-3">
                    {isSyncing && <div className="flex items-center gap-2 text-xs font-black text-indigo-500 animate-pulse uppercase"><RefreshCw size={14} className="animate-spin"/> Sincronizando...</div>}
                    <button onClick={() => setIsAddModalOpen(true)} className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700 flex items-center gap-2 shadow-lg shadow-red-500/20 transition">
                        <Plus size={18}/> Monitorar Concorrente
                    </button>
                </div>
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
                                <div className="flex flex-col items-center justify-center h-full py-10 opacity-30 text-center">
                                    <Sparkles size={40} className="mb-4" />
                                    <p className="text-xs italic leading-relaxed">Inicie o radar para mapear movimentos do setor.</p>
                                </div>
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
                    {competitors.length === 0 && !isSyncing ? (
                        <div className="h-full flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-slate-400 p-12 text-center">
                            <Sword size={64} className="mb-6 opacity-10"/>
                            <h3 className="font-black text-xl uppercase tracking-tighter mb-2">Base Spy Vazia</h3>
                            <p className="text-sm max-w-xs">Adicione seus principais concorrentes para que o Nexus Spy gere battlecards e análise SWOT automatizada.</p>
                            <button onClick={() => setIsAddModalOpen(true)} className="mt-8 px-8 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition">Monitorar Agora</button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {competitors.map(comp => (
                                <div key={comp.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-xl transition-all flex flex-col group">
                                    <div className="p-8 flex-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center font-black text-2xl text-slate-400 border border-slate-200 dark:border-slate-600">{comp.name.charAt(0)}</div>
                                            {comp.lastAnalysis ? <Badge color="green">INTELIGÊNCIA OK</Badge> : <Badge color="yellow">ANÁLISE PENDENTE</Badge>}
                                        </div>
                                        <h3 className="font-black text-xl text-slate-900 dark:text-white leading-tight uppercase tracking-tighter">{comp.name}</h3>
                                        <p className="text-xs text-blue-500 font-bold truncate mt-1 flex items-center gap-1"><Globe size={12}/> {comp.website}</p>
                                        <div className="mt-6 flex flex-col gap-1">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Setor / Vertical</p>
                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-300">{comp.sector}</p>
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
                                            {comp.lastAnalysis ? "Ver Battlecard" : "Analisar via IA"}
                                        </button>
                                        <button onClick={() => { if(confirm(`Deseja parar de monitorar ${comp.name}?`)) deleteCompetitor(currentUser, comp.id); }} className="p-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={18}/></button>
                                    </div>
                                </div>
                            ))}
                            {isSyncing && competitors.length === 0 && (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="bg-slate-100 dark:bg-slate-800 rounded-[2.5rem] h-80 animate-pulse"></div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* MODAL: ADICIONAR CONCORRENTE */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[1000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-md rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-slate-800">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="font-black text-2xl uppercase tracking-tighter">Novo Monitoramento</h3>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Motor Soft Spy Engine</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl text-slate-400 hover:text-red-500 transition"><X size={24}/></button>
                        </div>
                        <form onSubmit={handleAddCompetitor} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Nome da Empresa</label>
                                <input required className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-red-600 transition" placeholder="EX: CONCORRENTE XYZ" value={newCompForm.name} onChange={e => setNewCompForm({...newCompForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Website (URL)</label>
                                <div className="relative">
                                    <Globe className="absolute left-4 top-4 text-slate-400" size={20}/>
                                    <input className="w-full pl-12 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-red-600" placeholder="www.concorrente.com" value={newCompForm.website} onChange={e => setNewCompForm({...newCompForm, website: e.target.value})} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Vertical de Atuação</label>
                                <input className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 font-bold bg-transparent outline-none focus:border-red-600" placeholder="Ex: Software LPR" value={newCompForm.sector} onChange={e => setNewCompForm({...newCompForm, sector: e.target.value})} />
                            </div>
                            <button type="submit" className="w-full bg-red-600 text-white font-black py-5 rounded-[2rem] hover:bg-red-700 transition shadow-2xl shadow-red-500/30 uppercase tracking-widest text-xs flex items-center justify-center gap-3">
                                <Plus size={20}/> Iniciar Espionagem
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: ANÁLISE DETALHADA */}
            {isAnalysisModalOpen && selectedCompetitor && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-4xl h-[90vh] overflow-hidden flex flex-col border border-slate-700 animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-900 text-white shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-red-600 rounded-xl flex items-center justify-center font-black text-xl shadow-lg">{selectedCompetitor.name.charAt(0)}</div>
                                <div>
                                    <h2 className="text-2xl font-black uppercase tracking-tighter">{selectedCompetitor.name}</h2>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">{selectedOrganization?.website} • Soft Spy Intelligence</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAnalysisModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50 dark:bg-slate-900/50">
                            {isAnalyzing ? (
                                <div className="h-full flex flex-col items-center justify-center space-y-4 text-center">
                                    <Loader2 size={48} className="text-red-600 animate-spin"/>
                                    <h3 className="font-black text-xl text-slate-800 dark:text-white uppercase tracking-tighter">Gerando Inteligência Competitiva...</h3>
                                    <p className="text-slate-500 max-w-xs">A IA está processando o website e mapeando diferenciais comerciais.</p>
                                </div>
                            ) : selectedCompetitor.swot ? (
                                <div className="space-y-12 animate-fade-in">
                                    {/* SWOT Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 p-6 rounded-[2rem] border border-emerald-100 dark:border-emerald-800 shadow-sm">
                                            <h4 className="font-black text-emerald-700 dark:text-emerald-400 uppercase text-xs mb-4 flex items-center gap-2"><TrendingUp size={16}/> Pontos Fortes</h4>
                                            <ul className="space-y-2">
                                                {selectedCompetitor.swot.strengths?.map((s: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></div> {s}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-red-50 dark:bg-red-950/20 p-6 rounded-[2rem] border border-red-100 dark:border-red-800 shadow-sm">
                                            <h4 className="font-black text-red-700 dark:text-red-400 uppercase text-xs mb-4 flex items-center gap-2"><TrendingDown size={16}/> Pontos Fracos</h4>
                                            <ul className="space-y-2">
                                                {selectedCompetitor.swot.weaknesses?.map((w: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div> {w}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-blue-50 dark:bg-blue-950/20 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-800 shadow-sm">
                                            <h4 className="font-black text-blue-700 dark:text-blue-400 uppercase text-xs mb-4 flex items-center gap-2"><Zap size={16}/> Oportunidades</h4>
                                            <ul className="space-y-2">
                                                {selectedCompetitor.swot.opportunities?.map((o: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></div> {o}</li>)}
                                            </ul>
                                        </div>
                                        <div className="bg-amber-50 dark:bg-amber-950/20 p-6 rounded-[2rem] border border-amber-100 dark:border-amber-800 shadow-sm">
                                            <h4 className="font-black text-amber-700 dark:text-amber-400 uppercase text-xs mb-4 flex items-center gap-2"><AlertTriangle size={16}/> Ameaças</h4>
                                            <ul className="space-y-2">
                                                {selectedCompetitor.swot.threats?.map((t: string, i: number) => <li key={i} className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-start gap-2"><div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0"></div> {t}</li>)}
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Battlecard */}
                                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-[100px]"></div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter mb-8 flex items-center gap-3">
                                            <Shield size={24} className="text-red-500"/> Battlecard de Vendas
                                        </h3>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase text-red-500 tracking-[0.2em] mb-2">Como Matar o Negócio (Kill Points)</p>
                                                    <div className="space-y-3">
                                                        {selectedCompetitor.battlecard?.killPoints?.map((p: string, i: number) => (
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
                                                    <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-2">Defesa Soft Case</p>
                                                    <div className="space-y-3">
                                                        {selectedCompetitor.battlecard?.defensePoints?.map((p: string, i: number) => (
                                                            <div key={i} className="flex gap-3 items-start bg-white/5 p-4 rounded-2xl border border-white/5">
                                                                <CheckCircle size={16} className="text-emerald-500 mt-1 shrink-0"/>
                                                                <p className="text-sm font-bold text-slate-200">{p}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div className="bg-white/5 p-6 rounded-[2rem] border border-white/10">
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-1">Posicionamento de Preço</p>
                                                    <p className="text-lg font-black text-indigo-400">{selectedCompetitor.battlecard?.pricing}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center">
                                    <Building2 size={48} className="mb-4 opacity-10"/>
                                    <p className="font-bold">Nenhuma análise disponível.</p>
                                    <button onClick={() => handleRunAnalysis(selectedCompetitor)} className="mt-4 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold">Gerar Análise Agora</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
