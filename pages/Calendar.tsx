
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CheckCircle, Plus, Phone, Mail, Users, X, Video, MapPin, AlignLeft, Trash2, Maximize, Minimize, Filter, MoreHorizontal, CalendarDays, List, RefreshCw, Download, CalendarCheck, Wrench, Box, AlertTriangle, MessageCircle, ShieldCheck, Loader2, ClipboardCheck, CheckSquare, Activity, ShoppingBag, Package, Settings2, Monitor as MonitorIcon, User, Building2, Cpu, Zap, Layout } from 'lucide-react';
import { Activity as ActivityType, Project } from '../types';
import { Badge, SectionTitle } from '../components/Widgets';

export const Calendar: React.FC = () => {
    const { activities, toggleActivity, addActivity, updateActivity, projects, updateProject, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    // View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    // Drag & Drop State
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
    const [draggedEventType, setDraggedEventType] = useState<'activity' | 'project' | null>(null);

    // Reschedule Logic State
    const [pendingReschedule, setPendingReschedule] = useState<{ projectId: string, newDate: Date, clientNotified: boolean } | null>(null);
    const [isProcessingReschedule, setIsProcessingReschedule] = useState(false);

    // Filters
    const [filters, setFilters] = useState({
        Call: true,
        Meeting: true,
        Email: true,
        Task: true,
        Installation: true
    });

    // Modals
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);
    const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<ActivityType | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const toggleFilter = (type: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // Lógica das colunas de produção (igual ao Operations.tsx para consistência no modal)
    const columns = [
        { id: 'Kitting', label: '1. Separação (Kitting)', color: 'border-orange-500', progress: 20 },
        { id: 'Assembly', label: '2. Montagem / Bancada', color: 'border-purple-500', progress: 40 },
        { id: 'Execution', label: '3. Instalação / Campo', color: 'border-yellow-500', progress: 60 },
        { id: 'Training', label: '4. Treinamento / Go-Live', color: 'border-blue-500', progress: 80 },
        { id: 'Completed', label: '5. Concluída / Testada', color: 'border-green-500', progress: 100 },
    ];

    const allEvents = useMemo(() => {
        const events = activities.map(a => ({ ...a, eventType: 'activity' as const }));
        const projectEvents = projects
            .filter(p => !p.archived && p.deadline)
            .map(p => ({
                id: p.id,
                title: `Instalação: ${p.clientName}`,
                type: 'Installation',
                dueDate: p.deadline,
                completed: p.status === 'Completed',
                relatedTo: p.title,
                description: p.description,
                eventType: 'project' as const,
                originalProject: p
            }));
        return [...events, ...projectEvents];
    }, [activities, projects]);

    const handleDragStart = (e: React.DragEvent, id: string, type: 'activity' | 'project') => {
        setDraggedEventId(id);
        setDraggedEventType(type);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedEventId(null);
        setDraggedEventType(null);
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        if (!draggedEventId || !draggedEventType) return;

        if (draggedEventType === 'activity') {
            const event = activities.find(a => a.id === draggedEventId);
            if (event) {
                const originalDate = new Date(event.dueDate);
                const newDate = new Date(targetDate);
                newDate.setHours(originalDate.getHours(), originalDate.getMinutes());
                updateActivity(currentUser, { ...event, dueDate: newDate.toISOString() });
            }
        } else if (draggedEventType === 'project') {
            setPendingReschedule({
                projectId: draggedEventId,
                newDate: targetDate,
                clientNotified: false
            });
        }
        
        setDraggedEventId(null);
        setDraggedEventType(null);
    };

    const confirmReschedule = async () => {
        if (!pendingReschedule || !pendingReschedule.clientNotified) return;
        
        setIsProcessingReschedule(true);
        try {
            const project = projects.find(p => p.id === pendingReschedule.projectId);
            if (project) {
                const updatedProject = {
                    ...project,
                    deadline: pendingReschedule.newDate.toISOString(),
                    description: `${project.description}\n\n[REAGENDAMENTO] Data alterada para ${pendingReschedule.newDate.toLocaleDateString('pt-BR')} com confirmação de aviso ao cliente.`
                };
                await updateProject(currentUser, updatedProject);
                addSystemNotification("Agenda Atualizada", `Instalação de ${project.clientName} reagendada.`, "success");
            }
        } catch (e) {
            addSystemNotification("Erro", "Falha ao reagendar instalação.", "alert");
        } finally {
            setIsProcessingReschedule(false);
            setPendingReschedule(null);
        }
    };

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        const proj = projects.find(p => p.id === id);
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

        if (selectedProject?.id === id) setSelectedProject(updatedProjectData);
        await updateProject(currentUser, updatedProjectData);
        addSystemNotification("Produção Atualizada", `${proj.title} movido para ${newStatus}.`, "success");
    };

    const handleToggleTask = async (project: Project, taskId: string) => {
        const updatedTasks = project.tasks.map(t => t.id === taskId ? { ...t, status: t.status === 'Done' ? 'Pending' : 'Done' as any } : t);
        const updatedProject = { ...project, tasks: updatedTasks };
        
        if(selectedProject?.id === project.id) setSelectedProject(updatedProject);
        await updateProject(currentUser, updatedProject);
    };

    const getEventStyle = (type: string, completed: boolean) => {
        if (completed) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through grayscale';
        switch(type) {
            case 'Call': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800';
            case 'Meeting': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-blue-800';
            case 'Email': return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800';
            case 'Installation': return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 dark:bg-indigo-50/80 dark:border-indigo-400 shadow-md';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/50';
        }
    };

    const getTypeIcon = (type: string) => {
        switch(type) {
            case 'Call': return <Phone size={10} />;
            case 'Meeting': return <Users size={10} />;
            case 'Email': return <Mail size={10} />;
            case 'Installation': return <Wrench size={10} />;
            default: return <CheckCircle size={10} />;
        }
    };

    const calendarDays = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const days = [];
        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), currentMonth: false });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            days.push({ date: new Date(year, month, i), currentMonth: true });
        }
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({ date: new Date(year, month + 1, i), currentMonth: false });
        }
        return days;
    }, [year, month]);

    const safeArray = (val: any) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try { return JSON.parse(val); } catch(e) { return []; }
        }
        return [];
    };

    const renderCalendarDays = () => {
        return calendarDays.map((dayObj, index) => {
            const { date, currentMonth } = dayObj;
            const isToday = new Date().toDateString() === date.toDateString();
            
            const dayEvents = allEvents.filter(a => {
                const eventDate = new Date(a.dueDate);
                return eventDate.toDateString() === date.toDateString() && filters[a.type as keyof typeof filters];
            }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            return (
                <div 
                    key={index} 
                    className={`border-r border-b border-slate-200 dark:border-slate-700 min-h-[120px] max-h-[120px] p-2 transition relative group cursor-pointer flex flex-col overflow-hidden
                        ${currentMonth ? 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/20 opacity-40 hover:opacity-100 transition-opacity'}
                    `}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                    onClick={() => { setSelectedDateForNew(date); setIsDayViewOpen(true); }}
                >
                    <div className="flex justify-between items-start mb-1">
                        <span className={`text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-lg ${isToday ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 dark:text-slate-500'}`}>
                            {date.getDate()}
                        </span>
                    </div>
                    <div className="flex flex-col gap-0.5 flex-1 min-h-0 overflow-hidden">
                        {dayEvents.slice(0, 3).map(act => (
                            <div 
                                key={act.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, act.id, act.eventType)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if(act.eventType === 'project') setSelectedProject(act.originalProject);
                                    else setSelectedEvent(act as any); 
                                }}
                                className={`text-[8px] px-1.5 py-1 rounded-md border truncate flex items-center gap-1.5 cursor-grab active:cursor-grabbing transition transform hover:scale-[1.02] ${getEventStyle(act.type, act.completed)}`}
                            >
                                <span className="shrink-0">{getTypeIcon(act.type)}</span>
                                <span className="truncate font-black uppercase flex-1 leading-none">{act.title}</span>
                            </div>
                        ))}
                        {dayEvents.length > 3 && <div className="text-[7px] text-slate-400 text-center font-black uppercase mt-0.5">+ {dayEvents.length - 3} mais</div>}
                    </div>
                </div>
            );
        });
    };

    return (
        <div className={`flex flex-col bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${isFocusMode ? 'fixed inset-0 z-[5000] p-0' : 'h-full p-4 md:p-8'}`}>
            
            <div className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-20 ${isFocusMode ? 'p-4' : 'rounded-3xl p-6 mb-6 border shadow-xl'}`}>
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl"><CalIcon size={24}/></div>
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">AGENDA <span className="text-indigo-600">ENTERPRISE</span></h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">{monthNames[month]} {year}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-700 p-1 rounded-xl ml-4">
                        <button onClick={prevMonth} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition shadow-sm"><ChevronLeft size={16}/></button>
                        <button onClick={goToToday} className="px-4 py-1.5 bg-white dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-black uppercase tracking-widest shadow-sm">Hoje</button>
                        <button onClick={nextMonth} className="p-2 hover:bg-white dark:hover:bg-slate-600 rounded-lg transition shadow-sm"><ChevronRight size={16}/></button>
                    </div>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        {[
                            {id: 'Installation', label: 'OBRAS', icon: Wrench, color: 'text-indigo-600'},
                            {id: 'Call', label: 'CALLS', icon: Phone, color: 'text-blue-600'},
                            {id: 'Meeting', label: 'MEETS', icon: Users, color: 'text-purple-600'}
                        ].map(f => (
                            <button key={f.id} onClick={() => toggleFilter(f.id as any)} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition ${filters[f.id as keyof typeof filters] ? 'bg-white dark:bg-slate-600 shadow-md ' + f.color : 'text-slate-400 opacity-50'}`}>
                                <f.icon size={12}/> {f.label}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setIsFocusMode(!isFocusMode)} className="p-3 bg-white dark:bg-slate-800 border rounded-2xl text-slate-400 hover:text-indigo-600 transition shadow-sm">
                        {isFocusMode ? <Maximize size={20}/> : <Maximize size={20}/>}
                    </button>
                </div>
            </div>

            <div className={`flex-1 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${isFocusMode ? '' : 'rounded-[3rem]'}`}>
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    {weekDays.map(day => <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar">{renderCalendarDays()}</div>
            </div>

            {/* MODAL DE CONFIRMAÇÃO DE REAGENDAMENTO */}
            {pendingReschedule && (
                <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[11000] flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-scale-in border border-amber-200">
                        <div className="bg-amber-50 dark:bg-amber-900/20 p-8 text-center border-b border-amber-100">
                            <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl border-4 border-amber-500/20 text-amber-600">
                                <AlertTriangle size={40}/>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Confirmar Mudança</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Você está movendo uma <strong>Instalação</strong> para o dia {pendingReschedule.newDate.toLocaleDateString('pt-BR')}.</p>
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-200 dark:border-slate-700">
                                <div className="flex items-start gap-4 cursor-pointer" onClick={() => setPendingReschedule({...pendingReschedule, clientNotified: !pendingReschedule.clientNotified})}>
                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${pendingReschedule.clientNotified ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'}`}>
                                        {pendingReschedule.clientNotified && <CheckCircle size={18} fill="currentColor"/>}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">O cliente foi avisado?</p>
                                        <p className="text-xs text-slate-500 mt-1 leading-relaxed italic">"De acordo com a norma interna, mudanças de cronograma só são permitidas após ciência formal da unidade."</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setPendingReschedule(null)} className="flex-1 py-5 rounded-[2rem] border-2 border-slate-100 dark:border-slate-700 font-black uppercase text-[10px] tracking-widest text-slate-400 hover:bg-slate-50 transition">Cancelar</button>
                                <button 
                                    onClick={confirmReschedule} 
                                    disabled={!pendingReschedule.clientNotified || isProcessingReschedule}
                                    className="flex-[2] bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl hover:bg-indigo-600 hover:text-white transition disabled:opacity-30 flex items-center justify-center gap-2"
                                >
                                    {isProcessingReschedule ? <Loader2 size={16} className="animate-spin"/> : <ShieldCheck size={16}/>}
                                    {isProcessingReschedule ? 'SINCRONIZANDO...' : 'CONFIRMAR MUDANÇA'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* DAY VIEW MODAL */}
            {isDayViewOpen && (
                <div className="fixed inset-0 bg-slate-950/80 z-[9000] p-0 backdrop-blur-sm animate-fade-in flex justify-end">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl animate-slide-in-right flex flex-col border-l">
                        <div className="p-8 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{selectedDateForNew.toLocaleDateString('pt-BR', { weekday: 'long' })}</h3>
                                <p className="text-indigo-600 font-bold uppercase text-[10px] tracking-widest">{selectedDateForNew.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            <button onClick={() => setIsDayViewOpen(false)} className="p-3 hover:bg-red-50 rounded-2xl text-slate-400 transition"><X size={24}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {allEvents.filter(a => new Date(a.dueDate).toDateString() === selectedDateForNew.toDateString()).map(act => (
                                <div key={act.id} onClick={() => { setIsDayViewOpen(false); if(act.eventType === 'project') setSelectedProject(act.originalProject); else setSelectedEvent(act as any); }} className={`p-5 rounded-[1.5rem] border cursor-pointer hover:shadow-xl transition-all flex flex-col gap-2 ${getEventStyle(act.type, act.completed)}`}>
                                    <div className="flex justify-between items-center"><span className="text-[8px] font-black uppercase opacity-60 tracking-widest">{act.type}</span><Clock size={12}/></div>
                                    <h4 className="font-black text-sm uppercase tracking-tight leading-none">{act.title}</h4>
                                    <p className="text-[10px] font-bold opacity-60 uppercase">{act.relatedTo}</p>
                                </div>
                            ))}
                            {allEvents.filter(a => new Date(a.dueDate).toDateString() === selectedDateForNew.toDateString()).length === 0 && (
                                <div className="text-center py-20 text-slate-400 italic text-sm">Sem compromissos para este dia.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL DETALHADO DO PROJETO (UNIFICADO COM OPERATIONS) */}
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
                             <div className="lg:col-span-1 space-y-8">
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest flex items-center gap-2"><ClipboardCheck size={14}/> Checklist Técnico (Kitting)</h4>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border space-y-3 shadow-inner">
                                        {selectedProject.technicalSpecs ? (
                                            <div className="grid grid-cols-1 gap-4 text-xs">
                                                {/* Gabinetes - Suporte a múltiplos itens */}
                                                {Array.isArray(selectedProject.technicalSpecs.gabinetes) && selectedProject.technicalSpecs.gabinetes.length > 0 && (
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
                                                {Array.isArray(selectedProject.technicalSpecs.servidorCaixa) && selectedProject.technicalSpecs.servidorCaixa.length > 0 && (
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
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-400 italic text-xs py-10">Sem especificações técnicas detalhadas.</p>
                                        )}
                                    </div>
                                </div>
                             </div>

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

                             <div className="lg:col-span-1 space-y-8">
                                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                                    {/* Fix: Replace undefined 'ActivityIcon' with 'Activity' component from lucide-react */}
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
                                                <div className="w-8 h-8 bg-white dark:bg-slate-700 rounded-lg flex items-center justify-center text-indigo-50"><Package size={16}/></div>
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
