
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, ProjectNote, MarketingContent } from '../types';
import { MonitorPlay, Minimize, Wrench, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, AlertTriangle, Filter, X, Search, Image as ImageIcon, Camera, FileText, Upload, CheckSquare, ChevronRight, Edit2, Save, FilePlus, MessageSquare, Send, StopCircle, RefreshCw, Package, Archive, Sparkles, History, Box, Cpu, ClipboardCheck, ArrowRight, Megaphone, Timer, FileDown, Loader2, Trello, Plus } from 'lucide-react';
import { generateProjectTasks } from '../services/geminiService';
import { AcceptanceDocument } from '../components/AcceptanceDocument';

export const Operations: React.FC = () => {
    const { projects, addProject, updateProject, deleteProject, clients, addSystemNotification, products, addMarketingContent } = useData();
    const { currentUser } = useAuth();
    
    // UI States
    const [tvMode, setTvMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterManager, setFilterManager] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // PDF State
    const [isGeneratingAcceptance, setIsGeneratingAcceptance] = useState(false);
    const [projectForPDF, setProjectForPDF] = useState<Project | null>(null);

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

    const [isEditingAddress, setIsEditingAddress] = useState(false);
    const [addressForm, setAddressForm] = useState(() => {
        return selectedProject?.installAddress || selectedProject?.description || '';
    });
    
    const [newNoteText, setNewNoteText] = useState('');

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

    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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

    const handleDownloadAcceptance = async (project: Project) => {
        setProjectForPDF(project);
        setIsGeneratingAcceptance(true);
        addSystemNotification('Gerando Protocolo', 'Preparando termo de aceite para download...', 'info');

        setTimeout(async () => {
            const element = document.getElementById('acceptance-pdf-content');
            if (!element) {
                setIsGeneratingAcceptance(false);
                setProjectForPDF(null);
                return;
            }

            const opt = {
                margin: 0,
                filename: `Termo_Aceite_${project.clientName.replace(/\s/g, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            try {
                // @ts-ignore
                if (window.html2pdf) {
                    // @ts-ignore
                    await window.html2pdf().set(opt).from(element).save();
                    addSystemNotification('Sucesso', 'Protocolo baixado!', 'success');
                }
            } catch (e) {
                console.error(e);
                alert("Erro ao gerar PDF. Verifique se o navegador permitiu o download.");
            } finally {
                setIsGeneratingAcceptance(false);
                setProjectForPDF(null);
            }
        }, 800);
    };

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

    const columns = [
        { id: 'Planning', label: 'Proposta Aprovada', subLabel: 'Aguardando Início', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', headerTv: 'bg-blue-800 text-white' },
        { id: 'Kitting', label: 'Kitting / Separação', subLabel: 'Peças & Estoque', color: 'border-orange-500 bg-orange-50 dark:bg-orange-900/20', headerTv: 'bg-orange-700 text-white' },
        { id: 'Assembly', label: 'Produção / Montagem', subLabel: 'Montagem & Testes', color: 'border-purple-500 bg-purple-50 dark:bg-purple-900/20', headerTv: 'bg-purple-800 text-white' },
        { id: 'Execution', label: 'Instalação', subLabel: 'Equipe em Campo', color: 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20', headerTv: 'bg-yellow-700 text-white' },
        { id: 'Completed', label: 'Concluída', subLabel: 'Entregue', color: 'border-green-500 bg-green-50 dark:bg-green-900/20', headerTv: 'bg-green-800 text-white' },
    ];

    const managers = useMemo(() => Array.from(new Set(projects.map(p => p.manager).filter(Boolean))), [projects]);
    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchManager = filterManager ? p.manager === filterManager : true;
            const matchStatus = filterStatus !== 'All' ? p.status === filterStatus : true;
            return matchManager && matchStatus;
        });
    }, [projects, filterManager, filterStatus]);

    const historyProjects = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        return projects.filter(p => 
            p.archived && 
            p.completedAt && 
            new Date(p.completedAt) >= thirtyDaysAgo
        ).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());
    }, [projects]);

    const getProjectsByStatus = (status: string) => filteredProjects.filter(p => p.status === status && !p.archived);

    const [viewMode, setViewMode] = useState<'board' | 'history'>('board');

    const notifyMarketingAndCreateDraft = (project: Project) => {
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
        addSystemNotification('Marketing Alertado', `Instalação "${project.title}" concluída! Um rascunho foi criado no módulo de Marketing.`, 'success', 'Marketing');
    };

    const handleDragStart = (e: React.DragEvent, projectId: string) => {
        if (isMobile) { e.preventDefault(); return; }
        e.dataTransfer.setData('projectId', projectId);
    };
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    
    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        const projectId = e.dataTransfer.getData('projectId');
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== targetStatus) {
            updateProject(currentUser, { 
                ...project, 
                status: targetStatus as any,
                statusUpdatedAt: new Date().toISOString()
            });
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
            addSystemNotification('Faturamento Pendente', `Projeto "${project.title}" (${project.clientName}) concluído. Verificar faturamento final.`, 'info', project.clientName);
            notifyMarketingAndCreateDraft(project);
        }
    };

    const getDeadlineStyle = (deadlineStr: string, status: string) => {
        if (status === 'Completed') return 'border-green-500';
        const today = new Date();
        today.setHours(0,0,0,0);
        const deadline = new Date(deadlineStr);
        deadline.setHours(0,0,0,0);
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'border-red-500';
        if (diffDays <= 5) return 'border-yellow-500';
        return 'border-green-500';
    };

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
            statusUpdatedAt: new Date().toISOString(),
            progress: 0,
            startDate: newProjForm.start,
            deadline: new Date(new Date(newProjForm.start).setDate(new Date().getDate() + 30)).toISOString(),
            manager: currentUser.name,
            description: newProjForm.description,
            tasks: initialTasks,
            organizationId: currentUser.organizationId,
            archived: false,
            products: newProjForm.products,
            installationNotes: newProjForm.installationNotes
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
            {/* Hidden PDF Gen */}
            {projectForPDF && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                    <div id="acceptance-pdf-content">
                        <AcceptanceDocument project={projectForPDF} />
                    </div>
                </div>
            )}

            <div className={`flex justify-between items-center mb-6 shrink-0 ${tvMode ? 'px-4' : ''}`}>
                <div className="flex items-center gap-6">
                    <div>
                        <h1 className={`${tvMode ? 'text-4xl' : 'text-3xl'} font-bold flex items-center gap-3 ${tvMode ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                            <Wrench size={tvMode ? 40 : 28} className={tvMode ? "text-yellow-400" : "text-indigo-600 dark:text-indigo-400"}/> 
                            {tvMode ? 'OPERAÇÕES EM TEMPO REAL' : 'Painel de Produção'}
                        </h1>
                        {!tvMode && <p className="text-slate-500 dark:text-slate-400">Acompanhamento de instalações e serviços com detecção de gargalos.</p>}
                    </div>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={() => setViewMode(viewMode === 'board' ? 'history' : 'board')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition border bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300`}
                    >
                        {viewMode === 'board' ? <History size={18}/> : <Trello size={18}/>}
                        {viewMode === 'board' ? 'Histórico' : 'Quadro Ativo'}
                    </button>
                    <button 
                        onClick={() => setTvMode(!tvMode)} 
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold transition shadow-sm ${tvMode ? 'bg-red-600 text-white hover:bg-red-700 text-lg shadow-lg shadow-red-900/50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                    >
                        {tvMode ? <Minimize size={24}/> : <MonitorPlay size={18}/>}
                        {tvMode ? 'SAIR' : 'Modo TV'}
                    </button>
                    {!tvMode && (
                        <button onClick={() => setIsNewProjectOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2 shadow-sm">
                            <Plus size={18}/> Iniciar Projeto
                        </button>
                    )}
                </div>
            </div>

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

                                        const now = new Date();
                                        const statusDate = proj.statusUpdatedAt ? new Date(proj.statusUpdatedAt) : new Date(proj.startDate);
                                        const diffTime = Math.abs(now.getTime() - statusDate.getTime());
                                        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                                        const isGargalo = diffDays >= 3 && col.id !== 'Completed';

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
                                                    {delayed && <div className={`flex items-center gap-1 font-bold ${tvMode ? 'text-red-400 bg-red-900/50 px-2 py-1 rounded' : 'text-red-500'}`}><AlertCircle size={tvMode ? 20 : 16} /></div>}
                                                </div>
                                                <p className={`font-medium mb-3 ${tvMode ? 'text-lg text-slate-300' : 'text-sm text-slate-600 dark:text-slate-300'}`}>{proj.title}</p>
                                                
                                                <div className="mb-3 flex flex-wrap gap-1.5 min-h-[20px]">
                                                    {proj.products && proj.products.length > 0 ? proj.products.map((prod, idx) => (
                                                        <span 
                                                            key={idx} 
                                                            className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${tvMode ? 'bg-slate-700 text-slate-300 border-slate-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'}`}
                                                        >
                                                            {prod}
                                                        </span>
                                                    )) : (
                                                        <span className="text-[10px] italic text-slate-400">Sem produtos</span>
                                                    )}
                                                </div>

                                                <div className="flex flex-col gap-1.5 mt-auto">
                                                    <div className={`flex items-center gap-2 text-[10px] ${delayed ? 'text-red-500 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                                                        <Clock size={tvMode ? 18 : 12} className="shrink-0"/>
                                                        <span>Entrega: {new Date(proj.deadline).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className={`flex items-center gap-2 text-[10px] font-bold ${isGargalo ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                                        {isGargalo ? <AlertTriangle size={tvMode ? 18 : 12} className="animate-pulse"/> : <Timer size={tvMode ? 18 : 12}/>}
                                                        <span>{diffDays === 0 ? 'Iniciado hoje' : `${diffDays} ${diffDays === 1 ? 'dia' : 'dias'} nesta fase`}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className={`mt-4 w-full rounded-full overflow-hidden ${tvMode ? 'h-3 bg-slate-700' : 'h-1.5 bg-slate-100 dark:bg-slate-700'}`}><div className={`h-full transition-all duration-500 ${col.id === 'Completed' ? 'bg-green-500' : delayed ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${proj.progress}%`}}></div></div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {historyProjects.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 opacity-60">
                                <History size={48} className="mb-4 stroke-1"/>
                                <p className="text-sm">Nenhum projeto arquivado recentemente.</p>
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 uppercase text-xs font-bold sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-4">Projeto</th>
                                        <th className="p-4">Cliente</th>
                                        <th className="p-4 text-center">Concluído em</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {historyProjects.map(proj => (
                                        <tr key={proj.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4 font-bold text-slate-800 dark:text-white">{proj.title}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-300">{proj.clientName}</td>
                                            <td className="p-4 text-center font-mono text-xs text-slate-500 dark:text-slate-400">{proj.completedAt ? new Date(proj.completedAt).toLocaleDateString() : '-'}</td>
                                            <td className="p-4 text-center">
                                                <button onClick={() => setSelectedProject(proj)} className="text-blue-600 dark:text-blue-400 hover:underline text-xs font-bold">Ver Detalhes</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}

            {/* MODALS (Simplified for turn) */}
            {isNewProjectOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[300] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                            <h3 className="font-bold text-slate-900 dark:text-white">Iniciar Projeto</h3>
                            <button onClick={() => setIsNewProjectOpen(false)}><X className="text-slate-400"/></button>
                        </div>
                        <form onSubmit={handleCreateProject} className="p-6 space-y-4 overflow-y-auto">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Título</label><input required type="text" className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none" value={newProjForm.title} onChange={e => setNewProjForm({...newProjForm, title: e.target.value})} /></div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cliente</label>
                                <select className="w-full border rounded p-2.5 bg-white dark:bg-slate-700 dark:text-white outline-none" value={newProjForm.client} onChange={e => setNewProjForm({...newProjForm, client: e.target.value})}>
                                    <option value="">Selecione...</option>
                                    {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-3 rounded text-xs text-indigo-700 dark:text-indigo-300 flex gap-2">
                                <Sparkles size={16}/><p>IA gerará as tarefas automaticamente.</p>
                            </div>
                            <button type="submit" disabled={aiLoading} className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg">{aiLoading ? 'Gerando...' : 'Criar Projeto'}</button>
                        </form>
                    </div>
                </div>
            )}

            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[250] p-0 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800">
                        <div className="w-full relative shrink-0 bg-slate-900">
                            <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700 flex items-center justify-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-white/[0.1] bg-[size:20px_20px]"></div>
                                <div className="z-10 text-center text-white">
                                    <h2 className="text-2xl font-bold">{selectedProject.clientName}</h2>
                                    <p className="text-blue-100 text-sm">{selectedProject.title}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="absolute top-4 right-4 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white backdrop-blur-sm z-20 transition"><X size={24}/></button>
                        </div>

                        <div className="flex border-b border-slate-200 dark:border-slate-700 px-8 bg-white dark:bg-slate-900 sticky top-0 z-10 overflow-x-auto">
                            <button onClick={() => setActiveTab('checklist')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'checklist' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>Checklist</button>
                            <button onClick={() => setActiveTab('info')} className={`flex-1 py-4 px-4 text-sm font-bold border-b-2 transition whitespace-nowrap ${activeTab === 'info' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>Resumo & Protocolo</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
                            {activeTab === 'checklist' && (
                                <div className="space-y-4">
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Tarefas Pendentes</h3>
                                    {selectedProject.tasks.map(task => (
                                        <div key={task.id} onClick={() => handleToggleTask(task)} className={`p-4 rounded-xl border flex items-center gap-4 cursor-pointer transition ${task.status === 'Done' ? 'bg-green-50 border-green-200 opacity-60' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${task.status === 'Done' ? 'bg-green-500 border-green-500' : 'border-slate-300'}`}>{task.status === 'Done' && <CheckCircle size={14} className="text-white"/>}</div>
                                            <span className={task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-700 dark:text-slate-200'}>{task.title}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'info' && (
                                <div className="space-y-6">
                                    {/* SEÇÃO DE PROTOCOLO */}
                                    <div className="p-6 bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-slate-800 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm">
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="p-3 bg-white dark:bg-slate-700 rounded-xl shadow-sm text-indigo-600 dark:text-indigo-400"><FileDown size={28}/></div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">Protocolo de Entrega</h4>
                                                <p className="text-xs text-slate-500">Gere o termo de aceite formal para assinatura do cliente.</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleDownloadAcceptance(selectedProject)}
                                            disabled={isGeneratingAcceptance}
                                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                                        >
                                            {isGeneratingAcceptance ? <Loader2 className="animate-spin" size={18}/> : <FileDown size={18}/>}
                                            {isGeneratingAcceptance ? 'Gerando Documento...' : 'Baixar Termo de Aceite (PDF)'}
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Endereço de Instalação</h4>
                                        <div className="flex items-start gap-2">
                                            <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0"/>
                                            <p className="text-slate-800 dark:text-white text-sm">{selectedProject.installAddress || 'Não especificado.'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200">
                                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Produtos no Escopo</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedProject.products?.length ? selectedProject.products.map((p,i) => (
                                                <span key={i} className="px-2 py-1 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-xs text-slate-600 dark:text-slate-300 font-medium">
                                                    {p}
                                                </span>
                                            )) : <span className="text-xs text-slate-400 italic">Nenhum produto listado.</span>}
                                        </div>
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
