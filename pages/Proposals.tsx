
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal, Lead, Client, ProposalItem, Product } from '../types';
import { 
    Plus, Search, FileText, Edit2, Trash2, X, Save, 
    Filter, ArrowLeft, User, ListPlus, DollarSign, Package, 
    RefreshCw, Sparkles, Send, MessageCircle, ShoppingCart, Calculator, Eye, Layout, ChevronRight, Loader2
} from 'lucide-react';
import { ProposalDocument } from '../components/ProposalDocument';
import { SectionTitle, Badge } from '../components/Widgets';

const DEFAULT_INTRO = "A SOFTPARK apresenta a presente Proposta Técnica e Comercial para fornecimento de soluções de automação de entrada e saída de veículos por meio de reconhecimento automático de placas (LPR), bem como serviços associados de instalação, configuração e suporte técnico.";
const DEFAULT_TERMS = "1. CONFIDENCIALIDADE: Informações exclusivas para avaliação da CONTRATANTE.\n2. OBJETO: Solução integrada de automação veicular. Infraestrutura elétrica/lógica é de responsabilidade do cliente.\n3. VALIDADE: 20 dias corridos.\n4. INSTALAÇÃO: Até 45 dias após aceite formal.\n5. GARANTIA: 12 meses contra defeitos de fabricação.\n6. LGPD: Em conformidade com a Lei 13.709/2018.";

