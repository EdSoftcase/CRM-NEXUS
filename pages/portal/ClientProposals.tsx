
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Proposal, Project } from '../../types';
import { Badge } from '../../components/Widgets';
import { ProposalDocument } from '../../components/ProposalDocument';
import { SignaturePad } from '../../components/SignaturePad';
import { FileText as FileTextIcon, Search as SearchIcon, PenTool as PenIcon, X as XIcon, Loader2 as LoaderIcon, CheckCircle as CheckIcon, Download as DownloadIcon, Building2 as BuildingIcon } from 'lucide-react';

// Declarar html2pdf para o TS
declare const html2pdf: any;

export const ClientProposals: React.FC = () => {
  const { currentUser } = useAuth();
  const { proposals, updateProposal, addProject, clients, addSystemNotification, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<Proposal | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const normalizeStr = (s: any) => s ? String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

  const myProposals = useMemo(() => {
    if (!currentUser || currentUser.role !== 'client') return [];
    
    const userGroup = normalizeStr(currentUser.managedGroupName);
    const userEmail = currentUser.email?.toLowerCase().trim() || "";
    
    const accessibleUnitNames = new Set(clients.map(c => normalizeStr(c.name)));

    return proposals.filter(p => {
        if (p.status === 'Draft') return false;

        const propGroup = normalizeStr(p.groupName);
        const propCustomer = normalizeStr(p.companyName);
        const propEmail = (p.clientEmail || "").toLowerCase().trim();

        let isOwner = false;
        if (userGroup && propGroup === userGroup) isOwner = true;
        else if (accessibleUnitNames.has(propCustomer)) isOwner = true;
        else if (propEmail === userEmail) isOwner = true;

        if (!isOwner) return false;

        const search = searchTerm.toLowerCase();
        return p.title.toLowerCase().includes(search) || propCustomer.toLowerCase().includes(search);
    });
  }, [proposals, searchTerm, currentUser, clients]);

  const handleDownloadPdf = (prop: Proposal) => {
      const element = document.getElementById(`prop-doc-${prop.id}`);
      if (!element) {
          addSystemNotification("Download", "Abra o documento para gerar o PDF.", "info");
          return;
      }
      const opt = {
          margin: 10,
          filename: `Contrato_${prop.companyName}_${prop.id}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      html2pdf().from(element).set(opt).save();
  };

  const handleConfirmSignature = async (signatureBase64: string) => {
      if (!proposalToSign || !currentUser) return;
      setIsSigning(true);
      
      try {
          const updatedProposal: Proposal = {
              ...proposalToSign,
              status: 'Accepted',
              signature: signatureBase64,
              signedAt: new Date().toISOString(),
              signedByIp: 'Client Portal'
          };

          // 1. Atualiza a proposta no banco de dados via DataContext
          await updateProposal(currentUser, updatedProposal);

          // 2. Criação do Projeto na esteira (Automação de Fluxo)
          const scopeItems = proposalToSign.scope && proposalToSign.scope.length > 0 
            ? proposalToSign.scope 
            : ["Instalação de Equipamentos", "Configuração de Software LPR", "Treinamento Operacional"];

          const targetOrgId = proposalToSign.organizationId || currentUser.organizationId || 'org-1';

          const newProject: Project = {
              id: `PROJ-AUTO-${Date.now()}`,
              title: `${proposalToSign.title} (Ref: ${proposalToSign.id})`,
              clientName: proposalToSign.companyName,
              status: 'Kitting', 
              progress: 20,      
              startDate: new Date().toISOString(),
              deadline: proposalToSign.validUntil || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
              manager: 'Portal (Aceite Digital)',
              description: proposalToSign.customClause || `Projeto gerado automaticamente via Portal do Cliente após aceite da proposta ${proposalToSign.id}.`,
              products: proposalToSign.items?.map(item => item.name) || [],
              tasks: scopeItems.map((s, idx) => ({ 
                  id: `t-${idx}-${Date.now()}`, 
                  title: s, 
                  status: 'Pending' 
              })),
              organizationId: targetOrgId,
              archived: false
          };

          await addProject(currentUser, newProject);

          addSystemNotification('Sucesso', 'Contrato assinado. O projeto já está na nossa esteira de produção.', 'success');
          
          // Fecha o modal e recarrega os dados locais
          setIsSignModalOpen(false);
          setProposalToSign(null);
          refreshData();
          
      } catch (err: any) { 
          console.error("Signature processing error:", err);
          const errorMessage = err?.message || (typeof err === 'string' ? err : "Erro inesperado ao registrar assinatura.");
          alert(`Falha ao registrar assinatura: ${errorMessage}`); 
          setIsSigning(false); // Garante que o loading seja limpo em caso de erro
      } finally {
          // O estado isSigning é resetado no catch ou no sucesso antes do fechamento
      }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Contratos e Propostas</h1>
                <p className="text-slate-500 font-medium">Documentos exclusivos para gestão comercial.</p>
            </div>
            <div className="relative w-full md:w-64">
                <SearchIcon className="absolute left-3 top-2.5 text-slate-400" size={18}/>
                <input 
                    type="text" 
                    placeholder="Filtrar nesta lista..." 
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {myProposals.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-slate-200 mb-4">
                    <FileTextIcon size={40} />
                </div>
                <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Nenhum contrato localizado</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myProposals.map(prop => (
                    <div key={prop.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col overflow-hidden relative">
                        {prop.status === 'Accepted' && (
                            <div className="absolute top-4 right-4 bg-emerald-500 text-white p-1.5 rounded-full shadow-lg z-10 animate-scale-in">
                                <CheckIcon size={16} />
                            </div>
                        )}
                        <div className="p-8 flex-1">
                            <div className="flex justify-between mb-6">
                                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                    <FileTextIcon size={28}/>
                                </div>
                                <Badge color={prop.status === 'Accepted' ? 'green' : 'blue'}>
                                    {prop.status === 'Accepted' ? 'ASSINADO' : 'PENDENTE'}
                                </Badge>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight leading-tight line-clamp-2">{prop.title}</h3>
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase mb-6">
                                <BuildingIcon size={12}/> {prop.companyName}
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t flex flex-col gap-2">
                             {prop.status === 'Sent' ? (
                                <button onClick={() => { setProposalToSign(prop); setIsSignModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">
                                    <PenIcon size={18}/> Revisar e Assinar
                                </button>
                             ) : (
                                <button onClick={() => { setProposalToSign(prop); setIsSignModalOpen(true); }} className="w-full py-4 bg-white text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition flex items-center justify-center gap-2">
                                    <DownloadIcon size={16}/> Visualizar Cópia
                                </button>
                             )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isSignModalOpen && proposalToSign && (
            <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-2 md:p-4 backdrop-blur-md animate-fade-in">
                <div className="bg-white w-full max-w-6xl h-full md:h-[94vh] rounded-[2rem] md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in border border-white/20">
                    <div className="p-4 md:p-6 border-b flex justify-between items-center bg-slate-50 shrink-0">
                        <div className="flex items-center gap-4">
                            <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tighter">Documento Digital</h3>
                            <button onClick={() => handleDownloadPdf(proposalToSign)} className="bg-white border-2 border-slate-200 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition">
                                <DownloadIcon size={14}/> Gerar PDF
                            </button>
                        </div>
                        <button onClick={() => setIsSignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><XIcon size={24}/></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
                        <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar flex justify-center">
                            <div className="transform scale-[0.6] sm:scale-[0.85] lg:scale-90 xl:scale-100 origin-top">
                                <ProposalDocument id={`prop-doc-${proposalToSign.id}`} data={proposalToSign} />
                            </div>
                        </div>

                        <div className="w-full md:w-[400px] bg-white border-t md:border-t-0 md:border-l p-6 md:p-8 flex flex-col gap-6 shadow-2xl z-20 relative overflow-y-auto custom-scrollbar">
                             {isSigning && (
                                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-10">
                                     <LoaderIcon className="animate-spin text-indigo-600 mb-4" size={48}/>
                                     <p className="font-black uppercase text-xs tracking-widest text-slate-600">Sincronizando Aceite...</p>
                                 </div>
                             )}
                             
                             {proposalToSign.status === 'Accepted' ? (
                                 <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-200 text-center">
                                     <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                                         <CheckIcon size={32}/>
                                     </div>
                                     <h4 className="font-black text-emerald-900 uppercase text-lg mb-2">Contrato Ativo</h4>
                                     <p className="text-xs text-emerald-700 leading-relaxed">Este contrato foi assinado em <strong>{new Date(proposalToSign.signedAt!).toLocaleDateString()}</strong> e já está em processamento técnico.</p>
                                 </div>
                             ) : (
                                 <>
                                    <div className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 shrink-0">
                                        <h4 className="font-black text-indigo-900 uppercase tracking-tighter mb-2 flex items-center gap-2"><PenIcon size={18}/> Formalização</h4>
                                        <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">Ao assinar no campo abaixo, você confirma o aceite eletrônico deste contrato.</p>
                                    </div>
                                    <div className="flex-1 min-h-[300px] md:min-h-0 bg-slate-50 rounded-2xl border border-dashed border-slate-200 p-2">
                                        <SignaturePad onSave={handleConfirmSignature} />
                                    </div>
                                 </>
                             )}

                             <div className="pt-4 border-t border-slate-100 md:hidden">
                                 <button onClick={() => setIsSignModalOpen(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Sair do Modo Visualização</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
