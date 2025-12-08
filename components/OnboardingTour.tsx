
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ChevronRight, ChevronLeft, Sparkles, LayoutDashboard, Users, DollarSign, PieChart, CheckCircle, Phone, Radar, Trophy, PenTool } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentUser && currentUser.role !== 'client') {
      const hasSeenOnboarding = localStorage.getItem(`nexus_onboarding_v2_complete_${currentUser.id}`);
      if (!hasSeenOnboarding) {
        setIsOpen(true);
      }
    }
  }, [currentUser]);

  const handleComplete = () => {
    if (currentUser) {
      localStorage.setItem(`nexus_onboarding_v2_complete_${currentUser.id}`, 'true');
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
      title: "Bem-vindo ao Novo Nexus CRM",
      description: "Acabamos de lançar atualizações incríveis para transformar sua operação. Vamos conhecer as novidades?",
      icon: <Sparkles size={64} className="text-blue-500" />,
      color: "bg-blue-50 border-blue-100"
    },
    {
      title: "Nexus Voice (Telefonia IA)",
      description: "Agora você pode ligar e gravar chamadas direto do navegador. A IA transcreve o áudio, analisa o sentimento do cliente e sugere próximos passos.",
      icon: <Phone size={64} className="text-green-500" />,
      color: "bg-green-50 border-green-100"
    },
    {
      title: "Nexus Radar (Inteligência)",
      description: "Pare de preencher dados manualmente. Digite o nome da empresa e deixe o Radar buscar faturamento, tecnologias e concorrentes automaticamente.",
      icon: <Radar size={64} className="text-purple-500" />,
      color: "bg-purple-50 border-purple-100"
    },
    {
      title: "Smart Contracts (Assinatura)",
      description: "Suas propostas agora têm validade jurídica. O cliente assina digitalmente no portal e o contrato é gerado com hash de segurança.",
      icon: <PenTool size={64} className="text-indigo-500" />,
      color: "bg-indigo-50 border-indigo-100"
    },
    {
      title: "Gamificação de Vendas",
      description: "Ganhe XP e suba de nível a cada venda fechada. Acompanhe o Ranking no Dashboard e engaje sua equipe.",
      icon: <Trophy size={64} className="text-amber-500" />,
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
                    Pular Tour
                </button>
            )}

            <button 
                onClick={nextStep}
                className="flex-[2] py-3 px-4 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
            >
                {currentStep === steps.length - 1 ? (
                    <>Começar Agora <CheckCircle size={18} /></>
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
