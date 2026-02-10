
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal, Lead, Client, ProposalItem, Product, Project, TechnicalSpecs } from '../types';
import { 
    Plus, Search, FileText, Edit2, Trash2, X, Save, 
    ArrowLeft, Send, Eye, Loader2, CheckCircle, 
    Package, DollarSign, RefreshCw, User, Building2, ChevronDown, Target, AlertTriangle, Lock, Unlock, Sparkles, Zap, Wrench, Monitor, Cpu, Box, Layout, ClipboardCheck, Check
} from 'lucide-react';
import { ProposalDocument } from '../components/ProposalDocument';
import { SectionTitle, Badge } from '../components/Widgets';

const DEFAULT_INTRO = "A SOFTPARK apresenta a presente Proposta Técnica e Comercial para fornecimento de soluções de automação de entrada e saída de veículos por meio de reconhecimento automático de placas (LPR).";
const DEFAULT_TERMS = "1. VALIDADE: 20 dias corridos.\n2. INSTALAÇÃO: Até 45 dias após aceite formal.\n3. GARANTIA: 12 meses.";

export const Proposals: React.FC = () => {
    const { 
        proposals, leads, clients, products, 
        addProposal, updateProposal, removeProposal, 
        addProject, addSystemNotification 
    } = useData();
    const { currentUser } = useAuth();
    
    const [view, setView] = useState<'list' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isEditLocked, setIsEditLocked] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        leadId: '', clientId: '', clientEmail: '', title: '', clientName: '', companyName: '', 
        unit: '', groupName: '', setupCost: 0, monthlyCost: 0, timeline: '45 dias',
        introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, customClause: '',
        scope: [] as string[], items: [] as ProposalItem[], includesDevelopment: false,
        status: 'Draft' as any,
        createdDate: new Date().toISOString(),
        technicalSpecs: {
            gabinetes: [],
            servidorCaixa: []
        } as TechnicalSpecs
    });

    useEffect(() => {
        const prefill = localStorage.getItem('nexus_pending_proposal_conversion');
        if (prefill) {
            try {
                const data = JSON.parse(prefill);
                const isLead = data.targetType === 'lead';
                
                const suggestedItems: ProposalItem[] = (data.items || []).map((name: string) => {
                    const prod = products.find(p => p.name === name);
                    return prod ? { 
                        id: prod.id, name: prod.name, price: prod.price, quantity: 1, discount: 0, category: prod.category 
                    } : null;
                }).filter(Boolean);

                setFormData(prev => ({
                    ...prev,
                    leadId: isLead ? data.targetId : '',
                    clientId: !isLead ? data.targetId : '',
                    companyName: data.targetName,
                    title: data.title,
                    scope: data.scope || [],
                    items: suggestedItems,
                    status: 'Draft'
                }));
                setTargetSearch(data.targetName);
                setView('create');
                localStorage.removeItem('nexus_pending_proposal_conversion');
                addSystemNotification("Comercial", "Dados da vistoria importados com sucesso.", "success");
            } catch(e) { console.error("Prefill Error", e); }
        }
    }, [products, addSystemNotification]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsTargetDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatCurrency = (value: any) => {
        const num = Number(value) || 0;
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(num);
    };

    const getItemSubtotal = (item: ProposalItem) => {
        const base = (Number(item.price) || 0) * (Number(item.quantity) || 1);
        const disc = Number(item.discount) || 0;
        return base * (1 - disc / 100);
    };

    const finalSetupInvestment = useMemo(() => {
        const equipmentTotal = (formData.items || [])
            .filter(item => item.category === 'Product')
            .reduce((acc, item) => acc + getItemSubtotal(item), 0);
        return (Number(formData.setupCost) || 0) + equipmentTotal;
    }, [formData.items, formData.setupCost]);

    const finalMonthlyRecurrence = useMemo(() => {
        const servicesTotal = (formData.items || [])
            .filter(item => item.category !== 'Product')
            .reduce((acc, item) => acc + getItemSubtotal(item), 0);
        return (Number(formData.monthlyCost) || 0) + servicesTotal;
    }, [formData.items, formData.monthlyCost]);

    const filteredTargets = useMemo(() => {
        const query = (targetSearch || '').toLowerCase();
        const leadResults = leads
            .filter(l => (l.company || '').toLowerCase().includes(query) || (l.name || '').toLowerCase().includes(query))
            .map(l => ({ id: l.id, name: l.name, company: l.company, type: 'lead' as const, email: l.email }));
        
        const clientResults = clients
            .filter(c => (c.name || '').toLowerCase().includes(query) || (c.contactPerson || '').toLowerCase().includes(query))
            .map(c => ({ id: c.id, name: c.contactPerson, company: c.name, type: 'client' as const, email: c.email, unit: c.unit, groupName: c.groupName }));

        return [...leadResults, ...clientResults];
    }, [leads, clients, targetSearch]);

    const handleSelectTarget = (target: any) => {
        setTargetSearch(target.company || '');
        setFormData(prev => ({
            ...prev,
            leadId: target.type === 'lead' ? target.id : '',
            clientId: target.type === 'client' ? target.id : '',
            clientEmail: target.email || '',
            clientName: target.name || '',
            companyName: target.company || '',
            unit: target.unit || '',
            groupName: (target.groupName || '').toUpperCase()
        }));
        setIsTargetDropdownOpen(false);
    };

    const handleSave = async (isExpressActivation: boolean = false) => {
        if (!formData.title.trim() || !formData.companyName.trim()) {
            addSystemNotification("Campos Obrigatórios", "Defina um título e selecione um cliente.", "warning");
            return;
        }

        setIsSaving(true);
        const proposalStatus = isExpressActivation ? 'Accepted' : formData.status;

        const proposalData: Proposal = {
            ...formData,
            id: editingId || `PC-${Date.now()}`,
            price: Number(finalSetupInvestment), 
            monthlyCost: Number(finalMonthlyRecurrence),
            setupCost: Number(formData.setupCost),
            status: proposalStatus,
            organizationId: currentUser?.organizationId || 'org-1',
            signedAt: isExpressActivation ? new Date().toISOString() : undefined,
            signedByIp: isExpressActivation ? 'Express Activation' : undefined,
            technicalSpecs: formData.technicalSpecs
        } as any;

        try {
            if (editingId) await updateProposal(currentUser, proposalData);
            else await addProposal(currentUser, proposalData);
            
            if (isExpressActivation) {
                const scopeItems = formData.scope.length > 0 ? formData.scope : ["Instalação Padrão", "Configuração LPR"];
                const newProject: Project = {
                    id: `PROJ-EXP-${Date.now()}`,
                    title: `${formData.title} (Ativação Expressa)`,
                    clientName: formData.companyName,
                    status: 'Kitting',
                    progress: 20,
                    startDate: new Date().toISOString(),
                    deadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                    manager: currentUser.name,
                    description: `Projeto gerado via fluxo expresso. Baseado na proposta ${proposalData.id}.`,
                    products: formData.items.map(i => i.name),
                    tasks: scopeItems.map((s, idx) => ({ id: `t-${idx}-${Date.now()}`, title: s, status: 'Pending' })),
                    organizationId: currentUser.organizationId,
                    archived: false,
                    technicalSpecs: formData.technicalSpecs
                };
                await addProject(currentUser, newProject);
                addSystemNotification("Homologação", "Proposta Aceita e Projeto criado em Produção!", "success");
            } else {
                addSystemNotification("Sucesso", "Proposta salva.", "success");
            }
            
            setView('list');
            setEditingId(null);
        } catch (e) { 
            console.error("Save Error:", e);
            addSystemNotification("Erro", "Falha ao processar operação.", "alert");
        } finally { 
            setIsSaving(false); 
        }
    };

    const handleOpenEdit = (prop: Proposal) => {
        const isDraft = prop.status === 'Draft';
        setEditingId(prop.id);
        setTargetSearch(prop.companyName || '');
        setFormData({
            ...prop,
            setupCost: Number(prop.setupCost) || 0,
            monthlyCost: Number(prop.monthlyCost) || 0,
            items: Array.isArray(prop.items) ? prop.items : [],
            scope: Array.isArray(prop.scope) ? prop.scope : [],
            status: prop.status || 'Draft',
            technicalSpecs: prop.technicalSpecs || { gabinetes: [], servidorCaixa: [] }
        } as any);
        
        setIsEditLocked(!isDraft);
        setView('create');
    };

    const handleNewProposal = () => {
        setEditingId(null); 
        setTargetSearch(''); 
        setIsEditLocked(false);
        setFormData({
            leadId: '', clientId: '', clientEmail: '', title: '', clientName: '', companyName: '', 
            unit: '', groupName: '', setupCost: 0, monthlyCost: 0, timeline: '45 dias',
            introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, customClause: '',
            scope: [], items: [], includesDevelopment: false, status: 'Draft',
            createdDate: new Date().toISOString(),
            technicalSpecs: { gabinetes: [], servidorCaixa: [] }
        });
        setView('create'); 
    };

    const updateTechSpec = (field: keyof TechnicalSpecs, value: any) => {
        setFormData(prev => ({
            ...prev,
            technicalSpecs: { ...prev.technicalSpecs, [field]: value }
        }));
    };

    const toggleMultiSelectSpec = (field: 'gabinetes' | 'servidorCaixa', value: string) => {
        const current = Array.isArray(formData.technicalSpecs[field]) ? formData.technicalSpecs[field] as string[] : [];
        if (current.includes(value)) {
            updateTechSpec(field, current.filter(v => v !== value));
        } else {
            updateTechSpec(field, [...current, value]);
        }
    };

    const filteredProposals = useMemo(() => {
        const query = (searchTerm || '').toLowerCase();
        return proposals.filter(p => 
            (p.title || '').toLowerCase().includes(query) || 
            (p.companyName || '').toLowerCase().includes(query)
        ).sort((a,b) => new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime());
    }, [proposals, searchTerm]);

    return (
        <div className="p-0 h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden font-sans">
            {view === 'list' ? (
                <div className="p-6 md:p-8 flex flex-col flex-1 h-full animate-fade-in">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Propostas</h1>
                            <p className="text-slate-500 font-medium">Gestão de orçamentos e contratos.</p>
                        </div>
                        <button onClick={handleNewProposal} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                            <Plus size={18}/> Nova Proposta
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input type="text" placeholder="Buscar por título ou cliente..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-6">Proposta / Cliente</th>
                                        <th className="p-6 text-right">CAPEX (Setup)</th>
                                        <th className="p-6 text-right">OPEX (Mensal)</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProposals.map(prop => (
                                        <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group" onClick={() => handleOpenEdit(prop)}>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{prop.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black mt-1">{prop.companyName}</p>
                                            </td>
                                            <td className="p-6 text-right font-mono font-black text-emerald-600">{formatCurrency(prop.price)}</td>
                                            <td className="p-6 text-right font-mono font-black text-indigo-600">{formatCurrency(prop.monthlyCost)}</td>
                                            <td className="p-6 text-center">
                                                <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Sent' ? 'purple' : 'blue'}>
                                                    {String(prop.status || 'DRAFT').toUpperCase()}
                                                </Badge>
                                            </td>
                                            <td className="p-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(prop); }} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><Edit2 size={16}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Deseja realmente excluir esta proposta?")) removeProposal(currentUser, prop.id, "Manual"); }} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex h-screen overflow-hidden bg-slate-200 dark:bg-slate-950">
                    <div className="w-[480px] bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex flex-col shrink-0 shadow-2xl z-20 animate-slide-in-left">
                        <div className="p-6 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition"><ArrowLeft size={20}/></button>
                                <h2 className="font-black text-xl uppercase tracking-tighter">Editor</h2>
                            </div>
                            <div className="flex gap-2">
                                {isEditLocked ? (
                                    <button onClick={() => setIsEditLocked(false)} className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg hover:bg-amber-600 transition">
                                        <Unlock size={14}/> Desbloquear
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => handleSave(false)} disabled={isSaving} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition" title="Salvar Rascunho">
                                            {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                        </button>
                                        <button onClick={() => handleSave(true)} disabled={isSaving} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-indigo-700 flex items-center gap-2" title="Ativar Proposta e Criar Projeto">
                                            {isSaving ? <Loader2 size={16} className="animate-spin"/> : <Zap size={16} fill="currentColor" className="text-amber-300"/>}
                                            Ativar Agora
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={`flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar transition-opacity ${isEditLocked ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                            
                            <div className="space-y-4">
                                <SectionTitle title="Informações Gerais" />
                                <div className="relative" ref={dropdownRef}>
                                    <input 
                                        type="text"
                                        className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl pl-4 pr-10 py-4 font-bold bg-transparent outline-none focus:border-indigo-600"
                                        placeholder="Lead ou Cliente..."
                                        value={targetSearch}
                                        onChange={(e) => { setTargetSearch(e.target.value); setIsTargetDropdownOpen(true); }}
                                        onFocus={() => setIsTargetDropdownOpen(true)}
                                    />
                                    {isTargetDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto">
                                            {filteredTargets.map(t => (
                                                <div key={`${t.type}-${t.id}`} onClick={() => handleSelectTarget(t)} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between border-b last:border-0">
                                                    <div><p className="font-bold text-sm">{t.company}</p><p className="text-[10px] text-slate-500">{t.name}</p></div>
                                                    <Badge color={t.type === 'lead' ? 'yellow' : 'blue'}>{String(t.type).toUpperCase()}</Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <input type="text" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" placeholder="Título da Proposta" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>

                            {/* --- CHECKLIST DE PRODUÇÃO / KITTING (ORIGINAL DA PLANILHA) --- */}
                            <div className="space-y-6 bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-900/30">
                                <SectionTitle title="Configuração de Produção" subtitle="Itens para separação de material" />
                                
                                <div className="space-y-6">
                                    {/* Gabinetes - MÚLTIPLA SELEÇÃO */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 flex items-center gap-2"><Box size={12}/> Gabinetes (Multi-seleção)</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {["TOTEN SAÍDA - FIT", "TOTEN ENTRADA - FIT", "TOTEN SAÍDA - STANDARD", "TOTEN ENTRADA - STANDARD", 'ATM 24"', 'ATM 32"'].map(opt => (
                                                <button 
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => toggleMultiSelectSpec('gabinetes', opt)}
                                                    className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition flex items-center justify-between ${formData.technicalSpecs?.gabinetes?.includes(opt) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                                >
                                                    {opt}
                                                    {formData.technicalSpecs?.gabinetes?.includes(opt) && <Check size={14}/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Servidor / Caixa - MÚLTIPLA SELEÇÃO */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 flex items-center gap-2"><Cpu size={12}/> Servidor / Caixa (Multi-seleção)</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {["SERVIDOR", "CAIXA", "CAIXA/SERVIDOR"].map(opt => (
                                                <button 
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => toggleMultiSelectSpec('servidorCaixa', opt)}
                                                    className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition flex items-center justify-between ${formData.technicalSpecs?.servidorCaixa?.includes(opt) ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                                >
                                                    {opt}
                                                    {formData.technicalSpecs?.servidorCaixa?.includes(opt) && <Check size={14}/>}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Câmera */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 flex items-center gap-2"><Monitor size={12}/> Câmera</label>
                                        <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900 outline-none focus:border-indigo-500" value={formData.technicalSpecs?.camera || ''} onChange={e => updateTechSpec('camera', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            <option value="ALPHADIGI - POSTE">ALPHADIGI - POSTE</option>
                                            <option value="ALPHADIGI - PAREDE">ALPHADIGI - PAREDE</option>
                                            <option value="MILESIGHT">MILESIGHT</option>
                                        </select>
                                    </div>

                                    {/* Nobreak */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Nobreak</label>
                                            <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.nobreak || ''} onChange={e => updateTechSpec('nobreak', e.target.value)}>
                                                <option value="NÃO">NÃO</option>
                                                <option value="SIM">SIM</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Qtd Nobreak</label>
                                            <input type="text" className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.nobreakQty || ''} onChange={e => updateTechSpec('nobreakQty', e.target.value)} placeholder="0" />
                                        </div>
                                    </div>

                                    {/* Face ID */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Face ID</label>
                                        <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.faceId || ''} onChange={e => updateTechSpec('faceId', e.target.value)}>
                                            <option value="NÃO">NÃO</option>
                                            <option value="SIM">SIM</option>
                                        </select>
                                    </div>

                                    {/* Ilha */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Ilha</label>
                                        <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.ilha || ''} onChange={e => updateTechSpec('ilha', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            <option value="COM BASE">COM BASE</option>
                                            <option value="SEM BASE">SEM BASE</option>
                                            <option value="ILHA NOVA">ILHA NOVA</option>
                                            <option value="ILHA ANTIGA(RETRO FIT)">ILHA ANTIGA (RETRO FIT)</option>
                                        </select>
                                    </div>

                                    {/* Cancela */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Cancela</label>
                                            <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.cancela || ''} onChange={e => updateTechSpec('cancela', e.target.value)}>
                                                <option value="NÃO">NÃO</option>
                                                <option value="SIM">SIM</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Qtd Cancela</label>
                                            <input type="text" className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.cancelaQty || ''} onChange={e => updateTechSpec('cancelaQty', e.target.value)} placeholder="0" />
                                        </div>
                                    </div>

                                    {/* Braço */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Braço</label>
                                            <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.braco || ''} onChange={e => updateTechSpec('braco', e.target.value)}>
                                                <option value="NÃO">NÃO</option>
                                                <option value="SIM">SIM (PADRÃO)</option>
                                                <option value="ARTICULADO">ARTICULADO</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Tamanho Braço</label>
                                            <input type="text" className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.bracoTamanho || ''} onChange={e => updateTechSpec('bracoTamanho', e.target.value)} placeholder="Ex: 3m" />
                                        </div>
                                    </div>

                                    {/* Modelo Automação */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1 flex items-center gap-2"><Layout size={12}/> Modelo Automação</label>
                                        <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.modeloAutomacao || ''} onChange={e => updateTechSpec('modeloAutomacao', e.target.value)}>
                                            <option value="">Selecione...</option>
                                            <option value="ENTRADA ASSISTIDA">ENTRADA ASSISTIDA</option>
                                            <option value="SAÍDA ASSISTIDA">SAÍDA ASSISTIDA</option>
                                            <option value="ENTRADA CONVENCIONAL">ENTRADA CONVENCIONAL</option>
                                            <option value="SAÍDA CONVENCIONAL">SAÍDA CONVENCIONAL</option>
                                        </select>
                                    </div>

                                    {/* Foto Célula */}
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Foto Célula</label>
                                        <select className="w-full border-2 border-white dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-white dark:bg-slate-900" value={formData.technicalSpecs?.fotoCelula || ''} onChange={e => updateTechSpec('fotoCelula', e.target.value)}>
                                            <option value="NÃO">NÃO</option>
                                            <option value="SIM">SIM</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <SectionTitle title="Investimento" />
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Setup (CAPEX)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">R$</span>
                                            <input type="number" className="w-full pl-8 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 font-bold bg-slate-50 dark:bg-slate-900" value={formData.setupCost} onChange={e => setFormData({...formData, setupCost: parseFloat(e.target.value) || 0})} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-slate-400 uppercase mb-1 ml-1">Mensal (OPEX)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">R$</span>
                                            <input type="number" className="w-full pl-8 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 font-bold bg-slate-50 dark:bg-slate-900" value={formData.monthlyCost} onChange={e => setFormData({...formData, monthlyCost: parseFloat(e.target.value) || 0})} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 pb-20">
                                <SectionTitle title="Itens do Catálogo" />
                                <div className="flex gap-2">
                                    <select className="flex-1 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-transparent" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                                        <option value="">Selecionar do Catálogo...</option>
                                        {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <button onClick={() => {
                                        const p = products.find(prod => prod.id === selectedProductId);
                                        if(p) setFormData(prev => ({...prev, items: [...prev.items, {id: p.id, name: p.name, price: Number(p.price), quantity: 1, discount: 0, category: p.category}]}));
                                        setSelectedProductId('');
                                    }} className="bg-indigo-600 text-white p-3 rounded-xl"><Plus size={20}/></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex justify-center bg-slate-200 dark:bg-slate-950">
                        <div className="transform origin-top scale-[0.85] lg:scale-100 w-[210mm] pointer-events-none rounded-lg shadow-2xl mb-20">
                            <ProposalDocument data={{
                                ...formData,
                                id: editingId || 'EM GERAÇÃO',
                                price: Number(finalSetupInvestment),
                                monthlyCost: Number(finalMonthlyRecurrence),
                                createdDate: formData.createdDate,
                                validUntil: new Date(new Date(formData.createdDate).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString()
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
