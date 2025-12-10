
import React from 'react';
import { Proposal } from '../types';

interface ProposalDocumentProps {
    data: Proposal;
    id?: string;
}

// Helper para formatação BRL
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ data, id }) => (
    <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl text-slate-800 flex flex-col relative printable-area mx-auto">
        {/* Paper Header - SOFT CASE BRANDING */}
        <div className="flex justify-between items-center mb-12 border-b-2 border-slate-100 pb-6">
            {/* LOGO RECREATION */}
            <div className="flex items-center gap-3">
                {/* Graphic Icon */}
                <div className="w-12 h-12 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0f172a] relative overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                    <div className="absolute inset-0 opacity-30">
                        <div className="absolute w-[150%] h-[150%] border-2 border-white rounded-[40%] -top-[40%] -left-[40%]"></div>
                        <div className="absolute w-[150%] h-[150%] border-2 border-white rounded-[40%] -top-[30%] -left-[30%]"></div>
                        <div className="absolute w-[150%] h-[150%] border-2 border-white rounded-[40%] -top-[20%] -left-[20%]"></div>
                    </div>
                </div>
                {/* Text Logo */}
                <div className="flex flex-col justify-center leading-none">
                    <span className="text-3xl font-black text-[#0f172a] tracking-tighter">SOFT</span>
                    <span className="text-3xl font-bold text-[#0ea5e9] tracking-widest" style={{ letterSpacing: '0.15em' }}>CASE</span>
                </div>
            </div>

            {/* Company Info */}
            <div className="text-right">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase mb-1">Proposta Comercial</h1>
                <div className="text-xs text-slate-500 space-y-0.5">
                    <p className="font-bold text-slate-700">Soft Case Tecnologia</p>
                    <p>contato@softcase.com.br</p>
                    <p>(11) 99999-0000</p>
                </div>
            </div>
        </div>

        {/* Proposal Info */}
        <div className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-2">{data.title || 'Título da Proposta'}</h2>
            <div className="flex justify-between text-sm mt-4">
                <div>
                    <p className="text-slate-400 uppercase text-xs font-bold">Preparado para:</p>
                    <p className="font-medium text-lg">{data.clientName || 'Nome do Cliente'}</p>
                    <p className="text-slate-600">{data.companyName || 'Empresa'}</p>
                </div>
                <div className="text-right">
                    <p className="text-slate-400 uppercase text-xs font-bold">Data de Emissão:</p>
                    <p className="font-medium">{new Date(data.createdDate).toLocaleDateString()}</p>
                    <p className="text-slate-400 uppercase text-xs font-bold mt-2">Validade:</p>
                    <p className="font-medium">{new Date(data.validUntil).toLocaleDateString()}</p>
                </div>
            </div>
        </div>

        {/* Body */}
        <div className="space-y-6 flex-1 text-sm leading-relaxed text-slate-700 text-justify">
            
            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">1. Restrições de Uso e Confidencialidade</h3>
                <p>
                    As informações contidas nesta proposta são confidenciais e de uso exclusivo da CONTRATADA. É vedada sua divulgação, reprodução, distribuição ou utilização por terceiros sem autorização formal. Em caso de celebração de contrato, as informações poderão ser utilizadas nos limites contratuais estabelecidos.
                </p>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">2. Objeto da Proposta</h3>
                <p className="mb-2">
                    A presente proposta tem por objeto o fornecimento (venda ou locação) de equipamentos, softwares, serviços de instalação, treinamento e suporte técnico para soluções de automação, controle de acesso, monitoramento ou demais tecnologias oferecidas pela CONTRATADA.
                </p>
                <p className="mb-2">
                    A infraestrutura elétrica, lógica, civil e de conectividade necessária ao funcionamento da solução será de responsabilidade da CONTRATANTE.
                </p>
                
                {/* Dynamic Content: Introduction/Scope */}
                <div className="bg-slate-50 p-4 rounded border border-slate-100 my-4">
                    <p className="font-bold mb-2">Escopo Específico deste Projeto:</p>
                    <p className="whitespace-pre-wrap mb-2">{data.introduction}</p>
                    {data.scope.length > 0 && (
                        <ul className="list-disc pl-5 space-y-1">
                            {data.scope.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </section>

            <div className="html2pdf__page-break"></div>

            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">2.1 Opções Técnicas (Ilustrativo)</h3>
                <p>A solução poderá ser composta pelos seguintes itens, variando conforme necessidade:</p>
                <ul className="list-disc pl-5 mt-2 space-y-1 text-xs">
                    <li><strong>Opção 01 (Padrão):</strong> Equipamentos de captura, controladoras, cancelas/leitores, servidor, nobreak, instalação e treinamento.</li>
                    <li><strong>Opção 02 (Avançada):</strong> Equipamentos redundantes, captura frontal/traseira, sensores extras, controladoras adicionais.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">Condições Gerais</h3>
                <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Validade:</strong> {data.validUntil ? `Válida até ${new Date(data.validUntil).toLocaleDateString()}` : '20 dias corridos'}. O aceite será formalizado mediante assinatura.</li>
                    <li><strong>Entrega e Instalação:</strong> Ocorrerão conforme cronograma (Estimado: {data.timeline}), após o aceite formal e confirmação do pagamento inicial.</li>
                    <li><strong>Garantia:</strong> 12 meses contra defeitos de fabricação (exceto mau uso, intempéries, descargas elétricas).</li>
                    <li><strong>Licenciamento:</strong> Licenças de software são individuais, intransferíveis e inalteráveis.</li>
                </ul>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">2.7 SLA – Acordo de Nível de Serviço</h3>
                <p className="mb-2 text-xs">Atendimento em dias úteis, das 08h às 18h. Plantão remoto aos sábados para ocorrências críticas.</p>
                <table className="w-full text-xs border border-slate-200">
                    <thead className="bg-slate-100 font-bold">
                        <tr><td className="p-2 border">Nível</td><td className="p-2 border">Tipo</td><td className="p-2 border">Prazo Máximo</td></tr>
                    </thead>
                    <tbody>
                        <tr><td className="p-2 border">1</td><td className="p-2 border">Remoto</td><td className="p-2 border">Até 2 horas</td></tr>
                        <tr><td className="p-2 border">2</td><td className="p-2 border">Presencial (Inoperante)</td><td className="p-2 border">Até 36 horas</td></tr>
                        <tr><td className="p-2 border">3</td><td className="p-2 border">Presencial (Média)</td><td className="p-2 border">Até 72 horas</td></tr>
                    </tbody>
                </table>
            </section>

            <section className="bg-slate-50 p-6 rounded-lg border border-slate-100 mt-4">
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-4 border-b border-blue-100 pb-1">3. Quadro de Investimento</h3>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600 font-medium">Investimento Total</span>
                    <span className="text-2xl font-bold text-slate-900">{formatCurrency(data.price)}</span>
                </div>
                <div className="text-xs text-slate-500">
                    * Valores referentes à aquisição/setup. Mensalidades ou locação (se aplicável) serão detalhadas em contrato específico.
                </div>
            </section>

            <div className="html2pdf__page-break"></div>

            <section className="mt-8 pt-4">
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-4 border-b border-blue-100 pb-1">Termos Jurídicos e Condições</h3>
                <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed text-justify space-y-3">
                    <p><strong>4. Responsabilidades:</strong> A CONTRATADA fornece equipamentos, instalação e suporte. A CONTRATANTE provê infraestrutura elétrica/lógica, conectividade e acesso.</p>
                    <p><strong>5. Pagamento:</strong> Definido em contrato. Atrasos &gt; 10 dias sujeitos a multa de 2%, juros de 1% a.m. e suspensão do suporte.</p>
                    <p><strong>6. Reajuste:</strong> Anual pelo IGPM ou índice substituto.</p>
                    <p><strong>7. Rescisão:</strong> Aviso prévio de 30 dias. Multa por quebra de fidelidade conforme contrato.</p>
                    <p><strong>8. Propriedade Intelectual:</strong> Softwares e metodologias são exclusivos da CONTRATADA. Vedada engenharia reversa.</p>
                    <p><strong>9. LGPD:</strong> A CONTRATADA atua em conformidade com a legislação de proteção de dados.</p>
                    <p><strong>11. Renovação:</strong> Automática por iguais períodos, salvo manifestação contrária (30 dias).</p>
                    
                    {data.terms && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                            <p className="font-bold mb-1">Condições Específicas desta Proposta:</p>
                            <p>{data.terms}</p>
                        </div>
                    )}
                </div>
            </section>
        </div>

        {/* Footer / Signature Area */}
        <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="text-center w-1/3">
                    <div className="mb-2 h-12 flex items-end justify-center">
                        <span className="font-dancing text-xl text-slate-800">Soft Case</span>
                    </div>
                    <div className="border-b border-slate-300 mb-2"></div>
                    <p className="text-xs font-bold uppercase">Soft Case Tecnologia</p>
                </div>
                <div className="text-center w-1/3">
                    {data.signature ? (
                        <div className="mb-2 h-12 flex items-center justify-center">
                            <img src={data.signature} alt="Assinatura Cliente" className="max-h-full mix-blend-multiply" />
                        </div>
                    ) : (
                        <div className="mb-2 h-12"></div>
                    )}
                    <div className="border-b border-slate-300 mb-2"></div>
                    <p className="text-xs font-bold uppercase">De Acordo ({data.clientName})</p>
                </div>
            </div>
            
            {data.status === 'Accepted' && (
                <div className="mt-6 text-[8px] text-slate-400 font-mono text-center border-t border-slate-100 pt-2">
                    <p>HASH: {data.id} • TIMESTAMP: {data.signedAt || new Date().toISOString()}</p>
                    <p>Este documento foi assinado digitalmente através da plataforma Nexus CRM.</p>
                </div>
            )}
        </div>
    </div>
);
