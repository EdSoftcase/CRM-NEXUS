
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, ProjectNote, MarketingContent } from '../types';
import { MonitorPlay, Minimize, Wrench, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, Filter, X, Search, Image as ImageIcon, Camera, FileText, Upload, CheckSquare, ChevronRight, Edit2, Save, FilePlus, MessageSquare, Send, StopCircle, RefreshCw, Package, Archive, Sparkles, History, Box, Cpu, ClipboardCheck, ArrowRight, Megaphone } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';

export const Operations: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification, products, addMarketingContent } = useData();
    const { currentUser } = useAuth();
    
    // UI States
    const [tvMode, setTvMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterManager, setFilterManager] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // ... (Previous State Persistence Code) ...
    const [selectedProject, setSelectedProject] = useState<Project | null>(() => {
        try {
            const savedState = localStorage.getItem('nexus_operations_state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                return parsed.project || null;
            }
        } catch (e) {
            console.error("State restore failed", e);
        }
        return null;
    });

    const [activeTab, setActiveTab] = useState<'checklist' | 'evidence' | 'info' | 'diary'>(() => {
        try {
            const savedState = localStorage.getItem('nexus_operations_state');
            return savedState ? JSON.parse(savedState).tab : 'checklist';
        } catch {
            return 'checklist';
        }
    });

    // Edit States inside Modal
    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState(() => {
        return selectedProject?.installAddress || selectedProject?.description || '';
    });
    
    // Diary State
    const [newNoteText, setNewNoteText] = useState('');

    // New Project Modal State
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
    const [newProjForm, setNewProjForm] = useState({ 
        title: '', 
        client: '', 
        description: '', 
        start: new Date().toISOString().split('T')[0],
        products: [] as string[],
        installationNotes: ''
    });
    const [aiLoading, setAiLoading] = useState(false);

    // Mobile Check
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ... (Camera State & Logic) ...
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ... (Sync Persistence Effect) ...
    useEffect(() => {
        if (selectedProject) {
            const freshProjectData = projects.find(p => p.id === selectedProject.id);
            if (freshProjectData) {
                setSelectedProject(freshProjectData);
            }
        }
    }, [projects]);

    useEffect(() => {
        if (selectedProject) {
            const state = {
                project: selectedProject,
                tab: activeTab
            };
            localStorage.setItem('nexus_operations_state', JSON.stringify(state));
        } else {
            localStorage.removeItem('nexus_operations_state');
        }
    }, [selectedProject, activeTab]);

    // ... (Camera Functions: startCamera, stopCamera, capturePhoto, handleSavePhoto, handleFileChange) ...
    const startCamera = async () => {
        setIsCameraOpen(true);
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, 
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err: any) {
            console.error("Error accessing camera", err);
            setCameraError("Não foi possível acessar a câmera. Verifique as permissões do navegador.");
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            const tracks = stream.getTracks();
            tracks.forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOpen(false);
        setCameraError(null);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7);
                handleSavePhoto(base64);
                stopCamera();
            }
        }
    };

    const handleSavePhoto = (base64String: string) => {
        if (!selectedProject) return;
        const currentPhotos = selectedProject.photos || [];
        const updatedProject = { ...selectedProject, photos: [base64String, ...currentPhotos] };
        updateProject(currentUser, updatedProject);
        setSelectedProject(updatedProject);
        handleAddNote(`📸 Nova evidência adicionada via ${isCameraOpen ? 'Câmera App' : 'Upload'}`, true);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedProject || !e.target.files || e.target.files.length === 0) return;
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            handleSavePhoto(base64String);
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    // --- OTHER LOGIC ---
    const columns = [
        { id: 'Planning', label: 'Proposta Aprovada', subLabel: 'Aguardando Início', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', headerTv: 'bg-blue-800 text-white' },
        { id: 'Kitting', label: 'Kitting / Separação', subLabel: 'Peças & Estoque', color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', headerTv: 'bg-orange-700 text-white' },
        { id: 'Assembly', label: 'Produção / Montagem', subLabel: 'Montagem & Testes', color: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', headerTv: 'bg-purple-800 text-white' },
        { id: 'Execution', label: 'Instalação', subLabel: 'Equipe em Campo', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', headerTv: 'bg-yellow-700 text-white' },
        { id: 'Completed', label: 'Concluída', subLabel: 'Entregue', color: 'border-green-500 bg-green-50 dark:bg-green-900/20', headerTv: 'bg-green-800 text-white' },
    ];

    // ... (Filter Logic: managers, filteredProjects, getProjectsByStatus) ...
    const managers = useMemo(() => Array.from(new Set(projects.map(p => p.manager).filter(Boolean))), [projects]);
    const activeProjects = useMemo(() => projects.filter(p => !p.archived), [projects]);
    const historyProjects = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return projects.filter(p => p.archived && p.completedAt && new Date(p.completedAt) >= thirtyDaysAgo).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [projects]);

    const filteredProjects = useMemo(() => {
        // If viewing history tab, filter history projects, otherwise active
        // But the View Mode switch is outside filteredProjects logic in render.
        // Let's keep general filtering here.
        return projects.filter(p => {
            const matchManager = filterManager ? p.manager === filterManager : true;
            const matchStatus = filterStatus !== 'All' ? p.status === filterStatus : true;
            return matchManager && matchStatus;
        });
    }, [projects, filterManager, filterStatus]);

    const getProjectsByStatus = (status: string) => filteredProjects.filter(p => p.status === status && !p.archived);

    // View Mode State
    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');

    // --- AUTOMATION: NOTIFY MARKETING ---
    const notifyMarketingAndCreateDraft = (project: Project) => {
        // 1. Create Marketing Content Draft
        const draftContent: MarketingContent = {
            id: `CONT-OP-${Date.now()}`,
            title: `Case de Instalação: ${project.clientName}`,
            channel: 'Instagram',
            status: 'Draft',
            tone: 'Técnico e Inspirador',
            createdAt: new Date().toISOString(),
            content: `🔧 Mais uma instalação de sucesso concluída na **${project.clientName}**!\n\nNossa equipe técnica finalizou a implementação do projeto **${project.title}** garantindo qualidade e eficiência.\n\nConfira os detalhes dessa operação:\n✅ Tecnologia de ponta\n✅ Entrega no prazo\n✅ Cliente satisfeito\n\n#Operações #Instalação #${project.clientName.replace(/\s/g, '')} #Tecnologia #Excelência`,
            organizationId: currentUser?.organizationId
        };

        addMarketingContent(currentUser, draftContent);

        // 2. Send System Notification
        addSystemNotification(
            'Marketing Alertado', 
            `Instalação "${project.title}" concluída! Um rascunho foi criado no módulo de Marketing.`, 
            'success',
            'Marketing'
        );
    };

    // ... (Drag & Drop Logic) ...
    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        if (isMobile) { e.preventDefault(); return; }
        e.dataTransfer.setData('projectId', projectId);
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    
    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        const projectId = e.dataTransfer.getData('projectId');
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== targetStatus) {
            updateProject(currentUser, { ...project, status: targetStatus as any });
            
            // Check if dropped into Completed to trigger alerts
            if (targetStatus === 'Completed' && project.status !== 'Completed') {
                notifyMarketingAndCreateDraft(project);
            }
        }
    };

    const handleCardClick = (project: Project) => {
        if (!tvMode) {
            setSelectedProject(project);
            setAddressForm(project.installAddress || project.description || '');
            setActiveTab('checklist');
            setIsEditingAddress(false);
        }
    };

    // ... (Task Toggle, Save Address, Add Note, Finalize Logic) ...
    const handleToggleTask = (task: ProjectTask) => {
        if (!selectedProject) return;
        const updatedTasks = selectedProject.tasks.map(t => t.id === task.id ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t);
        const doneCount = updatedTasks.filter(t => t.status === 'Done').length;
        const progress = Math.round((doneCount / updatedTasks.length) * 100);
        const updatedProject = { ...selectedProject, tasks: updatedTasks, progress };
        updateProject(currentUser, updatedProject);
        setSelectedProject(updatedProject);
    };

    const handleSaveAddress = () => {
        if (!selectedProject) return;
        const updatedProject = { ...selectedProject, installAddress: addressForm };
        updateProject(currentUser, updatedProject);
        setSelectedProject(updatedProject);
        setIsEditingAddress(false);
    };

    const handleAddNote = (text: string = newNoteText, isSystem: boolean = false) => {
        if (!selectedProject || (!text.trim() && !isSystem)) return;
        const newNote: ProjectNote = {
            id: `NOTE-${Date.now()}`,
            text: text,
            author: isSystem ? 'Sistema' : currentUser?.name || 'Usuário',
            timestamp: new Date().toISOString(),
            stage: selectedProject.status
        };
        const updatedProject = { ...selectedProject, notes: [newNote, ...(selectedProject.notes || [])] };
        updateProject(currentUser, updatedProject);
        setSelectedProject(updatedProject);
        if (!isSystem) setNewNoteText('');
    };

    const handleDeleteProject = (id: string) => {
        if(confirm("Tem certeza que deseja excluir este projeto?")) {
            deleteProject(currentUser, id);
            if(selectedProject?.id === id) setSelectedProject(null);
        }
    };

    const handleFinalizeProject = (project: Project) => {
        if (confirm(`Deseja finalizar o projeto "${project.title}"?\n\nIsso irá:\n1. Mover o projeto para o Histórico.\n2. Notificar o Financeiro.\n3. Alertar o Marketing para divulgação.`)) {
            updateProject(currentUser, { ...project, archived: true, completedAt: new Date().toISOString(), status: 'Completed', progress: 100 });
            
            // Notify Finance
            addSystemNotification('Faturamento Pendente', `Projeto "${project.title}" (${project.clientName}) concluído. Verificar faturamento final.`, 'info', project.clientName);
            
            // Notify Marketing
            notifyMarketingAndCreateDraft(project);
        }
    };

    // HELPER: Determine Project Card Border based on Deadline
    const getDeadlineStyle = (deadlineStr: string, status: string) => {
        if (status === 'Completed') return 'border-green-500';

        const today = new Date();
        today.setHours(0,0,0,0);
        const deadline = new Date(deadlineStr);
        deadline.setHours(0,0,0,0);
        
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // Red: Overdue
        if (diffDays < 0) return 'border-red-500';
        // Yellow: 5 days or less
        if (diffDays <= 5) return 'border-yellow-500';
        // Green: On time
        return 'border-green-500';
    };

    // --- CREATE PROJECT LOGIC ---
    const toggleNewProjectProduct = (productName: string) => {
        setNewProjForm(prev => {
            const exists = prev.products.includes(productName);
            return {
                ...prev,
                products: exists 
                    ? prev.products.filter(p => p !== productName)
                    : [...prev.products, productName]
            };
        });
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        let initialTasks: ProjectTask[] = [];
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
            archived: false,
            products: newProjForm.products, // NEW
            installationNotes: newProjForm.installationNotes // NEW
        };

        addProject(currentUser, project);
        setIsNewProjectOpen(false);
        setNewProjForm({ 
            title: '', 
            client: '', 
            description: '', 
            start: new Date().toISOString().split('T')[0],
            products: [],
            installationNotes: ''
        });
    };

    const containerClass = tvMode 
        ? "fixed inset-0 z-[200] bg-slate-950 text-white p-4 overflow-hidden flex flex-col font-sans" 
        : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors";

    return (
        <div className={containerClass}>
            {/* ... Header & Filters (Same as before) ... */}
            <div className={`flex justify-between items-center mb-6 shrink-0 ${tvMode ? 'px-4' : ''}`}>
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className={`${tvMode ? 'text-4xl' : 'text-3xl'} font-bold flex items-center gap-3 ${tvMode ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            <Wrench size={tvMode ? 40 : 28} className={tvMode ? "text-yellow-400" : "text-indigo-600 dark:text-indigo-400"}/> 
                            {tvMode ? 'OPERAÇÕES EM TEMPO REAL' : 'Painel de Produção'}
                        </h1>
                        {!tvMode && <p className="text-slate-500 dark:text-slate-400">Acompanhamento de instalações e serviços.</p>}
                    </div>
                    {tvMode && filterManager && (
                        <div className="bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2 animate-pulse">
                            <User size={20} />
                            <span className="font-bold text-xl">Filtro: {filterManager}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    {!tvMode && (
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition border ${showFilters ? 'bg-slate-200 dark:bg-slate-700 border-slate-300 dark:border-slate-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                        >
                            <Filter size={18}/> Filtros
                        </button>
                    )}
                    <button 
                        onClick={() => setTvMode(!tvMode)} 
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition shadow-sm ${tvMode ? 'bg-red-600 text-white hover:bg-red-700 text-lg shadow-lg shadow-red-900/50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {tvMode ? <Minimize size={24}/> : <MonitorPlay size={18}/>}
                        {tvMode ? 'SAIR' : 'Modo TV'}
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && !tvMode && (
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-center animate-fade-in shadow-sm">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-500 dark:text-slate-400 mr-2">
                        <Filter size={16}/> Filtrar por:
                    </div>
                    <select 
                        className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        value={filterManager}
                        onChange={(e) => setFilterManager(e.target.value)}
                    >
                        <option value="">Todos os Responsáveis</option>
                        {managers.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={() => { setFilterManager(''); setShowFilters(false); }} className="text-slate-400 hover:text-red-500 ml-auto"><X size={20}/></button>
                </div>
            )}

            {/* ... Content Area (Kanban / History) ... */}
            {viewMode === 'board' ? (
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
                    <div className="flex gap-6 h-full min-w-max">
                        {columns.map(col => (
                            <div 
                                key={col.id} 
                                className={`flex-1 min-w-[320px] flex flex-col rounded-xl transition-all duration-300 ${tvMode ? 'bg-slate-900 border-2 border-slate-800' : `border-t-4 ${col.color.split(' ')[0]} bg-slate-100 dark:bg-slate-800/50`}`}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, col.id)}
                            >
                                <div className={`p-4 flex justify-between items-center ${tvMode ? `${col.headerTv} rounded-t-lg` : 'border-b border-slate-200 dark:border-slate-700'}`}>
                                    <div>
                                        <h2 className={`font-bold ${tvMode ? 'text-2xl tracking-wide' : 'text-lg text-slate-800 dark:text-white'}`}>{col.label}</h2>
                                        {!tvMode && <p className="text-sm text-slate-500">{col.subLabel}</p>}
                                    </div>
                                    <span className={`px-3 py-1 rounded-full font-bold shadow-sm ${tvMode ? 'bg-black/30 text-white text-xl' : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs'}`}>{getProjectsByStatus(col.id).length}</span>
                                </div>
                                <div className="p-3 flex-1 overflow-y-auto custom-scrollbar space-y-3">
                                    {getProjectsByStatus(col.id).map(proj => {
                                        const borderClass = getDeadlineStyle(proj.deadline, col.id);
                                        const delayed = borderClass === 'border-red-500';

                                        return (
                                            <div 
                                                key={proj.id}
                                                draggable={!tvMode}
                                                onDragStart={(e) => handleDragStart(e, proj.id)}
                                                onClick={() => handleCardClick(proj)}
                                                className={`
                                                    rounded-xl transition-all duration-200 relative overflow-hidden flex flex-col
                                                    border-l-4 ${borderClass}
                                                    ${tvMode ? 'p-5 bg-slate-800 border-y border-r border-slate-700' : 'p-4 bg-white dark:bg-slate-800 border-y border-r border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 cursor-pointer'}
                                                `}
                                            >
                                                <div className="flex justify-between items-start mb-2">
                                                    <h3 className={`font-bold leading-tight ${tvMode ? 'text-2xl text-white' : 'text-slate-800 dark:text-white'}`}>{proj.clientName}</h3>
                                                    {delayed && <div className={`flex items-center gap-1 font-bold ${tvMode ? 'text-red-400 bg-red-900/50 px-2 py-1 rounded' : 'text-red-500'}`}><AlertCircle size={tvMode ? 20 : 16} />{tvMode && <span className="text-xs uppercase">Atrasado</span>}</div>}
                                                </div>
                                                <p className={`font-medium mb-3 ${tvMode ? 'text-lg text-slate-300' : 'text-sm text-slate-600 dark:text-slate-300'}`}>{proj.title}</p>
                                                
                                                {/* PRODUCTS SECTION (Cleaned & Prominent) */}
                                                <div className="mb-3 flex flex-wrap gap-1.5 min-h-[20px]">
                                                    {proj.products && proj.products.length > 0 ? proj.products.map((prod, idx) => (
                                                        <span 
                                                            key={idx} 
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tvMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                                                        >
                                                            {prod}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] italic text-slate-400">Sem produtos listados</span>
                                                    )}
                                                </div>

                                                {/* CLEAN FOOTER: Deadline Only (Address & Manager Removed) */}
                                                <div className={`flex items-center gap-2 text-xs mt-auto ${delayed ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    <Clock size={tvMode ? 18 : 14} className="shrink-0"/>
                                                    <span>Entrega: {new Date(proj.deadline).toLocaleDateString()}</span>
                                                </div>
                                                
                                                {/* Finalize Button for Completed Column */}
                                                {col.id === 'Completed' && !tvMode && (
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleFinalizeProject(proj); }}
                                                        className="mt-3 w-full bg-green-600 text-white text-xs font-bold py-2 rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-1 shadow-sm"
                                                    >
                                                        <Megaphone size={12}/> Finalizar e Divulgar
                                                    </button>
                                                )}

                                                <div className={`mt-4 w-full rounded-full overflow-hidden ${tvMode ? 'h-3 bg-slate-700' : 'h-1.5 bg-slate-100 dark:bg-slate-700'}`}><div className={`h-full transition-all duration-500 ${col.id === 'Completed' ? 'bg-green-500' : delayed ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${proj.progress}%`}}></div></div>
                                            </div>
                                        );
                                    })}
                                    {getProjectsByStatus(col.id).length === 0 && <div className={`text-center py-10 flex flex-col items-center justify-center ${tvMode ? 'text-slate-700 opacity-50' : 'text-slate-400 opacity-50'}`}><Clock size={40} className="mb-2"/><p className="text-sm">Sem projetos</p></div>}
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
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs sticky top-0 shadow-sm">
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
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Iniciar Projeto</h3>
                            <button onClick={() => setIsNewProjectOpen(false)}><X className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"/></button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4 overflow-y-auto">
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
                            
                            {/* Product Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Produtos a Instalar</label>
                                <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1 border border-slate-200 dark:border-slate-700 rounded-lg">
                                    {products.filter(p => p.active).map(prod => (
                                        <div 
                                            key={prod.id}
                                            onClick={() => toggleNewProjectProduct(prod.name)}
                                            className={`cursor-pointer p-2 rounded text-xs font-medium border flex items-center gap-2 transition ${newProjForm.products.includes(prod.name) ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-blue-400'}`}
                                        >
                                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${newProjForm.products.includes(prod.name) ? 'bg-blue-500 border-blue-500' : 'border-slate-400'}`}>
                                                {newProjForm.products.includes(prod.name) && <CheckCircle size={8} className="text-white"/>}
                                            </div>
                                            {prod.name}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Observações de Instalação</label>
                                <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 h-20 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none" value={newProjForm.installationNotes} onChange={e => setNewProjForm({...newProjForm, installationNotes: e.target.value})} placeholder="Particularidades do local, horários, etc." />
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
                <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[250] p-0 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800">
                        {/* ... (Header & Metadata Bar) ... */}
                        
                        {/* FEATURED PHOTO HEADER (COVER PHOTO) */}
                        <div className="w-full relative shrink-0 bg-slate-900">
                            {selectedProject.photos && selectedProject.photos.length > 0 ? (
                                <div className="h-64 w-full relative group">
                                    <img src={selectedProject.photos[0]} className="w-full h-full object-cover opacity-90" alt="Latest Evidence" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent flex items-end p-6">
                                        <div className="text-white w-full">
                                            <span className="text-xs font-bold uppercase tracking-wider bg-blue-600 px-2 py-0.5 rounded shadow-sm">{selectedProject.status}</span>
                                            <h2 className="text-3xl font-bold mt-1 text-shadow drop-shadow-md">{selectedProject.clientName}</h2>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]"></div>
                                    <div className="z-10 text-center text-white">
                                        <h2 className="text-2xl font-bold">{selectedProject.clientName}</h2>
                                        <p className="text-blue-100 text-sm">{selectedProject.title}</p>
                                    </div>
                                </div>
                            )}
                            
                            <button 
                                onClick={startCamera}
                                className="absolute top-4 left-4 bg-black/40 hover:bg-black/60 text-white p-3 rounded-full backdrop-blur-sm transition z-20 flex items-center gap-2"
                                title="Abrir Câmera"
                            >
                                <Camera size={20}/>
                                <span className="text-xs font-bold hidden sm:inline">Nova Foto</span>
                            </button>

                            <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm z-20 transition"><X size={24}/></button>
                        </div>

                        {/* Metadata Bar */}
                        <div className="px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                            {selectedProject.photos && selectedProject.photos.length > 0 && <p className="text-lg font-bold text-slate-900 dark:text-white mb-2">{selectedProject.title}</p>}
                            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-500 dark:text-slate-400 mb-3">
                                <span className="flex items-center gap-1.5"><Calendar size={16} className="text-blue-500"/> {new Date(selectedProject.startDate).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1.5"><Clock size={16} className="text-red-500"/> {new Date(selectedProject.deadline).toLocaleDateString()}</span>
                                <span className="flex items-center gap-1.5"><User size={16} className="text-indigo-500"/> {selectedProject.manager}</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden"><div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{width: `${selectedProject.progress}%`}}></div></div>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto bg-white dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                            <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'checklist' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><CheckSquare size={16} className="inline mr-2 mb-0.5"/> Checklist</button>
                            <button onClick={() => setActiveTab('diary')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'diary' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><MessageSquare size={16} className="inline mr-2 mb-0.5"/> Diário</button>
                            <button onClick={() => setActiveTab('evidence')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'evidence' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><Camera size={16} className="inline mr-2 mb-0.5"/> Fotos</button>
                            <button onClick={() => setActiveTab('info')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-slate-800' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><FileText size={16} className="inline mr-2 mb-0.5"/> Resumo</button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
                            {activeTab === 'checklist' && (
                                <div className="space-y-4">
                                    {selectedProject.status === 'Kitting' && (
                                        <div className="mb-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg animate-fade-in">
                                            <h4 className="font-bold text-orange-800 dark:text-orange-300 mb-3 flex items-center gap-2">
                                                <Box size={18}/> Checklist de Kitting
                                            </h4>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" /> 
                                                    Verificar estoque de cabos
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" /> 
                                                    Separar conectores e periféricos
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-orange-600 rounded border-slate-300 focus:ring-orange-500" /> 
                                                    Confirmar equipamentos principais
                                                </label>
                                                <button 
                                                    className="mt-3 w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-bold flex items-center justify-center gap-2"
                                                    onClick={() => updateProject(currentUser, { ...selectedProject, status: 'Assembly' })}
                                                >
                                                    Liberar para Montagem <ArrowRight size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {selectedProject.status === 'Assembly' && (
                                        <div className="mb-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg animate-fade-in">
                                            <h4 className="font-bold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                                                <Cpu size={18}/> Checklist de Montagem & Testes
                                            </h4>
                                            <div className="space-y-2">
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" /> 
                                                    Montagem física concluída
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" /> 
                                                    Testes de stress realizados
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" /> 
                                                    Firmware atualizado
                                                </label>
                                                <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 text-purple-600 rounded border-slate-300 focus:ring-purple-500" /> 
                                                    Aprovado pelo CQ
                                                </label>
                                                <button 
                                                    className="mt-3 w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-xs font-bold flex items-center justify-center gap-2"
                                                    onClick={() => updateProject(currentUser, { ...selectedProject, status: 'Execution' })}
                                                >
                                                    Liberar para Instalação <ArrowRight size={14}/>
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Tarefas do Projeto</h3>
                                    {selectedProject.tasks.map(task => (
                                        <div key={task.id} onClick={() => handleToggleTask(task)} className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition group ${task.status === 'Done' ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${task.status === 'Done' ? 'bg-green-500 border-green-500' : 'border-slate-300 dark:border-slate-500 group-hover:border-blue-500'}`}>{task.status === 'Done' && <CheckCircle size={14} className="text-white"/>}</div>
                                            <span className={`font-medium ${task.status === 'Done' ? 'text-green-700 dark:text-green-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{task.title}</span>
                                        </div>
                                    ))}
                                    {selectedProject.tasks.length === 0 && <p className="text-slate-400 italic">Nenhuma tarefa definida.</p>}
                                </div>
                            )}

                            {activeTab === 'diary' && (
                                <div className="space-y-6 flex flex-col h-full">
                                    <div className="flex-1 space-y-4 mb-4">
                                        <h3 className="font-bold text-slate-800 dark:text-white mb-2">Histórico de Ocorrências</h3>
                                        {selectedProject.notes && selectedProject.notes.length > 0 ? selectedProject.notes.map(note => (
                                            <div key={note.id} className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                                                <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap">{note.text}</p>
                                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200 dark:border-slate-600"><span className="text-xs text-slate-500">{note.author} • {note.stage}</span><span className="text-xs text-slate-400">{new Date(note.timestamp).toLocaleString()}</span></div>
                                            </div>
                                        )) : <div className="text-center py-8 text-slate-400 italic">Nenhum registro no diário.</div>}
                                    </div>
                                    <div className="sticky bottom-0 bg-white dark:bg-slate-900 pt-2 border-t border-slate-100 dark:border-slate-700">
                                        <div className="relative">
                                            <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 pr-12 text-sm h-20 resize-none outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white" placeholder="Adicione uma observação sobre o andamento..." value={newNoteText} onChange={(e) => setNewNoteText(e.target.value)} />
                                            <button onClick={() => handleAddNote()} disabled={!newNoteText.trim()} className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"><Send size={16}/></button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'evidence' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-bold text-slate-800 dark:text-white">Galeria de Fotos</h3>
                                        <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                                        <div className="flex gap-2">
                                            <button onClick={startCamera} className="text-sm bg-slate-900 dark:bg-slate-700 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-slate-800 dark:hover:bg-slate-600 flex items-center gap-2"><Camera size={16}/> <span className="hidden sm:inline">Câmera App</span></button>
                                            <button onClick={() => fileInputRef.current?.click()} className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2"><Upload size={16}/> <span className="hidden sm:inline">Upload</span></button>
                                        </div>
                                    </div>
                                    {selectedProject.photos && selectedProject.photos.length > 0 ? (
                                        <div className="grid grid-cols-2 gap-4">
                                            {selectedProject.photos.map((photo, idx) => (
                                                <div key={idx} className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 relative group">
                                                    <img src={photo} alt={`Evidência ${idx}`} className="w-full h-full object-cover"/>
                                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><a href={photo} download={`evidencia-${idx}.jpg`} className="text-white font-bold text-xs hover:underline flex items-center gap-1"><Upload size={14} className="rotate-180"/> Baixar</a></div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                                            <ImageIcon size={48} className="mb-2 opacity-50"/>
                                            <p className="text-sm">Nenhuma evidência anexada.</p>
                                            <p className="text-xs mt-1">Use a Câmera App para evitar recarregar a página.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                                        <div className="flex justify-between items-center mb-2">
                                            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Endereço de Instalação</h4>
                                            {!isEditingAddress ? <button onClick={() => setIsEditingAddress(true)} className="text-blue-600 dark:text-blue-400 p-1 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"><Edit2 size={14}/></button> : <div className="flex gap-2"><button onClick={() => setIsEditingAddress(false)} className="text-slate-500 p-1 rounded hover:bg-slate-200"><X size={14}/></button><button onClick={handleSaveAddress} className="text-green-600 p-1 rounded hover:bg-green-50"><Save size={14}/></button></div>}
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <MapPin className="text-red-500 mt-1 shrink-0" size={20}/>
                                            <div className="w-full">
                                                {isEditingAddress ? <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={addressForm} onChange={(e) => setAddressForm(e.target.value)} rows={3} /> : <div><p className="text-slate-800 dark:text-white font-medium text-sm">{selectedProject.installAddress || 'Endereço não especificado no cadastro.'}</p>{selectedProject.installAddress && <a href={`https://maps.google.com/?q=${encodeURIComponent(selectedProject.installAddress)}`} target="_blank" rel="noreferrer" className="text-blue-600 dark:text-blue-400 text-xs font-bold hover:underline mt-1 inline-flex items-center gap-1">Abrir no Maps <ChevronRight size={12}/></a>}</div>}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Produtos a Instalar</h4>
                                        {selectedProject.products && selectedProject.products.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2">
                                                {selectedProject.products.map((prod, idx) => (
                                                    <div key={idx} className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-2 rounded border border-blue-100 dark:border-blue-800 text-sm font-medium flex items-center gap-2">
                                                        <Package size={14} /> {prod}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 italic text-sm">Nenhum produto especificado.</p>
                                        )}
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Observações de Instalação</h4>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                                            {selectedProject.installationNotes || 'Sem observações particulares.'}
                                        </p>
                                    </div>

                                    <div>
                                        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Descrição do Projeto</h4>
                                        <p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">{selectedProject.description || 'Sem descrição.'}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
