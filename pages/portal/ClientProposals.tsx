
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Proposal, Project, ProjectTask, Issue } from '../../types';
import { FileText, Download, CheckCircle, Clock, XCircle, Search, PenTool, X, Save, AlertCircle, CalendarClock, Loader2, Send } from 'lucide-react';
import { Badge } from '../../components/Widgets';
import { ProposalDocument } from '../../components/ProposalDocument';
import { SignaturePad } from '../../components/SignaturePad';

export const ClientProposals: React.FC = () => {
  const { currentUser } = useAuth();
  // Fix: Adding refreshData to the destructured properties from useData hook
  const { proposals, clients, updateProposal, addProject, addIssue, addSystemNotification, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null); 
  const [isDownloading, setIsDownloading] = useState(false);
  
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<Proposal | null>(null);

  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  const myProposals = useMemo(() => {
    if (!currentUser) return [];
    
    const normalize = (s: string) => (s || '').trim().toLowerCase();
    const userEmail = normalize(currentUser.email || '');

    return proposals.filter(p => {
        // Regra de segurança: A proposta deve estar em estado Enviada ou Aceita
        if (p.status === 'Draft') return false;
        
        // Match 1: Pelo ID vinculado do cliente
        if (currentClient && p.clientId === currentClient.id) return true;
        
        // Match 2: Pelo e-mail cadastrado na proposta
        if (p.clientEmail && normalize(p.clientEmail) === userEmail) return true;
        
        // Match 3: Pelo nome da empresa (reserva)
        if (currentClient && p.companyName && normalize(p.companyName) === normalize(currentClient.name)) return true;

        return false;
    }).filter(p => 
        p.title.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
  }, [proposals, currentClient, currentUser, searchTerm]);

  const handleDownload = async (proposal: Proposal) => {
      setSelectedProposal(proposal);
      setIsDownloading(true);
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
                    window.print();
                }
            } catch (e) {
                console.error("PDF Error", e);
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

      const updatedProposal: Proposal = {
          ...proposalToSign,
          status: 'Accepted',
          signature: signatureBase64,
          signedAt: new Date().toISOString(),
          signedByIp: 'Client Portal' 
      };

      // 1. Atualizar a Proposta
      updateProposal(currentUser, updatedProposal);
      addSystemNotification('Proposta Assinada', `A proposta "${updatedProposal.title}" foi assinada digitalmente.`, 'success');

      const scopeItems = proposalToSign.scope || [];
      const scopeText = scopeItems.length > 0 
          ? `\n\n--- ESCOPO CONTRATADO ---\n- ${scopeItems.join('\n- ')}` 
          : '';

      // 2. Criar o Projeto DIRETO em Kitting com o ESCOPO preenchido e 25% de progresso
      const newProject: Project = {
          id: `PROJ-${proposalToSign.id}-${Date.now()}`,
          title: proposalToSign.title,
          clientName: proposalToSign.companyName || proposalToSign.clientName, 
          status: 'Kitting', 
          progress: 25, // Inicia em Kitting = 25% conforme nova regra
          startDate: new Date().toISOString(),
          deadline: new Date(new Date().setDate(new Date().getDate() + 45)).toISOString(), 
          manager: 'A Definir', 
          description: `${proposalToSign.introduction}${scopeText}`,
          tasks: scopeItems.map((s, i) => ({ id: `t-${i}-${Date.now()}`, title: s, status: 'Pending' })), 
          organizationId: proposalToSign.organizationId || currentUser.organizationId || 'org-1',
          archived: false,
          products: scopeItems,
          proposalId: proposalToSign.id
      };

      addProject(currentUser, newProject);
      addSystemNotification('Produção Iniciada', `O projeto "${newProject.clientName}" entrou na fase de Kitting (25%).`, 'info');

      // 3. Se houver desenvolvimento, criar issue
      if (proposalToSign.includesDevelopment) {
          const newIssue: Issue = {
              id: `DEV-${proposalToSign.id.slice(-4)}`,
              title: `Desenv: ${proposalToSign.title}`,
              type: 'Feature',
              status: 'Backlog',
              points: 5,
              assignee: 'A Definir',
              sprint: 'Próxima Sprint',
              project: proposalToSign.companyName || proposalToSign.clientName,
              progress: 0,
              notes: [],
              organizationId: proposalToSign.organizationId || currentUser.organizationId || 'org-1',
              proposalId: proposalToSign.id
          };
          addIssue(currentUser, newIssue);
      }
      
      setIsSignModalOpen(false);
      setProposalToSign(null);
      alert("Contrato assinado com sucesso! O setor de Kitting já visualiza seu pedido.");
  };

  if (!currentUser) return null;

  return (
    <div className="space-y-6">
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
                {/* Fix: refreshData is now available from the hook destructuring */}
                <button onClick={() => refreshData()} className="mt-4 text-sm font-bold text-blue-600 underline">Atualizar Dados</button>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {myProposals.map(prop => (
                    <div key={prop.id} className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden group flex flex-col">
                        <div className="p-5 flex-1">
                            <div className="flex justify-between items-start mb-3">
                                <div className={`p-2 rounded-lg ${prop.status === 'Accepted' ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
                                    <FileText size={24}/>
                                </div>
                                <Badge color={prop.status === 'Accepted' ? 'green' : 'blue'}>
                                    {prop.status === 'Accepted' ? 'Aprovada' : 'Pendente'}
                                </Badge>
                            </div>
                            <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{prop.title}</h3>
                            <div className="text-xs text-slate-500 mb-4">
                                Validade: {new Date(prop.validUntil).toLocaleDateString()}
                            </div>
                            <div className="space-y-2 mb-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Setup</span>
                                    <span className="font-bold">R$ {(prop.price || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Mensal</span>
                                    <span className="font-bold">R$ {(prop.monthlyCost || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
                             {prop.status === 'Sent' && (
                                <button onClick={() => handleOpenSign(prop)} className="w-full py-2 bg-indigo-600 text-white font-bold text-sm rounded-lg hover:bg-indigo-700 transition">
                                    Revisar e Assinar
                                </button>
                            )}
                            <button onClick={() => handleDownload(prop)} disabled={isDownloading} className="w-full py-2 bg-white text-slate-600 font-bold text-sm rounded-lg border border-slate-200 hover:bg-slate-100 transition">
                                {isDownloading ? 'Gerando...' : 'Baixar PDF'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isSignModalOpen && proposalToSign && (
            <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                    <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-lg text-slate-900">Assinatura Digital de Contrato</h3>
                        <button onClick={() => setIsSignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X size={24}/></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                        <div className="flex-1 bg-slate-200 p-4 md:p-8 overflow-y-auto shadow-inner custom-scrollbar">
                            <div className="transform origin-top scale-[0.6] md:scale-[0.8] mb-10 bg-white shadow-lg mx-auto w-[210mm] min-h-[297mm] pointer-events-none">
                                <ProposalDocument data={proposalToSign} />
                            </div>
                        </div>
                        <div className="w-full md:w-96 bg-white border-l p-6 flex flex-col gap-6 shrink-0 z-10 shadow-xl">
                             <div>
                                 <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><PenTool size={18}/> Assinatura</h4>
                                 <p className="text-xs text-slate-500 mb-4">Assine no campo abaixo para aceitar a proposta.</p>
                                 <SignaturePad onSave={handleConfirmSignature} />
                             </div>
                             <div className="mt-auto pt-6 border-t">
                                 <button onClick={() => setIsSignModalOpen(false)} className="w-full py-3 border border-slate-300 rounded-lg text-slate-600 font-bold hover:bg-slate-50 transition">Cancelar</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
