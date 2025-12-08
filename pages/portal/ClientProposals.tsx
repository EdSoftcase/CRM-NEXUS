import React, { useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, FileText, Calendar, Clock, PenTool, X, FileDown, Loader2 } from 'lucide-react';
import { Badge } from '../../components/Widgets';
import { SignaturePad } from '../../components/SignaturePad';
import { ProposalDocument } from '../../components/ProposalDocument'; // Shared component

export const ClientProposals: React.FC = () => {
  const { proposals, updateProposal, clients } = useData();
  const { currentUser } = useAuth();
  
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<string | null>(null);
  
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [proposalToDownload, setProposalToDownload] = useState<string | null>(null);

  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  const myProposals = useMemo(() => {
    if (!currentClient) return [];
    return proposals.filter(p => 
        p.companyName === currentClient.name || 
        p.clientName === currentClient.name ||
        (p.status === 'Sent' && p.companyName.includes(currentClient.name))
    );
  }, [proposals, currentClient]);

  const handleAction = (proposalId: string, action: 'Accepted' | 'Rejected') => {
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal && window.confirm(`Deseja realmente ${action === 'Accepted' ? 'APROVAR' : 'RECUSAR'} esta proposta?`)) {
          updateProposal(currentUser, { ...proposal, status: action });
          alert(`Proposta ${action === 'Accepted' ? 'aprovada' : 'recusada'} com sucesso!`);
      }
  };

  const handleOpenSign = (id: string) => {
      setProposalToSign(id);
      setIsSignModalOpen(true);
  };

  const handleSignComplete = (signatureBase64: string) => {
      if (!proposalToSign) return;
      const proposal = proposals.find(p => p.id === proposalToSign);
      if (proposal) {
          updateProposal(currentUser, { 
              ...proposal, 
              status: 'Accepted',
              signature: signatureBase64,
              signedAt: new Date().toISOString()
          });
          setIsSignModalOpen(false);
          setProposalToSign(null);
          alert("Contrato assinado com sucesso! O status foi atualizado.");
      }
  };

  const handleDownloadPDF = async (proposalId: string) => {
      setProposalToDownload(proposalId);
      setIsGeneratingPDF(true);

      // Esperar o render do componente hidden
      setTimeout(async () => {
          const element = document.getElementById('client-pdf-content');
          const proposal = proposals.find(p => p.id === proposalId);
          
          if (!element || !proposal) {
              setIsGeneratingPDF(false);
              setProposalToDownload(null);
              return;
          }

          const opt = {
              margin: 0,
              filename: `Contrato_${proposal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
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
                  alert("Erro ao carregar gerador de PDF.");
              }
          } catch (e) {
              console.error(e);
              alert("Erro ao gerar PDF.");
          } finally {
              setIsGeneratingPDF(false);
              setProposalToDownload(null);
          }
      }, 500); // Delay para render
  };

  const downloadData = proposalToDownload ? proposals.find(p => p.id === proposalToDownload) : null;

  if (!currentClient) return null;

  return (
    <div className="space-y-6">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Propostas Comerciais</h1>
            <p className="text-slate-500">Visualize e aprove propostas pendentes.</p>
        </div>

        <div className="grid grid-cols-1 gap-6">
            {myProposals.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                    <FileText size={48} className="mx-auto text-slate-300 mb-4"/>
                    <p className="text-slate-500">Nenhuma proposta disponível no momento.</p>
                </div>
            ) : (
                myProposals.map(prop => (
                    <div key={prop.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition">
                        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <div className="flex items-center gap-3 mb-1">
                                    <h3 className="text-lg font-bold text-slate-900">{prop.title}</h3>
                                    <Badge color={prop.status === 'Accepted' ? 'green' : prop.status === 'Rejected' ? 'red' : 'blue'}>
                                        {prop.status === 'Sent' ? 'Aguardando Aprovação' : prop.status}
                                    </Badge>
                                </div>
                                <p className="text-sm text-slate-500">Enviada em {new Date(prop.createdDate).toLocaleDateString()}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase font-bold">Investimento</p>
                                <p className="text-2xl font-bold text-slate-800">R$ {prop.price.toLocaleString()}</p>
                            </div>
                        </div>
                        
                        <div className="p-6 bg-slate-50/50">
                            <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Resumo do Escopo</h4>
                            <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1 mb-6">
                                {prop.scope.slice(0, 3).map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                ))}
                                {prop.scope.length > 3 && <li>... e mais {prop.scope.length - 3} itens.</li>}
                            </ul>

                            <div className="flex items-center gap-6 text-sm text-slate-500 mb-6">
                                <span className="flex items-center gap-2"><Calendar size={16}/> Validade: {new Date(prop.validUntil).toLocaleDateString()}</span>
                                <span className="flex items-center gap-2"><Clock size={16}/> Prazo: {prop.timeline}</span>
                            </div>

                            {prop.status === 'Sent' && (
                                <div className="flex gap-3 pt-4 border-t border-slate-200">
                                    <button 
                                        onClick={() => handleOpenSign(prop.id)}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                                    >
                                        <PenTool size={18}/> Assinar Digitalmente
                                    </button>
                                    <button 
                                        onClick={() => handleAction(prop.id, 'Rejected')}
                                        className="px-6 py-3 border border-red-200 text-red-600 rounded-lg font-bold hover:bg-red-50 transition"
                                    >
                                        Recusar
                                    </button>
                                </div>
                            )}
                            
                            {prop.status === 'Accepted' && (
                                <div className="bg-green-50 border border-green-200 p-4 rounded-lg flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-green-800 text-sm font-medium mb-2">
                                            <CheckCircle size={18}/> Proposta aprovada! Em breve entraremos em contato para o início.
                                        </div>
                                        {prop.signature && (
                                            <div className="mt-2 p-2 bg-white rounded border border-green-100 inline-block">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Assinado em {new Date(prop.signedAt!).toLocaleDateString()}</p>
                                                <img src={prop.signature} alt="Assinatura" className="h-12 mix-blend-multiply opacity-80" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => handleDownloadPDF(prop.id)}
                                        disabled={isGeneratingPDF}
                                        className="bg-white text-green-700 border border-green-200 px-4 py-2 rounded-lg font-bold hover:bg-green-50 transition shadow-sm flex items-center gap-2 disabled:opacity-50"
                                    >
                                        {isGeneratingPDF && proposalToDownload === prop.id ? <Loader2 className="animate-spin" size={16}/> : <FileDown size={16}/>}
                                        Baixar Contrato
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))
            )}
        </div>

        {/* SIGNATURE MODAL */}
        {isSignModalOpen && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-900">Assinatura do Contrato</h3>
                        <button onClick={() => setIsSignModalOpen(false)}><X size={20} className="text-slate-400"/></button>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-slate-600 mb-4">
                            Ao assinar abaixo, você concorda com todos os termos e condições descritos na proposta comercial.
                        </p>
                        <SignaturePad onSave={handleSignComplete} />
                    </div>
                </div>
            </div>
        )}

        {/* HIDDEN PDF CONTAINER */}
        {downloadData && (
            <div className="fixed top-0 left-0 -z-50 opacity-0 pointer-events-none w-[210mm]" style={{ transform: 'translateX(-9999px)' }}>
                <div id="client-pdf-content">
                    <ProposalDocument data={downloadData} />
                </div>
            </div>
        )}
    </div>
  );
};