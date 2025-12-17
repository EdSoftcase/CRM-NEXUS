
import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal } from '../types';
import { Plus, Search, FileText, Edit2, Trash2, Send, Download, Printer, CheckCircle, X, Save, Share2, Globe, RefreshCw, Calculator, ShoppingCart, Percent, Loader2 } from 'lucide-react';
import { ProposalDocument } from '../components/ProposalDocument';
import { SectionTitle, Badge } from '../components/Widgets';
import { SignaturePad } from '../components/SignaturePad';
import { sendBridgeWhatsApp } from '../services/bridgeService';

const DEFAULT_INTRO = "Prezados,\n\nApresentamos nossa proposta comercial para fornecimento de soluções tecnológicas, visando atender às necessidades específicas do seu negócio com eficiência e qualidade.";
const DEFAULT_TERMS = "1. Validade da proposta: 15 dias.\n2. Pagamento: Conforme acordado em contrato.\n3. Prazo de entrega: A definir após assinatura.";

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
    
    // View State
    const [view, setView] = useState<'list' | 'create'>('list');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Print/PDF State
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

    // Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
    const [deleteReason, setDeleteReason] = useState('');

    const [isSendModalOpen, setSendModalOpen] = useState(false);
    const [proposalToSend, setProposalToSend] = useState<Proposal | null>(null);
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);

    // Form State
    const [targetType, setTargetType] = useState<'lead' | 'client'>('lead');
    const [formData, setFormData] = useState({
        leadId: '',
        clientId: '',
        title: '',
        clientName: '',
        companyName: '',
        unit: '', // New field for Unit
        setupCost: 0,
        monthlyCost: 0,
        timeline: '30 dias',
        introduction: DEFAULT_INTRO,
        terms: DEFAULT_TERMS,
        scopeItem: '',
        scope: [] as string[]
    });

    // Product Selection State
    const [selectedItems, setSelectedItems] = useState<ProposalItem[]>([]);
    const [selectedProductId, setSelectedProductId] = useState('');

    // Validation State
    const [errors, setErrors] = useState<{ price?: string; scope?: string }>({});

    // Helper para formatação BRL
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    // --- PRODUCT LOGIC ---

    const calculateAndSetTotal = (items: ProposalItem[]) => {
        const totalMonthly = items.reduce((acc, item) => acc + item.finalPrice, 0);
        setFormData(prev => ({ ...prev, monthlyCost: totalMonthly }));
    };

    const handleAddProduct = () => {
        if (!selectedProductId) return;
        const product = products.find(p => p.id === selectedProductId);
        if (product) {
            const newItem: ProposalItem = {
                productId: product.id,
                name: product.name,
                originalPrice: product.price,
                discountPercent: 0,
                finalPrice: product.price
            };
            
            const newItems = [...selectedItems, newItem];
            setSelectedItems(newItems);
            calculateAndSetTotal(newItems); // Updates monthlyCost
            
            // Auto-add to scope
            if (!formData.scope.includes(product.name)) {
                setFormData(prev => ({
                    ...prev,
                    scope: [...prev.scope, product.name]
                }));
            }
            
            setSelectedProductId('');
        }
    };

    const handleUpdateDiscount = (index: number, discount: number) => {
        // Clamp discount between 0 and 100
        const validDiscount = Math.min(100, Math.max(0, discount));
        
        const newItems = selectedItems.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    discountPercent: validDiscount,
                    finalPrice: item.originalPrice * (1 - validDiscount / 100)
                };
            }
            return item;
        });

        setSelectedItems(newItems);
        calculateAndSetTotal(newItems);
    };

    const handleRemoveItem = (index: number) => {
        const itemToRemove = selectedItems[index];
        const newItems = selectedItems.filter((_, i) => i !== index);
        
        setSelectedItems(newItems);
        calculateAndSetTotal(newItems);
        
        // Let's remove from scope for consistency
        setFormData(prev => ({
            ...prev,
            scope: prev.scope.filter(s => s !== itemToRemove.name)
        }));
    };

    // --- FORM HANDLERS ---

    const handleSelectLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        const lead = leads.find(l => l.id === leadId);
        
        if (lead) {
            setFormData(prev => ({
                ...prev,
                leadId: lead.id,
                clientId: '', 
                clientName: lead.name,
                companyName: lead.company,
                title: `Proposta Comercial - ${lead.company}`
            }));
        }
    };

    const handleSelectClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        
        if (client) {
            setFormData(prev => ({
                ...prev,
                leadId: '',
                clientId: client.id, 
                clientName: client.contactPerson,
                companyName: client.name,
                title: `Proposta Comercial - ${client.name}`,
                unit: client.unit || '' // Pre-fill unit if available in client profile
            }));
        }
    };

    const addScopeItem = () => {
        if (formData.scopeItem.trim()) {
            setFormData(prev => ({
                ...prev,
                scope: [...prev.scope, prev.scopeItem],
                scopeItem: ''
            }));
            setErrors(prev => ({ ...prev, scope: undefined }));
        }
    };

    const removeScopeItem = (index: number) => {
        setFormData(prev => ({
            ...prev,
            scope: prev.scope.filter((_, i) => i !== index)
        }));
    };

    const calculateTotal = () => {
        return formData.setupCost + (formData.monthlyCost * 12); // Keep total calculation for internal stats, but display differently
    };

    const handleSave = (sendImmediately: boolean = false) => {
        const newErrors: { price?: string; scope?: string } = {};
        let isValid = true;

        if (formData.setupCost <= 0 && formData.monthlyCost <= 0) {
            newErrors.price = 'Preencha pelo menos um valor (Setup ou Mensal).';
            isValid = false;
        }

        if (formData.scope.length === 0) {
            newErrors.scope = 'Adicione pelo menos um item ao escopo do projeto.';
            isValid = false;
        }

        setErrors(newErrors);

        if (!isValid) {
            addSystemNotification('Atenção', 'Por favor, corrija os erros no formulário antes de salvar.', 'warning');
            return;
        }

        const totalEstimatedValue = calculateTotal();
        const existingProposal = editingId ? proposals.find(p => p.id === editingId) : null;

        // Determine Status logic
        let newStatus = existingProposal?.status || 'Draft';
        if (sendImmediately) {
            newStatus = 'Sent';
        }

        const proposalData: Proposal = {
            id: editingId || `PROP-${Date.now()}`,
            title: formData.title || 'Nova Proposta',
            leadId: formData.leadId,
            clientId: formData.clientId, 
            clientName: formData.clientName,
            companyName: formData.companyName,
            
            setupCost: Number(formData.setupCost),
            monthlyCost: Number(formData.monthlyCost),
            price: totalEstimatedValue, 
            unit: formData.unit,

            consultantName: currentUser?.name || 'Consultor Nexus',
            consultantEmail: currentUser?.email || 'contato@nexus.com',
            consultantPhone: currentUser?.phone || '',

            createdDate: existingProposal?.createdDate || new Date().toISOString(),
            validUntil: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
            status: newStatus as any,
            introduction: formData.introduction,
            scope: formData.scope,
            timeline: formData.timeline,
            terms: formData.terms,
            
            organizationId: currentUser?.organizationId || existingProposal?.organizationId
        };

        if (editingId) {
            updateProposal(currentUser, proposalData);
            if (sendImmediately) {
                 // Explicitly target companyName for notification matching in portal
                 addSystemNotification('Proposta Enviada', `Proposta "${proposalData.title}" enviada para ${formData.companyName}.`, 'success', formData.companyName);
            } else {
                 addSystemNotification('Proposta Atualizada', `A proposta para ${formData.companyName} foi salva.`, 'success');
            }
        } else {
            addProposal(currentUser, proposalData);
            const msg = sendImmediately 
                ? `Proposta criada e disponibilizada no Portal do Cliente.` 
                : `Rascunho criado para ${formData.companyName}.`;
            
            // CRÍTICO: Use 'companyName' como 'relatedTo'. 
            // O Portal filtra notificações onde relatedTo === currentClient.name (que é o nome da empresa).
            const targetForNotification = formData.companyName; 
            
            addSystemNotification(
                sendImmediately ? 'Nova Proposta Recebida' : 'Rascunho Salvo', 
                msg, 
                'success', 
                targetForNotification // Notifica a EMPRESA
            );
        }

        setView('list');
        setFormData({
            leadId: '', clientId: '', title: '', clientName: '', companyName: '', unit: '', setupCost: 0, monthlyCost: 0, timeline: '30 dias',
            introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, scopeItem: '', scope: []
        });
        setSelectedItems([]); // Reset items
        setEditingId(null);
        setErrors({});
    };

    const handleEditProposal = (proposal: Proposal) => {
        setFormData({
            leadId: proposal.leadId || '',
            clientId: proposal.clientId || '',
            title: proposal.title,
            clientName: proposal.clientName,
            companyName: proposal.companyName,
            unit: proposal.unit || '',
            setupCost: proposal.setupCost || 0,
            monthlyCost: proposal.monthlyCost || 0,
            timeline: proposal.timeline,
            introduction: proposal.introduction,
            terms: proposal.terms,
            scope: proposal.scope,
            scopeItem: ''
        });
        
        // Reconstruct selected items from Scope for visual consistency (Best Guess)
        const reconstructedItems: ProposalItem[] = [];
        
        // Try to match scope strings to known products
        if (proposal.scope && proposal.scope.length > 0) {
            proposal.scope.forEach(scopeStr => {
                 // Simple match: does the product name exist in scope?
                 const prod = products.find(p => scopeStr.includes(p.name));
                 if (prod) {
                     // Check if already added to avoid duplicates if scope has variations
                     if (!reconstructedItems.find(ri => ri.productId === prod.id)) {
                         reconstructedItems.push({
                            productId: prod.id,
                            name: prod.name,
                            originalPrice: prod.price,
                            discountPercent: 0, // Assumption: We lost discount data, assume full price or 0%
                            finalPrice: prod.price
                         });
                     }
                 }
            });
        }
        
        // We set the items for display, but we DO NOT trigger a recalculation that would overwrite 
        // the correctly loaded monthlyCost. The remove/add/update handlers will trigger recalc.
        setSelectedItems(reconstructedItems);
        
        setTargetType(proposal.clientId ? 'client' : 'lead');
        setEditingId(proposal.id);
        setView('create');
    };

    const handleDeleteClick = (proposal: Proposal) => {
        setProposalToDelete(proposal);
        setDeleteReason('');
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (proposalToDelete && deleteReason.length >= 5) {
            removeProposal(currentUser, proposalToDelete.id, deleteReason);
            setIsDeleteModalOpen(false);
            setProposalToDelete(null);
            setDeleteReason('');
        }
    };

    const handleSendClick = (proposal: Proposal) => {
        setProposalToSend(proposal);
        setSendModalOpen(true);
    };

    const generatePDF = async () => {
        if (!proposalToSend) return;
        setIsGeneratingPDF(true);
        addSystemNotification('Gerando PDF', 'Aguarde enquanto o documento é gerado...', 'info');

        const element = document.getElementById('pdf-generator-content');
        if (!element) {
            setIsGeneratingPDF(false);
            addSystemNotification('Erro', 'Erro ao gerar PDF: Elemento não encontrado.', 'alert');
            return;
        }

        const opt = {
            margin: 0,
            filename: `${proposalToSend.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            // @ts-ignore
            if (window.html2pdf) {
                // @ts-ignore
                await window.html2pdf().set(opt).from(element).save();
                addSystemNotification('Sucesso', 'PDF baixado com sucesso.', 'success');
            } else {
                addSystemNotification('Erro', 'Biblioteca PDF não carregada. Tente imprimir como PDF.', 'alert');
            }
        } catch (e) {
            console.error(e);
            addSystemNotification('Erro', 'Falha ao gerar PDF.', 'alert');
        } finally {
            setIsGeneratingPDF(false);
        }
    };

    const handleQuickShareWhatsApp = async (proposal: Proposal) => {
        setSendingWhatsApp(true);
        const text = `Olá ${proposal.clientName}, segue a proposta comercial "${proposal.title}" para análise.\n\nInvestimento Setup: ${formatCurrency(proposal.setupCost || 0)}\nMensalidade: ${formatCurrency(proposal.monthlyCost || 0)}\n\nQualquer dúvida, estou à disposição!`;
        
        try {
            // Tenta encontrar o telefone
            let phone = '';
            if (proposal.clientId) {
                const client = clients.find(c => c.id === proposal.clientId);
                phone = client?.phone || '';
            } else if (proposal.leadId) {
                const lead = leads.find(l => l.id === proposal.leadId);
                phone = lead?.phone || '';
            }

            if (!phone) {
                throw new Error("Telefone não encontrado para este contato.");
            }

            // Tenta via Bridge
            await sendBridgeWhatsApp(phone, text);
            addSystemNotification('WhatsApp Enviado', `Mensagem enviada para ${proposal.clientName} via Bridge.`, 'success');
            setSendModalOpen(false);

        } catch (error: any) {
            console.warn("Bridge send failed or no phone:", error);
            
            // Fallback para link nativo
            if (confirm("O envio direto falhou ou o Bridge está offline. Deseja abrir o WhatsApp Web/App?")) {
                const encodedText = encodeURIComponent(text);
                window.open(`https://wa.me/?text=${encodedText}`, '_blank');
                setSendModalOpen(false);
            }
        } finally {
            setSendingWhatsApp(false);
        }
    };

    const handleQuickShareEmail = (proposal: Proposal) => {
        const subject = encodeURIComponent(`Proposta Comercial: ${proposal.title}`);
        const body = encodeURIComponent(`Olá ${proposal.clientName},\n\nConforme conversamos, segue em anexo a proposta comercial para o projeto na ${proposal.companyName}.\n\nResumo de Investimento:\nSetup/Instalação: ${formatCurrency(proposal.setupCost || 0)}\nValor Mensal: ${formatCurrency(proposal.monthlyCost || 0)}\nPrazo: ${proposal.timeline}\n\nFico no aguardo do seu retorno.\n\nAtenciosamente,\n${proposal.consultantName || 'Equipe Soft Case'}`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        setSendModalOpen(false);
    };

    const getCurrentFormDataAsProposal = (): Proposal => ({
        id: 'preview',
        title: formData.title,
        clientName: formData.clientName,
        companyName: formData.companyName,
        setupCost: formData.setupCost,
        monthlyCost: formData.monthlyCost,
        price: calculateTotal(),
        createdDate: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        status: 'Draft',
        introduction: formData.introduction,
        scope: formData.scope,
        timeline: formData.timeline,
        terms: formData.terms,
        consultantName: currentUser?.name || 'Consultor Nexus',
        consultantEmail: currentUser?.email || 'email@nexus.com',
        consultantPhone: currentUser?.phone || '',
        organizationId: currentUser?.organizationId,
        clientId: formData.clientId 
    });

    const filteredProposals = useMemo(() => {
        return proposals.filter(p => 
            p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
            p.companyName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [proposals, searchTerm]);

    return (
        <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
            {/* ... Hidden PDF Generator ... */}
            {proposalToSend && (
                <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                    <div id="pdf-generator-content">
                        <ProposalDocument data={proposalToSend} />
                    </div>
                </div>
            )}

            {view === 'list' ? (
                <>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Propostas Comerciais</h1>
                            <p className="text-slate-500 dark:text-slate-400">Gerencie e envie propostas para seus clientes.</p>
                        </div>
                        <button onClick={() => { setView('create'); setEditingId(null); setFormData({
                            leadId: '', clientId: '', title: '', clientName: '', companyName: '', unit: '', setupCost: 0, monthlyCost: 0, timeline: '30 dias',
                            introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, scopeItem: '', scope: []
                        }); setSelectedItems([]); }} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 flex items-center gap-2">
                            <Plus size={18}/> Nova Proposta
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                                <input 
                                    type="text" 
                                    placeholder="Buscar proposta..." 
                                    className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={refreshData} 
                                disabled={isSyncing}
                                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition"
                                title="Atualizar Lista"
                            >
                                <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""}/>
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-700 text-slate-50 dark:text-slate-300 font-medium border-b border-slate-200 dark:border-slate-600">
                                    <tr>
                                        <th className="p-4">Título / Cliente</th>
                                        <th className="p-4">Valor Mensal</th>
                                        <th className="p-4">Validade</th>
                                        <th className="p-4 text-center">Status</th>
                                        <th className="p-4 text-center">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {filteredProposals.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400">
                                                Nenhuma proposta encontrada. Clique em "Nova Proposta" para começar.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredProposals.map(prop => (
                                            <tr key={prop.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-900 dark:text-white">{prop.title}</div>
                                                    <div className="text-xs text-slate-500 dark:text-slate-400">{prop.companyName}</div>
                                                </td>
                                                <td className="p-4 text-slate-700 dark:text-slate-300 font-mono">
                                                    {formatCurrency(prop.monthlyCost || 0)}
                                                </td>
                                                <td className="p-4 text-slate-600 dark:text-slate-400">
                                                    {new Date(prop.validUntil).toLocaleDateString()}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Rejected' ? 'red' : prop.status === 'Sent' ? 'blue' : 'gray'}>
                                                        {prop.status === 'Sent' ? 'Enviado' : prop.status === 'Draft' ? 'Rascunho' : prop.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => handleSendClick(prop)} className="p-1.5 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Enviar / PDF">
                                                            <Send size={16}/>
                                                        </button>
                                                        <button onClick={() => handleEditProposal(prop)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Editar">
                                                            <Edit2 size={16}/>
                                                        </button>
                                                        <button onClick={() => handleDeleteClick(prop)} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition" title="Excluir">
                                                            <Trash2 size={16}/>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            ) : (
                <div className="flex flex-col h-full overflow-hidden">
                    {/* ... (Create/Edit View Logic - Same as before) ... */}
                    <div className="flex justify-between items-center mb-6 shrink-0">
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{editingId ? 'Editar Proposta' : 'Nova Proposta'}</h1>
                        <div className="flex gap-2">
                            <button onClick={() => setView('list')} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition">Cancelar</button>
                            
                            {/* Option 1: Save Draft */}
                            <button onClick={() => handleSave(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2">
                                <Save size={18}/> Salvar Rascunho
                            </button>

                            {/* Option 2: Save & Send (Publish) */}
                            <button onClick={() => handleSave(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition flex items-center gap-2 shadow-lg shadow-blue-500/20">
                                <Globe size={18}/> Salvar e Enviar ao Portal
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-6 h-full overflow-hidden">
                        {/* Editor Form */}
                        <div className="w-1/2 overflow-y-auto pr-2 custom-scrollbar bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <div className="space-y-6">
                                {/* ... (Form Fields - Same as before) ... */}
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Destinatário (Tipo)</label>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="targetType" checked={targetType === 'lead'} onChange={() => setTargetType('lead')} />
                                            <span className="text-sm dark:text-white">Lead (Prospect)</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="targetType" checked={targetType === 'client'} onChange={() => setTargetType('client')} />
                                            <span className="text-sm dark:text-white">Cliente Existente</span>
                                        </label>
                                    </div>
                                </div>

                                {targetType === 'lead' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Selecionar Lead</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={formData.leadId} onChange={handleSelectLead}>
                                            <option value="">Selecione um Lead...</option>
                                            {leads.map(l => <option key={l.id} value={l.id}>{l.name} - {l.company}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Selecionar Cliente</label>
                                        <select className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={formData.clientId} onChange={handleSelectClient}>
                                            <option value="">Selecione um Cliente...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400" value={formData.companyName} readOnly />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Contato</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400" value={formData.clientName} readOnly />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Unidade / Filial</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ex: Matriz, Filial Norte, Loja 01" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} />
                                    <p className="text-[10px] text-slate-400 mt-1">Isso ajuda a identificar o centro de custo no financeiro do cliente.</p>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <h4 className="text-sm font-bold text-slate-700 dark:text-white mb-3 flex items-center gap-2">
                                        <Calculator size={16} className="text-blue-500"/> Calculadora de Valores
                                    </h4>
                                    
                                    {/* Product Selector */}
                                    <div className="flex gap-2 mb-4">
                                        <select 
                                            className="flex-1 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none"
                                            value={selectedProductId}
                                            onChange={(e) => setSelectedProductId(e.target.value)}
                                        >
                                            <option value="">Selecione um produto...</option>
                                            {products.filter(p => p.active).map(p => (
                                                <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                                            ))}
                                        </select>
                                        <button onClick={handleAddProduct} disabled={!selectedProductId} className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50 transition">
                                            <Plus size={20}/>
                                        </button>
                                    </div>

                                    {/* Selected Products List */}
                                    {selectedItems.length > 0 && (
                                        <div className="mb-4 space-y-2">
                                            {selectedItems.map((item, idx) => (
                                                <div key={idx} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-600 text-sm">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600"><X size={14}/></button>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2 items-center">
                                                        <div className="text-xs text-slate-500 dark:text-slate-400">
                                                            De: {formatCurrency(item.originalPrice)}
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <Percent size={12} className="text-slate-400"/>
                                                            <input 
                                                                type="number" 
                                                                className="w-12 border border-slate-300 dark:border-slate-600 rounded p-1 text-xs text-center outline-none focus:border-blue-500 bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                                                value={item.discountPercent}
                                                                onChange={(e) => handleUpdateDiscount(idx, Number(e.target.value))}
                                                                min="0" max="100"
                                                            />
                                                            <span className="text-xs text-slate-500">%</span>
                                                        </div>
                                                        <div className="text-right font-bold text-blue-600 dark:text-blue-400">
                                                            {formatCurrency(item.finalPrice)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200 dark:border-slate-600">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Custo Setup (Único)</label>
                                            <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.setupCost} onChange={e => setFormData({...formData, setupCost: Number(e.target.value)})} placeholder="0.00" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Valor Mensal (Recorrente)</label>
                                            <input type="number" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500" value={formData.monthlyCost} onChange={e => setFormData({...formData, monthlyCost: Number(e.target.value)})} placeholder="0.00" />
                                        </div>
                                    </div>
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-600 flex justify-between items-center">
                                        <span className="text-xs text-slate-500 flex items-center gap-1">Total Mensal:</span>
                                        <span className="font-bold text-lg text-slate-800 dark:text-white">{formatCurrency(formData.monthlyCost)}</span>
                                    </div>
                                    {errors.price && <p className="text-red-500 text-xs mt-2">{errors.price}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Introdução / Objetivo</label>
                                    <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500" value={formData.introduction} onChange={e => setFormData({...formData, introduction: e.target.value})} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Escopo do Projeto</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="text" className="flex-1 border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" placeholder="Adicionar item ao escopo..." value={formData.scopeItem} onChange={e => setFormData({...formData, scopeItem: e.target.value})} onKeyDown={e => e.key === 'Enter' && addScopeItem()} />
                                        <button onClick={addScopeItem} className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 p-2.5 rounded text-slate-700 dark:text-slate-200"><Plus size={20}/></button>
                                    </div>
                                    <ul className="list-disc pl-5 text-sm space-y-1 text-slate-700 dark:text-slate-300">
                                        {formData.scope.map((item, idx) => (
                                            <li key={idx} className="group">
                                                {item} 
                                                <button onClick={() => removeScopeItem(idx)} className="ml-2 text-red-400 opacity-0 group-hover:opacity-100 hover:text-red-600 transition text-xs">[remover]</button>
                                            </li>
                                        ))}
                                    </ul>
                                    {errors.scope && <p className="text-red-500 text-xs mt-1">{errors.scope}</p>}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Cronograma / Prazo Estimado</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white outline-none" value={formData.timeline} onChange={e => setFormData({...formData, timeline: e.target.value})} />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Termos e Condições</label>
                                    <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2.5 bg-white dark:bg-slate-700 text-slate-900 dark:text-white h-24 resize-none outline-none" value={formData.terms} onChange={e => setFormData({...formData, terms: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        {/* Preview */}
                        <div className="w-1/2 bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden shadow-inner flex flex-col">
                            <div className="bg-slate-300 dark:bg-slate-800 p-2 text-center text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest shrink-0">Pré-visualização do Documento</div>
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar flex justify-center bg-slate-200 dark:bg-slate-900">
                                <div className="transform scale-[0.65] origin-top">
                                    <ProposalDocument data={getCurrentFormDataAsProposal()} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SEND MODAL */}
            {isSendModalOpen && proposalToSend && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <Send size={20} className="text-blue-600 dark:text-blue-400"/> Enviar Proposta
                            </h3>
                            <button onClick={() => setSendModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">Escolha como deseja enviar a proposta para <strong>{proposalToSend.clientName}</strong>:</p>
                            
                            <button onClick={generatePDF} className="w-full flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition group">
                                <div className="bg-red-100 dark:bg-red-900/30 p-2 rounded-full text-red-600 dark:text-red-400"><Download size={24}/></div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">Baixar PDF</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Salvar arquivo para envio manual</p>
                                </div>
                            </button>

                            <button onClick={() => handleQuickShareWhatsApp(proposalToSend)} disabled={sendingWhatsApp} className="w-full flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 transition group disabled:opacity-70">
                                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full text-green-600 dark:text-green-400">
                                    {sendingWhatsApp ? <Loader2 size={24} className="animate-spin"/> : <Share2 size={24}/>}
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400">WhatsApp (Bridge)</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">{sendingWhatsApp ? 'Enviando...' : 'Enviar direto ou gerar link'}</p>
                                </div>
                            </button>

                            <button onClick={() => handleQuickShareEmail(proposalToSend)} className="w-full flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition group">
                                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full text-blue-600 dark:text-blue-400"><Send size={24}/></div>
                                <div className="text-left">
                                    <p className="font-bold text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">E-mail</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">Abrir cliente de email padrão</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[1000] p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in border-t-4 border-red-500">
                        <div className="p-6">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Excluir Proposta</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                Tem certeza que deseja excluir a proposta <strong>{proposalToDelete?.title}</strong>? Esta ação é irreversível.
                            </p>
                            
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                                Motivo da Exclusão <span className="text-red-500">*</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm mb-4 outline-none focus:ring-2 focus:ring-red-500 dark:bg-slate-700 dark:text-white"
                                placeholder="Digite o motivo..."
                                value={deleteReason}
                                onChange={(e) => setDeleteReason(e.target.value)}
                            />

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition">Cancelar</button>
                                <button 
                                    onClick={handleConfirmDelete} 
                                    disabled={deleteReason.length < 5}
                                    className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700 disabled:opacity-50 transition"
                                >
                                    Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
