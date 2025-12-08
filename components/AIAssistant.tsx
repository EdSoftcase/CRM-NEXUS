import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Mic, Send, X, Loader2, PlayCircle, StopCircle, CheckCircle, AlertCircle } from 'lucide-react';
import { interpretCommand } from '../services/geminiService';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, Activity, LeadStatus } from '../types';

export const AIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
    const [inputValue, setInputValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
        { role: 'ai', text: 'Olá! Sou o Nexus AI. Diga algo como "Crie um lead para a Microsoft" ou "Agende uma reunião amanhã".' }
    ]);
    
    // Voice State
    const [isRecording, setIsRecording] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const { addLead, addActivity } = useData();
    const { currentUser } = useAuth();
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isOpen]);

    const handleAction = async (commandText: string, audioBlob?: Blob) => {
        setIsProcessing(true);
        try {
            let result;
            if (audioBlob) {
                // Convert Blob to Base64
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                await new Promise(resolve => reader.onloadend = resolve);
                const base64 = reader.result as string;
                result = await interpretCommand("", base64);
            } else {
                result = await interpretCommand(commandText);
            }

            // Execute Action
            if (result.action === 'create_lead') {
                const lead: Lead = {
                    id: `L-AI-${Date.now()}`,
                    name: result.data.name || 'Novo Lead IA',
                    company: result.data.company || 'Empresa Desconhecida',
                    email: result.data.email || '',
                    value: result.data.value || 0,
                    status: LeadStatus.NEW,
                    source: 'AI Assistant',
                    probability: 20,
                    createdAt: new Date().toISOString(),
                    lastContact: new Date().toISOString()
                };
                addLead(currentUser, lead);
                setMessages(prev => [...prev, { role: 'ai', text: `✅ ${result.message || 'Lead criado com sucesso!'}` }]);
            
            } else if (result.action === 'create_task') {
                const activity: Activity = {
                    id: `ACT-AI-${Date.now()}`,
                    title: result.data.title || 'Tarefa IA',
                    type: result.data.type || 'Task',
                    dueDate: result.data.dueDate || new Date().toISOString(),
                    completed: false,
                    relatedTo: 'Geral',
                    assignee: currentUser.id
                };
                addActivity(currentUser, activity);
                setMessages(prev => [...prev, { role: 'ai', text: `✅ ${result.message || 'Tarefa agendada!'}` }]);
            
            } else {
                setMessages(prev => [...prev, { role: 'ai', text: result.message || "Não entendi o comando. Tente algo como 'Adicionar lead João da Silva'." }]);
            }

        } catch (e) {
            console.error(e);
            setMessages(prev => [...prev, { role: 'ai', text: '❌ Erro ao processar. Tente novamente.' }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        setMessages(prev => [...prev, { role: 'user', text: inputValue }]);
        handleAction(inputValue);
        setInputValue('');
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) audioChunksRef.current.push(event.data);
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                setMessages(prev => [...prev, { role: 'user', text: '🎤 [Mensagem de Voz]' }]);
                handleAction("", audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
            setInputMode('voice');
        } catch (e) {
            alert("Erro ao acessar microfone.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            setInputMode('text');
        }
    };

    return (
        <>
            {/* Floating Button */}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-[9000] p-4 rounded-full shadow-2xl transition-all duration-300 flex items-center justify-center
                    ${isOpen ? 'bg-slate-800 rotate-90 scale-90' : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:scale-110 animate-pulse-slow'}
                `}
            >
                {isOpen ? <X className="text-white" size={24}/> : <Sparkles className="text-white" size={28}/>}
            </button>

            {/* Panel */}
            {isOpen && (
                <div className="fixed bottom-24 right-6 z-[9000] w-80 md:w-96 bg-white/90 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in origin-bottom-right h-[500px]">
                    
                    {/* Header */}
                    <div className="p-4 bg-slate-900 text-white flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                            <Sparkles size={18} className="text-white"/>
                        </div>
                        <div>
                            <h3 className="font-bold text-sm">Nexus Assistant</h3>
                            <p className="text-[10px] text-slate-300">Powered by Gemini 2.5</p>
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50 custom-scrollbar">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-3 rounded-2xl text-sm shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 border border-slate-200 rounded-bl-none'}`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isProcessing && (
                            <div className="flex justify-start">
                                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-slate-200 flex items-center gap-2">
                                    <Loader2 size={16} className="animate-spin text-purple-600"/>
                                    <span className="text-xs text-slate-500">Processando comando...</span>
                                </div>
                            </div>
                        )}
                        {isRecording && (
                            <div className="flex justify-end">
                                <div className="bg-red-50 border border-red-100 p-3 rounded-2xl rounded-br-none flex items-center gap-2">
                                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping"></div>
                                    <span className="text-xs text-red-600 font-bold">Ouvindo...</span>
                                </div>
                            </div>
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="p-3 bg-white border-t border-slate-200">
                        <div className="flex items-center gap-2 bg-slate-100 rounded-full p-1 pr-2 border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500/50 transition">
                            <input 
                                type="text" 
                                className="flex-1 bg-transparent border-none outline-none text-sm px-4 py-2 text-slate-700 placeholder:text-slate-400"
                                placeholder={isRecording ? "Ouvindo..." : "Digite ou fale..."}
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                disabled={isRecording || isProcessing}
                            />
                            
                            {inputValue.trim() ? (
                                <button 
                                    onClick={handleSend}
                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition"
                                >
                                    <Send size={16}/>
                                </button>
                            ) : (
                                <button 
                                    onClick={isRecording ? stopRecording : startRecording}
                                    className={`p-2 rounded-full transition ${isRecording ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                >
                                    {isRecording ? <StopCircle size={20}/> : <Mic size={20}/>}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
