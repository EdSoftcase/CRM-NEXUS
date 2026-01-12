
import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Proposal, Project } from '../../types';
import { Badge } from '../../components/Widgets';
import { ProposalDocument } from '../../components/ProposalDocument';
import { SignaturePad } from '../../components/SignaturePad';
import { FileText as FileTextIcon, Search as SearchIcon, PenTool as PenIcon, X as XIcon, Loader2 as LoaderIcon, CheckCircle as CheckIcon, Download as DownloadIcon, Building2 as BuildingIcon } from 'lucide-react';

export const ClientProposals: React.FC = () => {
  const { currentUser } = useAuth();
  const { proposals, updateProposal, addProject, projects, addSystemNotification, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<Proposal | null>(null);
  const [isSigning, setIsSigning] = useState(false);

  const normalizeStr = (s: string) => s ? s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase() : "";

  const myProposals = useMemo(() => {
    if (!currentUser || currentUser.role !== 'client') return [];
    const userGroup = normalizeStr(currentUser.managedGroupName || "");
    const userEmail = currentUser.email?.toLowerCase().trim() || "";

    return proposals.filter(p => {
        if (p.status === 'Draft') return false;
        const propGroup = normalizeStr(p.groupName || "");
        const propEmail = (p.clientEmail || "").toLowerCase().trim();
        const propCustomer = normalizeStr(p.companyName || "");

        let isOwner = false;
        if (userGroup && propGroup) {
            if (userGroup === propGroup) isOwner = true;
        } else {
            if (propEmail === userEmail || propCustomer === normalizeStr(currentUser.name)) isOwner = true;
        }
        if (!isOwner) return false;
        const search = searchTerm.toLowerCase();
        return p.title.toLowerCase().includes(search) || propCustomer.toLowerCase().includes(search);
    });
  }, [proposals, searchTerm, currentUser]);

  const handleConfirmSignature = async (signatureBase64: string) => {
      if (!proposalToSign || !currentUser) return;
      setIsSigning(true);
      
      const updatedProposal: Proposal = {
          ...proposalToSign,
          status: 'Accepted',
          signature: signatureBase64,
          signedAt: new Date().toISOString(),
          signedByIp: 'Client Portal'
      };

      try {
          await updateProposal(currentUser, updatedProposal);
          const projectExists = projects.some(p => p.title.includes(proposalToSign.id) || (p.clientName === proposalToSign.companyName && p.title === proposalToSign.title));
          
          if (!projectExists) {
              // CORREÇÃO AQUI: Concatenamos os itens do quadro "Escopo do Projeto" para a descrição da produção
              const scopeText = proposalToSign.scope && proposalToSign.scope.length > 0 
                ? proposalToSign.scope.join(' | ') 
                : "Escopo detalhado na proposta assinada.";

              const newProject: Project = {
                  id: `PROJ-AUTO-${Date.now()}`,
                  title: proposalToSign.title,
                  clientName: proposalToSign.companyName,
                  status: 'Kitting',
                  progress: 25,
                  startDate: new Date().toISOString(),
                  deadline: proposalToSign.validUntil || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
                  manager: 'Comercial (Aceite Digital)',
                  description: scopeText, // Agora usa o texto livre do Editor de Propostas
                  products: proposalToSign.items?.map(item => item.name) || [],
                  tasks: proposalToSign.scope?.map((s, idx) => ({ 
                      id: `t-${idx}`, 
                      title: s, 
                      status: 'Pending' 
                  })) || [
                      { id: 't1', title: 'Verificação de Itens em Estoque', status: 'Pending' },
                      { id: 't2', title: 'Configuração de Firmware LPR', status: 'Pending' }
                  ],
                  organizationId: proposalToSign.organizationId || currentUser.organizationId,
                  archived: false
              };
              await addProject(currentUser, newProject);
          }
          addSystemNotification('Sucesso', 'Contrato assinado e enviado para Produção.', 'success');
          setIsSignModalOpen(false);
          setProposalToSign(null);
          setTimeout(() => refreshData(), 800);
      } catch (err) { 
          alert(`Erro ao processar assinatura.`); 
      } finally {
          setIsSigning(false);
      }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Contratos e Propostas</h1>
                <p className="text-slate-500 font-medium">Documentos exclusivos para: <strong>{currentUser?.managedGroupName || currentUser?.name}</strong></p>
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
                                <button onClick={() => { setProposalToSign(prop); setIsSignModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg transition transform active:scale-95">Visualizar e Assinar</button>
                             ) : (
                                <button className="w-full py-4 bg-white text-slate-900 font-black uppercase text-xs tracking-widest rounded-2xl border-2 border-slate-200 hover:bg-slate-100 transition flex items-center justify-center gap-2">
                                    <DownloadIcon size={16}/> Baixar Cópia
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
                        <h3 className="font-black text-lg md:text-xl text-slate-900 uppercase tracking-tighter">Assinatura Digital</h3>
                        <button onClick={() => setIsSignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><XIcon size={24}/></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 relative">
                        <div className="flex-1 p-4 md:p-10 overflow-y-auto custom-scrollbar flex justify-center">
                            <div className="transform scale-[0.65] sm:scale-[0.85] lg:scale-90 xl:scale-100 origin-top">
                                <ProposalDocument data={proposalToSign} />
                            </div>
                        </div>

                        <div className="w-full md:w-[400px] bg-white border-t md:border-t-0 md:border-l p-6 md:p-8 flex flex-col gap-6 shadow-2xl z-20 relative overflow-y-auto custom-scrollbar">
                             {isSigning && (
                                 <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center text-center p-10">
                                     <LoaderIcon className="animate-spin text-indigo-600 mb-4" size={48}/>
                                     <p className="font-black uppercase text-xs tracking-widest text-slate-600">Finalizando Contrato...</p>
                                 </div>
                             )}
                             <div className="bg-indigo-50 p-5 rounded-[1.5rem] border border-indigo-100 shrink-0">
                                 <h4 className="font-black text-indigo-900 uppercase tracking-tighter mb-2 flex items-center gap-2"><PenIcon size={18}/> Formalização</h4>
                                 <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">Ao assinar no campo abaixo, você confirma o aceite eletrônico de todas as cláusulas deste contrato.</p>
                             </div>
                             
                             <div className="flex-1 min-h-[250px] md:min-h-0">
                                 <SignaturePad onSave={handleConfirmSignature} />
                             </div>

                             <div className="pt-4 border-t border-slate-100 md:hidden">
                                 <button onClick={() => setIsSignModalOpen(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-[10px] tracking-widest">Cancelar e Fechar</button>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
