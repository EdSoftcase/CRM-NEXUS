
import React, { useState, useMemo, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, CheckCircle, Plus, Phone, Mail, Users, X, Video, MapPin, AlignLeft, Trash2, Maximize, Minimize, Filter, MoreHorizontal, CalendarDays, List, RefreshCw, Download, CalendarCheck, Wrench, Box } from 'lucide-react';
import { Activity, Project } from '../types';
// Fix: Imported Badge component to resolve name not found error on line 493.
import { Badge } from '../components/Widgets';

export const Calendar: React.FC = () => {
    const { activities, toggleActivity, addActivity, updateActivity, projects } = useData();
    const { currentUser } = useAuth();
    
    // View State
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isFocusMode, setIsFocusMode] = useState(false);
    
    // Drag & Drop State
    const [draggedEventId, setDraggedEventId] = useState<string | null>(null);

    // Filters
    const [filters, setFilters] = useState({
        Call: true,
        Meeting: true,
        Email: true,
        Task: true,
        Installation: true // Nova categoria para Projetos
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

    // Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Navigation
    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const goToToday = () => setCurrentDate(new Date());

    // Toggle Filter
    const toggleFilter = (type: keyof typeof filters) => {
        setFilters(prev => ({ ...prev, [type]: !prev[type] }));
    };

    // --- AGREGAR ATIVIDADES E PROJETOS ---
    const allEvents = useMemo(() => {
        const events = activities.map(a => ({ ...a, eventType: 'activity' }));
        
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
                eventType: 'project',
                originalProject: p
            }));

        return [...events, ...projectEvents];
    }, [activities, projects]);

    // --- CALENDAR SYNC ---
    const generateICS = () => {
        let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Nexus CRM//PT-BR\nCALSCALE:GREGORIAN\n";
        const eventsToExport = allEvents.filter(a => !a.completed);

        eventsToExport.forEach(act => {
            const start = new Date(act.dueDate);
            const end = new Date(start.getTime() + 60 * 60 * 1000); 
            const formatDate = (date: Date) => date.toISOString().replace(/-|:|\.\d+/g, '');

            icsContent += "BEGIN:VEVENT\n";
            icsContent += `UID:${act.id}@nexus-crm\n`;
            icsContent += `DTSTAMP:${formatDate(new Date())}\n`;
            icsContent += `DTSTART:${formatDate(start)}\n`;
            icsContent += `DTEND:${formatDate(end)}\n`;
            icsContent += `SUMMARY:${act.title}\n`;
            icsContent += `DESCRIPTION:${act.description || act.relatedTo || 'Evento Nexus CRM'}\n`;
            icsContent += "END:VEVENT\n";
        });

        icsContent += "END:VCALENDAR";
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `Nexus_Calendar_${new Date().toISOString().split('T')[0]}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setIsSyncModalOpen(false);
    };

    const openGoogleCalendar = () => {
        window.open('https://calendar.google.com/calendar/r', '_blank');
        setIsSyncModalOpen(false);
    };

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedEventId(id);
        e.dataTransfer.effectAllowed = 'move';
        const el = e.target as HTMLElement;
        el.style.opacity = '0.5';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        const el = e.target as HTMLElement;
        el.style.opacity = '1';
        setDraggedEventId(null);
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        if (draggedEventId) {
            const event = allEvents.find(a => a.id === draggedEventId);
            if (event && event.eventType === 'activity') {
                const originalDate = new Date(event.dueDate);
                const newDate = new Date(targetDate);
                newDate.setHours(originalDate.getHours(), originalDate.getMinutes());
                updateActivity(currentUser, { ...(event as any), dueDate: newDate.toISOString() });
            }
            setDraggedEventId(null);
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

    const handleOpenDayView = (date: Date) => {
        setSelectedDateForNew(date);
        setIsDayViewOpen(true);
    };

    const handleCreateActivity = (e: React.FormEvent) => {
        e.preventDefault();
        const [hours, minutes] = newActivityForm.time.split(':');
        const dueDateTime = new Date(selectedDateForNew);
        dueDateTime.setHours(parseInt(hours), parseInt(minutes));

        const newActivity: Activity = {
            id: `ACT-${Date.now()}`,
            title: newActivityForm.title,
            type: newActivityForm.type,
            dueDate: dueDateTime.toISOString(),
            completed: false,
            relatedTo: newActivityForm.relatedTo || 'Geral',
            assignee: currentUser.id
        };

        addActivity(currentUser, newActivity);

        if (createMeet) {
             const startTime = dueDateTime.toISOString().replace(/-|:|\.\d\d\d/g, "");
             const endDate = new Date(dueDateTime.getTime() + 60 * 60 * 1000);
             const endTime = endDate.toISOString().replace(/-|:|\.\d\d\d/g, "");
             const title = encodeURIComponent(newActivityForm.title);
             const details = encodeURIComponent(`Contexto: ${newActivityForm.relatedTo || 'Geral'}\n\nAgendado via Nexus CRM.`);
             const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}&location=Google+Meet`;
             window.open(url, '_blank');
        }

        setIsAddModalOpen(false);
        setNewActivityForm({ title: '', type: 'Call', time: '09:00', relatedTo: '' });
        setCreateMeet(false);
    };

    const getEventStyle = (type: string, completed: boolean) => {
        if (completed) return 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700 line-through grayscale';
        
        switch(type) {
            case 'Call': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800 dark:hover:bg-blue-900';
            case 'Meeting': return 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-800 dark:hover:bg-purple-900';
            case 'Email': return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-200 dark:border-yellow-800 dark:hover:bg-yellow-900';
            case 'Installation': return 'bg-indigo-600 text-white border-indigo-700 hover:bg-indigo-700 dark:bg-indigo-500/80 dark:border-indigo-400';
            default: return 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-800 dark:hover:bg-emerald-900';
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

    const handleEventClick = (event: any) => {
        if (event.eventType === 'project') {
            setSelectedProject(event.originalProject);
        } else {
            setSelectedEvent(event);
        }
    };

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
                    className={`border-r border-b border-slate-200 dark:border-slate-700 min-h-[120px] p-2 transition relative group bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer flex flex-col`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, date)}
                    onClick={() => handleOpenDayView(date)}
                >
                    <div className="flex justify-between items-start mb-2">
                        <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full
                            ${isToday ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-700 dark:text-slate-300 group-hover:bg-slate-200 dark:group-hover:bg-slate-700 transition'}
                        `}>
                            {d}
                        </span>
                        <div 
                            className="opacity-0 group-hover:opacity-100 transition p-1 hover:bg-blue-100 dark:hover:bg-blue-900 rounded text-blue-600 dark:text-blue-400"
                            onClick={(e) => { e.stopPropagation(); handleOpenAdd(date); }}
                            title="Adicionar Evento"
                        >
                            <Plus size={14}/>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 flex-1">
                        {dayEvents.slice(0, 4).map(act => (
                            <div 
                                key={act.id} 
                                draggable={act.eventType === 'activity'}
                                onDragStart={(e) => act.eventType === 'activity' && handleDragStart(e, act.id)}
                                onDragEnd={handleDragEnd}
                                onClick={(e) => { e.stopPropagation(); handleEventClick(act); }}
                                className={`text-[10px] px-2 py-1.5 rounded-md border truncate flex items-center gap-2 cursor-grab active:cursor-grabbing shadow-sm transition transform hover:scale-[1.02] ${getEventStyle(act.type, act.completed)}`}
                            >
                                <span className="shrink-0">{getTypeIcon(act.type)}</span>
                                <span className="font-mono font-semibold opacity-80">{new Date(act.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                <span className="truncate font-medium flex-1">{act.title}</span>
                            </div>
                        ))}
                        {dayEvents.length > 4 && (
                            <div className="text-[10px] text-slate-400 text-center font-medium">
                                + {dayEvents.length - 4} mais
                            </div>
                        )}
                    </div>
                </div>
            );
        }
        return days;
    };

    return (
        <div className={`flex flex-col bg-slate-50 dark:bg-slate-900 transition-all duration-300 ${isFocusMode ? 'fixed inset-0 z-[5000] p-0' : 'h-full p-4 md:p-8'}`}>
            
            <div className={`bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 shadow-sm z-20 ${isFocusMode ? 'p-4' : 'rounded-xl p-4 mb-6 border'}`}>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <CalIcon size={20}/>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">Agenda</h1>
                            {!isFocusMode && <p className="text-xs text-slate-500 dark:text-slate-400">Instalações e Compromissos</p>}
                        </div>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>

                    <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                        <button onClick={prevMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-md transition shadow-sm"><ChevronLeft size={16}/></button>
                        <span className="text-sm font-bold text-slate-800 dark:text-slate-200 min-w-[100px] text-center capitalize">{monthNames[month]} {year}</span>
                        <button onClick={nextMonth} className="p-1.5 hover:bg-white dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-md transition shadow-sm"><ChevronRight size={16}/></button>
                    </div>
                    
                    <button onClick={goToToday} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-600 transition">Hoje</button>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <button onClick={() => setIsSyncModalOpen(true)} className="px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-600 transition flex items-center gap-2 shadow-sm">
                        <RefreshCw size={14}/> Sincronizar
                    </button>

                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg overflow-x-auto">
                        <button onClick={() => toggleFilter('Installation')} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${filters.Installation ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><Wrench size={10}/> Instal</button>
                        <button onClick={() => toggleFilter('Call')} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${filters.Call ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-sm' : 'text-slate-400'}`}><Phone size={10}/> Calls</button>
                        <button onClick={() => toggleFilter('Meeting')} className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition ${filters.Meeting ? 'bg-white dark:bg-slate-600 text-purple-600 shadow-sm' : 'text-slate-400'}`}><Users size={10}/> Meets</button>
                    </div>

                    <button onClick={() => setIsFocusMode(!isFocusMode)} className={`p-2 rounded-lg transition ${isFocusMode ? 'bg-slate-800 text-white' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
                        {isFocusMode ? <Minimize size={18}/> : <Maximize size={18}/>}
                    </button>

                    <button onClick={() => handleOpenAdd(new Date())} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-600/20 font-bold text-sm">
                        <Plus size={16}/> <span className="hidden md:inline">Novo Evento</span>
                    </button>
                </div>
            </div>

            <div className={`flex-1 bg-white dark:bg-slate-900 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden ${isFocusMode ? '' : 'rounded-xl'}`}>
                <div className="grid grid-cols-7 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                    {weekDays.map(day => (
                        <div key={day} className="p-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-1 overflow-y-auto custom-scrollbar">
                    {renderCalendarDays()}
                </div>
            </div>

            {/* DAY VIEW MODAL */}
            {isDayViewOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[9000] p-0 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-2xl font-bold text-slate-900 dark:text-white capitalize">
                                    {selectedDateForNew.toLocaleDateString('pt-BR', { weekday: 'long' })}
                                </h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
                                    <CalendarDays size={14}/> {selectedDateForNew.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </p>
                            </div>
                            <button onClick={() => setIsDayViewOpen(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition">
                                <X size={20}/>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white dark:bg-slate-900">
                             <div className="space-y-4 relative">
                                    <div className="absolute left-[2.85rem] top-2 bottom-2 w-px bg-slate-200 dark:bg-slate-700"></div>
                                    {allEvents.filter(a => {
                                        const d = new Date(a.dueDate);
                                        return d.getDate() === selectedDateForNew.getDate() && d.getMonth() === selectedDateForNew.getMonth();
                                    }).map((act) => (
                                        <div key={act.id} className="relative flex gap-4 group">
                                            <div className="w-16 pt-1 text-right shrink-0">
                                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 font-mono">
                                                    {new Date(act.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                            </div>
                                            <div className={`absolute left-[2.65rem] top-3 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 z-10 
                                                ${act.completed ? 'bg-slate-400' : 'bg-blue-500'}
                                            `}></div>
                                            <div 
                                                className={`flex-1 p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md 
                                                    ${getEventStyle(act.type, act.completed)}
                                                `}
                                                onClick={() => handleEventClick(act)}
                                            >
                                                <h4 className="font-bold text-sm">{act.title}</h4>
                                                <p className="text-[10px] opacity-80 mt-1 uppercase font-bold">{act.relatedTo}</p>
                                            </div>
                                        </div>
                                    ))}
                             </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SYNC MODAL */}
            {isSyncModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm animate-scale-in p-6 text-center border-t-4 border-indigo-600">
                        <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 dark:text-indigo-400">
                            <RefreshCw size={32}/>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Sincronizar Calendário</h3>
                        <div className="space-y-3 mt-6">
                            <button onClick={generateICS} className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20">
                                <Download size={18}/> Baixar Arquivo .ICS
                            </button>
                            <button onClick={openGoogleCalendar} className="w-full py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2">
                                <CalendarCheck size={18}/> Abrir Google Calendar
                            </button>
                        </div>
                        <button onClick={() => setIsSyncModalOpen(false)} className="mt-6 text-slate-400 hover:text-slate-600 text-sm font-medium">Cancelar</button>
                    </div>
                </div>
            )}

            {/* NEW ACTIVITY MODAL */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden border-t-4 border-blue-600">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">Agendar Atividade</h3>
                                </div>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-full transition"><X size={20}/></button>
                            </div>
                            
                            <form onSubmit={handleCreateActivity} className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Título</label>
                                    <input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-700 dark:text-white" placeholder="Ex: Reunião de Alinhamento" value={newActivityForm.title} onChange={e => setNewActivityForm({...newActivityForm, title: e.target.value})} />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Tipo</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm bg-white dark:bg-slate-700 dark:text-white appearance-none outline-none focus:ring-2 focus:ring-blue-500" value={newActivityForm.type} onChange={e => setNewActivityForm({...newActivityForm, type: e.target.value as any})}>
                                            <option value="Call">📞 Ligação</option>
                                            <option value="Meeting">👥 Reunião</option>
                                            <option value="Email">📧 Email</option>
                                            <option value="Task">✅ Tarefa</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Horário</label>
                                        <input type="time" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-700 dark:text-white" value={newActivityForm.time} onChange={e => setNewActivityForm({...newActivityForm, time: e.target.value})} />
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Vinculado a</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition bg-white dark:bg-slate-700 dark:text-white" placeholder="Cliente ou Lead" value={newActivityForm.relatedTo} onChange={e => setNewActivityForm({...newActivityForm, relatedTo: e.target.value})} />
                                </div>

                                <button type="submit" className="w-full bg-slate-900 dark:bg-slate-700 text-white font-bold py-3.5 rounded-lg hover:bg-slate-800 transition transform active:scale-[0.98] flex items-center justify-center gap-2">
                                    <CheckCircle size={18}/> Confirmar Agendamento
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT DETAIL MODAL */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm animate-scale-in overflow-hidden border border-slate-200 dark:border-slate-700">
                        <div className={`p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start`}>
                            <div>
                                <h3 className={`text-lg font-bold leading-tight ${selectedEvent.completed ? 'text-slate-500 dark:text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{selectedEvent.title}</h3>
                                <Badge color="blue" className="mt-2">{selectedEvent.type}</Badge>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="text-slate-400 hover:text-slate-600 rounded-full transition"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                <Clock size={16} className="text-slate-400"/>
                                <p className="font-medium">{new Date(selectedEvent.dueDate).toLocaleDateString()} às {new Date(selectedEvent.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                            </div>
                            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300 text-sm">
                                <Users size={16} className="text-slate-400"/>
                                <p className="font-medium">{selectedEvent.relatedTo}</p>
                            </div>
                            <button 
                                onClick={() => { toggleActivity(currentUser, selectedEvent.id); setSelectedEvent(null); }}
                                className={`w-full py-2.5 rounded-lg font-bold text-sm border flex items-center justify-center gap-2 transition ${selectedEvent.completed ? 'bg-slate-100' : 'bg-emerald-600 text-white border-emerald-600'}`}
                            >
                                <CheckCircle size={16}/> {selectedEvent.completed ? 'Reabrir' : 'Concluir'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* PROJECT DETAIL MODAL */}
            {selectedProject && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9500] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md animate-scale-in overflow-hidden border-t-8 border-indigo-600">
                        <div className="p-6 border-b flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Instalação Programada</h3>
                                <p className="text-indigo-600 font-bold text-sm mt-1">{selectedProject.clientName}</p>
                            </div>
                            <button onClick={() => setSelectedProject(null)} className="text-slate-400 p-1 hover:bg-slate-100 rounded-full"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Evolução do Projeto</span>
                                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">{selectedProject.progress}%</span>
                                </div>
                                <div className="w-full h-2 bg-indigo-200 dark:bg-indigo-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600" style={{width: `${selectedProject.progress}%`}}></div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500"><Wrench size={18}/></div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fase Atual</p>
                                        <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{selectedProject.status}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg text-slate-500"><Box size={18}/></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Escopo Programado</p>
                                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-tight line-clamp-2">{selectedProject.description}</p>
                                    </div>
                                </div>
                            </div>

                            <button onClick={() => setSelectedProject(null)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-indigo-600 transition shadow-xl">
                                Fechar Detalhes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
