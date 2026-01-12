
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask } from '../types';
import { MonitorPlay, Minimize, Wrench, Clock, CheckCircle, X, Search, History, Trello, Box, Activity, AlignLeft, GripVertical, BookOpen, Monitor } from 'lucide-react';
import { Badge } from '../components/Widgets';

export const Operations: React.FC = () => {
    const { projects: globalProjects, updateProject, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    const [tvMode, setTvMode] = useState(false);
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    
    const [historySearch, setHistorySearch] = useState('');
    const [managerFilter, setManagerFilter] = useState('All');

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [draggedProjectId, setDraggedProjectId] = useState<string | null>(null);
    
    // ESTADO LOCAL INICIALIZADO COM OS DADOS GLOBAIS
    const [localProjects, setLocalProjects] = useState<Project[]>([]);

    useEffect(() => {
        if (!draggedProjectId) {
            setLocalProjects(globalProjects);
        }
    }, [globalProjects, draggedProjectId]);

    const managers = useMemo(() => ['All', ...new Set(localProjects.map(p => p.manager).filter(Boolean))], [localProjects]);

    const historyProjects = useMemo(() => {
        return localProjects.filter(p => {
            const isArchived = p.archived;
            const matchesSearch = p.title.toLowerCase().includes(historySearch.toLowerCase()) || 
                                 p.clientName.toLowerCase().includes(historySearch.toLowerCase());
            const matchesManager = managerFilter === 'All' || p.manager === managerFilter;
            return isArchived && matchesSearch && matchesManager;
        }).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [localProjects, historySearch, managerFilter]);

    // ESTEIRA DE PRODUÇÃO COM 5 ESTÁGIOS
    const columns = [
        { id: 'Kitting', label: '1. Separação (Kitting)', color: 'border-orange-500', progress: 20 },
        { id: 'Assembly', label: '2. Montagem / Bancada', color: 'border-purple-500', progress: 40 },
        { id: 'Execution', label: '3. Instalação / Campo', color: 'border-yellow-500', progress: 60 },
        { id: 'Training', label: '4. Treinamento / Go-Live', color: 'border-blue-500', progress: 80 },
        { id: 'Completed', label: '5. Concluída / Testada', color: 'border-green-500', progress: 100 },
    ];

    const getProjectsByStatus = (statusId: string) => {
        return localProjects.filter(p => p.status === statusId && !p.archived);
    };

    // --- LÓGICA DE MOVIMENTAÇÃO ---
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
        const projIndex = localProjects.findIndex(p => p.id === id);
        if (projIndex !== -1) {
            const statusConfig = columns.find(c => c.id === newStatus);
            const newProgress = statusConfig ? statusConfig.progress : localProjects[projIndex].progress;
            
            const updatedProjectData: Project = { 
                ...localProjects[projIndex], 
                status: newStatus, 
                progress: newProgress,
                statusUpdatedAt: new Date().toISOString(),
                completedAt: newStatus === 'Completed' ? new Date().toISOString() : localProjects[projIndex].completedAt,
                archived: newStatus === 'Completed' // Se concluído, arquiva para histórico
            };

            // 1. ATUALIZAÇÃO VISUAL INSTANTÂNEA NO ESTADO LOCAL
            setLocalProjects(prev => prev.map(p => p.id === id ? updatedProjectData : p));

            if (selectedProject?.id === id) {
                setSelectedProject(updatedProjectData);
            }

            // 2. PERSISTÊNCIA NO CONTEXTO (QUE SALVA NO SUPABASE E LOCALSTORAGE)
            await updateProject(currentUser, updatedProjectData);
            
            addSystemNotification("Produção Atualizada", `Projeto movido para ${newStatus}.`, "success");
        }
    };

    const handleToggleTask = async (project: Project, taskId: string) => {
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t);
        const updatedProject = { ...project, tasks: updatedTasks };
        
        setLocalProjects(prev => prev.map(p => p.id === project.id ? updatedProject : p));
        if(selectedProject?.id === project.id) {
            setSelectedProject(updatedProject);
        }
        
        await updateProject(currentUser, updatedProject);
    };

    return (
        <div className={tvMode ? "fixed inset-0 z-[9999] bg-slate-950 p-6 overflow-hidden flex flex-col transition-all duration-500" : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors"}>
            <div className={`flex justify-between items-center shrink-0 ${tvMode ? 'mb-8 border-b border-slate-800 pb-6' : 'mb-6'}`}>
                <div>
                    <h1 className={`${tvMode ? 'text-4xl' : 'text-3xl'} font-black flex items-center gap-3 text-slate-900 dark:text-white uppercase tracking-tighter`}>
                        {tvMode ? (
                            <><Monitor className="text-indigo-400 animate-pulse" size={40}/> Dashboard de Operações</>
                        ) : (
                            <><Wrench className="text-indigo-600 dark:text-indigo-400"/> Painel de Produção</>
                        )}
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Visão Estratégica & Esteira de Produção</p>
                </div>

                <div className="flex gap-3">
                    {!tvMode && (
                        <button onClick={() => setViewMode(viewMode === 'board' ? 'history' : 'board')} className="flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs uppercase tracking-widest">
                            {viewMode === 'board' ? <History size={18}/> : <Trello size={18}/>}
                            {viewMode === 'board' ? 'Histórico' : 'Quadro'}
                        </button>
                    )}
                    <button onClick={() => setTvMode(!tvMode)} className={`flex items-center gap-2 px-6 py-2 rounded-xl font-black transition text-xs uppercase tracking-widest shadow-2xl ${tvMode ? 'bg-red-600 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                        {tvMode ? <Minimize size={20}/> : <MonitorPlay size={18}/>} {tvMode ? 'Sair do Modo TV' : 'Modo TV'}
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
                                <div className="p-4 border-b border-slate-200 dark:border-slate-700 font-black uppercase flex justify-between items-center bg-white/50 dark:bg-slate-800/50 rounded-t-[2.3rem] tracking-widest text-[10px]">
                                    <span className="text-slate-700 dark:text-slate-200 truncate pr-2">{col.label}</span>
                                    <Badge color="gray">{getProjectsByStatus(col.id).length}</Badge>
                                </div>
                                <div className="p-2 space-y-3 overflow-y-auto custom-scrollbar flex-1">
                                    {getProjectsByStatus(col.id).map(proj => (
                                        <div 
                                            key={proj.id} 
                                            draggable
                                            onDragStart={(e) => handleDragStart(e, proj.id)}
                                            onClick={() => setSelectedProject(proj)} 
                                            className={`p-4 bg-white dark:bg-slate-800 rounded-[1.8rem] border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-2xl transition-all group relative overflow-hidden active:scale-95 active:cursor-grabbing animate-fade-in`}
                                        >
                                            <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-1000" style={{width: `${proj.progress}%`}}></div>
                                            
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-black text-slate-900 dark:text-white text-[11px] uppercase tracking-tight line-clamp-2 leading-tight">{proj.clientName}</h3>
                                                <div className="bg-slate-100 dark:bg-slate-700 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition"><GripVertical size={12} className="text-slate-400"/></div>
                                            </div>
                                            
                                            <div className="space-y-2">
                                                {proj.description && (
                                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/20 p-2 rounded-xl border border-indigo-100/50 dark:border-indigo-800/50">
                                                        <p className="text-slate-700 dark:text-slate-200 leading-snug font-bold text-[9px] line-clamp-3 italic">
                                                            {proj.description}
                                                        </p>
                                                    </div>
                                                )}

                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <p className="text-[9px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-tight font-medium">
                                                        {proj.products && proj.products.length > 0 ? proj.products.join(' • ') : 'S/ Itens'}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex justify-between items-center pt-1">
                                                <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 font-mono">{proj.progress}%</span>
                                                <div className="flex items-center gap-1 text-[9px] font-black text-slate-400 uppercase">
                                                    <Clock size={10}/> {new Date(proj.deadline).toLocaleDateString('pt-BR', {day:'2-digit', month:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {getProjectsByStatus(col.id).length === 0 && (
                                        <div className="h-full flex flex-col items-center justify-center opacity-5 py-10">
                                            <Box size={40} className="text-slate-400 mb-2"/>
                                            <span className="text-[8px] font-black uppercase tracking-widest">Coluna Vazia</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[200px]">
                            <Search className="absolute left-4 top-3 text-slate-400" size={18}/>
                            <input 
                                type="text" 
                                placeholder="Buscar no histórico de conclusões..." 
                                className="w-full pl-12 pr-4 py-3 rounded-2xl border-none bg-white dark:bg-slate-800 text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={historySearch}
                                onChange={e => setHistorySearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-[10px] font-black sticky top-0 shadow-sm z-10">
                                <tr><th className="p-6">Projeto / Unidade</th><th className="p-6">Progresso Final</th><th className="p-6 text-center">Data Conclusão</th><th className="p-6 text-right">Ações</th></tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {historyProjects.map(proj => (
                                    <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                        <td className="p-6">
                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-base">{proj.clientName}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{proj.title}</p>
                                        </td>
                                        <td className="p-6">
                                            <div className="flex items-center gap-3">
                                                <CheckCircle size={16} className="text-emerald-500"/>
                                                <span className="font-black font-mono text-emerald-600">{proj.progress}%</span>
                                            </div>
                                        </td>
                                        <td className="p-6 text-center text-slate-500 font-bold">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString('pt-BR') : '-'}</td>
                                        <td className="p-6 text-right"><button onClick={() => setSelectedProject(proj)} className="bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition">Detalhes</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="fixed inset-0 bg-slate-950/95 flex items-center justify-center z-[10000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-scale-in border border-white/10">
                        <div className="p-8 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none mb-2">{selectedProject.clientName}</h2>
                                <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">{selectedProject.title}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="p-3 hover:bg-red-50 hover:text-red-500 rounded-2xl text-slate-400 transition-all"><X size={24}/></button>
                        </div>
                        
                        <div className="p-8 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-2 gap-10 custom-scrollbar">
                             <div className="space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><AlignLeft size={14}/> Descritivo Técnico do Escopo</h4>
                                    <div className="bg-indigo-50/30 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-800/50 text-sm font-bold text-slate-700 dark:text-slate-200 leading-relaxed shadow-inner">
                                        {selectedProject.description || "Nenhuma instrução adicional registrada para este projeto."}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><CheckCircle size={14}/> Checklist de Atividades</h4>
                                    <div className="space-y-3">
                                        {selectedProject.tasks && selectedProject.tasks.length > 0 ? selectedProject.tasks.map(t => (
                                            <div 
                                                key={t.id} 
                                                onClick={() => handleToggleTask(selectedProject, t.id)}
                                                className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all ${t.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 opacity-60' : 'bg-white dark:bg-slate-700 border-slate-100 dark:border-slate-600 hover:border-indigo-300 shadow-sm'}`}
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${t.status === 'Done' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300'}`}>
                                                    {t.status === 'Done' && <CheckCircle size={14} fill="currentColor"/>}
                                                </div>
                                                <span className={`text-xs font-bold ${t.status === 'Done' ? 'line-through text-slate-500' : 'text-slate-800 dark:text-white'}`}>{t.title}</span>
                                            </div>
                                        )) : <p className="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border text-center">Nenhuma etapa detalhada para este checklist.</p>}
                                    </div>
                                </div>
                             </div>

                             <div className="flex flex-col gap-8">
                                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    <div className="absolute right-[-20px] top-[-20px] text-white/5"><Activity size={150}/></div>
                                    <h4 className="text-[10px] font-black text-indigo-400 uppercase mb-6 tracking-widest relative z-10">Status do Processo</h4>
                                    
                                    <div className="grid grid-cols-2 gap-3 relative z-10">
                                        {columns.map(c => (
                                            <button 
                                                key={c.id} 
                                                onClick={(e) => { e.stopPropagation(); handleUpdateStatus(selectedProject.id, c.id); }} 
                                                className={`p-4 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all flex flex-col items-center gap-2 ${selectedProject.status === c.id ? 'bg-white text-slate-900 border-white shadow-xl scale-[1.02]' : 'bg-slate-800 text-slate-500 border-slate-700 hover:border-indigo-500 hover:text-indigo-400'}`}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {c.id === 'Training' && <BookOpen size={12}/>}
                                                    {c.label.split(' ')[1]}
                                                </span>
                                                <span className="text-[8px] opacity-60">{c.progress}%</span>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-8 pt-8 border-t border-white/10 relative z-10">
                                        <div className="flex justify-between items-end mb-3">
                                            <span className="text-[10px] font-black text-indigo-300 uppercase">Evolução Global</span>
                                            <span className="text-2xl font-black text-white font-mono">{selectedProject.progress}%</span>
                                        </div>
                                        <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
                                            <div className="h-full bg-gradient-to-r from-indigo-500 to-blue-400 transition-all duration-1000" style={{width: `${selectedProject.progress}%`}}></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-700 shadow-sm">
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2"><Box size={14}/> Materiais / Hardware</h4>
                                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                        {selectedProject.products && selectedProject.products.length > 0 ? (
                                            selectedProject.products.map((p, i) => (
                                                <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <Box size={14} className="text-indigo-500"/>
                                                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">{p}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-6 text-slate-400 italic text-xs">Nenhum hardware vinculado.</div>
                                        )}
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
