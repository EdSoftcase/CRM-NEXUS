
import React from 'react';
import { Proposal, ProposalItem } from '../types';

interface ProposalDocumentProps {
    data: Proposal;
    id?: string;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export const ProposalDocument: React.FC<ProposalDocumentProps> = ({ data, id }) => {
    const today = new Date(data.createdDate || new Date());
    
    const companyInfo = {
        name: 'SOFTCASE SOLUÇÕES TECNOLÓGICAS',
        cnpj: '08.966.815/0001-31',
        address: 'Rua Benjamin Constant 61, conj. 801. São Vicente - SP',
        consultant: data.consultantName || 'Edson Freire Santos',
    };

    const equipmentItems = data.items?.filter(i => i.category === 'Product') || [];
    const subscriptionItems = data.items?.filter(i => i.category === 'Subscription' || i.category === 'Service') || [];

    const totalCapex = data.price || 0;
    const totalOpex = data.monthlyCost || 0;

    return (
        <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl text-slate-800 flex flex-col relative printable-area mx-auto font-sans text-[10px] leading-relaxed">
            
            {/* CABEÇALHO BRANDING */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4 flex justify-between items-end">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-950 flex items-center justify-center rounded">
                        <span className="text-white font-black text-lg">SC</span>
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tighter">CONTRATO DE FORNECIMENTO E TECNOLOGIA</h1>
                        <p className="text-[8px] font-bold text-slate-500 italic">Nexus Enterprise Workflow • Softcase</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold">Referência: {data.id}</p>
                    <p>Emissão: {today.toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* 1. CONFIDENCIALIDADE */}
            <section className="mb-4">
                <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">1. CONFIDENCIALIDADE E RESTRIÇÃO</h3>
                <p className="text-justify text-slate-600">
                    As informações aqui contidas são exclusivas para avaliação da <strong>{data.companyName || 'CONTRATANTE'}</strong>. É vedada a duplicação ou revelação a terceiros sob pena de multa equivalente a 20% do valor desta proposta.
                </p>
            </section>

            {/* 2. OBJETO */}
            <section className="mb-4">
                <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">2. OBJETO</h3>
                <p className="text-justify text-slate-600">
                    Prestação de serviços e eventual locação/venda de hardware para automação de entrada e saída de veículos via reconhecimento de placas (LPR). No caso de locação, os equipamentos permanecem sob propriedade da SOFTCASE.
                </p>
            </section>

            {/* 3. TABELA COMERCIAL */}
            <div className="mb-4">
                <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="border border-slate-300 p-1.5 text-left uppercase text-[8px]">ITEM / SOLUÇÃO</th>
                            <th className="border border-slate-300 p-1.5 text-center w-10 text-[8px]">QTD</th>
                            <th className="border border-slate-300 p-1.5 text-right w-24 text-[8px]">VALOR</th>
                        </tr>
                    </thead>
                    <tbody>
                        {equipmentItems.map((item, idx) => (
                            <tr key={`hw-${idx}`}>
                                <td className="border border-slate-300 p-1.5 font-bold uppercase">{item.name} (CAPEX)</td>
                                <td className="border border-slate-300 p-1.5 text-center">{item.quantity}</td>
                                <td className="border border-slate-300 p-1.5 text-right font-bold">{formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                            </tr>
                        ))}
                        <tr className="bg-slate-50 font-black">
                            <td colSpan={2} className="border border-slate-300 p-1.5 text-right uppercase">INVESTIMENTO INICIAL (SETUP):</td>
                            <td className="border border-slate-300 p-1.5 text-right text-indigo-700">{formatCurrency(totalCapex)}</td>
                        </tr>
                        {subscriptionItems.map((item, idx) => (
                            <tr key={`svc-${idx}`}>
                                <td className="border border-slate-300 p-1.5 font-bold uppercase">{item.name} (OPEX)</td>
                                <td className="border border-slate-300 p-1.5 text-center">{item.quantity}</td>
                                <td className="border border-slate-300 p-1.5 text-right font-bold">{formatCurrency((item.price || 0) * (item.quantity || 1))}</td>
                            </tr>
                        ))}
                        <tr className="bg-indigo-50 font-black">
                            <td colSpan={2} className="border border-slate-300 p-1.5 text-right uppercase italic">MENSALIDADE OPERACIONAL:</td>
                            <td className="border border-slate-300 p-1.5 text-right text-indigo-900">{formatCurrency(totalOpex)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* 4. CONDIÇÕES E SLA */}
            <div className="grid grid-cols-2 gap-6 mb-4">
                <section>
                    <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">3. CONDIÇÕES E SLA</h3>
                    <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                        <li><strong>Validade:</strong> 20 dias corridos.</li>
                        <li><strong>Entrega:</strong> Até 30-45 dias após aceite.</li>
                        <li><strong>Garantia:</strong> 12 meses (Permanente em Locação).</li>
                        <li><strong>Carência:</strong> 24 meses para contratos de locação.</li>
                        <li><strong>Suporte N1 (Crítico):</strong> Visita até 36h.</li>
                        <li><strong>Suporte N2 (Médio):</strong> Visita até 72h.</li>
                    </ul>
                </section>
                <section>
                    <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">4. RESPONSABILIDADES</h3>
                    <div className="grid grid-cols-2 gap-2 text-[8px]">
                        <div className="bg-slate-50 p-1 rounded">
                            <p className="font-bold border-b mb-1">SOFTCASE:</p>
                            Hardware, Software, Configuração e Treinamento (8h).
                        </div>
                        <div className="bg-slate-50 p-1 rounded">
                            <p className="font-bold border-b mb-1">CONTRATANTE:</p>
                            Rede de dados, Energia, Infra e Equipe disponível.
                        </div>
                    </div>
                </section>
            </div>

            {/* 5. REFORÇOS JURÍDICOS E CRONOGRAMA */}
            <section className="mb-4">
                <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">5. DISPOSIÇÕES GERAIS E LGPD</h3>
                <p className="text-justify text-slate-600 text-[8px] leading-tight">
                    5.1. <strong>Propriedade Intelectual:</strong> Todo código e metodologia permanecem como propriedade da Softcase. 
                    5.2. <strong>LGPD:</strong> Ambas as partes declaram conformidade com a Lei 13.709/2018. 
                    5.3. <strong>Inadimplemento:</strong> Multa de 2% + juros de 1% a.m. 
                    5.4. <strong>Reajuste:</strong> Anual pelo IPCA. 
                    5.5. <strong>Foro:</strong> Eleito o foro de São Paulo para dirimir litígios.
                </p>
            </section>

            {/* ASSINATURAS */}
            <div className="mt-auto pt-4 border-t border-slate-300">
                <div className="flex justify-between items-end gap-16">
                    <div className="flex-1 text-center">
                        <div className="h-8 border-b border-slate-400 mb-1"></div>
                        <p className="font-bold uppercase text-[8px]">SOFTCASE SOLUÇÕES TECNOLÓGICAS</p>
                        <p className="text-[7px] text-slate-400 uppercase">LOCADORA / PRESTADORA</p>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="h-8 border-b border-slate-400 mb-1 flex items-center justify-center">
                            {data.signature && <img src={data.signature} className="max-h-full mix-blend-multiply" alt="signature"/>}
                        </div>
                        <p className="font-bold uppercase text-[8px]">{data.companyName || 'CONTRATANTE'}</p>
                        <p className="text-[7px] text-slate-400 uppercase">ACEITE DIGITAL</p>
                    </div>
                </div>
                {data.signedAt && (
                   <p className="text-[7px] text-slate-400 mt-2 text-center">
                       Documento assinado digitalmente em {new Date(data.signedAt).toLocaleString()} | IP: {data.signedByIp}
                   </p>
                )}
            </div>

            <div className="mt-4 text-center text-[6px] text-slate-300 uppercase tracking-[0.4em]">
                CONTRATO DIGITAL GERADO VIA NEXUS ENTERPRISE • AUTHENTICATED BY SOFTCASE CLOUD
            </div>
        </div>
    );
};
