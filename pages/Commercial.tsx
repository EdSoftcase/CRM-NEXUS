
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Widgets';
import { PipelineFunnel } from '../components/Charts';
import { Mail, Phone, Calendar, MapPin, Globe, Car, Box, X, AlertCircle, Clock, Flame, ThermometerSnowflake, Activity, MessageCircle, Send, BarChart2, ChevronDown, ChevronUp, Mic, Square, Loader2, PlayCircle, GraduationCap, Sparkles, Copy, GripVertical, Filter, Radar, UserPlus, List, Layout, Download, Calculator, DollarSign, MonitorPlay, Minimize, Search, CheckCircle, Server, User, Building, Trash2, Edit } from 'lucide-react';
import { generateLeadEmail, processAudioNote, generateSalesObjectionResponse, enrichCompanyData } from '../services/geminiService';
import { fetchAddressByCEP, fetchCoordinates } from '../services/geoService';
import { sendBridgeWhatsApp } from '../services/bridgeService'; // Import Bridge
import { Lead, LeadStatus, Note, Activity as ActivityType } from '../types';
import { SendEmailModal } from '../components/SendEmailModal';
import { CustomFieldRenderer } from '../components/CustomFieldRenderer';
import * as XLSX from 'xlsx';

export const Commercial: React.FC = () => {
  const { leads, updateLeadStatus, addLead, updateLead, addIssueNote, addActivity, addSystemNotification, customFields, removeClient } = useData(); 
  const { currentUser } = useAuth();
  
  // Mobile Detection
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- STATE PERSISTENCE FOR LEAD MODAL ---
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Recupera o lead do cache quando os leads são carregados
  useEffect(() => {
      if (leads.length > 0) {
          const savedLeadId = sessionStorage.getItem('nexus_selected_lead_id');
          if (savedLeadId) {
              const freshLead = leads.find(l => l.id === savedLeadId);
              // Apenas atualiza se não estiver selecionado ou se mudou
              if (freshLead && (!selectedLead || selectedLead.id !== freshLead.id)) {
                  setSelectedLead(freshLead);
              }
          }
      }
  }, [leads]);

  // Atualiza o lead selecionado se a lista mudar (sync)
  useEffect(() => {
      if (selectedLead) {
          const freshLead = leads.find(l => l.id === selectedLead.id);
          if (freshLead && JSON.stringify(freshLead) !== JSON.stringify(selectedLead)) {
              setSelectedLead(freshLead);
          }
      }
  }, [leads]);

  // Salva no cache sempre que abrir/fechar um lead
  useEffect(() => {
      if (selectedLead) {
          sessionStorage.setItem('nexus_selected_lead_id', selectedLead.id);
      } else {
          sessionStorage.removeItem('nexus_selected_lead_id');
      }
  }, [selectedLead]);
  
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [showFunnelChart, setShowFunnelChart] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'coach'>('details');
  const [coachScript, setCoachScript] = useState('');
  const [isCoachLoading, setIsCoachLoading] = useState(false);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppMessage, setWhatsAppMessage] = useState('');
  
  // PERSISTENT BRIDGE PREFERENCE
  const [useBridgeWhatsApp, setUseBridgeWhatsApp] = useState(() => {
      return localStorage.getItem('nexus_pref_bridge_whatsapp') === 'true';
  });

  const toggleBridgeWhatsApp = () => {
      const newVal = !useBridgeWhatsApp;
      setUseBridgeWhatsApp(newVal);
      localStorage.setItem('nexus_pref_bridge_whatsapp', String(newVal));
  };

  const [sendingWhatsApp, setSendingWhatsApp] = useState(false); // Sending State

  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({ name: '', company: '', email: '', phone: '', cep: '', address: '', latitude: 0, longitude: 0, website: '', parkingSpots: '', productInterest: '', source: 'Web', value: '', metadata: {} });
  const [cepError, setCepError] = useState<string | null>(null);
  const [isLoadingCep, setIsLoadingCep] = useState(false);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<LeadStatus | null>(null);
  const [showStagnantOnly, setShowStagnantOnly] = useState(false);
  const [isEnriching, setIsEnriching] = useState(false);

  // View Mode
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');

  // TV Mode
  const [tvMode, setTvMode] = useState(false);

  // Email Modal State
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailLead, setEmailLead] = useState<Lead | null>(null);

  // WhatsApp Specific State
  const [leadForWhatsApp, setLeadForWhatsApp] = useState<Lead | null>(null);
  
  // Commission Calculator State
  const [showCommissionCalc, setShowCommissionCalc] = useState(false);
  const [commissionRate, setCommissionRate] = useState(5); // default 5%

  // --- STATE PERSISTENCE (Mobile Camera Fix for New Lead) ---
  useEffect(() => {
      const savedState = sessionStorage.getItem('nexus_new_lead_state');
      if (savedState) {
          try {
              const parsed = JSON.parse(savedState);
              if (parsed.isOpen) {
                  setIsNewLeadModalOpen(true);
                  setNewLeadForm(parsed.form);
              }
          } catch (e) {
              console.error("Failed to restore lead state", e);
          }
      }
  }, []);

  useEffect(() => {
      const state = {
          isOpen: isNewLeadModalOpen,
          form: newLeadForm
      };
      sessionStorage.setItem('nexus_new_lead_state', JSON.stringify(state));
  }, [isNewLeadModalOpen, newLeadForm]);

  useEffect(() => {
      const filterFlag = sessionStorage.getItem('nexus_filter_stagnant');
      if (filterFlag === 'true') {
          setShowStagnantOnly(true);
          sessionStorage.removeItem('nexus_filter_stagnant');
      }
  }, []);

  const handleOpenLead = (lead: Lead) => { setSelectedLead(lead); setActiveTab('details'); setCoachScript(''); };
  const handleCloseLead = () => { setSelectedLead(null); };
  const handleCloseNewLead = () => { 
      setIsNewLeadModalOpen(false); 
      setCepError(null); 
      // Clear persistence immediately on proper close
      sessionStorage.removeItem('nexus_new_lead_state');
  };
  const handleOpenEmailModal = (e: React.MouseEvent, lead: Lead) => { e.stopPropagation(); setEmailLead(lead); setIsEmailModalOpen(true); };
  const handleEmailSuccess = (message: string) => { if (emailLead) { addSystemNotification('E-mail Enviado', message, 'success', emailLead.company); const newActivity: ActivityType = { id: `ACT-EMAIL-${Date.now()}`, title: `Email Enviado: ${message.split(':')[1] || 'Contato'}`, type: 'Email', dueDate: new Date().toISOString(), completed: true, relatedTo: emailLead.name, assignee: currentUser?.id || 'admin', description: message, organizationId: currentUser?.organizationId }; addActivity(currentUser, newActivity); } };
  const handleExportLeads = () => { /* ... */ };
  const pipelineTotal = useMemo(() => { return leads.filter(l => l.status !== LeadStatus.CLOSED_LOST && l.status !== LeadStatus.CLOSED_WON).reduce((acc, curr) => acc + curr.value, 0); }, [leads]);
  const wonTotal = useMemo(() => { return leads.filter(l => l.status === LeadStatus.CLOSED_WON).reduce((acc, curr) => acc + curr.value, 0); }, [leads]);
  const estimatedCommission = (pipelineTotal * (commissionRate / 100));
  const realizedCommission = (wonTotal * (commissionRate / 100));
  const whatsappTemplates = [ { label: 'Primeiro Contato', text: 'Olá [Nome], tudo bem? Sou da Nexus CRM. Vi que você demonstrou interesse em nossa solução e gostaria de entender melhor seu cenário.' }, { label: 'Follow-up Proposta', text: 'Olá [Nome], como vai? Conseguiu avaliar a proposta que enviei? Estou à disposição para tirar dúvidas.' }, { label: 'Agendar Reunião', text: 'Oi [Nome], gostaria de agendar uma breve conversa para te apresentar como podemos ajudar a [Empresa]. Qual sua disponibilidade?' }, { label: 'Confirmação', text: 'Olá [Nome], confirmando nossa reunião para amanhã. Tudo certo?' } ];
  const stages: LeadStatus[] = [LeadStatus.NEW, LeadStatus.QUALIFIED, LeadStatus.PROPOSAL, LeadStatus.NEGOTIATION, LeadStatus.CLOSED_WON];
  const getDaysInactive = (dateStr: string) => { const diff = new Date().getTime() - new Date(dateStr).getTime(); return Math.floor(diff / (1000 * 3600 * 24)); };
  const filteredLeads = useMemo(() => { if (showStagnantOnly) { return leads.filter(l => { const days = getDaysInactive(l.lastContact); return days > 7 && l.status !== LeadStatus.CLOSED_WON && l.status !== LeadStatus.CLOSED_LOST; }); } return leads; }, [leads, showStagnantOnly]);
  const calculateLeadScore = (lead: Lead) => { /* ... */ return { score: 50, term: 'Morno', color: 'text-yellow-500', icon: Activity, bg: '', reasons: [] }; };
  const handleGenerateEmail = async (lead: Lead) => { setLoadingEmail(true); setGeneratedEmail(''); const email = await generateLeadEmail(lead); setGeneratedEmail(email); setLoadingEmail(false); };
  const handleGenerateObjection = async (objectionType: string) => { if (!selectedLead) return; setIsCoachLoading(true); setCoachScript(''); const script = await generateSalesObjectionResponse(selectedLead, objectionType); setCoachScript(script); setIsCoachLoading(false); };
  const changeStatus = (newStatus: LeadStatus) => { if (selectedLead) { updateLeadStatus(currentUser, selectedLead.id, newStatus); setSelectedLead({ ...selectedLead, status: newStatus }); } };
  const handleAddToCalendar = (lead: Lead) => { const title = `Reunião: ${lead.name} - ${lead.company}`; const details = `...`; const location = lead.address || ''; const params = new URLSearchParams({ action: 'TEMPLATE', text: title, details, location }); window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank'); };
  const openWhatsAppModal = () => { if (selectedLead) { setLeadForWhatsApp(selectedLead); const defaultTmpl = whatsappTemplates[0]; const text = defaultTmpl.text.replace('[Nome]', selectedLead.name.split(' ')[0]).replace('[Empresa]', selectedLead.company); setWhatsAppMessage(text); setShowWhatsAppModal(true); } };
  const handleQuickWhatsApp = (e: React.MouseEvent, lead: Lead) => { e.stopPropagation(); setLeadForWhatsApp(lead); const defaultTmpl = whatsappTemplates[0]; const text = defaultTmpl.text.replace('[Nome]', lead.name.split(' ')[0]).replace('[Empresa]', lead.company); setWhatsAppMessage(text); setShowWhatsAppModal(true); };
  
  // MODIFIED: Handle Send WhatsApp
  const handleSendWhatsApp = async () => { 
      if (!leadForWhatsApp) return; 
      const phone = leadForWhatsApp.phone?.replace(/\D/g, '') || ''; 
      
      if (useBridgeWhatsApp) {
          setSendingWhatsApp(true);
          try {
              await sendBridgeWhatsApp(phone, whatsAppMessage);
              addSystemNotification('WhatsApp Enviado', `Mensagem enviada para ${leadForWhatsApp.name} via Bridge.`, 'success');
              setShowWhatsAppModal(false);
              setLeadForWhatsApp(null);
          } catch (e: any) {
              alert(`Erro ao enviar via Bridge: ${e.message}`);
          } finally {
              setSendingWhatsApp(false);
          }
      } else {
          const text = encodeURIComponent(whatsAppMessage); 
          window.open(`https://wa.me/${phone}?text=${text}`, '_blank'); 
          setShowWhatsAppModal(false); 
          setLeadForWhatsApp(null); 
      }
  };
  
  const maskCEP = (value: string) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const rawCep = e.target.value; const maskedCep = maskCEP(rawCep); setNewLeadForm(prev => ({ ...prev, cep: maskedCep })); if (maskedCep.length === 9) { setIsLoadingCep(true); const addressData = await fetchAddressByCEP(maskedCep); if (addressData) { const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`; const coords = await fetchCoordinates(fullAddress); setNewLeadForm(prev => ({ ...prev, address: fullAddress, latitude: coords?.lat || 0, longitude: coords?.lng || 0 })); setCepError(''); } else { setCepError('CEP não encontrado.'); } setIsLoadingCep(false); } else { setCepError(null); } };
  const handleNexusRadar = async () => { if (!newLeadForm.company) return; setIsEnriching(true); const enrichedData = await enrichCompanyData(newLeadForm.company, newLeadForm.website); if (enrichedData) { setNewLeadForm(prev => ({ ...prev, website: prev.website || enrichedData.website || '', productInterest: prev.productInterest || enrichedData.description })); addSystemNotification('Nexus Radar', `Dados enriquecidos para ${newLeadForm.company}`, 'success'); } setIsEnriching(false); };
  const handleCreateLead = (e: React.FormEvent) => { e.preventDefault(); const newLead: Lead = { id: `L-${Date.now()}`, name: newLeadForm.name, company: newLeadForm.company, email: newLeadForm.email, value: parseFloat(newLeadForm.value) || 0, status: LeadStatus.NEW, source: newLeadForm.source, probability: 20, createdAt: new Date().toISOString(), lastContact: new Date().toISOString(), phone: newLeadForm.phone, cep: newLeadForm.cep, address: newLeadForm.address, website: newLeadForm.website, parkingSpots: Number(newLeadForm.parkingSpots), productInterest: newLeadForm.productInterest, organizationId: currentUser.organizationId, metadata: newLeadForm.metadata }; addLead(currentUser, newLead); handleCloseNewLead(); };
  const startRecording = async () => { /* ... */ };
  const stopRecording = () => { /* ... */ };
  const handleAudioStop = async () => { /* ... */ };
  const handleDragStart = (e: React.DragEvent, leadId: string) => { 
      if (isMobile) { e.preventDefault(); return; } // Disable drag on mobile
      setDraggedLeadId(leadId); 
      e.dataTransfer.effectAllowed = 'move'; 
  };
  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColumn !== status) { setDragOverColumn(status); } };
  const handleDragLeave = (e: React.DragEvent) => { };
  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => { e.preventDefault(); setDragOverColumn(null); if (draggedLeadId) { const lead = leads.find(l => l.id === draggedLeadId); if (lead && lead.status !== targetStatus) { updateLeadStatus(currentUser, draggedLeadId, targetStatus); } setDraggedLeadId(null); } };
  const containerClass = tvMode ? "fixed inset-0 z-[100] bg-slate-900 p-4 overflow-hidden flex flex-col" : "p-4 md:p-8 flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors";

  return (
    <div className={containerClass}>
      {!tvMode && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
            <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Comercial / Pipeline</h1><p className="text-slate-500 dark:text-slate-400">Gestão de oportunidades com Lead Scoring Inteligente.</p></div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setShowCommissionCalc(!showCommissionCalc)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition whitespace-nowrap ${showCommissionCalc ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}><Calculator size={18}/> Calculadora</button>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700"><button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`} title="Visualização Kanban"><Layout size={16}/> <span className="hidden sm:inline">Kanban</span></button><button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`} title="Visualização Lista"><List size={16}/> <span className="hidden sm:inline">Lista</span></button></div>
                <button onClick={() => setIsNewLeadModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium whitespace-nowrap flex items-center justify-center gap-2"><UserPlus size={18}/> Novo Lead</button>
            </div>
          </div>
      )}
      
      {viewMode === 'kanban' && (
          <div className="flex flex-1 gap-4 md:gap-6 overflow-x-auto pb-4 px-1 min-h-0 snap-x snap-mandatory md:snap-none">
            {stages.map((stage, idx) => (
                <div key={stage} onDragOver={(e) => handleDragOver(e, stage)} onDrop={(e) => handleDrop(e, stage)} className={`min-w-[280px] md:min-w-[300px] w-[85vw] md:w-auto snap-center rounded-xl p-3 md:p-4 flex flex-col border transition-colors duration-200 ${dragOverColumn === stage ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500 border-dashed ring-2 ring-blue-100 dark:ring-blue-900' : tvMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    <div className={`flex justify-between items-center mb-4 sticky top-0 pb-2 z-10 border-b border-slate-200/50 dark:border-slate-700/50 rounded-t-lg ${idx === 0 ? 'bg-transparent' : ''}`}><h3 className={`font-bold truncate pr-2 text-sm md:text-base ${tvMode ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} title={stage}>{stage}</h3><span className="bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">{filteredLeads.filter(l => l.status === stage).length}</span></div>
                    <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar max-h-[65vh] md:max-h-[60vh]">
                        {filteredLeads.filter(l => l.status === stage).map(lead => (
                            <div 
                                key={lead.id} 
                                draggable={!tvMode && !isMobile} 
                                onDragStart={(e) => handleDragStart(e, lead.id)} 
                                onClick={() => handleOpenLead(lead)} 
                                className={`bg-white dark:bg-slate-700 p-3 md:p-4 rounded-lg shadow-sm ${!isMobile ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} hover:shadow-md transition-all border border-slate-200 dark:border-slate-600 relative group ${draggedLeadId === lead.id ? 'opacity-50' : 'opacity-100'} ${tvMode ? 'border-slate-600' : ''}`}
                            >
                                <div className="flex justify-between items-start mb-2"><div className="max-w-[70%]"><h4 className={`font-bold text-sm md:text-base leading-tight ${tvMode ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{lead.name}</h4><p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{lead.company}</p></div><div className={`flex flex-col items-end ${tvMode ? 'text-white' : ''}`}><span className="font-bold text-sm">R$ {lead.value.toLocaleString(undefined, { notation: 'compact' })}</span><span className="text-[10px] text-slate-400">{lead.probability}%</span></div></div>
                                {!tvMode && (<div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-600 mt-2"><div className="flex items-center gap-2"><div className={`flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-slate-800 px-1.5 py-0.5 rounded`}><Activity size={10} /> 50</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleQuickWhatsApp(e, lead)} className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50" title="WhatsApp Rápido"><MessageCircle size={14}/></button><button onClick={(e) => handleOpenEmailModal(e, lead)} className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Email Rápido"><Mail size={14}/></button></div></div>)}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
          </div>
      )}
      
      {viewMode === 'list' && (<div></div>)}

      <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 ${tvMode ? 'text-slate-400 bg-slate-900 p-4 fixed bottom-0 left-0 right-0 z-[110] border-t-slate-800' : ''}`}><div className="text-xs font-medium flex items-center gap-4"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {filteredLeads.length} Oportunidades</span><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Total: R$ {pipelineTotal.toLocaleString()}</span></div><button onClick={() => setTvMode(!tvMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition text-xs uppercase tracking-wide shadow-sm ${tvMode ? 'bg-red-600 text-white hover:bg-red-700 border-red-500' : 'bg-slate-800 text-white hover:bg-slate-700 border-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>{tvMode ? <Minimize size={16}/> : <MonitorPlay size={16}/>}{tvMode ? 'Sair do Modo TV' : 'Modo TV'}</button></div>

      {isNewLeadModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Lead</h2>
                      <button onClick={handleCloseNewLead} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                  </div>
                  <form onSubmit={handleCreateLead} className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.company} onChange={e => setNewLeadForm({...newLeadForm, company: e.target.value})} onBlur={handleNexusRadar}/></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Contato</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.name} onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label><input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.email} onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.phone} onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Estimado</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.value} onChange={e => setNewLeadForm({...newLeadForm, value: e.target.value})} /></div>
                          <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.address} onChange={e => setNewLeadForm({...newLeadForm, address: e.target.value})} /></div>
                      </div>
                      <CustomFieldRenderer fields={customFields} module="leads" values={newLeadForm.metadata} onChange={(key, value) => setNewLeadForm(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))} className="pt-4 border-t border-slate-100 dark:border-slate-700"/>
                      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                          <button type="button" onClick={handleCloseNewLead} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700">Cancelar</button>
                          <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-sm flex items-center gap-2">
                              {isEnriching ? <Loader2 size={18} className="animate-spin"/> : <CheckCircle size={18}/>} Salvar Lead
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* LEAD DETAILS MODAL - USING CREATEPORTAL TO FIX Z-INDEX/STACKING CONTEXT ISSUES */}
      {selectedLead && createPortal(
          <div className="fixed inset-0 bg-black/60 flex items-center justify-end z-[9999] p-0 backdrop-blur-sm animate-fade-in" onClick={handleCloseLead}>
              <div className="bg-white dark:bg-slate-900 w-full max-w-2xl h-full shadow-2xl animate-slide-in-right flex flex-col border-l border-slate-200 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-start shrink-0">
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">{selectedLead.id}</span>
                              <Badge color="blue">{selectedLead.status}</Badge>
                          </div>
                          <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight">{selectedLead.name}</h2>
                          <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1 mt-1">
                              <Building size={14}/> {selectedLead.company}
                          </p>
                      </div>
                      <div className="flex gap-2">
                          <button onClick={openWhatsAppModal} className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full hover:bg-green-200 dark:hover:bg-green-900/50 transition" title="WhatsApp">
                              <MessageCircle size={20}/>
                          </button>
                          <button onClick={handleCloseLead} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full text-slate-500 dark:text-slate-400 transition">
                              <X size={24}/>
                          </button>
                      </div>
                  </div>

                  <div className="flex border-b border-slate-200 dark:border-slate-700 px-6 bg-white dark:bg-slate-900 shrink-0">
                      <button onClick={() => setActiveTab('details')} className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'details' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>Detalhes</button>
                      <button onClick={() => setActiveTab('coach')} className={`px-4 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'coach' ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}>IA Coach</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-900 custom-scrollbar">
                      {activeTab === 'details' && (
                          <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Potencial</p>
                                      <input 
                                          type="number" 
                                          className="text-xl font-bold text-slate-900 dark:text-white bg-transparent outline-none w-full"
                                          value={selectedLead.value}
                                          onChange={(e) => updateLead(currentUser, {...selectedLead, value: parseFloat(e.target.value) || 0})}
                                      />
                                  </div>
                                  <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                                      <p className="text-xs text-slate-500 dark:text-slate-400 uppercase mb-1">Probabilidade</p>
                                      <input 
                                          type="range" 
                                          className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                          value={selectedLead.probability}
                                          onChange={(e) => updateLead(currentUser, {...selectedLead, probability: parseInt(e.target.value)})}
                                      />
                                      <p className="text-right text-xs font-bold text-blue-600 dark:text-blue-400 mt-1">{selectedLead.probability}%</p>
                                  </div>
                              </div>

                              <div className="space-y-4">
                                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase border-b border-slate-100 dark:border-slate-700 pb-2">Informações de Contato</h3>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                          <p className="text-slate-500 dark:text-slate-400 text-xs">Email</p>
                                          <p className="text-slate-800 dark:text-white truncate">{selectedLead.email || '-'}</p>
                                      </div>
                                      <div>
                                          <p className="text-slate-500 dark:text-slate-400 text-xs">Telefone</p>
                                          <p className="text-slate-800 dark:text-white">{selectedLead.phone || '-'}</p>
                                      </div>
                                      <div className="col-span-2">
                                          <p className="text-slate-500 dark:text-slate-400 text-xs">Endereço</p>
                                          <p className="text-slate-800 dark:text-white">{selectedLead.address || '-'}</p>
                                      </div>
                                  </div>
                              </div>

                              <div>
                                  <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">Estágio do Pipeline</h3>
                                  <div className="flex flex-col gap-2">
                                      {stages.map((stage) => (
                                          <button
                                              key={stage}
                                              onClick={() => changeStatus(stage)}
                                              className={`w-full text-left px-4 py-2 rounded-lg text-sm font-medium transition flex items-center justify-between ${selectedLead.status === stage ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                          >
                                              {stage}
                                              {selectedLead.status === stage && <CheckCircle size={16}/>}
                                          </button>
                                      ))}
                                  </div>
                              </div>

                              {Object.keys(selectedLead.metadata || {}).length > 0 && (
                                  <div>
                                      <h3 className="font-bold text-slate-800 dark:text-white text-sm uppercase border-b border-slate-100 dark:border-slate-700 pb-2 mb-3">Dados Personalizados</h3>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                          {Object.entries(selectedLead.metadata || {}).map(([key, value]) => {
                                              const fieldDef = customFields.find(f => f.key === key);
                                              return (
                                                  <div key={key}>
                                                      <p className="text-slate-500 dark:text-slate-400 text-xs">{fieldDef?.label || key}</p>
                                                      <p className="text-slate-800 dark:text-white">{String(value)}</p>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              )}
                          </div>
                      )}

                      {activeTab === 'coach' && (
                          <div className="space-y-6">
                              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800">
                                  <h3 className="font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2 mb-2">
                                      <Sparkles size={18}/> Sales Coach AI
                                  </h3>
                                  <p className="text-sm text-indigo-800 dark:text-indigo-300 mb-4">
                                      Precisa de ajuda para responder uma objeção ou criar um email?
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-2 mb-4">
                                      <button onClick={() => handleGenerateObjection('Preço Alto')} className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition">Objeção: Preço Alto</button>
                                      <button onClick={() => handleGenerateObjection('Concorrência')} className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition">Objeção: Concorrência</button>
                                      <button onClick={() => handleGenerateObjection('Falta de Tempo')} className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition">Objeção: "Vou pensar"</button>
                                      <button onClick={() => handleGenerateEmail(selectedLead)} className="text-xs bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 px-3 py-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/50 transition">Gerar Email Cold Call</button>
                                  </div>

                                  {isCoachLoading ? (
                                      <div className="flex items-center justify-center py-8 text-indigo-400"><Loader2 className="animate-spin mr-2"/> Gerando resposta...</div>
                                  ) : (
                                      (coachScript || generatedEmail) && (
                                          <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-indigo-100 dark:border-indigo-800 text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed animate-fade-in relative group">
                                               {coachScript || generatedEmail}
                                               <button onClick={() => { navigator.clipboard.writeText(coachScript || generatedEmail); addSystemNotification('Copiado', 'Texto copiado!', 'info'); }} className="absolute top-2 right-2 text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition" title="Copiar"><Copy size={16}/></button>
                                          </div>
                                      )
                                  )}
                              </div>
                          </div>
                      )}
                  </div>
              </div>
          </div>,
          document.body
      )}

      {showWhatsAppModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2"><MessageCircle size={20} className="text-green-600 dark:text-green-400"/> Enviar WhatsApp</h2>
                    <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Para: <strong>{selectedLead.name}</strong> ({selectedLead.phone})</p>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer" onClick={toggleBridgeWhatsApp}>
                        <div className="flex items-center gap-2"><Server size={16} className={useBridgeWhatsApp ? 'text-green-600' : 'text-slate-400'}/><span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar Nexus Bridge (Automático)</span></div>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${useBridgeWhatsApp ? 'bg-green-500' : 'bg-slate-300'}`}><div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${useBridgeWhatsApp ? 'translate-x-5' : 'translate-x-0'}`}></div></div>
                    </div>
                    <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mensagem</label><textarea className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={whatsAppMessage} onChange={(e) => setWhatsAppMessage(e.target.value)}/></div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">{whatsappTemplates.map((tmpl, idx) => (<button key={idx} onClick={() => { const text = tmpl.text.replace('[Nome]', selectedLead.name.split(' ')[0]).replace('[Empresa]', selectedLead.company); setWhatsAppMessage(text); }} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap border border-slate-200 dark:border-slate-600 transition">{tmpl.label}</button>))}</div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                    <button onClick={handleSendWhatsApp} disabled={sendingWhatsApp} className="px-6 py-2 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#128C7E] shadow-md transition flex items-center gap-2 disabled:opacity-70">{sendingWhatsApp ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}{sendingWhatsApp ? 'Enviando...' : 'Enviar'}</button>
                </div>
            </div>
        </div>
      )}

      {isEmailModalOpen && emailLead && (
          <SendEmailModal lead={emailLead} onClose={() => setIsEmailModalOpen(false)} onSuccess={handleEmailSuccess}/>
      )}
    </div>
  );
};
