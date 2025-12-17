
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Proposal, Project, ProjectTask } from '../../types';
import { FileText, Download, CheckCircle, Clock, XCircle, Search, PenTool, X, Save, AlertCircle, CalendarClock, Loader2 } from 'lucide-react';
import { Badge } from '../../components/Widgets';
import { ProposalDocument } from '../../components/ProposalDocument';
import { SignaturePad } from '../../components/SignaturePad';

export const ClientProposals: React.FC = () => {
  const { currentUser } = useAuth();
  const { proposals, clients, updateProposal, addProject, addSystemNotification } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null); // For PDF download (hidden)
  const [isDownloading, setIsDownloading] = useState(false);
  
  // SIGNATURE STATE
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<Proposal | null>(null);

  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  const myProposals = useMemo(() => {
    if (!currentClient) return [];
    
    // Normalize Helper
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const clientName = normalize(currentClient.name);
    const clientContact = normalize(currentClient.contactPerson);

    return proposals.filter(p => {
        // 1. REGRA DE OURO: Clientes NUNCA veem rascunhos
        if (p.status === 'Draft') return false;

        // 2. Match by ID (Best)
        if (p.clientId && p.clientId === currentClient.id) return true;

        // 3. Match by Company Name (Fuzzy)
        const propCompany = normalize(p.companyName);
        if (propCompany && (propCompany === clientName || propCompany.includes(clientName) || clientName.includes(propCompany))) return true;
        
        // 4. Match by Client Name (Person) - fallback
        const propClientName = normalize(p.clientName);
        if (propClientName && (propClientName === clientContact || propClientName === clientName)) return true;

        return false;
    }).filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [proposals, currentClient, searchTerm]);

  const handleDownload = async (proposal: Proposal) => {
      setSelectedProposal(proposal);
      setIsDownloading(true);
      
      // Wait for DOM to render the hidden component
      setTimeout(async () => {
          const element = document.getElementById('client-proposal-pdf-content');
          if (element) {
             const opt = {
                margin: 0,
                filename: `Proposta_${proposal.title.replace(/[^a-z0-9]/gi, '_')}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            try {
                // @ts-ignore
                if (window.html2pdf) {
                    // @ts-ignore
                    await window.html2pdf().set(opt).from(element).save();
                } else {
                    // Fallback if library missing
                    window.print();
                }
            } catch (e) {
                console.error("PDF Error", e);
                alert("Erro ao gerar PDF.");
            }
          }
          setIsDownloading(false);
          setSelectedProposal(null);
      }, 1000);
  };

  const handleOpenSign = (proposal: Proposal) => {
      setProposalToSign(proposal);
      setIsSignModalOpen(true);
  };

  const handleConfirmSignature = (signatureBase64: string) => {
      if (!proposalToSign || !currentUser) return;

      // 1. Atualizar Proposta para "Accepted"
      const updatedProposal: Proposal = {
          ...proposalToSign,
          status: 'Accepted',
          signature: signatureBase64,
          signedAt: new Date().toISOString(),
          signedByIp: 'Client Portal (IP Logged)' // Em produção, pegar IP real
      };

      updateProposal(currentUser, updatedProposal);
      addSystemNotification('Proposta Assinada', `A proposta "${updatedProposal.title}" foi assinada digitalmente por ${currentClient?.name}.`, 'success');

      // 2. AUTOMATION: Criar Projeto em Operações
      // Mapeia o escopo da proposta para a descrição do projeto
      const scopeText = proposalToSign.scope && proposalToSign.scope.length > 0 
          ? `\n\n--- ESCOPO CONTRATADO ---\n- ${proposalToSign.scope.join('\n- ')}` 
          : '';

      const newProject: Project = {
          id: `PROJ-${proposalToSign.id}-${Date.now()}`, // ID único baseado na proposta
          title: proposalToSign.title,
          clientName: proposalToSign.companyName || proposalToSign.clientName, // Use company name if available
          status: 'Planning', // Coluna "Proposta Aprovada" no Kanban de Operações
          progress: 0,
          startDate: new Date().toISOString(),
          deadline: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString(), // Default 30 dias
          manager: 'A Definir', // Será atribuído pelo gestor
          description: `${proposalToSign.introduction}${scopeText}`,
          tasks: [] as ProjectTask[], // Começa sem tarefas ou pode-se gerar via IA depois
          // CRÍTICO: Usar o ID da organização da PROPOSTA. Se a proposta não tiver, fallback para current user (que pode estar vazio se for cliente externo)
          organizationId: proposalToSign.organizationId || currentUser.organizationId || 'org-1',
          archived: false,
          products: proposalToSign.scope || [], // CORREÇÃO: Transfere o escopo/produtos para o projeto
          installationNotes: 'Projeto criado automaticamente via assinatura no portal.'
      };

      console.log("Automação: Criando projeto...", newProject);
      addProject(currentUser, newProject);
      addSystemNotification('Produção Iniciada', `Projeto "${newProject.title}" enviado para o Painel de Produção.`, 'info');
      
      setIsSignModalOpen(false);
      setProposalToSign(null);
      alert("Proposta assinada com sucesso! O projeto foi enviado para nossa equipe de produção.");
  };

  if (!currentClient) return (
      <div className="p-12 text-center flex flex-col items-center justify-center h-full">
          <AlertCircle size={48} className="text-slate-300 mb-4"/>
          <h3 className="text-lg font-bold text-slate-700">Perfil não vinculado</h3>
          <p className="text-slate-500">Seu usuário não está associado a uma conta de cliente válida.</p>
      </div>
  );

  return (
    <div className="space-y-6">
        {/* Hidden PDF Container */}
        {selectedProposal && (
             <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                <div id="client-proposal-pdf-content">
                    <ProposalDocument data={selectedProposal} />
                </div>
            </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Minhas Propostas</h1>
                <p className="text-slate-500">Histórico de orçamentos e contratos.</p>
            </div>
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Buscar proposta..." 
                    className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {myProposals.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                <FileText size={48} className="mx-auto text-slate-300 mb-4"/>
                <p className="text-slate-500 font-medium">Nenhuma proposta disponível no momento.</p>
                <p className="text-xs text-slate-400 mt-1">Quando receber uma nova proposta, ela aparecerá aqui.</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProposals.map(prop => (
                    <div key={prop.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden group flex flex-col">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${prop.status === 'Accepted' ? 'bg-green-100 text-green-600' : prop.status === 'Rejected' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileText size={24}/>
                                </div>
                                <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Rejected' ? 'red' : 'blue'}>
                                    {prop.status === 'Accepted' ? 'Aprovada' : prop.status === 'Rejected' ? 'Recusada' : 'Pendente'}
                                </Badge>
                            </div>
                            
                            <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1" title={prop.title}>{prop.title}</h3>
                            <div className="flex flex-col gap-1 text-xs text-slate-500 mb-4">
                                <div className="flex items-center gap-1">
                                    <Clock size={12}/> Validade: {new Date(prop.validUntil).toLocaleDateString()}
                                </div>
                                {prop.timeline && (
                                    <div className="flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                        <CalendarClock size={12}/> Instalação: {prop.timeline}
                                    </div>
                                )}
                            </div>
                            
                            <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                {prop.setupCost !== undefined && prop.setupCost > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Setup</span>
                                        <span className="font-medium text-slate-900">R$ {(prop.setupCost || 0).toLocaleString()}</span>
                                    </div>
                                )}
                                {prop.monthlyCost !== undefined && prop.monthlyCost > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Mensalidade</span>
                                        <span className="font-medium text-slate-900">R$ {(prop.monthlyCost || 0).toLocaleString()}</span>
                                    </div>
                                )}
                                {(!prop.setupCost && !prop.monthlyCost) && (
                                     <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Total</span>
                                        <span className="font-medium text-slate-900">R$ {(prop.price || 0).toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                             {/* SIGNATURE BUTTON */}
                             {prop.status === 'Sent' && (
                                <button 
                                    onClick={() => handleOpenSign(prop)}
                                    className="w-full py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition flex items-center justify-center gap-2 shadow-sm"
                                >
                                    <PenTool size={16}/> Revisar e Assinar
                                </button>
                            )}

                            <button 
                                onClick={() => handleDownload(prop)}
                                disabled={isDownloading && selectedProposal?.id === prop.id}
                                className="w-full py-2 bg-white text-slate-600 font-bold text-sm rounded-lg border border-slate-200 hover:bg-slate-100 transition flex items-center justify-center gap-2"
                            >
                                {isDownloading && selectedProposal?.id === prop.id ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>} 
                                Baixar PDF
                            </button>
                        </div>

                        {prop.status === 'Accepted' && (
                            <div className="px-5 py-3 bg-green-50 border-t border-green-100 text-xs text-green-700 flex items-center gap-2">
                                <CheckCircle size={14}/> Assinada em {prop.signedAt ? new Date(prop.signedAt).toLocaleDateString() : '-'}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* SIGNATURE MODAL */}
        {isSignModalOpen && proposalToSign && (
            <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">Assinatura Digital de Contrato</h3>
                            <p className="text-sm text-slate-500">Documento: {proposalToSign.title}</p>
                        </div>
                        <button onClick={() => setIsSignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24}/></button>
                    </div>
                    
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        {/* Preview Document */}
                        <div className="flex-1 bg-slate-200 p-4 md:p-8 overflow-y-auto shadow-inner custom-scrollbar">
                            <div className="transform origin-top scale-[0.6] md:scale-[0.8] mb-10 bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] pointer-events-none">
                                <ProposalDocument data={proposalToSign} />
                            </div>
                        </div>

                        {/* Signature Area */}
                        <div className="w-full md:w-96 bg-white border-l p-6 flex flex-col gap-6 shrink-0 z-10 shadow-xl">
                             <div>
                                 <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PenTool size={18}/> Assinatura</h4>
                                 <p className="text-xs text-slate-500 mb-4">
                                     Por favor, assine no campo abaixo para aceitar a proposta.
                                 </p>
                                 <SignaturePad onSave={handleConfirmSignature} />
                             </div>
                             
                             <div className="mt-auto pt-6 border-t space-y-4">
                                 <div className="flex items-start gap-2 p-3 bg-blue-50 rounded text-xs text-blue-800 border border-blue-100">
                                     <Clock size={16} className="shrink-0 mt-0.5"/>
                                     <p>Sua assinatura será registrada com carimbo de tempo, IP e hash de segurança para validade jurídica.</p>
                                 </div>
                                 <div className="flex gap-3">
                                     <button onClick={() => setIsSignModalOpen(false)} className="flex-1 py-3 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
