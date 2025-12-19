import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, ProjectNote, MarketingContent } from '../types';
import { MonitorPlay, Minimize, Wrench, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, AlertTriangle, Filter, X, Search, Image as ImageIcon, Camera, FileText, Upload, CheckSquare, ChevronRight, Edit2, Save, FilePlus, MessageSquare, Send, StopCircle, RefreshCw, Package, Archive, Sparkles, History, Box, Cpu, ClipboardCheck, ArrowRight, Megaphone, Timer, FileDown, Loader2, Trello, Plus } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';
import { AcceptanceDocument } from '../components/AcceptanceDocument';
// Import Badge component from Widgets to fix 'Cannot find name' errors
import { Badge } from '../components/Widgets';

export const Operations: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification, products, addMarketingContent } = useData();
    const { currentUser } = useAuth();
    
    const [tvMode, setTvMode] = useState(false);
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    
    // Filters for History
    const [historySearch, setHistorySearch] = useState('');
    const [managerFilter, setManagerFilter] = useState('All');

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [activeTab, setActiveTab] = useState<'checklist' | 'info'>('checklist');

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
        { id: 'Planning', label: 'Planejamento', color: 'border-blue-500' },
        { id: 'Kitting', label: 'Kitting', color: 'border-orange-500' },
        { id: 'Assembly', label: 'Montagem', color: 'border-purple-500' },
        { id: 'Execution', label: 'Instalação', color: 'border-yellow-500' },
        { id: 'Completed', label: 'Concluída', color: 'border-green-500' },
    ];

    return (
        <div className={tvMode ? "fixed inset-0 z-[200] bg-slate-950 p-4 overflow-hidden flex flex-col" : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors"}>
            <div className="flex justify-between items-center mb-6 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-3">
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
                            <div key={col.id} className="flex-1 min-w-[300px] flex flex-col rounded-xl border-t-4 bg-slate-100 dark:bg-slate-800/50" style={{borderColor: col.color}}>
                                <div className="p-4 border-b font-bold flex justify-between">{col.label} <span>{getProjectsByStatus(col.id).length}</span></div>
                                <div className="p-2 space-y-3 overflow-y-auto custom-scrollbar">
                                    {getProjectsByStatus(col.id).map(proj => (
                                        <div key={proj.id} onClick={() => setSelectedProject(proj)} className="p-4 bg-white dark:bg-slate-800 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition">
                                            <h3 className="font-bold text-sm">{proj.clientName}</h3>
                                            <p className="text-xs text-slate-500 mt-1">{proj.title}</p>
                                            <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden"><div className="bg-blue-500 h-full" style={{width: `${proj.progress}%`}}></div></div>
                                        </div>
                                    ))}
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
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-400"/>
                            <select 
                                className="bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                value={managerFilter}
                                onChange={(e) => setManagerFilter(e.target.value)}
                            >
                                {managers.map(m => <option key={m} value={m}>{m === 'All' ? 'Todos Gerentes' : m}</option>)}
                            </select>
                        </div>
                        <Badge color="gray">{historyProjects.length} Projetos Arquivados</Badge>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-bold sticky top-0 shadow-sm z-10">
                                <tr><th>Projeto</th><th>Cliente</th><th>Gerente</th><th className="text-center">Concluído</th><th className="text-center">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {historyProjects.map(proj => (
                                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="p-4 font-bold">{proj.title}</td>
                                        <td className="p-4">{proj.clientName}</td>
                                        <td className="p-4">{proj.manager}</td>
                                        <td className="p-4 text-center">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString() : '-'}</td>
                                        <td className="p-4 text-center"><button onClick={() => setSelectedProject(proj)} className="text-blue-600 font-bold hover:underline">Ver Detalhes</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
            {/* Modal project details same as before... */}
        </div>
    );
};