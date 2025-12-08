
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ChevronRight, ChevronLeft, Globe, DollarSign, FileText, LifeBuoy, CheckCircle } from 'lucide-react';

export const ClientPortalTour: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentUser && currentUser.role === 'client') {
      const hasSeenTour = localStorage.getItem(`nexus_portal_tour_complete_${currentUser.id}`);
      if (!hasSeenTour) {
        setIsOpen(true);
      }
    }
  }, [currentUser]);

  const handleComplete = () => {
    if (currentUser) {
      localStorage.setItem(`nexus_portal_tour_complete_${currentUser.id}`, 'true');
    }
    setIsOpen(false);
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(curr => curr + 1);
    } else {
      handleComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(curr => curr - 1);
    }
  };

  if (!isOpen) return null;

  const steps = [
    {
      title: "Bem-vindo ao seu Portal",
      description: "Este é o seu espaço exclusivo para acompanhar serviços, faturas e solicitações com total transparência.",
      icon: <Globe size={64} className="text-blue-500" />,
      color: "bg-blue-50 border-blue-100"
    },
    {
      title: "Gestão Financeira",
      description: "Acesse a aba 'Financeiro' para visualizar suas faturas pendentes, histórico de pagamentos e baixar boletos.",
      icon: <DollarSign size={64} className="text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-100"
    },
    {
      title: "Propostas & Contratos",
      description: "Recebeu uma nova proposta? Na aba 'Propostas' você pode revisar os detalhes e assinar digitalmente com validade jurídica.",
      icon: <FileText size={64} className="text-purple-500" />,
      color: "bg-purple-50 border-purple-100"
    },
    {
      title: "Suporte Técnico",
      description: "Precisa de ajuda? Abra chamados diretamente pela aba 'Suporte' e acompanhe a resolução em tempo real.",
      icon: <LifeBuoy size={64} className="text-amber-500" />,
      color: "bg-amber-50 border-amber-100"
    }
  ];

  const currentData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative">
        
        {/* Close Button */}
        <button 
          onClick={handleComplete}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition z-10"
        >
          <X size={20} />
        </button>

        {/* Content Area */}
        <div className={`p-8 pb-0 flex flex-col items-center text-center`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-lg ${currentData.color}`}>
            {currentData.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-3">{currentData.title}</h2>
          <p className="text-slate-600 leading-relaxed min-h-[80px]">
            {currentData.description}
          </p>
        </div>

        {/* Footer / Navigation */}
        <div className="p-8 pt-4">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 ? (
                <button 
                    onClick={prevStep}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} /> Voltar
                </button>
            ) : (
                <button 
                    onClick={handleComplete}
                    className="flex-1 py-3 px-4 rounded-xl text-slate-400 font-bold hover:text-slate-600 transition"
                >
                    Pular
                </button>
            )}

            <button 
                onClick={nextStep}
                className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
                {currentStep === steps.length - 1 ? (
                    <>Acessar Portal <CheckCircle size={18} /></>
                ) : (
                    <>Próximo <ChevronRight size={18} /></>
                )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
