
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, MarketingContent } from '../types';
import { Trello, Plus, Calendar, User, MoreHorizontal, CheckSquare, Sparkles, X, Save, Trash2, Clock, CheckCircle, Archive, AlertCircle, History, Megaphone } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';

export const Projects: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification, addMarketingContent } = useData();
    const { currentUser } = useAuth();
    
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newProjForm, setNewProjForm] = useState({ title: '', client: '', description: '', start: new Date().toISOString().split('T')[0] });
    const [aiLoading, setAiLoading] = useState(false);

    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Nova tabela de progresso sincronizada com Operations
    const columns = [
        { id: 'Kitting', label: 'Kitting', color: 'border-orange-300 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-800', progress: 25 },
        { id: 'Assembly', label: 'Montagem', color: 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800', progress: 50 },
        { id: 'Execution', label: 'Execução', color: 'border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800', progress: 75 },
        { id: 'Completed', label: 'Concluído', color: 'border-green-300 bg-green-50 dark:bg-green-900/20 dark:border-green-800', progress: 100 },
    ];

    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
    const historyProjects = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return projects.filter(p => p.archived && p.completedAt && new Date(p.completedAt) >= thirtyDaysAgo).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [projects]);

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        setAiLoading(true);
        let initialTasks: ProjectTask[] = [];
        try {
            const aiTasks = await generateProjectTasks(newProjForm.title, newProjForm.description);
            initialTasks = aiTasks.map((t: any, i: number) => ({ id: `t-${Date.now()}-${i}`, title: t.title, status: 'Pending' }));
        } catch (error) { console.error(error); } finally { setAiLoading(false); }

        const project: Project = {
            id: `PROJ-${Date.now()}`,
            title: newProjForm.title,
            clientName: newProjForm.client,
            status: 'Kitting', 
            progress: 25, // Inicia em 25% conforme regra de status
            startDate: newProjForm.start,
            deadline: new Date(new Date(newProjForm.start).setDate(new Date().getDate() + 45)).toISOString(),
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
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t);
        
        // Agora o progresso NÃO é mais calculado por aqui.
        // O progresso segue o STATUS definido no Kanban da Produção.
        updateProject(currentUser, { ...project, tasks: updatedTasks });
        
        if(selectedProject?.id === project.id) {
            setSelectedProject({ ...project, tasks: updatedTasks });
        }
    };

    const handleUpdateProjectStatusInProjects = (project: Project, newStatus: any) => {
        const statusConfig = columns.find(c => c.id === newStatus);
        const newProgress = statusConfig ? statusConfig.progress : project.progress;
        
        const updated = { 
            ...project, 
            status: newStatus, 
            progress: newProgress,
            statusUpdatedAt: new Date().toISOString()
        };
        updateProject(currentUser, updated);
        if(selectedProject?.id === project.id) setSelectedProject(updated);
    };

    return (
        <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Trello className="text-indigo-600 dark:text-indigo-400"/> Gestão de Projetos
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400">Progresso calculado automaticamente pelo estágio da produção.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setViewMode('board')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'board' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-50'}`}>Quadro</button>
                    <button onClick={() => setViewMode('history')} className={`px-4 py-2 rounded-md text-sm font-medium transition ${viewMode === 'history' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : 'text-slate-50'}`}>Histórico</button>
                </div>
                <button onClick={() => setIsNewProjectOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 shadow-sm transition">Novo Projeto</button>
            </div>

            {viewMode === 'board' ? (
                <div className="flex-1 overflow-x-auto pb-4">
                    <div className="flex gap-6 h-full min-w-max">
                        {columns.map(col => (
                            <div key={col.id} className="w-80 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <div className={`p-4 font-bold border-b ${col.color} flex justify-between`}>
                                    {col.label} <span className="text-[10px] bg-white/50 px-1.5 rounded">{col.progress}%</span>
                                </div>
                                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                                    {activeProjects.filter(p => p.status === col.id).map(proj => (
                                        <div key={proj.id} onClick={() => setSelectedProject(proj)} className="bg-white dark:bg-slate-700 p-4 rounded-lg border border-slate-200 dark:border-slate-600 hover:shadow-md cursor-pointer transition">
                                            <h4 className="font-bold text-sm mb-1">{proj.clientName}</h4>
                                            <p className="text-xs text-slate-500 truncate">{proj.title}</p>
                                            <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div className="bg-blue-500 h-full transition-all" style={{width:`${proj.progress}%`}}></div>
                                            </div>
                                            <div className="mt-2 text-[9px] font-bold text-slate-400 uppercase text-right">{proj.progress}% Concluído</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 uppercase text-xs sticky top-0">
                            <tr><th className="p-4">Projeto</th><th className="p-4">Cliente</th><th className="p-4 text-center">Evolução</th><th className="p-4 text-center">Conclusão</th></tr>
                        </thead>
                        <tbody className="divide-y">
                            {historyProjects.map(proj => (
                                <tr key={proj.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedProject(proj)}>
                                    <td className="p-4 font-bold">{proj.title}</td>
                                    <td className="p-4">{proj.clientName}</td>
                                    <td className="p-4 text-center font-mono font-bold text-green-600">{proj.progress}%</td>
                                    <td className="p-4 text-center">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isNewProjectOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold">Novo Projeto</h3>
                            <button onClick={() => setIsNewProjectOpen(false)}><X/></button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4">
                            <input required className="w-full border rounded p-2" placeholder="Nome do Projeto" value={newProjForm.title} onChange={e => setNewProjForm({...newProjForm, title: e.target.value})} />
                            <select required className="w-full border rounded p-2 bg-white dark:bg-slate-800" value={newProjForm.client} onChange={e => setNewProjForm({...newProjForm, client: e.target.value})}>
                                <option value="">Selecione o Cliente</option>
                                {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                            <textarea className="w-full border rounded p-2 h-24" placeholder="Descrição para IA gerar tarefas..." value={newProjForm.description} onChange={e => setNewProjForm({...newProjForm, description: e.target.value})} />
                            <button disabled={aiLoading} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition">
                                {aiLoading ? 'Processando IA...' : 'Iniciar Projeto'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in h-[80vh] flex flex-col">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50 dark:bg-slate-900 shrink-0">
                            <div>
                                <h2 className="text-xl font-bold">{selectedProject.title}</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedProject.status}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)}><X/></button>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between text-sm font-black uppercase text-indigo-600 dark:text-indigo-400 mb-2">
                                    <span>Evolução por Estágio</span>
                                    <span>{selectedProject.progress || 0}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 shadow-inner overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-700 shadow-lg" style={{width: `${selectedProject.progress}%`}}></div>
                                </div>
                                <p className="mt-4 text-[10px] text-slate-400 text-center font-medium italic">A evolução é vinculada ao estágio atual na aba Produção.</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                                {columns.map(c => (
                                    <button 
                                        key={c.id} 
                                        onClick={() => handleUpdateProjectStatusInProjects(selectedProject, c.id)}
                                        className={`p-3 rounded-lg border text-xs font-bold transition flex items-center justify-between ${selectedProject.status === c.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-700 border-slate-200 text-slate-500 dark:text-slate-400 hover:border-indigo-400'}`}
                                    >
                                        <span>{c.label}</span>
                                        <span className="opacity-50">{c.progress}%</span>
                                    </button>
                                ))}
                            </div>

                            <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                <CheckSquare size={18}/> Checklist de Tarefas
                            </h3>
                            <div className="space-y-2">
                                {selectedProject.tasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer transition" onClick={() => handleToggleTask(selectedProject, task.id)}>
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition ${task.status === 'Done' ? 'bg-green-500 border-green-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300'}`}>
                                            {task.status === 'Done' && <CheckCircle size={14}/>}
                                        </div>
                                        <span className={`text-sm ${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
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
