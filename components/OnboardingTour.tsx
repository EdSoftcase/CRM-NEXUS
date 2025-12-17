import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, ChevronRight, ChevronLeft, Sparkles, Phone, Target, Map, Wrench, CheckCircle, Rocket } from 'lucide-react';

export const OnboardingTour: React.FC = () => {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Key atualizada para garantir que usuários antigos vejam as novidades da versão SOFT-CRM
  const STORAGE_KEY = `softcrm_onboarding_v3_complete_${currentUser?.id}`;

  useEffect(() => {
    if (currentUser && currentUser.role !== 'client') {
      const hasSeenOnboarding = localStorage.getItem(STORAGE_KEY);
      if (!hasSeenOnboarding) {
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
      title: "Bem-vindo ao SOFT-CRM Enterprise",
      description: "Sua plataforma de gestão evoluiu. Agora com Inteligência Artificial nativa, telefonia integrada e geo-localização para maximizar seus resultados.",
      icon: <Rocket size={64} className="text-blue-600" />,
      color: "bg-blue-50 border-blue-200",
      gradient: "from-blue-600 to-indigo-600"
    },
    {
      title: "Central de Contatos & Bridge",
      description: "Conecte-se de verdade. Utilize o discador VoIP integrado com análise de sentimento por IA e gerencie WhatsApp e E-mails em um único lugar.",
      icon: <Phone size={64} className="text-emerald-600" />,
      color: "bg-emerald-50 border-emerald-200",
      gradient: "from-emerald-500 to-green-600"
    },
    {
      title: "Geo-Inteligência & Radar",
      description: "Visualize sua carteira no mapa. Encontre oportunidades próximas, trace rotas e descubra leads qualificados com o Nexus Radar.",
      icon: <Map size={64} className="text-purple-600" />,
      color: "bg-purple-50 border-purple-200",
      gradient: "from-purple-500 to-violet-600"
    },
    {
      title: "Operações & Projetos",
      description: "Do fechamento à entrega. Gerencie instalações e serviços com nosso Kanban de Projetos e gere contratos com assinatura digital válida.",
      icon: <Wrench size={64} className="text-orange-600" />,
      color: "bg-orange-50 border-orange-200",
      gradient: "from-orange-500 to-amber-600"
    },
    {
      title: "Assistente IA Gemini",
      description: "Seu copiloto de negócios. Peça para a IA criar leads, resumir chamados ou escrever e-mails persuasivos. Basta clicar no ícone de brilho.",
      icon: <Sparkles size={64} className="text-indigo-600" />,
      color: "bg-indigo-50 border-indigo-200",
      gradient: "from-indigo-500 to-blue-600"
    }
  ];

  const currentData = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-scale-in flex flex-col relative border border-white/20">
        
        {/* Header Visual */}
        <div className={`h-2 absolute top-0 left-0 right-0 bg-gradient-to-r ${currentData.gradient}`}></div>

        {/* Close Button */}
        <button 
          onClick={handleComplete}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition z-10"
        >
          <X size={20} />
        </button>

        {/* Content Area */}
        <div className={`p-8 pb-0 flex flex-col items-center text-center mt-6`}>
          <div className={`w-32 h-32 rounded-full flex items-center justify-center mb-6 border-4 border-white dark:border-slate-700 shadow-xl ${currentData.color} transition-colors duration-500`}>
            {currentData.icon}
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3 transition-all duration-300">{currentData.title}</h2>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed min-h-[80px] text-sm md:text-base">
            {currentData.description}
          </p>
        </div>

        {/* Footer / Navigation */}
        <div className="p-8 pt-6">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentStep ? `w-8 bg-slate-800 dark:bg-white` : 'w-2 bg-slate-200 dark:bg-slate-600'}`}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {currentStep > 0 ? (
                <button 
                    onClick={prevStep}
                    className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2"
                >
                    <ChevronLeft size={18} /> Voltar
                </button>
            ) : (
                <button 
                    onClick={handleComplete}
                    className="flex-1 py-3 px-4 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold transition"
                >
                    Pular
                </button>
            )}

            <button 
                onClick={nextStep}
                className={`flex-[2] py-3 px-4 rounded-xl text-white font-bold transition shadow-lg flex items-center justify-center gap-2 bg-gradient-to-r ${currentData.gradient} hover:shadow-xl hover:scale-[1.02] transform duration-200`}
            >
                {currentStep === steps.length - 1 ? (
                    <>Começar a Usar <CheckCircle size={18} /></>
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