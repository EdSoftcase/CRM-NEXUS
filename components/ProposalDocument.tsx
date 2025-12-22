
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
    const companyInfo = {
        name: data.consultantName || 'Edson Freire',
        email: data.consultantEmail || 'edson.freire@softcasenet.com.br',
        phone: data.consultantPhone || '(13) 97810-6594'
    };

    const getItemSubtotal = (item: ProposalItem) => {
        const base = item.price * item.quantity;
        const disc = item.discount || 0;
        return base * (1 - disc / 100);
    };

    const equipmentItems = data.items?.filter(i => i.category === 'Product') || [];
    const serviceItems = data.items?.filter(i => i.category === 'Service' || i.category === 'Subscription') || [];

    const equipmentSubtotal = equipmentItems.reduce((acc, item) => acc + getItemSubtotal(item), 0);
    const servicesSubtotal = serviceItems.reduce((acc, item) => acc + getItemSubtotal(item), 0);

    const finalSetupValue = (data.setupCost || 0);
    const finalMonthlyValue = (data.monthlyCost || 0);

    return (
    <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-2xl text-slate-800 flex flex-col relative printable-area mx-auto font-sans">
        {/* Header Branding */}
        <div className="flex justify-between items-center mb-8 border-b-2 border-slate-900 pb-6">
            <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-slate-950 flex items-center justify-center shadow-md">
                    <span className="text-white font-black text-2xl">SP</span>
                </div>
                <div className="flex flex-col leading-none">
                    <span className="text-3xl font-black text-slate-950 tracking-tighter">SOFT</span>
                    <span className="text-3xl font-bold text-blue-600 tracking-widest" style={{ letterSpacing: '0.1em' }}>PARK</span>
                </div>
            </div>
            <div className="text-right">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight uppercase mb-1">Proposta Técnica e Comercial</h1>
                <p className="text-[9px] font-bold text-blue-600 uppercase tracking-widest">Controle de Acesso Veicular LPR</p>
                <div className="text-[10px] text-slate-500 mt-2">
                    <p className="font-bold text-slate-700">Ref: {data.id}</p>
                </div>
            </div>
        </div>

        {/* Client & Metadata */}
        <div className="grid grid-cols-2 gap-8 mb-8">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">CONTRATANTE (DESTINATÁRIO)</p>
                <p className="font-bold text-sm text-slate-900">{data.companyName || 'Empresa'}</p>
                <p className="text-xs text-slate-600">A/C: {data.clientName || 'Responsável'}</p>
                {data.unit && <p className="text-[10px] text-slate-500 mt-1">Unidade: {data.unit}</p>}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-right">
                <p className="text-[9px] text-slate-400 uppercase font-black mb-1">DADOS DE EMISSÃO</p>
                <p className="text-xs font-bold">Data: {new Date(data.createdDate).toLocaleDateString('pt-BR')}</p>
                <p className="text-xs text-slate-600">Validade: {new Date(data.validUntil).toLocaleDateString('pt-BR')}</p>
                <p className="text-xs text-blue-600 font-bold mt-1">Prazo Instalação: {data.timeline || '45 dias'}</p>
            </div>
        </div>

        {/* 1. Apresentação */}
        <div className="mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-200 pb-1 mb-2">1. Apresentação</h3>
            <p className="text-[11px] text-slate-700 leading-relaxed text-justify whitespace-pre-wrap">{data.introduction}</p>
        </div>

        {/* 2. Catálogo de Itens */}
        {data.items && data.items.length > 0 && (
            <div className="mb-6">
                <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-200 pb-1 mb-2">2. Composição da Solução</h3>
                <table className="w-full text-[10px] border border-slate-200">
                    <thead className="bg-slate-950 text-white font-bold uppercase">
                        <tr>
                            <th className="p-2 border border-slate-700 text-left">Especificação Técnica</th>
                            <th className="p-2 border border-slate-700 text-center w-12">Qtd</th>
                            <th className="p-2 border border-slate-700 text-right w-24">V. Unitário</th>
                            <th className="p-2 border border-slate-700 text-center w-16">Desc</th>
                            <th className="p-2 border border-slate-700 text-right w-28">Subtotal</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.items.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="p-2 border border-slate-200">
                                    <p className="font-bold">{item.name}</p>
                                    <span className="text-[8px] uppercase font-bold text-slate-400">
                                        {item.category === 'Product' ? 'Equipamento' : 'Serviço de Licenciamento/Suporte'}
                                    </span>
                                </td>
                                <td className="p-2 border border-slate-200 text-center">{item.quantity}</td>
                                <td className="p-2 border border-slate-200 text-right">{formatCurrency(item.price)}</td>
                                <td className="p-2 border border-slate-200 text-center text-blue-600 font-bold">{item.discount || 0}%</td>
                                <td className="p-2 border border-slate-200 text-right font-bold">{formatCurrency(getItemSubtotal(item))}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {/* 3. SLA Section (NORMATIVA) */}
        <div className="mb-6">
            <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-200 pb-1 mb-2">3. Acordo de Nível de Serviço (SLA)</h3>
            <table className="w-full text-[10px] border border-slate-200 text-center">
                <thead className="bg-slate-100 font-bold uppercase">
                    <tr>
                        <th className="p-1.5 border border-slate-200">Nível</th>
                        <th className="p-1.5 border border-slate-200">Tipo de Atendimento</th>
                        <th className="p-1.5 border border-slate-200">Prazo Máximo</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className="p-1 border border-slate-200 font-bold">1</td>
                        <td className="p-1 border border-slate-200 text-left pl-3">Suporte Remoto / Diagnóstico</td>
                        <td className="p-1 border border-slate-200 font-bold">2 Horas</td>
                    </tr>
                    <tr>
                        <td className="p-1 border border-slate-200 font-bold">2</td>
                        <td className="p-1 border border-slate-200 text-left pl-3">Presencial (Sistema Inoperante)</td>
                        <td className="p-1 border border-slate-200 font-bold">36 Horas</td>
                    </tr>
                    <tr>
                        <td className="p-1 border border-slate-200 font-bold">3</td>
                        <td className="p-1 border border-slate-200 text-left pl-3">Presencial (Média Prioridade)</td>
                        <td className="p-1 border border-slate-200 font-bold">72 Horas</td>
                    </tr>
                </tbody>
            </table>
            <p className="text-[9px] text-slate-500 mt-2 italic">* Plantão remoto aos sábados (09h às 17h) para ocorrências críticas de sistema inoperante.</p>
        </div>

        {/* 4. Resumo Financeiro */}
        <div className="mt-auto">
            <div className="bg-slate-950 text-white p-6 rounded-xl mb-6 shadow-xl">
                <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 border-b border-white/10 pb-1">Resumo de Investimento SOFTPARK</h3>
                <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-white/50 mb-2">Venda e Implantação (Capex)</p>
                        <div className="flex justify-between text-[11px]">
                            <span>Equipamentos LPR:</span>
                            <span className="font-mono">{formatCurrency(equipmentSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span>Serviços de Instalação:</span>
                            <span className="font-mono">{formatCurrency(data.setupCost || 0)}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs font-bold">TOTAL ÚNICO:</span>
                            <span className="text-lg font-black text-blue-400">{formatCurrency(finalSetupValue)}</span>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <p className="text-[9px] font-black uppercase text-white/50 mb-2">Licenciamento e Manutenção (Opex)</p>
                        <div className="flex justify-between text-[11px]">
                            <span>Softwares SOFTPARK:</span>
                            <span className="font-mono">{formatCurrency(servicesSubtotal)}</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                            <span>SLA Suporte Mensal:</span>
                            <span className="font-mono">{formatCurrency(data.monthlyCost || 0)}</span>
                        </div>
                        <div className="pt-2 mt-2 border-t border-white/10 flex justify-between items-center">
                            <span className="text-xs font-bold">TOTAL MENSAL:</span>
                            <span className="text-lg font-black text-blue-400">{formatCurrency(finalMonthlyValue)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. Termos e Condições */}
            <div className="mb-6">
                <h3 className="text-xs font-black text-slate-900 uppercase border-b border-slate-200 pb-1 mb-2">4. Termos e Condições Gerais</h3>
                <p className="text-[9px] text-slate-500 text-justify leading-relaxed whitespace-pre-wrap">{data.terms}</p>
            </div>

            {/* 6. Signatures */}
            <div className="pt-6 border-t border-slate-200">
                <div className="flex justify-between items-end">
                    <div className="text-center w-5/12">
                        <div className="mb-2 h-10 border-b border-slate-300 flex items-end justify-center">
                            <span className="text-[10px] text-slate-400">Pela SOFTPARK</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase">{companyInfo.name}</p>
                        <p className="text-[8px] text-slate-500">Gerência de Relacionamento</p>
                        <p className="text-[8px] text-slate-400">{companyInfo.email}</p>
                    </div>
                    <div className="text-center w-5/12">
                        {data.signature ? (
                            <div className="mb-1 h-12 flex items-center justify-center">
                                <img src={data.signature} alt="Signature" className="max-h-full mix-blend-multiply" />
                            </div>
                        ) : (
                            <div className="mb-2 h-10 border-b border-slate-300"></div>
                        )}
                        <p className="text-[10px] font-bold uppercase">{data.clientName || 'Aceite do Cliente'}</p>
                        <p className="text-[8px] text-slate-500">Representante Legal (Contratante)</p>
                        {data.signedAt && <p className="text-[7px] text-slate-400 font-mono mt-1">Assinado via Portal: {new Date(data.signedAt).toLocaleString()}</p>}
                    </div>
                </div>
                <div className="mt-8 text-center text-[7px] text-slate-300 uppercase tracking-widest">
                    SOFTPARK TECNOLOGIA • DOCUMENTO VINCULADO AO SOFT-CRM ENTERPRISE
                </div>
            </div>
        </div>
    </div>
)};
