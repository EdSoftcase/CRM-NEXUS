
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal, Lead, Client, ProposalItem, Product } from '../types';
import { 
    Plus, Search, FileText, Edit2, Trash2, X, Save, 
    ArrowLeft, Send, Eye, Loader2, EyeOff, CheckCircle, 
    ChevronRight, Package, DollarSign, RefreshCw, User, Building2, ChevronDown, Target, ListChecks, AlertTriangle
} from 'lucide-react';
import { ProposalDocument } from '../components/ProposalDocument';
import { SectionTitle, Badge } from '../components/Widgets';

const DEFAULT_INTRO = "A SOFTPARK apresenta a presente Proposta Técnica e Comercial para fornecimento de soluções de automação de entrada e saída de veículos por meio de reconhecimento automático de placas (LPR).";
const DEFAULT_TERMS = "1. VALIDADE: 20 dias corridos.\n2. INSTALAÇÃO: Até 45 dias após aceite formal.\n3. GARANTIA: 12 meses.";

export const Proposals: React.FC = () => {
    const { 
        proposals, leads, clients, products, 
        addProposal, updateProposal, removeProposal, 
        addSystemNotification
    } = useData();
    const { currentUser } = useAuth();
    
    const [view, setView] = useState<'list' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [targetSearch, setTargetSearch] = useState('');
    const [isTargetDropdownOpen, setIsTargetDropdownOpen] = useState(false);
    const [targetType, setTargetType] = useState<'lead' | 'client'>('lead');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [newScopeItem, setNewScopeItem] = useState('');

    const dropdownRef = useRef<HTMLDivElement>(null);

    const [formData, setFormData] = useState({
        leadId: '', clientId: '', clientEmail: '', title: '', clientName: '', companyName: '', 
        unit: '', groupName: '', setupCost: 0, monthlyCost: 0, timeline: '45 dias',
        introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, customClause: '',
        scope: [] as string[], items: [] as ProposalItem[], includesDevelopment: false
    });

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsTargetDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const getItemSubtotal = (item: ProposalItem) => {
        const base = (item.price || 0) * (item.quantity || 1);
        const disc = item.discount || 0;
        return base * (1 - disc / 100);
    };

    const finalSetupInvestment = useMemo(() => {
        const equipment = formData.items.filter(item => item.category === 'Product').reduce((acc, item) => acc + getItemSubtotal(item), 0);
        return equipment + Number(formData.setupCost || 0);
    }, [formData.items, formData.setupCost]);

    const finalMonthlyRecurrence = useMemo(() => {
        const services = formData.items.filter(item => item.category !== 'Product').reduce((acc, item) => acc + getItemSubtotal(item), 0);
        return services + Number(formData.monthlyCost || 0);
    }, [formData.items, formData.monthlyCost]);

    const filteredTargets = useMemo(() => {
        const query = targetSearch.toLowerCase();
        const leadResults = leads
            .filter(l => l.company.toLowerCase().includes(query) || l.name.toLowerCase().includes(query))
            .map(l => ({ id: l.id, name: l.name, company: l.company, type: 'lead' as const, email: l.email }));
        
        const clientResults = clients
            .filter(c => c.name.toLowerCase().includes(query) || c.contactPerson.toLowerCase().includes(query))
            .map(c => ({ id: c.id, name: c.contactPerson, company: c.name, type: 'client' as const, email: c.email, unit: c.unit, groupName: c.groupName }));

        return [...leadResults, ...clientResults];
    }, [leads, clients, targetSearch]);

    const handleSelectTarget = (target: any) => {
        setTargetType(target.type);
        setTargetSearch(target.company);
        if (target.type === 'lead') {
            setFormData(prev => ({
                ...prev, leadId: target.id, clientId: '', clientEmail: target.email || '', clientName: target.name || '', companyName: target.company || '', groupName: '',
            }));
        } else {
            setFormData(prev => ({
                ...prev, clientId: target.id, leadId: '', clientEmail: target.email || '', clientName: target.name || '', companyName: target.company || '', unit: target.unit || '', groupName: (target.groupName || '').toUpperCase()
            }));
        }
        setIsTargetDropdownOpen(false);
    };

    const handleAddScope = () => {
        if (newScopeItem.trim()) {
            setFormData(prev => ({ ...prev, scope: [...prev.scope, newScopeItem.trim()] }));
            setNewScopeItem('');
        }
    };

    const handleRemoveScope = (index: number) => {
        setFormData(prev => ({ ...prev, scope: prev.scope.filter((_, i) => i !== index) }));
    };

    const handleSave = async (shouldSend: boolean = false) => {
        // VALIDAÇÃO REFORÇADA
        if (!formData.title.trim()) {
            addSystemNotification("Campo Obrigatório", "Por favor, defina um título para a proposta.", "warning");
            return;
        }
        if (!formData.companyName.trim()) {
            addSystemNotification("Alvo não selecionado", "Você precisa vincular a proposta a um Lead ou Unidade.", "warning");
            return;
        }
        if (formData.items.length === 0) {
            addSystemNotification("Proposta sem itens", "Adicione ao menos um Equipamento ou Serviço ao orçamento.", "warning");
            return;
        }

        setIsSaving(true);
        
        let finalGroupName = formData.groupName;
        if (!finalGroupName) {
            const matchedClient = clients.find(c => c.name.trim().toUpperCase() === formData.companyName.trim().toUpperCase());
            if (matchedClient) finalGroupName = (matchedClient.groupName || '').toUpperCase();
        }

        const proposalData: any = {
            id: editingId || `PC-${Date.now()}`,
            title: formData.title,
            leadId: targetType === 'lead' ? formData.leadId : undefined,
            clientId: targetType === 'client' ? formData.clientId : undefined,
            clientEmail: formData.clientEmail,
            clientName: formData.clientName,
            companyName: formData.companyName,
            groupName: finalGroupName.trim().toUpperCase(),
            unit: formData.unit,
            items: formData.items,
            customClause: formData.customClause,
            price: finalSetupInvestment, 
            monthlyCost: finalMonthlyRecurrence,
            setupCost: Number(formData.setupCost), 
            includesDevelopment: formData.includesDevelopment,
            createdDate: editingId ? (proposals.find(p => p.id === editingId)?.createdDate || new Date().toISOString()) : new Date().toISOString(),
            validUntil: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(),
            status: shouldSend ? 'Sent' : (editingId ? (proposals.find(p => p.id === editingId)?.status || 'Draft') : 'Draft'),
            introduction: formData.introduction,
            scope: formData.scope,
            timeline: formData.timeline,
            terms: formData.terms,
            organizationId: currentUser?.organizationId || 'org-1'
        };

        try {
            if (editingId) {
                await updateProposal(currentUser, proposalData);
            } else {
                await addProposal(currentUser, proposalData);
            }
            addSystemNotification("Sucesso", "Proposta salva e sincronizada.", "success");
            setView('list');
            setEditingId(null);
        } catch (e: any) { 
            console.error("Erro ao salvar proposta:", e);
            addSystemNotification("Falha", e.message || "Erro de sincronização.", "alert");
        } finally { 
            setIsSaving(false); 
        }
    };

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (p.companyName && p.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    }, [proposals, searchTerm]);

    return (
        <div className="p-0 h-full flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors overflow-hidden font-sans">
            {view === 'list' ? (
                <div className="p-6 md:p-8 flex flex-col flex-1 h-full">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Propostas</h1>
                            <p className="text-slate-500 font-medium">Orçamentos e conversão comercial.</p>
                        </div>
                        <button onClick={() => { 
                            setEditingId(null); 
                            setTargetSearch(''); 
                            setFormData({
                                leadId: '', clientId: '', clientEmail: '', title: '', clientName: '', companyName: '', 
                                unit: '', groupName: '', setupCost: 0, monthlyCost: 0, timeline: '45 dias',
                                introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, customClause: '',
                                scope: [], items: [], includesDevelopment: false
                            });
                            setView('create'); 
                        }} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 flex items-center gap-2">
                            <Plus size={18}/> Gerar Proposta
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b flex items-center gap-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input type="text" placeholder="Buscar proposta pelo título ou empresa..." className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-slate-800 text-sm outline-none border border-transparent focus:border-indigo-500 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-black uppercase text-slate-400 sticky top-0 z-10">
                                    <tr>
                                        <th className="p-6">Proposta / Cliente</th>
                                        <th className="p-6 text-right">Setup (Capex)</th>
                                        <th className="p-6 text-right">Mensal (Opex)</th>
                                        <th className="p-6 text-center">Status</th>
                                        <th className="p-6 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProposals.map(prop => (
                                        <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition cursor-pointer group" onClick={() => { 
                                            setEditingId(prop.id); 
                                            setTargetSearch(prop.companyName || ''); 
                                            setFormData({...prop, setupCost: prop.setupCost || 0, monthlyCost: prop.monthlyCost || 0, scope: prop.scope || [], items: prop.items || []} as any); 
                                            setView('create'); 
                                        }}>
                                            <td className="p-6">
                                                <p className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-lg">{prop.title}</p>
                                                <p className="text-[10px] text-slate-400 uppercase font-black mt-1 flex items-center gap-2">
                                                    {prop.companyName} {prop.status === 'Sent' && <span className="flex items-center gap-1 text-indigo-500 animate-pulse"><Eye size={12}/> Visualizado</span>}
                                                </p>
                                            </td>
                                            <td className="p-6 text-right font-mono font-black text-emerald-600">{formatCurrency(prop.price || 0)}</td>
                                            <td className="p-6 text-right font-mono font-black text-indigo-600">{formatCurrency(prop.monthlyCost || 0)}</td>
                                            <td className="p-6 text-center"><Badge color={prop.status === 'Accepted' ? 'green' : 'blue'}>{prop.status.toUpperCase()}</Badge></td>
                                            <td className="p-6 text-right">
                                                <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) removeProposal(currentUser, prop.id, "Manual"); }} className="p-3 text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
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
                    {/* ESQUERDA: EDITOR */}
                    <div className="w-[450px] bg-white dark:bg-slate-900 border-r border-slate-300 dark:border-slate-800 flex flex-col shrink-0 shadow-2xl z-20">
                        <div className="p-6 border-b flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setView('list')} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500 transition"><ArrowLeft size={20}/></button>
                                <h2 className="font-black text-xl uppercase tracking-tighter">Editor</h2>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleSave(false)} disabled={isSaving} className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 transition">
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                </button>
                                <button onClick={() => handleSave(true)} title="Salvar e Enviar para o Portal" disabled={isSaving} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 shadow-lg">
                                    <Send size={18}/>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            <div className="space-y-4">
                                <SectionTitle title="Identificação do Alvo" />
                                
                                <div className="relative" ref={dropdownRef}>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 ml-1">Pesquisar Lead ou Unidade</label>
                                    <div className="relative">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <Search size={18} />
                                        </div>
                                        <input 
                                            type="text"
                                            className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl pl-11 pr-10 py-4 font-bold bg-transparent outline-none focus:border-indigo-600 transition-all"
                                            placeholder="Digite o nome para buscar..."
                                            value={targetSearch}
                                            onChange={(e) => {
                                                setTargetSearch(e.target.value);
                                                setIsTargetDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsTargetDropdownOpen(true)}
                                        />
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            <ChevronDown size={18} className={`transition-transform ${isTargetDropdownOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>

                                    {isTargetDropdownOpen && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-[100] max-h-64 overflow-y-auto custom-scrollbar animate-fade-in">
                                            {filteredTargets.length > 0 ? (
                                                filteredTargets.map((target) => (
                                                    <div 
                                                        key={`${target.type}-${target.id}`}
                                                        onClick={() => handleSelectTarget(target)}
                                                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer flex items-center justify-between border-b border-slate-50 dark:border-slate-700 last:border-0 group"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`p-2 rounded-lg ${target.type === 'lead' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                                                                {target.type === 'lead' ? <Target size={16}/> : <Building2 size={16}/>}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-slate-900 dark:text-white text-sm">{target.company}</p>
                                                                <p className="text-[10px] font-medium text-slate-500 uppercase flex items-center gap-1">
                                                                    <User size={10}/> {target.name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Badge color={target.type === 'lead' ? 'yellow' : 'blue'}>
                                                            {target.type === 'lead' ? 'LEAD' : 'UNID'}
                                                        </Badge>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-8 text-center text-slate-400">
                                                    <p className="text-xs font-bold uppercase tracking-widest">Nenhum resultado encontrado</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <input type="text" className="w-full border-2 border-slate-100 dark:border-slate-800 rounded-xl p-4 font-bold bg-transparent outline-none focus:border-indigo-600" placeholder="Título da Proposta (ex: Projeto LPR V1)" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                            </div>

                            <div className="space-y-4">
                                <SectionTitle title="Escopo do Projeto" />
                                <div className="flex gap-2">
                                    <input 
                                        type="text" 
                                        className="flex-1 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-transparent outline-none focus:border-indigo-600"
                                        placeholder="Descreva um item do escopo..."
                                        value={newScopeItem}
                                        onChange={e => setNewScopeItem(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddScope()}
                                    />
                                    <button onClick={handleAddScope} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition">
                                        <Plus size={20}/>
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.scope.map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 group">
                                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                <CheckCircle size={14} className="text-indigo-500" /> {item}
                                            </span>
                                            <button onClick={() => handleRemoveScope(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                                <Trash2 size={14}/>
                                            </button>
                                        </div>
                                    ))}
                                    {formData.scope.length === 0 && <p className="text-[10px] text-slate-400 italic text-center py-2">Nenhum item de escopo adicionado.</p>}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <SectionTitle title="Equipamentos & Serviços" />
                                <div className="flex gap-2">
                                    <select className="flex-1 border-2 border-slate-100 dark:border-slate-800 rounded-xl p-3 text-xs font-bold bg-transparent outline-none" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                                        <option value="">Adicionar Item do Catálogo...</option>
                                        {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>[{p.category === 'Product' ? 'Equip' : 'Serv'}] {p.name}</option>)}
                                    </select>
                                    <button onClick={() => {
                                        const p = products.find(prod => prod.id === selectedProductId);
                                        if(p) setFormData(prev => ({...prev, items: [...prev.items, {id: p.id, name: p.name, price: p.price, quantity: 1, discount: 0, category: p.category}]}));
                                        setSelectedProductId('');
                                    }} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/20"><Plus size={20}/></button>
                                </div>
                                <div className="space-y-2">
                                    {formData.items.map((item, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-3 group relative">
                                            <div className="flex justify-between font-black text-[10px] uppercase">
                                                <span className="truncate pr-4">{item.name}</span>
                                                <button onClick={() => setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== idx)}))} className="text-slate-300 hover:text-red-500 transition-colors"><X size={16}/></button>
                                            </div>
                                            <div className="grid grid-cols-3 gap-2">
                                                <div>
                                                    <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Qtd</label>
                                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-lg p-2 text-xs font-bold" value={item.quantity} onChange={e => {const n=[...formData.items]; n[idx].quantity=parseInt(e.target.value)||1; setFormData({...formData, items:n});}} />
                                                </div>
                                                <div>
                                                    <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Desc %</label>
                                                    <input type="number" className="w-full bg-white dark:bg-slate-800 border rounded-lg p-2 text-xs font-bold text-indigo-600" value={item.discount} onChange={e => {const n=[...formData.items]; n[idx].discount=parseFloat(e.target.value)||0; setFormData({...formData, items:n});}} />
                                                </div>
                                                <div className="text-right flex flex-col justify-end">
                                                    <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Total</label>
                                                    <div className="text-[10px] font-black text-slate-900 dark:text-white py-2">{formatCurrency(getItemSubtotal(item))}</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {formData.items.length === 0 && (
                                    <div className="p-6 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center gap-2">
                                        <AlertTriangle size={24} className="text-amber-500 opacity-50"/>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center leading-tight">Você deve adicionar itens para<br/>poder salvar o orçamento.</p>
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2 flex items-center gap-1"><DollarSign size={10}/> Ajuste Capex</p>
                                    <input type="number" className="w-full bg-transparent border-none text-xl font-black outline-none text-emerald-700 dark:text-emerald-400" value={formData.setupCost} onChange={e => setFormData({...formData, setupCost: parseFloat(e.target.value) || 0})} />
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/50">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2 flex items-center gap-1"><RefreshCw size={10}/> Ajuste Opex</p>
                                    <input type="number" className="w-full bg-transparent border-none text-xl font-black outline-none text-blue-700 dark:text-blue-400" value={formData.monthlyCost} onChange={e => setFormData({...formData, monthlyCost: parseFloat(e.target.value) || 0})} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex justify-center bg-slate-200 dark:bg-slate-950">
                        <div className="transform origin-top scale-[0.85] lg:scale-100 w-[210mm] pointer-events-none rounded-lg shadow-2xl">
                            <ProposalDocument data={{
                                ...formData,
                                id: editingId || 'NOVA',
                                price: finalSetupInvestment,
                                monthlyCost: finalMonthlyRecurrence,
                                createdDate: new Date().toISOString(),
                                validUntil: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(),
                                status: 'Draft'
                            }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
