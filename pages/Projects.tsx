
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask } from '../types';
import { Trello, Plus, Calendar, User, MoreHorizontal, CheckSquare, Sparkles, X, Save, Trash2, Clock, CheckCircle, Archive, AlertCircle, History } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';

export const Projects: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    // View State
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    
    // Mobile Check
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // New Project Modal
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newProjForm, setNewProjForm] = useState({ title: '', client: '', description: '', start: new Date().toISOString().split('T')[0] });
    const [aiLoading, setAiLoading] = useState(false);

    // Task Edit State
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const columns = [
        { id: 'Planning', label: 'Planejamento', color: 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800' },
        { id: 'Execution', label: 'Execução', color: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800' },
        { id: 'Review', label: 'Revisão', color: 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800' },
        { id: 'Completed', label: 'Concluído', color: 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800' },
    ];

    // Filter projects based on view mode (Active vs Archived History)
    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
    
    const historyProjects = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return projects.filter(p => 
            p.archived && 
            p.completedAt && 
            new Date(p.completedAt) >= thirtyDaysAgo
        ).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [projects]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        
        let initialTasks: ProjectTask[] = [];
        
        // Auto-generate tasks with AI if requested (implicitly done for all new projects to "wow" user)
        setAiLoading(true);
        try {
            const aiTasks = await generateProjectTasks(newProjForm.title, newProjForm.description);
            initialTasks = aiTasks.map((t: any, i: number) => ({
                id: `t-${Date.now()}-${i}`,
                title: t.title,
                status: 'Pending'
            }));
        } catch (error) {
            console.error("AI Gen Failed", error);
        } finally {
            setAiLoading(false);
        }

        const project: Project = {
            id: `PROJ-${Date.now()}`,
            title: newProjForm.title,
            clientName: newProjForm.client,
            status: 'Planning',
            progress: 0,
            startDate: newProjForm.start,
            deadline: new Date(new Date(newProjForm.start).setDate(new Date().getDate() + 30)).toISOString(),
            manager: currentUser.name,
            description: newProjForm.description,
            tasks: initialTasks,
            organizationId: currentUser.organizationId,
            archived: false
        };

        addProject(currentUser, project);
        setIsNewProjectOpen(false);
        setNewProjForm({ title: '', client: '', description: '', start: new Date().toISOString().split('T')[0] });
    };

    const handleToggleTask = (project: Project, taskId: string) => {
        const updatedTasks = project.tasks.map(t => 
            t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t
        );
        
        // Recalculate progress
        const doneCount = updatedTasks.filter(t => t.status === 'Done').length;
        const progress = Math.round((doneCount / updatedTasks.length) * 100);

        updateProject(currentUser, { ...project, tasks: updatedTasks, progress });
        if(selectedProject?.id === project.id) setSelectedProject({ ...project, tasks: updatedTasks, progress });
    };

    const handleDeleteProject = (id: string) => {
        if(confirm("Tem certeza que deseja excluir este projeto?")) {
            deleteProject(currentUser, id);
            if(selectedProject?.id === id) setSelectedProject(null);
        }
    };

    // --- FINALIZE & ARCHIVE LOGIC ---
    const handleFinalizeProject = (project: Project) => {
        if (confirm(`Deseja finalizar o projeto "${project.title}"?\n\nIsso irá:\n1. Mover o projeto para o Histórico.\n2. Notificar o Financeiro para cobrança.`)) {
            // 1. Archive Project
            updateProject(currentUser, {
                ...project,
                archived: true,
                completedAt: new Date().toISOString(),
                status: 'Completed', // Ensure status is Completed
                progress: 100
            });

            // 2. Notify Finance
            addSystemNotification(
                'Faturamento Pendente',
                `Projeto "${project.title}" (${project.clientName}) concluído. Verificar faturamento final.`,
                'info',
                project.clientName
            );
        }
    };

    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        if (isMobile) { e.preventDefault(); return; }
        e.dataTransfer.setData('projectId', projectId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        const projectId = e.dataTransfer.getData('projectId');
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== targetStatus) {
            updateProject(currentUser, { ...project, status: targetStatus as any });
        }
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trello className="text-indigo-600 dark:text-indigo-400"/> Gestão de Projetos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Acompanhamento de entregas e instalações.</p>
                </div>
                
                <div className="flex gap-2 bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setViewMode('board')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${viewMode === 'board' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <Trello size={16}/> Kanban Ativo
                    </button>
                    <button 
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 transition ${viewMode === 'history' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                    >
                        <History size={16}/> Histórico (30d)
                    </button>
                </div>

                <button onClick={() => setIsNewProjectOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition">
                    <Plus size={18}/> Novo Projeto
                </button>
            </div>

            {/* Content Area */}
            {viewMode === 'board' ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex gap-6 h-full min-w-max">
                        {columns.map(col => (
                            <div 
                                key={col.id} 
                                className="w-80 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className={`p-4 font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 rounded-t-xl flex justify-between items-center ${col.color}`}>
                                    {col.label}
                                    <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs">{activeProjects.filter(p => p.status === col.id).length}</span>
                                </div>
                                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {activeProjects.filter(p => p.status === col.id).map(proj => (
                                        <div 
                                            key={proj.id} 
                                            draggable={!isMobile}
                                            onDragStart={(e) => handleDragStart(e, proj.id)}
                                            onClick={() => setSelectedProject(proj)}
                                            className="bg-white dark:bg-slate-700 p-4 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-500 cursor-pointer transition group relative flex flex-col"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{proj.title}</h4>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(proj.id); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-1"><User size={12}/> {proj.clientName}</p>
                                            
                                            <div className="mb-3">
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 mb-1">
                                                    <span>Progresso</span>
                                                    <span className="font-bold">{proj.progress}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 dark:bg-slate-600 rounded-full h-1.5">
                                                    <div className={`h-1.5 rounded-full transition-all duration-500 ${proj.progress === 100 ? 'bg-green-500' : 'bg-blue-600 dark:bg-blue-500'}`} style={{width: `${proj.progress}%`}}></div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-slate-600 text-xs text-slate-400 dark:text-slate-500 mt-auto">
                                                <span className="flex items-center gap-1"><Clock size={12}/> {new Date(proj.deadline).toLocaleDateString()}</span>
                                                <span className="bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{proj.tasks.filter(t => t.status === 'Done').length}/{proj.tasks.length}</span>
                                            </div>

                                            {/* Finalize Button for Completed Column */}
                                            {col.id === 'Completed' && (
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleFinalizeProject(proj); }}
                                                    className="mt-3 w-full bg-green-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm"
                                                >
                                                    <CheckCircle size={12}/> Finalizar Entrega
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                <Archive size={18} className="text-slate-500"/> Histórico de Instalações
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Projetos concluídos nos últimos 30 dias.</p>
                        </div>
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold px-2 py-1 rounded">
                            {historyProjects.length} Registros
                        </span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {historyProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60">
                                <History size={48} className="mb-4 stroke-1"/>
                                <p className="text-sm">Nenhum projeto arquivado recentemente.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-4">Projeto</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4">Gerente</th>
                                        <th className="p-4 text-center">Concluído em</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {historyProjects.map(proj => (
                                        <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{proj.title}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{proj.clientName}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
                                                    {proj.manager?.charAt(0)}
                                                </div>
                                                {proj.manager}
                                            </td>
                                            <td className="p-4 text-center font-mono text-xs text-slate-500 dark:text-slate-400">
                                                {proj.completedAt ? new Date(proj.completedAt).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="p-4 text-center">
                                                <button 
                                                    onClick={() => setSelectedProject(proj)}
                                                    className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold"
                                                >
                                                    Ver Detalhes
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* NEW PROJECT MODAL */}
            {isNewProjectOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Iniciar Projeto</h3>
                            <button onClick={() => setIsNewProjectOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Projeto</label>
                                <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={newProjForm.title} onChange={e => setNewProjForm({...newProjForm, title: e.target.value})} placeholder="Ex: Implantação Sistema" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cliente</label>
                                <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newProjForm.client} onChange={e => setNewProjForm({...newProjForm, client: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Descrição (Para IA)</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 h-20 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={newProjForm.description} onChange={e => setNewProjForm({...newProjForm, description: e.target.value})} placeholder="Descreva o escopo para a IA gerar as tarefas..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Data Início</label>
                                <input type="date" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={newProjForm.start} onChange={e => setNewProjForm({...newProjForm, start: e.target.value})} />
                            </div>
                            
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded text-xs text-indigo-700 dark:text-indigo-300 flex gap-2 border border-indigo-100 dark:border-indigo-800">
                                <Sparkles size={16} className="shrink-0"/>
                                <p>O Nexus AI irá gerar automaticamente a lista de tarefas sugerida com base na descrição.</p>
                            </div>

                            <button type="submit" disabled={aiLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 disabled:opacity-70 flex justify-center items-center gap-2 transition shadow-lg shadow-indigo-500/20">
                                {aiLoading ? <><div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent"></div> Gerando Plano...</> : 'Criar Projeto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* PROJECT DETAIL MODAL */}
            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in h-[80vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50 dark:bg-slate-900 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedProject.title}</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm">{selectedProject.clientName} • <span className="uppercase font-bold text-xs">{selectedProject.status}</span></p>
                                {selectedProject.archived && <span className="inline-block mt-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">ARQUIVADO</span>}
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={24}/></button>
                        </div>
                        
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-6">
                                <div className="flex justify-between text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                                    <span>Progresso Geral</span>
                                    <span>{selectedProject.progress}%</span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3">
                                    <div className={`h-3 rounded-full transition-all duration-500 ${selectedProject.progress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} style={{width: `${selectedProject.progress}%`}}></div>
                                </div>
                            </div>

                            <h3 className="font-bold text-slate-800 dark:text-white mb-3 flex items-center gap-2">
                                <CheckSquare size={18} className="text-indigo-600 dark:text-indigo-400"/> Lista de Tarefas
                            </h3>
                            
                            <div className="space-y-2">
                                {selectedProject.tasks.map(task => (
                                    <div key={task.id} className={`flex items-center gap-3 p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer ${selectedProject.archived ? 'opacity-70 pointer-events-none' : ''}`} onClick={() => !selectedProject.archived && handleToggleTask(selectedProject, task.id)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${task.status === 'Done' ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-800'}`}>
                                            {task.status === 'Done' && <CheckCircle size={14} className="text-white"/>}
                                        </div>
                                        <span className={`text-sm flex-1 ${task.status === 'Done' ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
