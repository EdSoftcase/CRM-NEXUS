
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Maximize2, Minimize2, X, GripVertical, User, Delete, Activity, Loader2, Save, History, Users, GripHorizontal, Search, ArrowUpRight } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { analyzePhoneCall } from '../services/geminiService';
import { Activity as ActivityType } from '../types';

export const NexusVoice: React.FC = () => {
    const { addActivity, activities, clients, leads } = useData();
    const { currentUser } = useAuth();

    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [activeTab, setActiveTab] = useState<'keypad' | 'recents' | 'contacts'>('keypad');
    
    const [callState, setCallState] = useState<'idle' | 'dialing' | 'connected' | 'ended' | 'analyzing'>('idle');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [contactSearch, setContactSearch] = useState('');

    // Audio Refs
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    // Dados Computados
    const recentCalls = useMemo(() => {
        return activities
            .filter(a => a.type === 'Call')
            .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime())
            .slice(0, 20);
    }, [activities]);

    const allContacts = useMemo(() => {
        const cList = clients.filter(c => c.phone).map(c => ({ id: c.id, name: c.name, phone: c.phone, type: 'Cliente', company: c.name }));
        const lList = leads.filter(l => l.phone).map(l => ({ id: l.id, name: l.name, phone: l.phone, type: 'Lead', company: l.company }));
        return [...cList, ...lList].sort((a, b) => a.name.localeCompare(b.name));
    }, [clients, leads]);

    const filteredContacts = useMemo(() => {
        if (!contactSearch) return allContacts;
        return allContacts.filter(c => 
            c.name.toLowerCase().includes(contactSearch.toLowerCase()) || 
            c.company.toLowerCase().includes(contactSearch.toLowerCase())
        );
    }, [allContacts, contactSearch]);

    // Timer Logic
    useEffect(() => {
        if (callState === 'connected') {
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [callState]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const handleDigit = (digit: string) => {
        if (phoneNumber.length < 15) setPhoneNumber(prev => prev + digit);
    };

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const handleQuickDial = (number: string) => {
        const cleanNumber = number.replace(/\D/g, ''); // Remove formatação visual
        setPhoneNumber(cleanNumber);
        setActiveTab('keypad');
        // Opcional: Iniciar chamada automaticamente
        // startCall(cleanNumber);
    };

    const startCall = async () => {
        if (phoneNumber.length < 3) return;
        setCallState('dialing');
        
        // Simular tempo de conexão
        setTimeout(async () => {
            try {
                // Solicitar permissão de microfone REAL
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    if (event.data.size > 0) audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = processCallAudio;
                mediaRecorder.start();
                
                setCallState('connected');
                setDuration(0);
            } catch (err) {
                alert("Erro ao acessar microfone. Verifique as permissões.");
                setCallState('idle');
            }
        }, 1500);
    };

    const endCall = () => {
        if (mediaRecorderRef.current && callState === 'connected') {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setCallState('analyzing');
    };

    const processCallAudio = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Converter para Base64 para enviar ao Gemini
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            const result = await analyzePhoneCall(base64Audio, formatTime(duration));
            setAnalysis(result);
            setCallState('ended');
        };
    };

    const saveCallLog = () => {
        if (analysis) {
            // Tenta encontrar o nome do contato pelo número de telefone para vincular corretamente
            const cleanDialedNumber = phoneNumber.replace(/\D/g, '');
            const matchedContact = allContacts.find(c => c.phone.replace(/\D/g, '').includes(cleanDialedNumber));
            
            // Se encontrar, usa o nome do contato. Se não, usa o número.
            const relatedEntityName = matchedContact ? matchedContact.name : phoneNumber;

            const newActivity: ActivityType = {
                id: `CALL-${Date.now()}`,
                title: `Chamada: ${relatedEntityName}`,
                type: 'Call',
                dueDate: new Date().toISOString(),
                completed: true,
                relatedTo: relatedEntityName, // Vínculo crucial para o Client360
                assignee: currentUser?.id || 'admin',
                description: analysis.summary, // Salva o resumo no campo description
                metadata: analysis // Salva o objeto completo (incluindo transcrição e sentimento) no metadata
            };
            
            addActivity(currentUser, newActivity);
            alert(`Chamada salva e vinculada a "${relatedEntityName}"!`);
            resetVoice();
        }
    };

    const resetVoice = () => {
        setCallState('idle');
        setPhoneNumber('');
        setDuration(0);
        setAnalysis(null);
        setActiveTab('keypad'); // Volta para o teclado
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-24 z-[8000] p-4 bg-green-600 hover:bg-green-700 text-white rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center animate-fade-in"
                title="Nexus Voice"
            >
                <Phone size={24} />
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-24 z-[9000] bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 border border-slate-700 ${isMinimized ? 'w-72 h-16' : 'w-80 h-[500px] max-h-[80vh]'}`}>
            
            {/* Header */}
            <div className="bg-slate-800 p-3 flex justify-between items-center cursor-grab active:cursor-grabbing border-b border-slate-700 shrink-0">
                <div className="flex items-center gap-2 text-white">
                    <div className={`w-2 h-2 rounded-full ${callState === 'idle' ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="font-bold text-sm">Nexus Voice</span>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setIsMinimized(!isMinimized)} className="text-slate-400 hover:text-white">
                        {isMinimized ? <Maximize2 size={16}/> : <Minimize2 size={16}/>}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-400">
                        <X size={16}/>
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <div className="flex-1 bg-slate-900 relative overflow-hidden flex flex-col">
                    
                    {/* --- IDLE STATE (TABS) --- */}
                    {callState === 'idle' && (
                        <>
                            {/* Navigation Tabs */}
                            <div className="flex border-b border-slate-800">
                                <button onClick={() => setActiveTab('keypad')} className={`flex-1 py-3 flex justify-center text-xs font-bold uppercase tracking-wider transition ${activeTab === 'keypad' ? 'text-green-400 border-b-2 border-green-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <GripHorizontal size={16} className="mb-1 block mx-auto"/> Teclado
                                </button>
                                <button onClick={() => setActiveTab('recents')} className={`flex-1 py-3 flex justify-center text-xs font-bold uppercase tracking-wider transition ${activeTab === 'recents' ? 'text-green-400 border-b-2 border-green-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <History size={16} className="mb-1 block mx-auto"/> Recentes
                                </button>
                                <button onClick={() => setActiveTab('contacts')} className={`flex-1 py-3 flex justify-center text-xs font-bold uppercase tracking-wider transition ${activeTab === 'contacts' ? 'text-green-400 border-b-2 border-green-400 bg-slate-800/50' : 'text-slate-500 hover:text-slate-300'}`}>
                                    <Users size={16} className="mb-1 block mx-auto"/> Contatos
                                </button>
                            </div>

                            {/* TAB 1: KEYPAD */}
                            {activeTab === 'keypad' && (
                                <div className="h-full flex flex-col p-6 overflow-y-auto">
                                    <div className="flex-1 flex flex-col justify-center items-center mb-4 min-h-[80px]">
                                        <input 
                                            type="text" 
                                            value={phoneNumber}
                                            readOnly
                                            className="bg-transparent text-white text-3xl font-light text-center w-full outline-none mb-2"
                                            placeholder="..."
                                        />
                                        <p className="text-green-500 text-[10px] font-bold uppercase tracking-widest">VoIP Ready</p>
                                    </div>
                                    
                                    <div className="grid grid-cols-3 gap-4 mb-6 shrink-0">
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, '*', 0, '#'].map((digit) => (
                                            <button 
                                                key={digit}
                                                onClick={() => handleDigit(digit.toString())}
                                                className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xl flex items-center justify-center transition mx-auto shadow-sm"
                                            >
                                                {digit}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="flex justify-center items-center gap-6 shrink-0">
                                        <button onClick={handleBackspace} className="text-slate-500 hover:text-slate-300 p-2">
                                            <Delete size={24}/>
                                        </button>
                                        <button 
                                            onClick={startCall}
                                            className="w-16 h-16 rounded-full bg-green-600 hover:bg-green-500 text-white flex items-center justify-center shadow-lg shadow-green-500/30 transition-transform active:scale-95"
                                        >
                                            <Phone size={32} fill="currentColor"/>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: RECENTS (HISTORY) */}
                            {activeTab === 'recents' && (
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                    {recentCalls.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                            <History size={32} className="mb-2 opacity-50"/>
                                            <p className="text-xs">Nenhuma chamada recente</p>
                                        </div>
                                    ) : (
                                        <div className="divide-y divide-slate-800">
                                            {recentCalls.map(call => (
                                                <div 
                                                    key={call.id} 
                                                    className="p-3 hover:bg-slate-800/50 cursor-pointer flex justify-between items-center group transition"
                                                    onClick={() => handleQuickDial(call.relatedTo)}
                                                >
                                                    <div className="min-w-0">
                                                        <p className="text-white text-sm font-medium truncate">{call.relatedTo}</p>
                                                        <p className="text-xs text-slate-500">{new Date(call.dueDate).toLocaleDateString()} • {new Date(call.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                                    </div>
                                                    <button className="text-slate-500 group-hover:text-green-400">
                                                        <Phone size={16}/>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* TAB 3: CONTACTS (PHONEBOOK) */}
                            {activeTab === 'contacts' && (
                                <div className="flex-1 flex flex-col overflow-hidden">
                                    <div className="p-3 border-b border-slate-800">
                                        <div className="bg-slate-800 rounded-lg flex items-center px-3 py-2">
                                            <Search size={14} className="text-slate-500 mr-2"/>
                                            <input 
                                                type="text" 
                                                placeholder="Buscar nome..." 
                                                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
                                                value={contactSearch}
                                                onChange={e => setContactSearch(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {filteredContacts.length === 0 ? (
                                            <div className="h-full flex flex-col items-center justify-center text-slate-600">
                                                <Users size={32} className="mb-2 opacity-50"/>
                                                <p className="text-xs">Nenhum contato encontrado</p>
                                            </div>
                                        ) : (
                                            <div className="divide-y divide-slate-800">
                                                {filteredContacts.map(contact => (
                                                    <div 
                                                        key={contact.id} 
                                                        className="p-3 hover:bg-slate-800/50 cursor-pointer flex justify-between items-center group transition"
                                                        onClick={() => handleQuickDial(contact.phone)}
                                                    >
                                                        <div className="min-w-0">
                                                            <p className="text-white text-sm font-medium truncate">{contact.name}</p>
                                                            <p className="text-xs text-slate-500 truncate">{contact.company} • {contact.type}</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-slate-600 font-mono hidden sm:block">{contact.phone}</span>
                                                            <button className="text-slate-500 group-hover:text-green-400 bg-slate-800 p-2 rounded-full">
                                                                <Phone size={14}/>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* --- CALLING / CONNECTED STATE --- */}
                    {(callState === 'dialing' || callState === 'connected') && (
                        <div className="h-full flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-800 overflow-hidden absolute inset-0 z-10">
                            <div className="w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center mb-4 relative shrink-0">
                                <User size={48} className="text-slate-400"/>
                                <div className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-ping"></div>
                            </div>
                            <h3 className="text-2xl text-white font-light mb-1 text-center truncate w-full">{phoneNumber}</h3>
                            <p className="text-green-400 text-sm font-medium mb-8">
                                {callState === 'dialing' ? 'Chamando...' : formatTime(duration)}
                            </p>

                            <div className="flex items-center gap-6">
                                <button 
                                    onClick={() => setIsMuted(!isMuted)}
                                    className={`p-4 rounded-full ${isMuted ? 'bg-white text-slate-900' : 'bg-slate-700 text-white'} transition`}
                                >
                                    {isMuted ? <MicOff size={24}/> : <Mic size={24}/>}
                                </button>
                                <button 
                                    onClick={endCall}
                                    className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition transform hover:scale-110"
                                >
                                    <PhoneOff size={32} fill="currentColor"/>
                                </button>
                            </div>
                            
                            {callState === 'connected' && (
                                <div className="mt-8 flex gap-1 items-end h-8">
                                    {[...Array(5)].map((_, i) => (
                                        <div key={i} className="w-1 bg-green-500 rounded-full animate-pulse" style={{height: `${Math.random() * 100}%`, animationDuration: '0.5s'}}></div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* --- ANALYZING STATE --- */}
                    {callState === 'analyzing' && (
                        <div className="h-full flex flex-col items-center justify-center p-6 text-center absolute inset-0 z-10 bg-slate-900">
                            <Loader2 size={48} className="text-blue-500 animate-spin mb-4"/>
                            <h3 className="text-white font-bold text-lg">Processando Chamada...</h3>
                            <p className="text-slate-400 text-sm mt-2">A IA está transcrevendo e analisando o áudio.</p>
                        </div>
                    )}

                    {/* --- ENDED / SUMMARY STATE --- */}
                    {callState === 'ended' && analysis && (
                        <div className="flex flex-col h-full bg-slate-900 absolute inset-0 z-10">
                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
                                <div className="flex items-center gap-2 mb-4 text-green-400">
                                    <Activity size={20}/>
                                    <span className="font-bold uppercase tracking-wider text-xs">Análise IA Concluída</span>
                                </div>

                                <div className="space-y-4">
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Sentimento</p>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${analysis.sentiment === 'Positivo' ? 'bg-green-500/20 text-green-400' : analysis.sentiment === 'Negativo' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                            {analysis.sentiment}
                                        </span>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Resumo</p>
                                        <p className="text-sm text-slate-200 leading-relaxed">{analysis.summary}</p>
                                    </div>
                                    <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Próximos Passos</p>
                                        <p className="text-sm text-slate-200">{analysis.nextSteps}</p>
                                    </div>
                                    {/* Transcript optional if available */}
                                    {analysis.transcript && (
                                         <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
                                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Transcrição</p>
                                            <p className="text-xs text-slate-300 italic">{analysis.transcript}</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Fixed Footer */}
                            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 flex gap-3">
                                <button onClick={resetVoice} className="flex-1 py-3 rounded-lg border border-slate-600 text-slate-300 font-medium hover:bg-slate-800 transition">
                                    Descartar
                                </button>
                                <button onClick={saveCallLog} className="flex-1 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2">
                                    <Save size={18}/> Salvar
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};
