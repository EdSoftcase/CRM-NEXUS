
import React, { useState, useRef } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Proposal } from '../types';
import { FileText, Plus, Eye, Download, Send, ChevronLeft, Save, Trash2, Printer, MessageCircle, Mail, X, Share2, AlertCircle, Edit3, LayoutTemplate, Edit2, FileDown, Loader2, AlertTriangle, User, Users } from 'lucide-react';
import { Badge } from '../components/Widgets';
import { ProposalDocument } from '../components/ProposalDocument'; 

const DEFAULT_INTRO = "Agradecemos a oportunidade de apresentar nossa solução. Com base em nossas conversas, desenhamos um projeto focado em atender suas necessidades e otimizar seus processos.";
const DEFAULT_TERMS = "1. VALIDADE: Esta proposta é válida por 15 dias.\n\n2. PAGAMENTO: 50% no aceite e 50% na entrega.\n\n3. CRONOGRAMA: O início do projeto se dá após a confirmação do pagamento inicial.\n\n4. CONFIDENCIALIDADE: As partes comprometem-se a manter sigilo sobre as informações trocadas.";

export const Proposals: React.FC = () => {
    const { proposals, leads, clients, addProposal, updateProposal, removeProposal, addSystemNotification } = useData();
    const { currentUser } = useAuth();
    
    const [view, setView] = useState<'list' | 'create'>('list');
    
    // Edit State
    const [editingId, setEditingId] = useState<string | null>(null);
    
    // Mobile View State (Editor vs Preview)
    const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');
    
    // Preview Modal State
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Send Modal State
    const [sendModalOpen, setSendModalOpen] = useState(false);
    const [proposalToSend, setProposalToSend] = useState<Proposal | null>(null);
    const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
    
    // Delete Modal State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [proposalToDelete, setProposalToDelete] = useState<Proposal | null>(null);
    const [deleteReason, setDeleteReason] = useState('');
    
    // State to hold the proposal currently being viewed/previewed
    const [previewData, setPreviewData] = useState<Proposal | null>(null);

    // Form State
    const [targetType, setTargetType] = useState<'lead' | 'client'>('lead');
    const [formData, setFormData] = useState({
        leadId: '',
        title: '',
        clientName: '',
        companyName: '',
        price: 0,
        timeline: '30 dias',
        introduction: DEFAULT_INTRO,
        terms: DEFAULT_TERMS,
        scopeItem: '',
        scope: [] as string[]
    });

    // Validation State
    const [errors, setErrors] = useState<{ price?: string; scope?: string }>({});

    // Helper para formatação BRL
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const handleSelectLead = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const leadId = e.target.value;
        const lead = leads.find(l => l.id === leadId);
        
        if (lead) {
            setFormData(prev => ({
                ...prev,
                leadId: lead.id,
                clientName: lead.name,
                companyName: lead.company,
                price: lead.value,
                title: `Proposta Comercial - ${lead.company}`
            }));
            if (lead.value > 0) setErrors(prev => ({ ...prev, price: undefined }));
        }
    };

    const handleSelectClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const clientId = e.target.value;
        const client = clients.find(c => c.id === clientId);
        
        if (client) {
            setFormData(prev => ({
                ...prev,
                leadId: '',
                clientName: client.contactPerson,
                companyName: client.name,
                price: client.ltv || 0,
                title: `Proposta Comercial - ${client.name}`
            }));
        }
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = Number(e.target.value);
        setFormData(prev => ({ ...prev, price: val }));

        if (val <= 0) {
            setErrors(prev => ({ ...prev, price: 'O valor deve ser maior que zero.' }));
        } else {
            setErrors(prev => ({ ...prev, price: undefined }));
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

    const handleSave = () => {
        const newErrors: { price?: string; scope?: string } = {};
        let isValid = true;

        if (formData.price <= 0) {
            newErrors.price = 'O valor do investimento é obrigatório.';
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

        const proposalData: Proposal = {
            id: editingId || `PROP-${Date.now()}`,
            title: formData.title || 'Nova Proposta',
            leadId: formData.leadId,
            clientName: formData.clientName,
            companyName: formData.companyName,
            price: formData.price,
            createdDate: new Date().toISOString(),
            validUntil: new Date(new Date().setDate(new Date().getDate() + 15)).toISOString(),
            status: editingId ? (proposals.find(p => p.id === editingId)?.status || 'Draft') : 'Sent',
            introduction: formData.introduction,
            scope: formData.scope,
            timeline: formData.timeline,
            terms: formData.terms
        };

        if (editingId) {
            updateProposal(currentUser, proposalData);
            addSystemNotification('Proposta Atualizada', `A proposta para ${formData.companyName} foi atualizada.`, 'success');
        } else {
            addProposal(currentUser, proposalData);
            addSystemNotification('Proposta Criada', `Nova proposta para ${formData.companyName} criada com sucesso.`, 'success');
        }

        setView('list');
        setFormData({
            leadId: '', title: '', clientName: '', companyName: '', price: 0, timeline: '30 dias',
            introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, scopeItem: '', scope: []
        });
        setEditingId(null);
        setErrors({});
    };

    const handlePrint = () => {
        window.print();
    };

    const handleEditProposal = (proposal: Proposal) => {
        setFormData({
            leadId: proposal.leadId || '',
            title: proposal.title,
            clientName: proposal.clientName,
            companyName: proposal.companyName,
            price: proposal.price,
            timeline: proposal.timeline,
            introduction: proposal.introduction,
            terms: proposal.terms,
            scope: proposal.scope,
            scopeItem: ''
        });
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

    const handleQuickShareWhatsApp = (proposal: Proposal) => {
        const text = encodeURIComponent(`Olá ${proposal.clientName}, segue a proposta comercial "${proposal.title}" para análise (PDF em anexo).\n\nInvestimento: ${formatCurrency(proposal.price)}\nValidade: ${new Date(proposal.validUntil).toLocaleDateString()}\n\nQualquer dúvida, estou à disposição!`);
        window.open(`https://wa.me/?text=${text}`, '_blank');
        setSendModalOpen(false);
    };

    const handleQuickShareEmail = (proposal: Proposal) => {
        const subject = encodeURIComponent(`Proposta Comercial: ${proposal.title}`);
        const body = encodeURIComponent(`Olá ${proposal.clientName},\n\nConforme conversamos, segue em anexo a proposta comercial para o projeto na ${proposal.companyName}.\n\nResumo:\nInvestimento: ${formatCurrency(proposal.price)}\nPrazo: ${proposal.timeline}\n\nFico no aguardo do seu retorno.\n\nAtenciosamente,\nEquipe Soft Case`);
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
        setSendModalOpen(false);
    };

    const getCurrentFormDataAsProposal = (): Proposal => ({
        id: 'preview',
        title: formData.title,
        clientName: formData.clientName,
        companyName: formData.companyName,
        price: formData.price,
        createdDate: new Date().toISOString(),
        validUntil: new Date().toISOString(),
        status: 'Draft',
        introduction: formData.introduction,
        scope: formData.scope,
        timeline: formData.timeline,
        terms: formData.terms
    });

    if (view === 'list') {
        return (
            <div className="p-4 md:p-8 min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Gerador de Propostas</h1>
                        <p className="text-slate-500 dark:text-slate-400">Crie, edite e envie propostas comerciais.</p>
                    </div>
                    <button 
                        onClick={() => {
                            setFormData({
                                leadId: '', title: '', clientName: '', companyName: '', price: 0, timeline: '30 dias',
                                introduction: DEFAULT_INTRO, terms: DEFAULT_TERMS, scopeItem: '', scope: []
                            });
                            setEditingId(null);
                            setView('create');
                        }}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition shadow-sm font-medium flex items-center gap-2 whitespace-nowrap"
                    >
                        <Plus size={20} /> <span className="hidden md:inline">Nova Proposta</span>
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex-1 overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left text-sm min-w-[900px]">
                        <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-300 uppercase text-xs font-medium border-b border-slate-200 dark:border-slate-600">
                            <tr>
                                <th className="p-4">Título / Cliente</th>
                                <th className="p-4">Data Criação</th>
                                <th className="p-4">Valor</th>
                                <th className="p-4">Validade</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {proposals.map(prop => (
                                <tr 
                                    key={prop.id} 
                                    className="hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                                    onClick={() => { setPreviewData(prop); setShowPreviewModal(true); }}
                                >
                                    <td className="p-4">
                                        <div className="font-bold text-slate-900 dark:text-white truncate max-w-[200px]" title={prop.title}>{prop.title}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-[200px]">{prop.companyName} ({prop.clientName})</div>
                                    </td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(prop.createdDate).toLocaleDateString()}</td>
                                    <td className="p-4 font-bold text-slate-700 dark:text-slate-200">{formatCurrency(prop.price)}</td>
                                    <td className="p-4 text-slate-600 dark:text-slate-300">{new Date(prop.validUntil).toLocaleDateString()}</td>
                                    <td className="p-4">
                                        <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Sent' ? 'blue' : 'gray'}>
                                            {prop.status === 'Sent' ? 'Enviado' : prop.status === 'Accepted' ? 'Aceito' : prop.status}
                                        </Badge>
                                    </td>
                                    <td className="p-4 flex justify-center gap-2">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleEditProposal(prop); }}
                                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition" 
                                            title="Editar Proposta"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleSendClick(prop); }}
                                            className="p-2 text-slate-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded transition" 
                                            title="Enviar Proposta (WhatsApp/Email)"
                                        >
                                            <Send size={18} />
                                        </button>
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(prop); }}
                                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition" 
                                            title="Cancelar/Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {proposals.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500 italic">
                                        Nenhuma proposta criada. Clique em "Nova Proposta" para começar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Send Modal with PDF Generation */}
                {sendModalOpen && proposalToSend && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
                            <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-900">
                                <h3 className="font-bold text-slate-800 dark:text-white">Enviar Proposta</h3>
                                <button onClick={() => setSendModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><X size={20}/></button>
                            </div>
                            <div className="p-6">
                                <div className="text-center mb-6">
                                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <FileDown size={24}/>
                                    </div>
                                    <h4 className="font-bold text-slate-800 dark:text-white text-lg">Documento Oficial</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Baixe o PDF para enviar como anexo.</p>
                                </div>

                                <button 
                                    onClick={generatePDF}
                                    disabled={isGeneratingPDF}
                                    className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-slate-900 dark:bg-slate-700 text-white font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition shadow-lg shadow-slate-900/20 mb-6 disabled:opacity-70"
                                >
                                    {isGeneratingPDF ? <Loader2 className="animate-spin" size={20}/> : <FileDown size={20}/>}
                                    {isGeneratingPDF ? 'Gerando PDF...' : 'Baixar PDF da Proposta'}
                                </button>

                                <div className="relative flex py-2 items-center mb-6">
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                                    <span className="flex-shrink-0 mx-4 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">Mensagem Rápida</span>
                                    <div className="flex-grow border-t border-slate-200 dark:border-slate-600"></div>
                                </div>

                                <div className="space-y-3">
                                    <button 
                                        onClick={() => handleQuickShareWhatsApp(proposalToSend)}
                                        className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-[#25D366] text-white font-bold hover:opacity-90 transition shadow-sm"
                                    >
                                        <MessageCircle size={20}/> Link WhatsApp
                                    </button>
                                    <button 
                                        onClick={() => handleQuickShareEmail(proposalToSend)}
                                        className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-sm"
                                    >
                                        <Mail size={20}/> Link E-mail
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        {/* Hidden Container for PDF Generation (Keep White for printing) */}
                        <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                            <div id="pdf-generator-content">
                                <ProposalDocument data={proposalToSend} />
                            </div>
                        </div>
                    </div>
                )}

                {/* DELETE CONFIRMATION MODAL */}
                {isDeleteModalOpen && proposalToDelete && (
                    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] p-4 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                            <div className="p-6 border-b border-red-100 dark:border-red-900 bg-red-50 dark:bg-red-900/30 flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full text-red-600 dark:text-red-300 h-fit">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900 dark:text-white">Excluir Proposta</h2>
                                        <p className="text-sm text-red-700 dark:text-red-300 font-medium mt-1">Esta ação é irreversível.</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsDeleteModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full transition"><X size={20}/></button>
                            </div>
                            
                            <div className="p-6 space-y-4">
                                <p className="text-slate-600 dark:text-slate-300 text-sm">
                                    Você está prestes a excluir a proposta <strong>{proposalToDelete.title}</strong> do cliente {proposalToDelete.companyName}.
                                </p>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-400 uppercase mb-1">
                                        Justificativa da Exclusão <span className="text-red-500">*</span>
                                    </label>
                                    <textarea 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-red-500 outline-none text-sm h-24 resize-none bg-white dark:bg-slate-700 text-slate-900 dark:text-white"
                                        placeholder="Digite o motivo (mínimo 5 caracteres)..."
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                    />
                                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 text-right">
                                        {deleteReason.length}/5 caracteres
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                                <button 
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                                >
                                    Cancelar
                                </button>
                                <button 
                                    onClick={handleConfirmDelete}
                                    disabled={deleteReason.length < 5}
                                    className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700 shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Trash2 size={16}/> Confirmar Exclusão
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="min-h-full flex flex-col bg-slate-100 dark:bg-slate-900 transition-colors">
            {/* Toolbar */}
            <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 p-3 md:p-4 flex flex-col md:flex-row justify-between items-start md:items-center shadow-sm shrink-0 no-print gap-3 md:gap-0 transition-colors">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <button onClick={() => setView('list')} className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                        <ChevronLeft size={24}/>
                    </button>
                    <div className="flex-1 md:flex-none">
                        <h2 className="text-lg md:text-xl font-bold text-slate-800 dark:text-white">
                            {editingId ? 'Editar Proposta' : 'Nova Proposta'}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 md:hidden">Preencha os dados abaixo</p>
                    </div>
                </div>
                
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <button 
                        onClick={() => { setPreviewData(getCurrentFormDataAsProposal()); setShowPreviewModal(true); }}
                        className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition whitespace-nowrap"
                    >
                        <Eye size={18}/> Preview
                    </button>
                    <button 
                        onClick={handleSave} 
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-bold shadow-sm transition whitespace-nowrap"
                    >
                        <Save size={18}/> {editingId ? 'Atualizar Proposta' : 'Salvar e Gerar'}
                    </button>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="lg:hidden flex border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm shrink-0">
                <button 
                    onClick={() => setMobileTab('editor')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mobileTab === 'editor' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <Edit3 size={16}/> Editor
                </button>
                <button 
                    onClick={() => setMobileTab('preview')}
                    className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${mobileTab === 'preview' ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                    <LayoutTemplate size={16}/> Visualizar
                </button>
            </div>

            <div className="flex flex-col lg:flex-row flex-1 relative overflow-hidden">
                {/* Editor (Left) */}
                <div className={`
                    w-full lg:w-5/12 p-4 md:p-6 overflow-y-auto bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 no-print transition-all
                    ${mobileTab === 'preview' ? 'hidden lg:block' : 'block'}
                `}>
                    <div className="max-w-xl mx-auto space-y-6 pb-20 lg:pb-0">
                        
                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Dados do Cliente</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-2">Vincular a:</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-lg">
                                        <button 
                                            onClick={() => setTargetType('lead')}
                                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition ${targetType === 'lead' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            <User size={14}/> Lead (Pipeline)
                                        </button>
                                        <button 
                                            onClick={() => setTargetType('client')}
                                            className={`flex-1 py-2 text-xs font-bold rounded flex items-center justify-center gap-2 transition ${targetType === 'client' ? 'bg-white dark:bg-slate-600 shadow-sm text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                                        >
                                            <Users size={14}/> Cliente (Carteira)
                                        </button>
                                    </div>
                                </div>

                                {targetType === 'lead' ? (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Selecionar Lead</label>
                                        <select onChange={handleSelectLead} value={formData.leadId} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none">
                                            <option value="">Selecione um lead...</option>
                                            {leads.map(l => <option key={l.id} value={l.id}>{l.name} - {l.company}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Selecionar Cliente</label>
                                        <select onChange={handleSelectClient} className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none">
                                            <option value="">Selecione um cliente...</option>
                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nome Cliente</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Empresa</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none" value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Título da Proposta</label>
                                    <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm font-medium bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">Escopo e Valores</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Introdução</label>
                                    <textarea className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm h-24 resize-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none" value={formData.introduction} onChange={e => setFormData({...formData, introduction: e.target.value})} />
                                </div>
                                
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 flex justify-between">
                                        Itens do Escopo
                                        {errors.scope && <span className="text-red-500 font-normal normal-case flex items-center gap-1"><AlertCircle size={12}/> {errors.scope}</span>}
                                    </label>
                                    <div className="flex gap-2 mb-2">
                                        <input 
                                            type="text" 
                                            className={`flex-1 border rounded p-2 text-sm outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white ${errors.scope ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-slate-300 dark:border-slate-600'}`}
                                            placeholder="Adicione um item entregável..."
                                            value={formData.scopeItem}
                                            onChange={e => setFormData({...formData, scopeItem: e.target.value})}
                                            onKeyDown={e => e.key === 'Enter' && addScopeItem()}
                                        />
                                        <button onClick={addScopeItem} className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 p-2 rounded border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300"><Plus size={18}/></button>
                                    </div>
                                    <ul className="space-y-2">
                                        {formData.scope.map((item, idx) => (
                                            <li key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-100 dark:border-slate-700 text-sm dark:text-slate-300">
                                                <span>• {item}</span>
                                                <button onClick={() => removeScopeItem(idx)} className="text-red-400 hover:text-red-600"><Trash2 size={14}/></button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Investimento Total (R$)</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                className={`w-full border rounded p-2 text-sm outline-none focus:ring-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-white
                                                    ${errors.price ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 dark:border-slate-600 focus:ring-blue-500'}`}
                                                value={formData.price} 
                                                onChange={handlePriceChange}
                                            />
                                            {errors.price && <AlertCircle size={16} className="absolute right-2 top-2 text-red-500" title={errors.price} />}
                                        </div>
                                        {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Prazo de Execução</label>
                                        <input type="text" className="w-full border border-slate-300 dark:border-slate-600 rounded p-2 text-sm bg-white dark:bg-slate-700 text-slate-800 dark:text-white outline-none" value={formData.timeline} onChange={e => setFormData({...formData, timeline: e.target.value})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Termos e Condições (Cláusulas)</label>
                                    <textarea 
                                        className="w-full border border-slate-300 dark:border-slate-600 rounded p-3 text-sm h-64 resize-y focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 text-slate-800 dark:text-white" 
                                        placeholder="Digite ou cole as cláusulas contratuais aqui..."
                                        value={formData.terms} 
                                        onChange={e => setFormData({...formData, terms: e.target.value})} 
                                    />
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">O conteúdo se ajustará automaticamente a múltiplas páginas no PDF.</p>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Live Preview (Right) */}
                <div className={`
                    w-full lg:w-7/12 bg-slate-200 dark:bg-slate-950 overflow-auto flex justify-center items-start no-print transition-colors
                    ${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'}
                `}>
                    <div className="transform scale-[0.5] sm:scale-[0.7] md:scale-[0.8] lg:scale-100 origin-top mt-8 mb-20 shadow-2xl shrink-0">
                        <ProposalDocument data={getCurrentFormDataAsProposal()} />
                    </div>
                </div>
            </div>

            {/* --- PREVIEW MODAL WITH ACTIONS --- */}
            {showPreviewModal && previewData && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm no-print animate-fade-in">
                    <div className="bg-slate-100 dark:bg-slate-900 w-full h-full max-w-5xl rounded-xl shadow-2xl overflow-hidden flex flex-col">
                        <div className="bg-white dark:bg-slate-800 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                    <Eye className="text-blue-600 dark:text-blue-400"/> Visualizando: {previewData.title}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">Confira o layout final antes de enviar.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg font-medium transition shadow-sm">
                                    <Printer size={18}/> <span className="hidden md:inline">Imprimir / PDF</span>
                                </button>
                                <div className="w-px h-8 bg-slate-200 dark:bg-slate-700 mx-2 hidden md:block"></div>
                                <button onClick={() => {setShowPreviewModal(false); setPreviewData(null);}} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-500 dark:text-slate-400">
                                    <X size={24}/>
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-200 dark:bg-slate-950 custom-scrollbar">
                            <div className="shadow-2xl transform scale-[0.5] md:scale-100 origin-top md:origin-center">
                                <ProposalDocument data={previewData} />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
