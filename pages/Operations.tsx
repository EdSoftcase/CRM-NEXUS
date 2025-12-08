
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Project, ProjectTask, ProjectNote } from '../types';
import { MonitorPlay, Minimize, Wrench, MapPin, Calendar, User, Clock, CheckCircle, AlertCircle, Filter, X, Search, Image as ImageIcon, Camera, FileText, Upload, CheckSquare, ChevronRight, Edit2, Save, FilePlus, MessageSquare, Send, StopCircle, RefreshCw } from 'lucide-react';

export const Operations: React.FC = () => {
    const { projects, updateProject } = useData();
    const { currentUser } = useAuth();
    
    // UI States
    const [tvMode, setTvMode] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filterManager, setFilterManager] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');

    // --- ROBUST STATE PERSISTENCE (Lazy Init) ---
    // Initialize state from localStorage to handle browser refreshes/camera interruptions
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

    // --- IN-APP CAMERA STATE ---
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- SYNC PERSISTENCE ---
    // Update local selectedProject when global projects context updates
    useEffect(() => {
        if (selectedProject) {
            const freshProjectData = projects.find(p => p.id === selectedProject.id);
            if (freshProjectData) {
                setSelectedProject(freshProjectData);
            }
        }
    }, [projects]);

    // Save state to localStorage whenever it changes
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

    // --- CAMERA FUNCTIONS ---
    const startCamera = async () => {
        setIsCameraOpen(true);
        setCameraError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' }, // Prefer rear camera
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
            
            // Set canvas size to match video stream
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                const base64 = canvas.toDataURL('image/jpeg', 0.7); // Compress quality
                handleSavePhoto(base64);
                stopCamera();
            }
        }
    };

    const handleSavePhoto = (base64String: string) => {
        if (!selectedProject) return;

        const currentPhotos = selectedProject.photos || [];
        const updatedProject = { 
            ...selectedProject, 
            photos: [base64String, ...currentPhotos] 
        };
        
        updateProject(currentUser, updatedProject);
        setSelectedProject(updatedProject);
        
        // Add automated log
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
        e.target.value = ''; // Reset input
    };

    // --- OTHER LOGIC ---
    const columns = [
        { id: 'Planning', label: 'Proposta Aprovada', subLabel: 'Aguardando Início', color: 'border-blue-500 bg-blue-50 dark:bg-blue-900/20', headerTv: 'bg-blue-800 text-white' },
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

    const getProjectsByStatus = (status: string) => filteredProjects.filter(p => p.status === status);

    const handleDragStart = (e: React.DragEvent, projectId: string) => e.dataTransfer.setData('projectId', projectId);
    const handleDragOver = (e: React.DragEvent) => e.preventDefault();
    const handleDrop = (e: React.DragEvent, targetStatus: string) => {
        const projectId = e.dataTransfer.getData('projectId');
        const project = projects.find(p => p.id === projectId);
        if (project && project.status !== targetStatus) {
            updateProject(currentUser, { ...project, status: targetStatus as any });
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
        const updatedTasks = selectedProject.tasks.map(t => 
            t.id === task.id ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t
        );
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

    const isDelayed = (deadline: string) => new Date(deadline) < new Date();

    const containerClass = tvMode 
        ? "fixed inset-0 z-[200] bg-slate-950 text-white p-4 overflow-hidden flex flex-col font-sans" 
        : "p-4 md:p-8 h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors";

    return (
        <div className={containerClass}>
            {/* Header */}
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

            {/* Kanban Board */}
            <div className="flex-1 flex gap-4 overflow-x-auto pb-2 px-1">
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
                        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-3">
                            {getProjectsByStatus(col.id).map(proj => {
                                const delayed = isDelayed(proj.deadline) && col.id !== 'Completed';
                                return (
                                    <div 
                                        key={proj.id}
                                        draggable={!tvMode}
                                        onDragStart={(e) => handleDragStart(e, proj.id)}
                                        onClick={() => handleCardClick(proj)}
                                        className={`rounded-xl transition-all duration-200 relative overflow-hidden ${tvMode ? `p-5 bg-slate-800 border-l-[6px] ${delayed ? 'border-l-red-500 animate-pulse-slow shadow-[0_0_15px_rgba(239,68,68,0.3)]' : col.id === 'Completed' ? 'border-l-green-500' : 'border-l-blue-500'}` : 'p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-md hover:-translate-y-1 cursor-pointer'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <h3 className={`font-bold leading-tight ${tvMode ? 'text-2xl text-white' : 'text-slate-800 dark:text-white'}`}>{proj.clientName}</h3>
                                            {delayed && <div className={`flex items-center gap-1 font-bold ${tvMode ? 'text-red-400 bg-red-900/50 px-2 py-1 rounded' : 'text-red-500'}`}><AlertCircle size={tvMode ? 20 : 16} />{tvMode && <span className="text-xs uppercase">Atrasado</span>}</div>}
                                        </div>
                                        <p className={`font-medium mb-4 ${tvMode ? 'text-lg text-slate-300' : 'text-sm text-slate-600 dark:text-slate-300'}`}>{proj.title}</p>
                                        <div className={`grid ${tvMode ? 'grid-cols-2 gap-4 text-sm' : 'space-y-2 text-xs'} text-slate-500 dark:text-slate-400`}>
                                            <div className="flex items-center gap-2"><MapPin size={tvMode ? 18 : 14} className="shrink-0"/><span className="truncate">{proj.installAddress || proj.description ? (proj.installAddress || proj.description).substring(0, 30) : 'Sem endereço'}</span></div>
                                            <div className={`flex items-center gap-2 ${delayed ? 'text-red-500 font-bold' : ''}`}><Clock size={tvMode ? 18 : 14} className="shrink-0"/><span>{new Date(proj.deadline).toLocaleDateString()}</span></div>
                                            <div className={`flex items-center gap-2 ${tvMode ? 'col-span-2 border-t border-slate-700 pt-2 mt-1' : ''}`}><div className={`rounded-full flex items-center justify-center font-bold text-white shrink-0 ${tvMode ? 'w-8 h-8 bg-indigo-600 text-sm' : 'w-5 h-5 bg-indigo-500 text-[10px]'}`}>{proj.manager?.charAt(0) || 'U'}</div><span className={`${tvMode ? 'text-base text-white' : ''}`}>{proj.manager}</span></div>
                                        </div>
                                        <div className={`mt-4 w-full rounded-full overflow-hidden ${tvMode ? 'h-3 bg-slate-700' : 'h-1.5 bg-slate-100 dark:bg-slate-700'}`}><div className={`h-full transition-all duration-500 ${col.id === 'Completed' ? 'bg-green-500' : delayed ? 'bg-red-500' : 'bg-blue-500'}`} style={{width: `${proj.progress}%`}}></div></div>
                                    </div>
                                );
                            })}
                            {getProjectsByStatus(col.id).length === 0 && <div className={`text-center py-10 flex flex-col items-center justify-center ${tvMode ? 'text-slate-700 opacity-50' : 'text-slate-400 opacity-50'}`}><Clock size={40} className="mb-2"/><p className="text-sm">Sem projetos</p></div>}
                        </div>
                    </div>
                ))}
            </div>

            {/* DETAILS MODAL */}
            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[250] p-0 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800">
                        
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
                            
                            {/* In-App Camera Button - Positioned on Header */}
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
                                    <h3 className="font-bold text-slate-800 dark:text-white mb-2">Etapas de Instalação</h3>
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
                                    <div><h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Descrição do Projeto</h4><p className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-wrap bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-100 dark:border-slate-700">{selectedProject.description || 'Sem descrição.'}</p></div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* FULL SCREEN IN-APP CAMERA MODAL */}
            {isCameraOpen && (
                <div className="fixed inset-0 z-[9999] bg-black flex flex-col animate-fade-in">
                    <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
                        {cameraError ? (
                            <div className="text-white text-center p-6">
                                <AlertCircle size={48} className="mx-auto mb-4 text-red-500"/>
                                <p className="text-lg font-bold mb-2">Erro na Câmera</p>
                                <p className="text-sm opacity-80 mb-6">{cameraError}</p>
                                <button onClick={stopCamera} className="bg-white text-black px-6 py-2 rounded-full font-bold">Fechar</button>
                            </div>
                        ) : (
                            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        
                        {!cameraError && (
                            <button onClick={stopCamera} className="absolute top-4 right-4 text-white p-4 bg-black/50 rounded-full z-10 hover:bg-black/70 transition"><X size={24}/></button>
                        )}
                    </div>
                    
                    {!cameraError && (
                        <div className="h-32 bg-black flex items-center justify-center gap-12 pb-8 pt-4">
                             <button onClick={stopCamera} className="text-white text-sm font-bold opacity-80 hover:opacity-100 px-4">Cancelar</button>
                             <button 
                                onClick={capturePhoto} 
                                className="w-20 h-20 rounded-full bg-white border-4 border-slate-300 flex items-center justify-center shadow-lg active:scale-90 transition transform duration-100 focus:outline-none focus:ring-4 focus:ring-blue-500/50"
                                aria-label="Tirar Foto"
                             ></button>
                             <button onClick={() => { /* Switch Camera logic could go here */ }} className="text-white opacity-80 hover:opacity-100 px-4">
                                <RefreshCw size={24} />
                             </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
