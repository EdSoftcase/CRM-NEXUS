
import React, { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Proposal } from '../../types';
import { FileText, Search, PenTool, X, Save, Loader2, CheckCircle, ArrowRight } from 'lucide-react';
import { Badge } from '../../components/Widgets';
import { ProposalDocument } from '../../components/ProposalDocument';
import { SignaturePad } from '../../components/SignaturePad';

const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export const ClientProposals: React.FC = () => {
  const { currentUser } = useAuth();
  const { proposals, clients, updateProposal, addSystemNotification, refreshData } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [proposalToSign, setProposalToSign] = useState<Proposal | null>(null);

  const currentClient = useMemo(() => 
    clients.find(c => c.id === currentUser?.relatedClientId), 
  [clients, currentUser]);

  const myProposals = useMemo(() => {
    if (!currentUser) return [];
    return proposals.filter(p => {
        if (p.status === 'Draft') return false;
        return (p.clientId === currentClient?.id || p.clientEmail === currentUser.email);
    }).filter(p => p.title.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [proposals, currentClient, currentUser, searchTerm]);

  const handleConfirmSignature = async (signatureBase64: string) => {
      if (!proposalToSign || !currentUser) return;

      const updatedProposal: Proposal = {
          ...proposalToSign,
          status: 'Accepted',
          signature: signatureBase64,
          signedAt: new Date().toISOString(),
          signedByIp: 'Client Portal'
      };

      try {
          // A criação do projeto agora acontece dentro desta função updateProposal no DataContext
          await updateProposal(currentUser, updatedProposal);
          addSystemNotification('Contrato Assinado!', `Aceite formal de ${updatedProposal.companyName} confirmado.`, 'success');
          
          setIsSignModalOpen(false);
          setProposalToSign(null);
          alert("Assinado com sucesso! Nossa equipe técnica já iniciou a separação dos seus equipamentos.");
          
          // Aguarda um pequeno delay para o banco processar e recarrega
          setTimeout(() => refreshData(), 500);
      } catch (err) { 
          console.error(err);
          alert("Erro ao processar assinatura."); 
      }
  };

  return (
    <div className="space-y-8 animate-fade-in font-sans">
        <div className="flex justify-between items-center">
            <div>
                <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Propostas Disponíveis</h1>
                <p className="text-slate-500 font-medium">Analise e aprove as soluções para sua unidade.</p>
            </div>
        </div>

        {myProposals.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border border-dashed">
                <FileText size={48} className="mx-auto text-slate-200 mb-4"/>
                <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Nenhuma proposta pendente</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myProposals.map(prop => (
                    <div key={prop.id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group flex flex-col overflow-hidden">
                        <div className="p-8 flex-1">
                            <div className="flex justify-between mb-6">
                                <div className="p-4 rounded-2xl bg-indigo-50 text-indigo-600"><FileText size={28}/></div>
                                <Badge color={prop.status === 'Accepted' ? 'green' : 'blue'}>{prop.status === 'Accepted' ? 'ASSINADO' : 'PENDENTE'}</Badge>
                            </div>
                            <h3 className="text-xl font-black text-slate-900 mb-6 uppercase tracking-tight leading-tight">{prop.title}</h3>
                            <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div className="flex justify-between text-xs font-black uppercase text-slate-400"><span>Setup</span><span className="text-slate-900 font-mono">{formatCurrency(prop.price)}</span></div>
                                <div className="flex justify-between text-xs font-black uppercase text-slate-400"><span>Mensal</span><span className="text-indigo-600 font-mono">{formatCurrency(prop.monthlyCost || 0)}</span></div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 border-t flex flex-col gap-2">
                             {prop.status === 'Sent' && (
                                <button onClick={() => { setProposalToSign(prop); setIsSignModalOpen(true); }} className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-xs tracking-widest rounded-2xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/20 transition">Revisar e Assinar</button>
                             )}
                             <button className="w-full py-4 bg-white text-slate-500 font-black uppercase text-[10px] tracking-widest rounded-2xl border-2 border-slate-100 hover:bg-slate-100 transition">Download PDF</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {isSignModalOpen && proposalToSign && (
            <div className="fixed inset-0 bg-slate-950/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
                <div className="bg-white w-full max-w-6xl h-[92vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-scale-in">
                    <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                        <h3 className="font-black text-xl text-slate-900 uppercase tracking-tighter">Assinatura Digital</h3>
                        <button onClick={() => setIsSignModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition"><X size={24}/></button>
                    </div>
                    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
                        <div className="flex-1 p-10 overflow-y-auto custom-scrollbar flex justify-center">
                            <div className="transform scale-[0.8] lg:scale-100 origin-top pointer-events-none">
                                <ProposalDocument data={proposalToSign} />
                            </div>
                        </div>
                        <div className="w-full md:w-96 bg-white border-l p-8 flex flex-col gap-8 shadow-2xl z-10">
                             <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                                 <h4 className="font-black text-indigo-900 uppercase tracking-tighter mb-2 flex items-center gap-2"><PenTool size={18}/> Aceite Formal</h4>
                                 <p className="text-[11px] text-indigo-700 leading-relaxed font-medium">Ao assinar, você concorda com os termos técnicos e cronogramas desta proposta.</p>
                             </div>
                             <div className="flex-1"><SignaturePad onSave={handleConfirmSignature} /></div>
                             <button onClick={() => setIsSignModalOpen(false)} className="text-slate-400 font-black uppercase text-[10px] tracking-widest hover:text-red-500 transition">Cancelar</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
