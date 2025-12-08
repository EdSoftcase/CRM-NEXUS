
// ... existing imports ...
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Badge } from '../components/Widgets';
import { PipelineFunnel } from '../components/Charts';
import { Mail, Phone, Calendar, MapPin, Globe, Car, Box, X, AlertCircle, Clock, Flame, ThermometerSnowflake, Activity, MessageCircle, Send, BarChart2, ChevronDown, ChevronUp, Mic, Square, Loader2, PlayCircle, GraduationCap, Sparkles, Copy, GripVertical, Filter, Radar, UserPlus, List, Layout, Download, Calculator, DollarSign, MonitorPlay, Minimize, Search, CheckCircle, Server } from 'lucide-react';
import { generateLeadEmail, processAudioNote, generateSalesObjectionResponse, enrichCompanyData } from '../services/geminiService';
import { fetchAddressByCEP, fetchCoordinates } from '../services/geoService';
import { sendBridgeWhatsApp } from '../services/bridgeService'; // Import Bridge
import { Lead, LeadStatus, Note, Activity as ActivityType } from '../types';
import { SendEmailModal } from '../components/SendEmailModal';
import { CustomFieldRenderer } from '../components/CustomFieldRenderer';
import * as XLSX from 'xlsx';

export const Commercial: React.FC = () => {
  // ... existing state hooks ...
  const { leads, updateLeadStatus, addLead, updateLead, addIssueNote, addActivity, addSystemNotification, customFields } = useData(); 
  const { currentUser } = useAuth();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // ... existing variables ...
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

  // ... (Keep existing effects and handlers: useEffect, handleOpenLead, handleCloseLead, handleCloseNewLead, handleOpenEmailModal, handleEmailSuccess, handleExportLeads, calculations, filter logic) ...
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
  
  // ... (Rest of handlers: address, radar, recording, drag drop) ...
  const maskCEP = (value: string) => value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => { const rawCep = e.target.value; const maskedCep = maskCEP(rawCep); setNewLeadForm(prev => ({ ...prev, cep: maskedCep })); if (maskedCep.length === 9) { setIsLoadingCep(true); const addressData = await fetchAddressByCEP(maskedCep); if (addressData) { const fullAddress = `${addressData.logradouro}, ${addressData.bairro}, ${addressData.localidade} - ${addressData.uf}`; const coords = await fetchCoordinates(fullAddress); setNewLeadForm(prev => ({ ...prev, address: fullAddress, latitude: coords?.lat || 0, longitude: coords?.lng || 0 })); setCepError(''); } else { setCepError('CEP não encontrado.'); } setIsLoadingCep(false); } else { setCepError(null); } };
  const handleNexusRadar = async () => { if (!newLeadForm.company) return; setIsEnriching(true); const enrichedData = await enrichCompanyData(newLeadForm.company, newLeadForm.website); if (enrichedData) { setNewLeadForm(prev => ({ ...prev, website: prev.website || enrichedData.website || '', productInterest: prev.productInterest || enrichedData.description })); addSystemNotification('Nexus Radar', `Dados enriquecidos para ${newLeadForm.company}`, 'success'); } setIsEnriching(false); };
  const handleCreateLead = (e: React.FormEvent) => { e.preventDefault(); const newLead: Lead = { id: `L-${Date.now()}`, name: newLeadForm.name, company: newLeadForm.company, email: newLeadForm.email, value: parseFloat(newLeadForm.value) || 0, status: LeadStatus.NEW, source: newLeadForm.source, probability: 20, createdAt: new Date().toISOString(), lastContact: new Date().toISOString(), phone: newLeadForm.phone, cep: newLeadForm.cep, address: newLeadForm.address, website: newLeadForm.website, parkingSpots: Number(newLeadForm.parkingSpots), productInterest: newLeadForm.productInterest, organizationId: currentUser.organizationId, metadata: newLeadForm.metadata }; addLead(currentUser, newLead); handleCloseNewLead(); };
  const startRecording = async () => { /* ... */ };
  const stopRecording = () => { /* ... */ };
  const handleAudioStop = async () => { /* ... */ };
  const handleDragStart = (e: React.DragEvent, leadId: string) => { setDraggedLeadId(leadId); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e: React.DragEvent, status: LeadStatus) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverColumn !== status) { setDragOverColumn(status); } };
  const handleDragLeave = (e: React.DragEvent) => { };
  const handleDrop = (e: React.DragEvent, targetStatus: LeadStatus) => { e.preventDefault(); setDragOverColumn(null); if (draggedLeadId) { const lead = leads.find(l => l.id === draggedLeadId); if (lead && lead.status !== targetStatus) { updateLeadStatus(currentUser, draggedLeadId, targetStatus); } setDraggedLeadId(null); } };
  const containerClass = tvMode ? "fixed inset-0 z-[100] bg-slate-900 p-4 overflow-hidden flex flex-col" : "p-4 md:p-8 flex flex-col h-full bg-slate-50 dark:bg-slate-900 transition-colors";

  return (
    <div className={containerClass}>
      {/* ... (Header, KPI, Kanban/List View, Footer) ... */}
      {!tvMode && (
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 shrink-0">
            {/* ... Header Content ... */}
            <div><h1 className="text-3xl font-bold text-slate-900 dark:text-white">Comercial / Pipeline</h1><p className="text-slate-500 dark:text-slate-400">Gestão de oportunidades com Lead Scoring Inteligente.</p></div>
            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button onClick={() => setShowCommissionCalc(!showCommissionCalc)} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition whitespace-nowrap ${showCommissionCalc ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}><Calculator size={18}/> Calculadora</button>
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700"><button onClick={() => setViewMode('kanban')} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`} title="Visualização Kanban"><Layout size={16}/> <span className="hidden sm:inline">Kanban</span></button><button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-2 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'}`} title="Visualização Lista"><List size={16}/> <span className="hidden sm:inline">Lista</span></button></div>
                {/* ... other buttons ... */}
                <button onClick={() => setIsNewLeadModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium whitespace-nowrap flex items-center justify-center gap-2"><UserPlus size={18}/> Novo Lead</button>
            </div>
          </div>
      )}
      
      {/* ... (Render Body based on viewMode) ... */}
      {viewMode === 'kanban' && (
          <div className="flex flex-1 gap-4 md:gap-6 overflow-x-auto pb-4 px-1 min-h-0 snap-x snap-mandatory md:snap-none">
            {stages.map((stage, idx) => (
                <div key={stage} onDragOver={(e) => handleDragOver(e, stage)} onDrop={(e) => handleDrop(e, stage)} className={`min-w-[280px] md:min-w-[300px] w-[85vw] md:w-auto snap-center rounded-xl p-3 md:p-4 flex flex-col border transition-colors duration-200 ${dragOverColumn === stage ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-500 border-dashed ring-2 ring-blue-100 dark:ring-blue-900' : tvMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                    <div className={`flex justify-between items-center mb-4 sticky top-0 pb-2 z-10 border-b border-slate-200/50 dark:border-slate-700/50 rounded-t-lg ${idx === 0 ? 'bg-transparent' : ''}`}><h3 className={`font-bold truncate pr-2 text-sm md:text-base ${tvMode ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`} title={stage}>{stage}</h3><span className="bg-white dark:bg-slate-700 px-2 py-1 rounded text-xs font-bold text-slate-500 dark:text-slate-400 shadow-sm">{filteredLeads.filter(l => l.status === stage).length}</span></div>
                    <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar max-h-[65vh] md:max-h-[60vh]">
                        {filteredLeads.filter(l => l.status === stage).map(lead => (
                            <div key={lead.id} draggable={!tvMode} onDragStart={(e) => handleDragStart(e, lead.id)} onClick={() => handleOpenLead(lead)} className={`bg-white dark:bg-slate-700 p-3 md:p-4 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all border border-slate-200 dark:border-slate-600 relative group ${draggedLeadId === lead.id ? 'opacity-50' : 'opacity-100'} ${tvMode ? 'border-slate-600' : ''}`}>
                                <div className="flex justify-between items-start mb-2"><div className="max-w-[70%]"><h4 className={`font-bold text-sm md:text-base leading-tight ${tvMode ? 'text-white' : 'text-slate-800 dark:text-white'}`}>{lead.name}</h4><p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{lead.company}</p></div><div className={`flex flex-col items-end ${tvMode ? 'text-white' : ''}`}><span className="font-bold text-sm">R$ {lead.value.toLocaleString(undefined, { notation: 'compact' })}</span><span className="text-[10px] text-slate-400">{lead.probability}%</span></div></div>
                                {!tvMode && (<div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-600 mt-2"><div className="flex items-center gap-2"><div className={`flex items-center gap-1 text-[10px] font-bold text-blue-500 bg-blue-50 dark:bg-slate-800 px-1.5 py-0.5 rounded`}><Activity size={10} /> 50</div></div><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={(e) => handleQuickWhatsApp(e, lead)} className="p-1.5 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded hover:bg-green-200 dark:hover:bg-green-900/50" title="WhatsApp Rápido"><MessageCircle size={14}/></button><button onClick={(e) => handleOpenEmailModal(e, lead)} className="p-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50" title="Email Rápido"><Mail size={14}/></button></div></div>)}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
          </div>
      )}
      {/* ... List View ... */}
      {viewMode === 'list' && (<div></div>)}

      {/* ... Footer ... */}
      <div className={`mt-auto pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0 ${tvMode ? 'text-slate-400 bg-slate-900 p-4 fixed bottom-0 left-0 right-0 z-[110] border-t-slate-800' : ''}`}><div className="text-xs font-medium flex items-center gap-4"><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-blue-500"></div> {filteredLeads.length} Oportunidades</span><span className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Total: R$ {pipelineTotal.toLocaleString()}</span></div><button onClick={() => setTvMode(!tvMode)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition text-xs uppercase tracking-wide shadow-sm ${tvMode ? 'bg-red-600 text-white hover:bg-red-700 border-red-500' : 'bg-slate-800 text-white hover:bg-slate-700 border-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600'}`}>{tvMode ? <Minimize size={16}/> : <MonitorPlay size={16}/>}{tvMode ? 'Sair do Modo TV' : 'Modo TV'}</button></div>

      {/* NEW LEAD MODAL */}
      {isNewLeadModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9000] p-4 backdrop-blur-sm animate-fade-in">
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                  {/* ... Header ... */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">Novo Lead</h2>
                      <button onClick={handleCloseNewLead} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"><X size={20}/></button>
                  </div>
                  
                  {/* Body with Custom Fields */}
                  <form onSubmit={handleCreateLead} className="p-6 space-y-4 overflow-y-auto">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Standard Fields */}
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.company} onChange={e => setNewLeadForm({...newLeadForm, company: e.target.value})} onBlur={handleNexusRadar}/></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome do Contato</label><input required type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.name} onChange={e => setNewLeadForm({...newLeadForm, name: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Email</label><input type="email" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.email} onChange={e => setNewLeadForm({...newLeadForm, email: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Telefone</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.phone} onChange={e => setNewLeadForm({...newLeadForm, phone: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Estimado</label><input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.value} onChange={e => setNewLeadForm({...newLeadForm, value: e.target.value})} /></div>
                          
                          {/* Address & Enrichment */}
                          <div className="col-span-1 md:col-span-2"><label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Endereço</label><input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white" value={newLeadForm.address} onChange={e => setNewLeadForm({...newLeadForm, address: e.target.value})} /></div>
                      </div>

                      {/* Custom Fields Section */}
                      <CustomFieldRenderer 
                          fields={customFields}
                          module="leads"
                          values={newLeadForm.metadata}
                          onChange={(key, value) => setNewLeadForm(prev => ({ ...prev, metadata: { ...prev.metadata, [key]: value } }))}
                          className="pt-4 border-t border-slate-100 dark:border-slate-700"
                      />

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

      {selectedLead && (<div></div>)}

      {/* WhatsApp Modal */}
      {showWhatsAppModal && selectedLead && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <MessageCircle size={20} className="text-green-600 dark:text-green-400"/> Enviar WhatsApp
                    </h2>
                    <button onClick={() => setShowWhatsAppModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Para: <strong>{selectedLead.name}</strong> ({selectedLead.phone})</p>
                    
                    {/* Bridge Toggle */}
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer" onClick={toggleBridgeWhatsApp}>
                        <div className="flex items-center gap-2">
                            <Server size={16} className={useBridgeWhatsApp ? 'text-green-600' : 'text-slate-400'}/>
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Usar Nexus Bridge (Automático)</span>
                        </div>
                        <div className={`w-10 h-5 rounded-full p-0.5 transition-colors ${useBridgeWhatsApp ? 'bg-green-500' : 'bg-slate-300'}`}>
                            <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${useBridgeWhatsApp ? 'translate-x-5' : 'translate-x-0'}`}></div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Mensagem</label>
                        <textarea 
                            className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 h-32 resize-none focus:ring-2 focus:ring-green-500 outline-none text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                            value={whatsAppMessage}
                            onChange={(e) => setWhatsAppMessage(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                        {whatsappTemplates.map((tmpl, idx) => (
                            <button 
                                key={idx}
                                onClick={() => {
                                    const text = tmpl.text.replace('[Nome]', selectedLead.name.split(' ')[0]).replace('[Empresa]', selectedLead.company);
                                    setWhatsAppMessage(text);
                                }}
                                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap border border-slate-200 dark:border-slate-600 transition"
                            >
                                {tmpl.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={() => setShowWhatsAppModal(false)} className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition">Cancelar</button>
                    <button 
                        onClick={handleSendWhatsApp} 
                        disabled={sendingWhatsApp}
                        className="px-6 py-2 rounded-lg bg-[#25D366] text-white font-bold hover:bg-[#128C7E] shadow-md transition flex items-center gap-2 disabled:opacity-70"
                    >
                        {sendingWhatsApp ? <Loader2 className="animate-spin" size={16}/> : <Send size={16}/>}
                        {sendingWhatsApp ? 'Enviando...' : 'Enviar'}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Email Modal */}
      {isEmailModalOpen && emailLead && (
          <SendEmailModal 
              lead={emailLead} 
              onClose={() => setIsEmailModalOpen(false)} 
              onSuccess={handleEmailSuccess}
          />
      )}
    </div>
  );
};
