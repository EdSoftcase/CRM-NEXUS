import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ChevronRight, ChevronLeft, Globe, DollarSign, FileText, LifeBuoy, CheckCircle } from 'lucide-react';

export const ClientPortalTour: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Key atualizada para forçar exibição do novo branding
  const STORAGE_KEY = `softcrm_portal_tour_v2_complete_${currentUser?.id}`;

  useEffect(() => {
    if (currentUser && currentUser.role === 'client') {
      const hasSeenTour = localStorage.getItem(STORAGE_KEY);
      if (!hasSeenTour) {
        setIsOpen(true);
      }
    }
  }, [currentUser]);

  const handleComplete = () => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY, 'true');
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
      title: "Bem-vindo ao Portal SOFT-CRM",
      description: "Preparamos um ambiente exclusivo para você acompanhar seus serviços com total transparência e agilidade.",
      icon: <Globe size={64} className="text-blue-500" />,
      color: "bg-blue-50 border-blue-100",
      gradient: "from-blue-500 to-blue-600"
    },
    {
      title: "Gestão Financeira Transparente",
      description: "Acesse suas faturas, visualize histórico de pagamentos e baixe boletos ou notas fiscais na aba 'Financeiro'.",
      icon: <DollarSign size={64} className="text-emerald-500" />,
      color: "bg-emerald-50 border-emerald-100",
      gradient: "from-emerald-500 to-green-600"
    },
    {
      title: "Propostas e Contratos",
      description: "Analise novas propostas e assine contratos digitalmente com validade jurídica, tudo sem papelada, na aba 'Propostas'.",
      icon: <FileText size={64} className="text-purple-500" />,
      color: "bg-purple-50 border-purple-100",
      gradient: "from-purple-500 to-indigo-600"
    },
    {
      title: "Suporte Dedicado",
      description: "Precisa de ajuda? Abra chamados técnicos, tire dúvidas e acompanhe a resolução em tempo real na aba 'Suporte'.",
      icon: <LifeBuoy size={64} className="text-amber-500" />,
      color: "bg-amber-50 border-amber-100",
      gradient: "from-amber-500 to-orange-600"
    }
  ];

  const currentData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative border border-slate-100">
        
        {/* Top Gradient Line */}
        <div className={`h-1.5 w-full bg-gradient-to-r ${currentData.gradient} absolute top-0`}></div>

        {/* Close Button */}
        <button 
          onClick={handleComplete}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition z-10"
        >
          <X size={20} />
        </button>

        {/* Content Area */}
        <div className={`p-8 pb-0 flex flex-col items-center text-center mt-4`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 border-white shadow-xl ${currentData.color} transition-all duration-300`}>
            {currentData.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-3">{currentData.title}</h2>
          <p className="text-slate-500 leading-relaxed min-h-[80px]">
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
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-8 bg-slate-800' : 'w-2 bg-slate-200'}`}
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
                className="flex-[2] py-3 px-4 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
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