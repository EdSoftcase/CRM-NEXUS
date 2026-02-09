
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CheckCircle, Plus, Phone, Mail, Users, X, Video, MapPin, AlignLeft, Trash2, Maximize, Minimize, Filter, MoreHorizontal, CalendarDays, List, RefreshCw, Download, CalendarCheck, Wrench, Box, AlertTriangle, MessageCircle, ShieldCheck, Loader2 } from 'lucide-react';
import { Activity, Project } from '../types';
import { Badge } from '../components/Widgets';

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
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDayViewOpen, setIsDayViewOpen] = useState(false);
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
    const [selectedDateForNew, setSelectedDateForNew] = useState<Date>(new Date());
    const [selectedEvent, setSelectedEvent] = useState<Activity | null>(null);
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);

    // Form
    const [createMeet, setCreateMeet] = useState(false);
    const [newActivityForm, setNewActivityForm] = useState({
        title: '',
        type: 'Call' as 'Call' | 'Meeting' | 'Email' | 'Task',
        time: '09:00',
        relatedTo: ''
    });

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    const toggleFilter = (type: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

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
        const el = e.target as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const el = e.target as HTMLElement;
        el.style.opacity = '1';
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
            // INTERCEPÇÃO PARA INSTALAÇÕES
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

    const handleOpenAdd = (date: Date) => {
        setSelectedDateForNew(date);
        setIsAddModalOpen(true);
        const now = new Date();
        const nextHour = new Date(now.setHours(now.getHours() + 1, 0, 0, 0));
        setNewActivityForm(prev => ({ 
            ...prev, 
            time: nextHour.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
        }));
    };

    const handleCreateActivity = (e: React.FormEvent) => {
        e.preventDefault();
        const [hours, minutes] = newActivityForm.time.split(':');
        const dueDateTime = new Date(selectedDateForNew);
        dueDateTime.setHours(parseInt(hours), parseInt(minutes));

        addActivity(currentUser, {
            id: `ACT-${Date.now()}`,
            title: newActivityForm.title,
            type: newActivityForm.type,
            dueDate: dueDateTime.toISOString(),
            completed: false,
            relatedTo: newActivityForm.relatedTo || 'Geral',
            assignee: currentUser.id
        });

        if (createMeet) {
            const startTime = dueDateTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
            const endDate = new Date(dueDateTime.getTime() + 60 * 60 * 1000);
            const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
            const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(newActivityForm.title)}&dates=${startTime}/${endTime}&location=Google+Meet`;
            window.open(url, '_blank');
        }
        setIsAddModalOpen(false);
    };

    const getEventStyle = (type: string, completed: boolean) => {
        if (completed) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through grayscale';
        switch(type) {
            case 'Call': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800';
            case 'Meeting': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800';
            case 'Email': return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800';
            case 'Installation': return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 dark:bg-indigo-500/80 dark:border-indigo-400 shadow-md';
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

    const filteredEvents = useMemo(() => {
        return allEvents.filter(a => {
            const d = new Date(a.dueDate);
            return d.getMonth() === month && d.getFullYear() === year && filters[a.type as keyof typeof filters];
        });
    }, [allEvents, month, year, filters]);

    const renderCalendarDays = () => {
        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="bg-slate-50/50 dark:bg-slate-800/30 border-r border-b border-slate-100 dark:border-slate-800 min-h-[120px]"></div>);
        }
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d);
            const isToday = new Date().toDateString() === date.toDateString();
            const dayEvents = filteredEvents
                .filter(a => new Date(a.dueDate).getDate() === d)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
            
            days.push(
                <div 
                    key={d} 
                    className="border-r border-b border-slate-200 dark:border-slate-700 min-h-[120px] p-2 transition relative group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                    onClick={() => { setSelectedDateForNew(date); setIsDayViewOpen(true); }}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-black w-7 h-7 flex items-center justify-center rounded-xl ${isToday ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-700 dark:text-slate-300'}`}>{d}</span>
                        <div onClick={(e) => { e.stopPropagation(); handleOpenAdd(date); }} className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-indigo-100 rounded text-indigo-600"><Plus size={14}/></div>
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                        {dayEvents.slice(0, 4).map(act => (
                            <div 
                                key={act.id} 
                                draggable
                                onDragStart={(e) => handleDragStart(e, act.id, act.eventType)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); act.eventType === 'project' ? setSelectedProject(act.originalProject) : setSelectedEvent(act as any); }}
                                className={`text-[9px] px-2 py-1.5 rounded-lg border truncate flex items-center gap-2 cursor-grab active:cursor-grabbing transition transform hover:scale-[1.03] ${getEventStyle(act.type, act.completed)}`}
                            >
                                <span className="shrink-0">{getTypeIcon(act.type)}</span>
                                <span className="truncate font-black uppercase flex-1">{act.title}</span>
                            </div>
                        ))}
                        {dayEvents.length > 4 && <div className="text-[9px] text-slate-400 text-center font-black uppercase">+ {dayEvents.length - 4} items</div>}
                    </div>
                </div>
            );
        }
        return days;
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
                        {isFocusMode ? <Minimize size={20}/> : <Maximize size={20}/>}
                    </button>
                    <button onClick={() => handleOpenAdd(new Date())} className="bg-slate-900 text-white px-8 py-3 rounded-2xl hover:scale-[1.02] transition shadow-2xl font-black uppercase text-[10px] tracking-widest">Novo Evento</button>
                </div>
            </div>

            <div className={`flex-1 bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${isFocusMode ? '' : 'rounded-[3rem]'}`}>
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    {weekDays.map(day => <div key={day} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</div>)}
                </div>
                <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar">{renderCalendarDays()}</div>
            </div>

            {/* MODAL DE CONFIRMAÇÃO DE REAGENDAMENTO (Nova Funcionalidade) */}
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
                            {allEvents.filter(a => new Date(a.dueDate).getDate() === selectedDateForNew.getDate() && new Date(a.dueDate).getMonth() === selectedDateForNew.getMonth()).map(act => (
                                <div key={act.id} onClick={() => { setIsDayViewOpen(false); act.eventType === 'project' ? setSelectedProject(act.originalProject) : setSelectedEvent(act as any); }} className={`p-5 rounded-[1.5rem] border cursor-pointer hover:shadow-xl transition-all flex flex-col gap-2 ${getEventStyle(act.type, act.completed)}`}>
                                    <div className="flex justify-between items-center"><span className="text-[8px] font-black uppercase opacity-60 tracking-widest">{act.type}</span><Clock size={12}/></div>
                                    <h4 className="font-black text-sm uppercase tracking-tight leading-none">{act.title}</h4>
                                    <p className="text-[10px] font-bold opacity-60 uppercase">{act.relatedTo}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
