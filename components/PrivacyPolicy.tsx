import React from 'react';
import { X, ShieldCheck, Lock, Eye, Server, FileText } from 'lucide-react';

interface PrivacyPolicyProps {
  onClose: () => void;
}

export const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col relative overflow-hidden animate-scale-in">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <ShieldCheck size={24} />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900">Política de Privacidade</h2>
                <p className="text-xs text-slate-500">Em conformidade com a LGPD (Lei nº 13.709/2018)</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded-full transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 text-slate-700 leading-relaxed custom-scrollbar">
            <div className="max-w-3xl mx-auto space-y-8">
                
                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600"/> 1. Introdução
                    </h3>
                    <p className="text-sm text-justify">
                        O <strong>Nexus CRM Enterprise</strong> compromete-se com a proteção de dados e a privacidade de seus usuários. Esta Política descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais, em estrita conformidade com a Lei Geral de Proteção de Dados (LGPD) do Brasil. Ao utilizar nossos serviços, você concorda com os termos aqui descritos.
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Eye size={20} className="text-blue-600"/> 2. Coleta de Dados
                    </h3>
                    <p className="text-sm mb-2">Coletamos os seguintes tipos de dados para o funcionamento do sistema:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                        <li><strong>Dados Cadastrais:</strong> Nome completo, e-mail corporativo, telefone e cargo.</li>
                        <li><strong>Dados da Empresa:</strong> Razão social, CNPJ e endereço.</li>
                        <li><strong>Dados de Uso:</strong> Logs de acesso, endereço IP, tipo de navegador e interações dentro da plataforma (Audit Logs).</li>
                        <li><strong>Dados de Clientes (Terceiros):</strong> Informações inseridas por você sobre seus leads e clientes para gestão no CRM.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Server size={20} className="text-blue-600"/> 3. Finalidade do Tratamento
                    </h3>
                    <p className="text-sm mb-2">Os dados são tratados para as seguintes finalidades:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Operação</p>
                            <p className="text-sm">Fornecer acesso às funcionalidades do CRM, autenticação e suporte técnico.</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Segurança</p>
                            <p className="text-sm">Prevenção de fraudes, monitoramento de acessos indevidos e auditoria.</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Comunicação</p>
                            <p className="text-sm">Envio de notificações importantes, faturas e atualizações do sistema.</p>
                        </div>
                        <div className="bg-slate-50 p-3 rounded border border-slate-100">
                            <p className="text-xs font-bold uppercase text-slate-500 mb-1">Melhoria</p>
                            <p className="text-sm">Análise de dados anonimizados para aprimoramento da plataforma via IA.</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <Lock size={20} className="text-blue-600"/> 4. Segurança e Armazenamento
                    </h3>
                    <p className="text-sm text-justify">
                        Adotamos medidas técnicas e administrativas robustas para proteger seus dados, incluindo criptografia em trânsito (SSL/TLS) e em repouso (no banco de dados). Utilizamos infraestrutura de nuvem segura (Supabase/PostgreSQL) com políticas rígidas de controle de acesso (Row Level Security - RLS), garantindo que os dados de uma organização não sejam acessíveis por outra (Isolamento Multi-tenant).
                    </p>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                        <ShieldCheck size={20} className="text-blue-600"/> 5. Direitos do Titular (Você)
                    </h3>
                    <p className="text-sm mb-2">Conforme a LGPD, você possui os seguintes direitos sobre seus dados:</p>
                    <ul className="list-disc pl-5 text-sm space-y-1 text-slate-600">
                        <li><strong>Confirmação e Acesso:</strong> Solicitar confirmação da existência de tratamento e acesso aos dados.</li>
                        <li><strong>Correção:</strong> Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
                        <li><strong>Anonimização ou Bloqueio:</strong> Solicitar tratamento de dados desnecessários ou excessivos.</li>
                        <li><strong>Portabilidade:</strong> Solicitar a transferência dos dados para outro fornecedor.</li>
                        <li><strong>Eliminação:</strong> Solicitar a exclusão dos dados pessoais tratados com o consentimento, exceto nas hipóteses legais de retenção.</li>
                    </ul>
                </section>

                <section>
                    <h3 className="text-lg font-bold text-slate-900 mb-3">6. Cookies e Tecnologias de Rastreamento</h3>
                    <p className="text-sm text-justify">
                        Utilizamos cookies essenciais para manter sua sessão ativa e segura. Cookies analíticos podem ser usados para entender como você interage com a plataforma, sempre de forma agregada. Você pode gerenciar as preferências de cookies nas configurações do seu navegador.
                    </p>
                </section>

                <section className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                    <h3 className="text-lg font-bold text-blue-900 mb-2">Contato do Encarregado (DPO)</h3>
                    <p className="text-sm text-blue-800 mb-4">
                        Para exercer seus direitos ou tirar dúvidas sobre esta política, entre em contato com nosso Encarregado de Proteção de Dados:
                    </p>
                    <div className="text-sm">
                        <p><strong>E-mail:</strong> privacidade@nexus-crm.com.br</p>
                        <p><strong>Endereço:</strong> Av. Paulista, 1000 - São Paulo, SP</p>
                    </div>
                </section>

                <p className="text-xs text-slate-400 text-center pt-8">
                    Última atualização: 26 de Outubro de 2023
                </p>
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
            <button 
                onClick={onClose}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-500/30"
            >
                Entendido
            </button>
        </div>
      </div>
    </div>
  );
};