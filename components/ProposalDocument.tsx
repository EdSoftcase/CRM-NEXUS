
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
                    Prestação de serviços e eventual locação/venda de hardware para automação de entrada e saída de veículos por meio de reconhecimento automático de placas (LPR).
                </p>
            </section>

            {/* NOVA SEÇÃO: ESPECIFICAÇÕES TÉCNICAS (KITTING) */}
            {data.technicalSpecs && Object.values(data.technicalSpecs).some(v => !!v) && (
                <section className="mb-4">
                    <h3 className="font-black border-b border-slate-200 mb-2 uppercase text-[9px]">3. CONFIGURAÇÃO TÉCNICA E MATERIAL</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        {data.technicalSpecs.gabinetes && data.technicalSpecs.gabinetes.length > 0 && (
                            <div className="flex flex-col border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Gabinetes:</span>
                                <span className="font-black">{data.technicalSpecs.gabinetes.join(' + ')}</span>
                            </div>
                        )}
                        {data.technicalSpecs.servidorCaixa && data.technicalSpecs.servidorCaixa.length > 0 && (
                            <div className="flex flex-col border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Servidor / Caixa:</span>
                                <span className="font-black">{data.technicalSpecs.servidorCaixa.join(' + ')}</span>
                            </div>
                        )}
                        {data.technicalSpecs.camera && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Câmera LPR:</span>
                                <span className="font-black">{data.technicalSpecs.camera}</span>
                            </div>
                        )}
                        {data.technicalSpecs.nobreak && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Nobreak:</span>
                                <span className="font-black">{data.technicalSpecs.nobreak} {data.technicalSpecs.nobreakQty ? `(Qtd: ${data.technicalSpecs.nobreakQty})` : ''}</span>
                            </div>
                        )}
                        {data.technicalSpecs.faceId && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Face ID:</span>
                                <span className="font-black">{data.technicalSpecs.faceId}</span>
                            </div>
                        )}
                        {data.technicalSpecs.ilha && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Ilha:</span>
                                <span className="font-black">{data.technicalSpecs.ilha}</span>
                            </div>
                        )}
                        {data.technicalSpecs.cancela && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Cancela / Braço:</span>
                                <span className="font-black">{data.technicalSpecs.cancela} {data.technicalSpecs.cancelaQty ? `(Qtd: ${data.technicalSpecs.cancelaQty})` : ''} / {data.technicalSpecs.braco || 'N/A'} {data.technicalSpecs.bracoTamanho ? `(${data.technicalSpecs.bracoTamanho})` : ''}</span>
                            </div>
                        )}
                        {data.technicalSpecs.modeloAutomacao && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Modelo Automação:</span>
                                <span className="font-black">{data.technicalSpecs.modeloAutomacao}</span>
                            </div>
                        )}
                        {data.technicalSpecs.fotoCelula && (
                            <div className="flex justify-between border-b border-slate-200/50 pb-1">
                                <span className="font-bold text-slate-500 uppercase text-[8px]">Foto Célula:</span>
                                <span className="font-black">{data.technicalSpecs.fotoCelula}</span>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 3. TABELA COMERCIAL */}
            <div className="mb-4">
                <h3 className="font-black uppercase text-[9px] mb-1">4. TABELA COMERCIAL</h3>
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
                    <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">5. CONDIÇÕES E SLA</h3>
                    <ul className="list-disc pl-3 text-slate-600 space-y-0.5">
                        <li><strong>Validade:</strong> 20 dias corridos.</li>
                        <li><strong>Entrega:</strong> Até 30-45 dias após aceite.</li>
                        <li><strong>Garantia:</strong> 12 meses (Permanente em Locação).</li>
                        <li><strong>Carência:</strong> 24 meses para contratos de locação.</li>
                    </ul>
                </section>
                <section>
                    <h3 className="font-black border-b border-slate-200 mb-1 uppercase text-[9px]">6. RESPONSABILIDADES</h3>
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
            </div>

            <div className="mt-4 text-center text-[6px] text-slate-300 uppercase tracking-[0.4em]">
                CONTRATO DIGITAL GERADO VIA NEXUS ENTERPRISE • AUTHENTICATED BY SOFTCASE CLOUD
            </div>
        </div>
    );
};
