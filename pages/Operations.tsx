
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, ProjectNote, MarketingContent } from '../types';
import { MonitorPlay, Minimize, Wrench, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, AlertTriangle, Filter, X, Search, Image as ImageIcon, Camera, FileText, Upload, CheckSquare, ChevronRight, Edit2, Save, FilePlus, MessageSquare, Send, StopCircle, RefreshCw, Package, Archive, Sparkles, History, Box, Cpu, ClipboardCheck, ArrowRight, Megaphone, Timer, FileDown, Loader2, Trello, Plus, PackageOpen, ListChecks, Activity } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';
import { AcceptanceDocument } from '../components/AcceptanceDocument';
import { Badge } from '../components/Widgets';

export const Operations: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification, products, addMarketingContent } = useData();
    const { currentUser } = useAuth();
    
    const [tvMode, setTvMode] = useState(false);
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    
    const [historySearch, setHistorySearch] = useState('');
    const [managerFilter, setManagerFilter] = useState('All');

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const managers = useMemo(() => ['All', ...new Set(projects.map(p => p.manager).filter(Boolean))], [projects]);

    const historyProjects = useMemo(() => {
        return projects.filter(p => {
            const isArchived = p.archived;
            const matchesSearch = p.title.toLowerCase().includes(historySearch.toLowerCase()) || 
                                 p.clientName.toLowerCase().includes(historySearch.toLowerCase());
            const matchesManager = managerFilter === 'All' || p.manager === managerFilter;
            return isArchived && matchesSearch && matchesManager;
        }).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [projects, historySearch, managerFilter]);

    const getProjectsByStatus = (status: string) => projects.filter(p => p.status === status && !p.archived);

    const columns = [
        { id: 'Kitting', label: 'Kitting (Equipamentos)', color: 'border-orange-500', progress: 25 },
        { id: 'Assembly', label: 'Montagem / Bancada', color: 'border-purple-500', progress: 50 },
        { id: 'Execution', label: 'Instalação em Campo', color: 'border-yellow-500', progress: 75 },
        { id: 'Completed', label: 'Concluída / Testada', color: 'border-green-500', progress: 100 },
    ];

    const handleUpdateStatus = (id: string, newStatus: any) => {
        const proj = projects.find(p => p.id === id);
        if (proj) {
            // Cálculo automático do progresso baseado no novo status
            const statusConfig = columns.find(c => c.id === newStatus);
            const newProgress = statusConfig ? statusConfig.progress : proj.progress;
            
            updateProject(currentUser, { 
                ...proj, 
                status: newStatus, 
                progress: newProgress,
                statusUpdatedAt: new Date().toISOString() 
            });
        }
    };

    return (
        <div className={tvMode ? "fixed inset-0 z-[200] bg-slate-950 p-4 overflow-hidden flex flex-col" : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors"}>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-900 dark:text-white">
                        <Wrench className="text-indigo-600 dark:text-indigo-400"/> {tvMode ? 'OPERACIONAL TV' : 'Painel de Produção'}
                    </h1>
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setViewMode(viewMode === 'board' ? 'history' : 'board')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        {viewMode === 'board' ? <History size={18}/> : <Trello size={18}/>}
                        {viewMode === 'board' ? 'Histórico' : 'Quadro'}
                    </button>
                    <button onClick={() => setTvMode(!tvMode)} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition ${tvMode ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white'}`}>
                        {tvMode ? <Minimize size={20}/> : <MonitorPlay size={18}/>} TV
                    </button>
                </div>
            </div>

            {viewMode === 'board' ? (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-6 h-full min-w-max">
                        {columns.map(col => (
                            <div key={col.id} className="flex-1 min-w-[320px] flex flex-col rounded-xl border-t-4 bg-slate-100 dark:bg-slate-800/50" style={{borderColor: col.color}}>
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-bold flex justify-between bg-white/50 dark:bg-slate-800/50 rounded-t-xl">
                                    <span className="text-slate-700 dark:text-slate-200">{col.label}</span>
                                    <Badge color="gray">{getProjectsByStatus(col.id).length}</Badge>
                                </div>
                                <div className="p-3 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                    {getProjectsByStatus(col.id).map(proj => (
                                        <div key={proj.id} onClick={() => setSelectedProject(proj)} className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-md transition group relative">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-slate-900 dark:text-white text-sm uppercase tracking-tight">{proj.clientName}</h3>
                                                <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded opacity-0 group-hover:opacity-100 transition"><ArrowRight size={14} className="text-slate-400"/></div>
                                            </div>
                                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mb-2 truncate">{proj.title}</p>
                                            
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-700 mb-3">
                                                <p className="text-[9px] font-black text-slate-400 uppercase mb-1 flex items-center gap-1"><PackageOpen size={10}/> Escopo Contratado</p>
                                                <p className="text-[10px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight italic">
                                                    {proj.products && proj.products.length > 0 ? proj.products.join(' • ') : 'Nenhum item listado'}
                                                </p>
                                            </div>

                                            <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                                                <div className="bg-blue-500 h-full transition-all duration-500" style={{width: `${proj.progress}%`}}></div>
                                            </div>
                                            <div className="mt-3 flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                                                <span className="flex items-center gap-1 font-mono text-indigo-600 dark:text-indigo-400">{proj.progress}% Evolução</span>
                                                <span className="flex items-center gap-1 text-slate-400"><Clock size={10}/> {new Date(proj.deadline).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {getProjectsByStatus(col.id).length === 0 && (
                                        <div className="text-center py-10 opacity-20"><Package size={40} className="mx-auto text-slate-400"/></div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico..." 
                                className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
                                <tr><th className="p-4">Projeto</th><th className="p-4">Cliente</th><th className="p-4">Progresso</th><th className="text-center">Concluído</th><th className="text-center">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {historyProjects.map(proj => (
                                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="p-4 font-bold text-slate-800 dark:text-white">{proj.title}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400">{proj.clientName}</td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 font-mono">{proj.progress}%</td>
                                        <td className="p-4 text-center text-slate-500">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString() : '-'}</td>
                                        <td className="p-4 text-center"><button onClick={() => setSelectedProject(proj)} className="text-blue-600 font-bold hover:underline">Ver Detalhes</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in border border-slate-200 dark:border-slate-700">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">{selectedProject.clientName}</h2>
                                <p className="text-sm text-slate-500">{selectedProject.title}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400"><X/></button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                             <div>
                                <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Alterar Status da Produção</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {columns.map(c => (
                                        <button key={c.id} onClick={() => handleUpdateStatus(selectedProject.id, c.id)} className={`p-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${selectedProject.status === c.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg scale-[1.02]' : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:bg-slate-50'}`}>
                                            {selectedProject.status === c.id && <CheckCircle size={14}/>}
                                            {c.label.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                                    <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-2">Checklist Operacional</h4>
                                    <div className="space-y-2">
                                        {selectedProject.tasks && selectedProject.tasks.length > 0 ? selectedProject.tasks.slice(0, 5).map(t => (
                                            <div key={t.id} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                                <div className={`w-3 h-3 rounded-full border ${t.status === 'Done' ? 'bg-green-500 border-green-500' : 'bg-white dark:bg-slate-800 border-slate-300'}`}></div>
                                                <span className={t.status === 'Done' ? 'line-through opacity-50' : ''}>{t.title}</span>
                                            </div>
                                        )) : <p className="text-[10px] text-slate-400 italic">Sem tarefas detalhadas.</p>}
                                    </div>
                                </div>
                             </div>

                             <div className="flex flex-col gap-6">
                                <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><Activity size={14}/> Resumo do Projeto</h4>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2"><span className="text-slate-500">Início:</span> <span className="font-bold text-slate-800 dark:text-white">{new Date(selectedProject.startDate).toLocaleDateString()}</span></div>
                                        <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2"><span className="text-slate-500">Prazo Estimado:</span> <span className="font-bold text-orange-600">{new Date(selectedProject.deadline).toLocaleDateString()}</span></div>
                                        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
                                            <span className="text-slate-500">Evolução pelo Status:</span> 
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold text-indigo-600 dark:text-indigo-400">{selectedProject.progress}%</span>
                                            </div>
                                        </div>
                                        <div className="pt-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase block mb-2 flex items-center gap-1"><ListChecks size={12}/> Itens Contratados</span>
                                            <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 max-h-32 overflow-y-auto custom-scrollbar">
                                                <ul className="text-xs space-y-1 text-slate-700 dark:text-slate-200 font-medium list-disc pl-4">
                                                    {selectedProject.products && selectedProject.products.length > 0 ? (
                                                        selectedProject.products.map((p, i) => <li key={i}>{p}</li>)
                                                    ) : (
                                                        <li className="list-none text-slate-400 italic ml-[-1rem]">Dados não vinculados.</li>
                                                    )}
                                                </ul>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center italic">O progresso é atualizado automaticamente ao mover o card de produção.</p>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
