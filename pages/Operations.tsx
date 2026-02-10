
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, TechnicalSpecs } from '../types';
// Fix: Added ClipboardCheck to lucide-react imports to resolve "Cannot find name 'ClipboardCheck'" error on line 282.
import { 
    MonitorPlay, Minimize, Wrench, Clock, CheckCircle, X, Search, 
    History, Trello, Box, Activity, AlignLeft, GripVertical, 
    Monitor, Package, Building2, Layout, ChevronRight, AlertCircle, 
    ShoppingBag, List, LayoutGrid, Maximize2, 
    CheckSquare, Cpu, Monitor as MonitorIcon, ClipboardCheck, Zap, ShieldCheck,
    User, Settings2
} from 'lucide-react';
import { Badge } from '../components/Widgets';

export const Operations: React.FC = () => {
    const { projects: globalProjects, updateProject, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    const [tvMode, setTvMode] = useState(false);
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    const [displayDensity, setDisplayDensity] = useState<'standard' | 'compact'>('standard');
    
    const [historySearch, setHistorySearch] = useState('');
    const [managerFilter, setManagerFilter] = useState('All');

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    
    const [localProjects, setLocalProjects] = useState<Project[]>([]);

    useEffect(() => {
        setLocalProjects(globalProjects);
    }, [globalProjects]);

    const isRecentlyCompleted = (proj: Project) => {
        if (proj.status !== 'Completed' || !proj.completedAt) return false;
        const completionDate = new Date(proj.completedAt);
        const today = new Date();
        const diffTime = Math.abs(today.getTime() - completionDate.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 30;
    };

    const historyProjects = useMemo(() => {
        return localProjects.filter(p => {
            const isArchived = p.archived || (p.status === 'Completed' && !isRecentlyCompleted(p));
            const matchesSearch = (p.title || '').toLowerCase().includes(historySearch.toLowerCase()) || 
                                 (p.clientName || '').toLowerCase().includes(historySearch.toLowerCase()) ||
                                 (p.unit || '').toLowerCase().includes(historySearch.toLowerCase());
            const matchesManager = managerFilter === 'All' || p.manager === managerFilter;
            return isArchived && matchesSearch && matchesManager;
        }).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [localProjects, historySearch, managerFilter]);

    const columns = [
        { id: 'Kitting', label: '1. Separação (Kitting)', color: 'border-orange-500', progress: 20 },
        { id: 'Assembly', label: '2. Montagem / Bancada', color: 'border-purple-500', progress: 40 },
        { id: 'Execution', label: '3. Instalação / Campo', color: 'border-yellow-500', progress: 60 },
        { id: 'Training', label: '4. Treinamento / Go-Live', color: 'border-blue-500', progress: 80 },
        { id: 'Completed', label: '5. Concluída / Testada', color: 'border-green-500', progress: 100 },
    ];

    const getProjectsByStatus = (statusId: string) => {
        return localProjects.filter(p => {
            const matchStatus = p.status === statusId;
            if (!matchStatus) return false;
            if (statusId === 'Completed') return isRecentlyCompleted(p);
            return !p.archived;
        }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()); // Ordenação por data de início (ordem de chegada)
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedProjectId(id);
        e.dataTransfer.setData('projectId', id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, newStatus: string) => {
        e.preventDefault();
        const id = e.dataTransfer.getData('projectId') || draggedProjectId;
        if (id) {
            handleUpdateStatus(id, newStatus);
        }
        setDraggedProjectId(null);
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const proj = localProjects.find(p => p.id === id);
        if (!proj) return;

        const statusConfig = columns.find(c => c.id === newStatus);
        const newProgress = statusConfig ? statusConfig.progress : proj.progress;
        
        const isFinished = newStatus === 'Completed';

        const updatedProjectData: Project = { 
            ...proj, 
            status: newStatus, 
            progress: newProgress,
            statusUpdatedAt: new Date().toISOString(),
            completedAt: isFinished ? new Date().toISOString() : proj.completedAt,
            archived: false 
        };

        setLocalProjects(prev => prev.map(p => p.id === id ? updatedProjectData : p));
        if (selectedProject?.id === id) setSelectedProject(updatedProjectData);

        try {
            await updateProject(currentUser, updatedProjectData);
            addSystemNotification("Produção Atualizada", `${proj.title} movido para ${newStatus}.`, "success");
        } catch (error) {
            console.error("Erro ao atualizar projeto:", error);
            setLocalProjects(globalProjects);
        }
    };

    const handleToggleTask = async (project: Project, taskId: string) => {
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t);
        const updatedProject = { ...project, tasks: updatedTasks };
        
        setLocalProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
        if(selectedProject?.id === project.id) setSelectedProject(updatedProject);
        
        await updateProject(currentUser, updatedProject);
    };

    const getSLASignal = (deadline: string) => {
        const today = new Date();
        const dead = new Date(deadline);
        const diffDays = Math.ceil((dead.getTime() - today.getTime()) / (1000 * 3600 * 24));

        if (diffDays < 0) return { color: 'bg-red-500', label: 'ATRASADO', icon: <AlertCircle size={10}/> };
        if (diffDays <= 15) return { color: 'bg-amber-500', label: 'CRÍTICO', icon: <Clock size={10}/> };
        return { color: 'bg-emerald-500', label: 'DENTRO PRAZO', icon: <CheckCircle size={10}/> };
    };

    const safeArray = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch(e) { return []; }
        }
        return [];
    };

    return (
        <div className={tvMode ? "fixed inset-0 z-[9999] bg-slate-950 p-6 overflow-hidden flex flex-col transition-all duration-500" : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors font-sans"}>
            <div className={`flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 gap-4 ${tvMode ? 'mb-8 border-b border-slate-800 pb-6' : 'mb-6'}`}>
                <div>
                    <h1 className={`${tvMode ? 'text-4xl' : 'text-3xl'} font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tighter`}>
                        {tvMode ? (
                            <><MonitorPlay className="text-indigo-400 animate-pulse" size={40}/> Dashboard de Operações</>
                        ) : (
                            <><Wrench className="text-indigo-600 dark:text-indigo-400"/> Esteira de Produção</>
                        )}
                    </h1>
                    <div className="flex items-center gap-4 mt-2">
                        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">Status de Implantação e Logística</p>
                    </div>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    {!tvMode && (
                        <button onClick={() => setViewMode(viewMode === 'board' ? 'history' : 'board')} className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-bold transition border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[10px] uppercase tracking-widest shadow-sm">
                            {viewMode === 'board' ? <History size={16}/> : <Trello size={16}/>}
                            {viewMode === 'board' ? 'Histórico' : 'Quadro'}
                        </button>
                    )}
                    <button onClick={() => setTvMode(!tvMode)} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-xl font-black transition text-[10px] uppercase tracking-widest shadow-2xl ${tvMode ? 'bg-slate-800 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                        {tvMode ? <Minimize size={18}/> : <MonitorPlay size={16}/>} {tvMode ? 'Sair TV' : 'Modo TV'}
                    </button>
                </div>
            </div>

            {viewMode === 'board' ? (
                <div className="flex-1 min-h-0 overflow-x-auto custom-scrollbar">
                    <div className="flex h-full gap-4 min-w-max pb-4">
                        {columns.map(col => (
                            <div 
                                key={col.id} 
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                                className={`flex flex-col w-80 rounded-[2.5rem] border-t-8 bg-slate-100/50 dark:bg-slate-800/50 shadow-inner transition-all ${draggedProjectId ? 'border-dashed opacity-80 scale-[0.98]' : ''}`} 
                                style={{borderColor: col.color}}
                            >
                                <div className="p-5 border-b border-slate-200 dark:border-slate-700 font-black uppercase flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-t-[2.3rem] tracking-widest text-[10px]">
                                    <span className="text-slate-700 dark:text-slate-200 truncate pr-2">{col.label}</span>
                                    <Badge color="gray">{getProjectsByStatus(col.id).length}</Badge>
                                </div>
                                
                                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {getProjectsByStatus(col.id).map(proj => {
                                        const sla = getSLASignal(proj.deadline);
                                        const items = safeArray(proj.products);
                                        
                                        return (
                                            <div 
                                                key={proj.id} 
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, proj.id)}
                                                onClick={() => setSelectedProject(proj)} 
                                                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-xl transition-all group relative overflow-hidden active:scale-95 active:cursor-grabbing p-5 rounded-[2rem]"
                                            >
                                                <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000" style={{width: `${proj.progress}%`}}></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-black text-white flex items-center gap-1 ${sla.color}`}>{sla.icon} {sla.label}</span>
                                                        </div>
                                                        <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-[15px] mb-1 truncate">{proj.title}</h3>
                                                        <div className="flex items-center gap-1.5 text-slate-400">
                                                            <Building2 size={12} className="shrink-0"/>
                                                            <p className="font-black uppercase tracking-widest truncate text-[9px]">{proj.clientName}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex justify-between items-center">
                                                    <div className="flex -space-x-2">
                                                        {items.slice(0, 3).map((it, idx) => (
                                                            <div key={idx} className="w-6 h-6 rounded-lg bg-indigo-50 dark:bg-indigo-900 flex items-center justify-center border-2 border-white dark:border-slate-800 text-[8px] font-black" title={it}>{it.charAt(0)}</div>
                                                        ))}
                                                        {items.length > 3 && <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center border-2 border-white dark:border-slate-800 text-[8px] font-black">+{items.length-3}</div>}
                                                    </div>
                                                    <span className="text-[11px] font-black text-indigo-600 font-mono">{proj.progress}%</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="p-5 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                            <input type="text" placeholder="Filtrar histórico..." className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white dark:bg-slate-800 text-sm font-bold outline-none" value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-black sticky top-0 shadow-sm">
                                <tr><th className="p-6">Unidade</th><th className="p-6">Empresa</th><th className="p-6 text-center">Conclusão</th><th className="p-6 text-right">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {historyProjects.map(proj => (
                                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => setSelectedProject(proj)}>
                                        <td className="p-6 font-black text-slate-900 dark:text-white uppercase tracking-tighter">{proj.title}</td>
                                        <td className="p-6 text-xs font-bold text-slate-500 uppercase">{proj.clientName}</td>
                                        <td className="p-6 text-center font-bold">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="p-6 text-right"><button className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">Detalhes</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-6xl h-[94vh] overflow-hidden shadow-2xl flex flex-col border">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-1">{selectedProject.title}</h2>
                                <p className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2"><Building2 size={12}/> {selectedProject.clientName}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-3 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all rounded-2xl"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-3 gap-10 custom-scrollbar">
                             {/* Coluna 1: Relatório e Checklist de Kitting */}
                             <div className="lg:col-span-1 space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><ClipboardCheck size={14}/> Checklist Técnico (Kitting)</h4>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border space-y-3 shadow-inner">
                                        {selectedProject.technicalSpecs ? (
                                            <div className="grid grid-cols-1 gap-4 text-xs">
                                                {/* Gabinetes - Suporte a múltiplos itens */}
                                                {selectedProject.technicalSpecs.gabinetes && selectedProject.technicalSpecs.gabinetes.length > 0 && (
                                                    <div className="border-b pb-3">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2 mb-2"><Box size={12}/> Gabinete(s)</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedProject.technicalSpecs.gabinetes.map((g, idx) => (
                                                                <span key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-[10px] font-black">{g}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {/* Servidor/Caixa - Suporte a múltiplos itens */}
                                                {selectedProject.technicalSpecs.servidorCaixa && selectedProject.technicalSpecs.servidorCaixa.length > 0 && (
                                                    <div className="border-b pb-3">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2 mb-2"><Cpu size={12}/> Servidor / Caixa</span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {selectedProject.technicalSpecs.servidorCaixa.map((s, idx) => (
                                                                <span key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded text-[10px] font-black">{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.camera && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><MonitorIcon size={12}/> Câmera</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.camera}</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.nobreak && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><Zap size={12}/> Nobreak</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.nobreak} ({selectedProject.technicalSpecs.nobreakQty || '1'})</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.faceId && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><User size={12}/> Face ID</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.faceId}</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.ilha && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><Layout size={12}/> Ilha</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.ilha}</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.cancela && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><Minimize size={12}/> Cancela</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.cancela} ({selectedProject.technicalSpecs.cancelaQty || '1'})</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.braco && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><ShieldCheck size={12}/> Braço</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.braco} {selectedProject.technicalSpecs.bracoTamanho ? `(${selectedProject.technicalSpecs.bracoTamanho})` : ''}</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.modeloAutomacao && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase flex items-center gap-2"><Settings2 size={12}/> Automação</span>
                                                        <span className="font-black text-indigo-600 uppercase">{selectedProject.technicalSpecs.modeloAutomacao}</span>
                                                    </div>
                                                )}
                                                {selectedProject.technicalSpecs.fotoCelula && (
                                                    <div className="flex justify-between border-b pb-2">
                                                        <span className="text-slate-400 font-bold uppercase">Foto Célula</span>
                                                        <span className="font-black text-slate-700 dark:text-white">{selectedProject.technicalSpecs.fotoCelula}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-400 italic text-xs py-10">Sem especificações técnicas detalhadas.</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><AlignLeft size={14}/> Notas do Consultor</h4>
                                    <p className="text-sm font-medium text-slate-600 dark:text-slate-300 italic leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border">{selectedProject.description}</p>
                                </div>
                             </div>

                             {/* Coluna 2: Tarefas Operacionais */}
                             <div className="lg:col-span-1">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><CheckSquare size={14}/> Tarefas de Implantação</h4>
                                <div className="space-y-3">
                                    {safeArray(selectedProject.tasks).map(t => (
                                        <div key={t.id} onClick={() => handleToggleTask(selectedProject, t.id)} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${t.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 opacity-60' : 'bg-white dark:bg-slate-900 hover:border-indigo-300'}`}>
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${t.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300'}`}>{t.status === 'Done' && <CheckCircle size={14} fill="currentColor"/>}</div>
                                            <span className={`text-xs font-bold ${t.status === 'Done' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-white'}`}>{t.title}</span>
                                        </div>
                                    ))}
                                </div>
                             </div>

                             {/* Coluna 3: Estágios e Inventário */}
                             <div className="lg:col-span-1 space-y-8">
                                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute right-[-20px] top-[-20px] text-white/5"><Activity size={150}/></div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-6 tracking-widest relative z-10">Mover Estágio da Esteira</h4>
                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        {columns.map(c => (
                                            <button key={c.id} onClick={() => handleUpdateStatus(selectedProject.id, c.id)} className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${selectedProject.status === c.id ? 'bg-white text-slate-900 border-white shadow-xl scale-[1.05]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-indigo-500'}`}>
                                                {c.label.split(' ')[1]}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                                        <div className="flex justify-between mb-3"><span className="text-[10px] font-black text-indigo-300 uppercase">Evolução</span><span className="text-xl font-black text-white font-mono">{selectedProject.progress}%</span></div>
                                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden shadow-inner"><div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-1000" style={{width: `${selectedProject.progress}%`}}></div></div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2"><ShoppingBag size={14}/> Catálogo de Equipamentos</h4>
                                    <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                        {safeArray(selectedProject.products).map((p, i) => (
                                            <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border">
                                                <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-indigo-500"><Package size={16}/></div>
                                                <span className="text-[11px] font-bold uppercase">{p}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
