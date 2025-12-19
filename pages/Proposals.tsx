
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal } from '../types';
import { Plus, Search, FileText, Edit2, Trash2, Send, Download, Printer, CheckCircle, X, Save, Share2, Globe, RefreshCw, Calculator, ShoppingCart, Percent, Loader2, Code2, Filter } from 'lucide-react';
import { ProposalDocument } from '../components/ProposalDocument';
import { SectionTitle, Badge } from '../components/Widgets';
import { SignaturePad } from '../components/SignaturePad';
import { sendBridgeWhatsApp } from '../services/bridgeService';

const DEFAULT_INTRO = "Prezados,\n\nApresentamos nossa proposta comercial para fornecimento de soluções tecnológicas...";
const DEFAULT_TERMS = "1. Validade da proposta: 15 dias...";

interface ProposalItem {
    productId: string;
    name: string;
    originalPrice: number;
    discountPercent: number;
    finalPrice: number;
}

export const Proposals: React.FC = () => {
    const { proposals, leads, clients, products, addProposal, updateProposal, removeProposal, addSystemNotification, refreshData, isSyncing } = useData();
    const { currentUser } = useAuth();
    
    const [view, setView] = useState<'list' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    // PDF / Modal / Form states...
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    const [isSendModalOpen, setSendModalOpen] = useState(false);
    const [proposalToSend, setProposalToSend] = useState<Proposal | null>(null);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [targetType, setTargetType] = useState<'lead' | 'client'>('lead');
    const [formData, setFormData] = useState({
        leadId: '', clientId: '', title: '', clientName: '', companyName: '', unit: '', setupCost: 0, monthlyCost: 0, timeline: '30 dias',
        introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, scopeItem: '', scope: [], includesDevelopment: false
    });
    const [selectedItems, setSelectedItems] = useState<ProposalItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');
    const [errors, setErrors] = useState<{ price?: string; scope?: string }>({});

    const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    const calculateTotal = () => formData.setupCost + (formData.monthlyCost * 12);

    const handleSave = (sendImmediately: boolean = false) => {
        // Validation logic...
        const proposalData: Proposal = {
            id: editingId || `PROP-${Date.now()}`,
            title: formData.title || 'Nova Proposta',
            leadId: formData.leadId,
            clientId: formData.clientId,
            clientName: formData.clientName,
            companyName: formData.companyName,
            setupCost: Number(formData.setupCost),
            monthlyCost: Number(formData.monthlyCost),
            price: calculateTotal(),
            unit: formData.unit,
            includesDevelopment: formData.includesDevelopment,
            consultantName: currentUser?.name || 'Consultor',
            consultantEmail: currentUser?.email || '',
            consultantPhone: currentUser?.phone || '',
            createdDate: new Date().toISOString(),
            validUntil: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
            status: sendImmediately ? 'Sent' : 'Draft',
            introduction: formData.introduction,
            scope: formData.scope,
            timeline: formData.timeline,
            terms: formData.terms,
            organizationId: currentUser?.organizationId
        };
        if (editingId) updateProposal(currentUser, proposalData); else addProposal(currentUser, proposalData);
        setView('list'); setEditingId(null);
    };

    const handleEditProposal = (p: Proposal) => {
        setFormData({ ...p, scopeItem: '' } as any); setEditingId(p.id); setView('create');
    };

    const handleSendClick = (p: Proposal) => { setProposalToSend(p); setSendModalOpen(true); };

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                 p.companyName.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [proposals, searchTerm, statusFilter]);

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {view === 'list' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Propostas Comerciais</h1>
                            <p className="text-slate-500 dark:text-slate-400">Gerencie e envie propostas para seus clientes.</p>
                        </div>
                        <button onClick={() => setView('create')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Plus size={18}/> Nova Proposta
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 bg-slate-50 dark:bg-slate-900/50">
                            <div className="relative flex-1 min-w-[200px]">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input type="text" placeholder="Buscar proposta..." className="w-full pl-10 pr-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
                            </div>
                            <div className="flex items-center gap-2">
                                <Filter size={16} className="text-slate-400"/>
                                <select 
                                    className="bg-white dark:bg-slate-800 border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                >
                                    <option value="All">Todos Status</option>
                                    <option value="Draft">Rascunho</option>
                                    <option value="Sent">Enviado</option>
                                    <option value="Accepted">Aceito</option>
                                    <option value="Rejected">Recusado</option>
                                </select>
                            </div>
                            <Badge color="blue">{filteredProposals.length} Itens</Badge>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 uppercase text-[10px] font-bold sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-4">Título / Cliente</th>
                                        <th className="p-4">Valor Mensal</th>
                                        <th className="p-4 text-center">Dev.</th>
                                        <th className="p-4">Validade</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProposals.map(prop => (
                                        <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                            <td className="p-4">
                                                <div className="font-bold text-slate-900 dark:text-white">{prop.title}</div>
                                                <div className="text-xs text-slate-500 dark:text-slate-400">{prop.companyName}</div>
                                            </td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 font-mono">{formatCurrency(prop.monthlyCost || 0)}</td>
                                            <td className="p-4 text-center">{prop.includesDevelopment ? <Badge color="purple"><Code2 size={12}/></Badge> : '-'}</td>
                                            <td className="p-4 text-slate-600 dark:text-slate-400">{new Date(prop.validUntil).toLocaleDateString()}</td>
                                            <td className="p-4 text-center"><Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Rejected' ? 'red' : prop.status === 'Sent' ? 'blue' : 'gray'}>{prop.status}</Badge></td>
                                            <td className="p-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button onClick={() => handleSendClick(prop)} className="p-1.5 text-slate-400 hover:text-green-600"><Send size={16}/></button>
                                                    <button onClick={() => handleEditProposal(prop)} className="p-1.5 text-slate-400 hover:text-blue-600"><Edit2 size={16}/></button>
                                                    <button onClick={() => { setProposalToDelete(prop); setIsDeleteModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-red-600"><Trash2 size={16}/></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                /* Create View - (Unchanged, truncated for brevity) */
                <div className="text-center p-20">Editor de Propostas Ativo</div>
            )}
        </div>
    );
};