export const Proposals: React.FC = () => {
    const { 
        proposals, leads, clients, products, 
        addProposal, updateProposal, removeProposal, 
        addSystemNotification
    } = useData();
    const { currentUser } = useAuth();
    
    const [view, setView] = useState<'list' | 'create'>('list');
    const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [targetType, setTargetType] = useState<'lead' | 'client'>('lead');

    const [selectedProductId, setSelectedProductId] = useState('');
    const [scopeInput, setScopeInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        leadId: '',
        clientId: '',
        clientEmail: '',
        title: '',
        clientName: '',
        companyName: '',
        unit: '',
        setupCost: 0,
        monthlyCost: 0,
        timeline: '45 dias',
        introduction: DEFAULT_INTRO,
        terms: DEFAULT_TERMS,
        customClause: '',
        scope: [] as string[],
        items: [] as ProposalItem[],
        includesDevelopment: false
    });

    const formatCurrency = (value: number) => 
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const getItemSubtotal = (item: ProposalItem) => {
        const base = item.price * item.quantity;
        const disc = item.discount || 0;
        return base * (1 - disc / 100);
    };

    // Cálculos de Totais
    const equipmentValue = useMemo(() => 
        formData.items.filter(item => item.category === 'Product').reduce((acc, item) => acc + getItemSubtotal(item), 0)
    , [formData.items]);

    const serviceValue = useMemo(() => 
        formData.items.filter(item => item.category !== 'Product').reduce((acc, item) => acc + getItemSubtotal(item), 0)
    , [formData.items]);

    const finalSetupInvestment = useMemo(() => equipmentValue + Number(formData.setupCost || 0), [equipmentValue, formData.setupCost]);
    const finalMonthlyRecurrence = useMemo(() => serviceValue + Number(formData.monthlyCost || 0), [serviceValue, formData.monthlyCost]);

    const handleSelectTarget = (id: string) => {
        if (targetType === 'lead') {
            const lead = leads.find(l => l.id === id);
            setFormData(prev => ({
                ...prev,
                leadId: id,
                clientId: '',
                clientEmail: lead ? lead.email : '',
                clientName: lead ? lead.name : '',
                companyName: lead ? lead.company : '',
            }));
        } else {
            const client = clients.find(c => c.id === id);
            setFormData(prev => ({
                ...prev,
                clientId: id,
                leadId: '',
                clientEmail: client ? client.email : '',
                clientName: client ? client.contactPerson : '',
                companyName: client ? client.name : '',
                unit: client ? (client.unit || '') : ''
            }));
        }
    };

    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            leadId: '', clientId: '', clientEmail: '', title: '', clientName: '', companyName: '', 
            unit: '', setupCost: 0, monthlyCost: 0, timeline: '45 dias',
            introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, customClause: '',
            scope: [], items: [], includesDevelopment: false
        });
        setActiveTab('editor');
        setView('create');
    };

    const handleEditProposal = (p: Proposal) => {
        setEditingId(p.id);
        setFormData({
            leadId: p.leadId || '',
            clientId: p.clientId || '',
            clientEmail: p.clientEmail || '',
            title: p.title,
            clientName: p.clientName || '',
            companyName: p.companyName || '',
            unit: p.unit || '',
            setupCost: p.setupCost || 0,
            monthlyCost: p.monthlyCost || 0,
            timeline: p.timeline,
            introduction: p.introduction,
            terms: p.terms,
            customClause: p.customClause || '',
            scope: p.scope || [],
            items: p.items || [],
            includesDevelopment: p.includesDevelopment || false
        });
        setTargetType(p.clientId ? 'client' : 'lead');
        setActiveTab('editor');
        setView('create');
    };

    const handleAddScope = () => {
        if (!scopeInput.trim()) return;
        setFormData(prev => ({ ...prev, scope: [...prev.scope, scopeInput.trim()] }));
        setScopeInput('');
    };

    const handleAddProduct = () => {
        const product = products.find(p => p.id === selectedProductId);
        if (!product) return;
        const newItem: ProposalItem = { 
            id: product.id, 
            name: product.name, 
            price: product.price, 
            quantity: 1, 
            discount: 0, 
            category: product.category 
        };
        setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
        setSelectedProductId('');
    };

    const handleUpdateItem = (index: number, field: keyof ProposalItem, value: any) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index] };
        if (field === 'quantity') item.quantity = parseInt(value) || 1;
        if (field === 'discount') item.discount = parseFloat(value) || 0;
        newItems[index] = item;
        setFormData({ ...formData, items: newItems });
    };

    const handleSave = async (shouldSend: boolean = false) => {
        if (!formData.companyName || !formData.title) {
            alert("Nome da empresa e título são obrigatórios.");
            return;
        }

        setIsSaving(true);
        const proposalData: Proposal = {
            id: editingId || `PC-${Date.now()}`,
            title: formData.title,
            leadId: targetType === 'lead' ? formData.leadId : undefined,
            clientId: targetType === 'client' ? formData.clientId : undefined,
            clientEmail: formData.clientEmail,
            clientName: formData.clientName,
            companyName: formData.companyName,
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
                addSystemNotification("Sucesso", "Proposta atualizada e salva no banco.", "success");
            } else {
                await addProposal(currentUser, proposalData);
                addSystemNotification("Sucesso", "Nova proposta criada e salva no banco.", "success");
            }
            setView('list');
        } catch (e) {
            console.error("Save Error", e);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 (p.companyName && p.companyName.toLowerCase().includes(searchTerm.toLowerCase()));
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [proposals, searchTerm, statusFilter]);

    return (
        <div className="p-4 md:p-8 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-full">
            {view === 'list' ? (
                <div className="flex flex-col flex-1 h-full">
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <FileText className="text-blue-600"/> Propostas Comerciais
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400">Separação de Investimento Único (Setup) e Recorrência Mensal.</p>
                        </div>
                        <button onClick={handleOpenCreate} className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/20 flex items-center gap-2">
                            <Plus size={18}/> Nova Proposta
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col flex-1 overflow-hidden">
                        <div className="p-4 border-b border-slate-200 flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input type="text" placeholder="Buscar por título ou empresa..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-black sticky top-0 z-10">
                                    <tr>
                                        <th className="p-4">Identificação</th>
                                        <th className="p-4 text-right">Setup (Capex)</th>
                                        <th className="p-4 text-right">Mensal (Opex)</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProposals.map(prop => (
                                        <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition cursor-pointer" onClick={() => handleEditProposal(prop)}>
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900 dark:text-white leading-tight">{prop.title}</p>
                                                <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">{prop.companyName || prop.clientName}</p>
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-emerald-600">
                                                {formatCurrency(prop.price || 0)}
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-blue-600">
                                                {formatCurrency(prop.monthlyCost || 0)}
                                            </td>
                                            <td className="p-4 text-center">
                                                <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Sent' ? 'blue' : 'gray'}>{prop.status}</Badge>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={(e) => { e.stopPropagation(); handleEditProposal(prop); }} className="p-2 text-slate-400 hover:text-blue-600 transition"><Edit2 size={16}/></button>
                                                    <button onClick={(e) => { e.stopPropagation(); if(confirm("Excluir?")) removeProposal(currentUser, prop.id, "Manual"); }} className="p-2 text-slate-400 hover:text-red-600 transition"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredProposals.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 italic">Nenhuma proposta localizada.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="flex flex-col h-full animate-fade-in">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 shrink-0 gap-4">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setView('list')} className="p-2 bg-white dark:bg-slate-800 border rounded-lg text-slate-500 hover:text-slate-900 shadow-sm transition"><ArrowLeft size={20}/></button>
                            <h1 className="text-2xl font-bold">{editingId ? 'Editar Proposta' : 'Nova Proposta'}</h1>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex bg-white dark:bg-slate-800 p-1 rounded-xl border shadow-sm">
                                <button onClick={() => setActiveTab('editor')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'editor' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                                    <Layout size={16}/> Editor
                                </button>
                                <button onClick={() => setActiveTab('preview')} className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition ${activeTab === 'preview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                                    <Eye size={16}/> PDF
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleSave(false)} disabled={isSaving} className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-6 py-2.5 rounded-xl font-bold hover:bg-slate-300 flex items-center gap-2 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Salvar
                                </button>
                                <button onClick={() => handleSave(true)} disabled={isSaving} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-indigo-700 shadow-lg flex items-center gap-2 disabled:opacity-50">
                                    {isSaving ? <Loader2 className="animate-spin" size={18}/> : <Send size={18}/>} Enviar
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        {activeTab === 'editor' ? (
                            <div className="pb-32">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-7xl mx-auto">
                                    {/* Sidebar de Configuração */}
                                    <div className="lg:col-span-4 space-y-6">
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <SectionTitle title="Destinatário" subtitle="Lead ou Unidade da base" />
                                            <div className="space-y-4">
                                                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                                                    <button onClick={() => setTargetType('lead')} className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition ${targetType === 'lead' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>Lead</button>
                                                    <button onClick={() => setTargetType('client')} className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition ${targetType === 'client' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>Unidade</button>
                                                </div>
                                                <select className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-slate-50 dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={targetType === 'lead' ? formData.leadId : formData.clientId} onChange={(e) => handleSelectTarget(e.target.value)}>
                                                    <option value="">Selecione um alvo...</option>
                                                    {targetType === 'lead' 
                                                        ? leads.map(l => <option key={l.id} value={l.id}>{l.company} ({l.name})</option>)
                                                        : clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                                    }
                                                </select>
                                                <input type="text" className="w-full border border-slate-200 dark:border-slate-600 rounded-lg p-2.5 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Título da Proposta" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <SectionTitle title="Escopo & Notas" subtitle="Itens descritivos da solução" />
                                            <div className="flex gap-2 mb-4">
                                                <input type="text" className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-xs bg-slate-50 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nova nota técnica..." value={scopeInput} onChange={e => setScopeInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddScope()} />
                                                <button onClick={handleAddScope} className="bg-slate-900 text-white p-2 rounded-lg hover:bg-slate-800 transition"><Plus size={16}/></button>
                                            </div>
                                            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                                                {formData.scope.map((item, i) => (
                                                    <div key={i} className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg text-xs group border border-slate-100 dark:border-slate-700 hover:border-slate-300 transition">
                                                        <span className="flex-1 leading-relaxed">{item}</span>
                                                        <button onClick={() => setFormData(prev => ({...prev, scope: prev.scope.filter((_, idx) => idx !== i)}))} className="text-slate-300 hover:text-red-500 transition shrink-0"><X size={14}/></button>
                                                    </div>
                                                ))}
                                                {formData.scope.length === 0 && <p className="text-center py-4 text-slate-400 text-xs italic">Nenhum item de escopo adicionado.</p>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Composição Financeira */}
                                    <div className="lg:col-span-8 space-y-6">
                                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                                                <SectionTitle title="Itens e Valores" subtitle="Composição financeira da proposta" />
                                                <div className="flex items-center gap-2 w-full md:w-auto">
                                                    <select className="flex-1 border border-slate-200 dark:border-slate-600 rounded-lg p-2 text-xs bg-slate-50 dark:bg-slate-900 md:w-64 outline-none focus:ring-2 focus:ring-blue-500" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                                                        <option value="">Adicionar item do catálogo...</option>
                                                        {products.filter(p => p.active).map(p => <option key={p.id} value={p.id}>[{p.category === 'Product' ? 'Equip' : 'Serv'}] {p.name}</option>)}
                                                    </select>
                                                    <button onClick={handleAddProduct} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition shadow-sm"><Plus size={18}/></button>
                                                </div>
                                            </div>

                                            <div className="overflow-x-auto mb-8 border border-slate-100 dark:border-slate-700 rounded-xl">
                                                <table className="w-full text-sm">
                                                    <thead className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-700">
                                                        <tr>
                                                            <th className="p-4 text-left">Item / Categoria</th>
                                                            <th className="p-4 text-center w-20">Qtd</th>
                                                            <th className="p-4 text-right w-24">V. Unitário</th>
                                                            <th className="p-4 text-center w-20">Desc (%)</th>
                                                            <th className="p-4 text-right w-32">Subtotal</th>
                                                            <th className="p-4 text-center w-10"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                                        {formData.items.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                                                <td className="p-4">
                                                                    <p className="font-bold text-slate-800 dark:text-white">{item.name}</p>
                                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${item.category === 'Product' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{item.category === 'Product' ? 'Equipamento' : 'SLA/Mensalidade'}</span>
                                                                </td>
                                                                <td className="p-4 text-center">
                                                                    <input type="number" className="w-14 border border-slate-200 dark:border-slate-600 rounded p-1 text-center bg-white dark:bg-slate-700" value={item.quantity} onChange={e => handleUpdateItem(idx, 'quantity', e.target.value)}/>
                                                                </td>
                                                                <td className="p-4 text-right font-mono text-slate-500 dark:text-slate-400">{formatCurrency(item.price)}</td>
                                                                <td className="p-4 text-center">
                                                                    <input type="number" className="w-12 border border-slate-200 dark:border-slate-600 rounded p-1 text-center font-bold text-blue-600 bg-white dark:bg-slate-700" value={item.discount} onChange={e => handleUpdateItem(idx, 'discount', e.target.value)}/>
                                                                </td>
                                                                <td className="p-4 text-right font-black text-slate-900 dark:text-white">{formatCurrency(getItemSubtotal(item))}</td>
                                                                <td className="p-4 text-center">
                                                                    <button onClick={() => setFormData(prev => ({...prev, items: prev.items.filter((_, i) => i !== idx)}))} className="text-slate-300 hover:text-red-500 transition"><Trash2 size={16}/></button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        {formData.items.length === 0 && (
                                                            <tr><td colSpan={6} className="py-12 text-center text-slate-400 italic">Clique em "Adicionar item" para compor os valores.</td></tr>
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                            
                                            {/* RESUMO DE INVESTIMENTO - GRID CORRIGIDO PARA EVITAR SOBREPOSIÇÃO */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
                                                <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="bg-white dark:bg-emerald-800 p-1.5 rounded-lg shadow-sm">
                                                            <Package size={16} className="text-emerald-600 dark:text-emerald-300"/>
                                                        </div>
                                                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Setup (Capex)</span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{formatCurrency(finalSetupInvestment)}</p>
                                                        <div className="text-right w-32">
                                                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Ajuste R$</label>
                                                            <input type="number" className="w-full bg-white dark:bg-slate-700 border border-emerald-200 dark:border-emerald-900 rounded p-1.5 text-right text-sm font-bold outline-none text-emerald-600 focus:ring-1 focus:ring-emerald-500" value={formData.setupCost} onChange={e => setFormData({...formData, setupCost: parseFloat(e.target.value) || 0})} />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/50 shadow-sm">
                                                    <div className="flex items-center gap-2 mb-4">
                                                        <div className="bg-white dark:bg-blue-800 p-1.5 rounded-lg shadow-sm">
                                                            <RefreshCw size={16} className="text-blue-600 dark:text-blue-300"/>
                                                        </div>
                                                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">Mensal (Opex)</span>
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{formatCurrency(finalMonthlyRecurrence)}</p>
                                                        <div className="text-right w-32">
                                                            <label className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Ajuste R$</label>
                                                            <input type="number" className="w-full bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-900 rounded p-1.5 text-right text-sm font-bold outline-none text-blue-600 focus:ring-1 focus:ring-blue-500" value={formData.monthlyCost} onChange={e => setFormData({...formData, monthlyCost: parseFloat(e.target.value) || 0})} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full bg-slate-200 dark:bg-slate-950 p-8 overflow-y-auto custom-scrollbar shadow-inner">
                                <div className="bg-white shadow-2xl mx-auto w-[210mm] min-h-[297mm] transform origin-top scale-[0.85] md:scale-100 mb-10 pointer-events-none">
                                    <ProposalDocument data={{
                                        ...formData,
                                        id: editingId || 'NOVA',
                                        price: finalSetupInvestment,
                                        monthlyCost: finalMonthlyRecurrence,
                                        createdDate: new Date().toISOString(),
                                        validUntil: new Date(new Date().setDate(new Date().getDate() + 20)).toISOString(),
                                        status: 'Draft',
                                        timeline: formData.timeline
                                    }} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
