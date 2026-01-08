
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
        role: 'Gerente de Relacionamento'
    };

    // Helper para calcular subtotal de UM item
    const getItemSubtotal = (item: ProposalItem) => {
        const base = (item.price || 0) * (item.quantity || 1);
        const disc = item.discount || 0;
        return base * (1 - disc / 100);
    };

    // SEPARAÇÃO LÓGICA DE ITENS PARA CÁLCULO INDEPENDENTE
    const equipmentItems = data.items?.filter(i => i.category === 'Product') || [];
    const subscriptionItems = data.items?.filter(i => i.category === 'Subscription' || i.category === 'Service') || [];

    // Cálculo Independente de CAPEX (Setup/Hardware)
    const totalCapex = equipmentItems.reduce((acc, item) => acc + getItemSubtotal(item), 0) + Number(data.setupCost || 0);
    
    // Cálculo Independente de OPEX (Mensalidade/Recorrência)
    const totalOpex = subscriptionItems.reduce((acc, item) => acc + getItemSubtotal(item), 0) + Number(data.monthlyCost || 0);

    return (
        <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl text-slate-800 flex flex-col relative printable-area mx-auto font-serif text-[11px] leading-relaxed">
            
            {/* CABEÇALHO */}
            <div className="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-950 flex items-center justify-center rounded">
                        <span className="text-white font-black text-xl">SC</span>
                    </div>
                    <div>
                        <h1 className="text-lg font-bold uppercase tracking-tighter">CONTRATO DE LOCAÇÃO E PRESTAÇÃO DE SERVIÇOS</h1>
                        <p className="text-[9px] font-bold text-slate-500 italic">Nexus Enterprise Workflow System</p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="font-bold">Proposta: {data.id}</p>
                    <p>Emissão: {today.toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* QUALIFICAÇÃO */}
            <div className="mb-6">
                <p className="text-justify mb-4">
                    Pelo presente instrumento particular de contrato, a <strong>LOCADORA</strong> (SOFTCASE) e a <strong>LOCATÁRIA</strong> (<strong>{data.companyName || '________________________________'}</strong>) celebram o fornecimento de tecnologia sob as seguintes condições comerciais:
                </p>
            </div>

            {/* TABELA DE VALORES - ESTILO IMAGEM REFERÊNCIA */}
            <div className="my-6">
                <table className="w-full border-collapse border border-slate-300">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="border border-slate-300 p-2 text-left uppercase text-[9px]">SOLUÇÃO / EQUIPAMENTO</th>
                            <th className="border border-slate-300 p-2 text-center w-12 text-[9px]">Qtd</th>
                            <th className="border border-slate-300 p-2 text-right w-28 text-[9px]">Investimento</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Renderiza todos os itens do escopo detalhado */}
                        {data.items?.map((item, idx) => (
                            <tr key={idx}>
                                <td className="border border-slate-300 p-2">
                                    <p className="font-bold uppercase">{item.name}</p>
                                    <span className="text-[8px] text-slate-400 uppercase leading-none">
                                        {item.category === 'Product' ? 'LOCAÇÃO/LICENÇA' : 'MENSALIDADE/SUPORTE'}
                                    </span>
                                </td>
                                <td className="border border-slate-300 p-2 text-center">{item.quantity}</td>
                                <td className="border border-slate-300 p-2 text-right font-bold">{formatCurrency(item.price)}</td>
                            </tr>
                        ))}
                        
                        {/* LINHA DE TOTAL SETUP (CAPEX) - INDEPENDENTE */}
                        <tr className="bg-slate-50">
                            <td colSpan={2} className="border border-slate-300 p-3 text-right font-black uppercase text-slate-600">
                                TOTAL SETUP (CAPEX):
                            </td>
                            <td className="border border-slate-300 p-3 text-right text-blue-800 font-black text-xs">
                                {formatCurrency(totalCapex)}
                            </td>
                        </tr>

                        {/* LINHA DE MENSALIDADE OPERACIONAL (OPEX) - INDEPENDENTE */}
                        <tr className="bg-indigo-50/50">
                            <td colSpan={2} className="border border-slate-300 p-3 text-right font-black uppercase italic text-indigo-900">
                                MENSALIDADE OPERACIONAL (OPEX):
                            </td>
                            <td className="border border-slate-300 p-3 text-right text-indigo-700 font-black text-xs">
                                {formatCurrency(totalOpex)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* GARANTIA E LICENÇA - SEÇÃO 4 DA IMAGEM */}
            <div className="space-y-4">
                <section>
                    <h3 className="font-bold uppercase border-b border-slate-200 mb-1">4. GARANTIA E LICENÇA</h3>
                    <p className="text-justify">
                        4.1. <strong>Locação:</strong> Garantia permanente contra defeitos de fabricação durante a vigência contratual. 
                        <strong> Compra:</strong> Garantia de 12 (doze) meses. Exclui-se má utilização ou acidentes.
                        4.2. As licenças de software são individuais e intransferíveis, vinculadas ao hardware fornecido.
                    </p>
                </section>
                
                <section>
                    <h3 className="font-bold uppercase border-b border-slate-200 mb-1">5. CONDIÇÕES GERAIS</h3>
                    <p className="text-justify">
                        O prazo de implantação estimado é de {data.timeline || '45 dias'} após assinatura. 
                        O faturamento do OPEX inicia-se imediatamente após o Go-Live da unidade ou assinatura, conforme cronograma.
                    </p>
                </section>
            </div>

            {/* ASSINATURAS */}
            <div className="mt-auto pt-10 border-t border-slate-300">
                <p className="text-right mb-10 text-[10px]">São Vicente, {today.getDate()} de {today.toLocaleString('pt-BR', {month: 'long'})} de {today.getFullYear()}</p>
                
                <div className="grid grid-cols-2 gap-20">
                    <div className="text-center">
                        <div className="h-10 border-b border-slate-400 mb-2"></div>
                        <p className="font-bold uppercase text-[9px]">{companyInfo.name}</p>
                        <p className="text-[8px] text-slate-400">LOCADORA</p>
                    </div>
                    <div className="text-center">
                        <div className="h-10 border-b border-slate-400 mb-2 flex items-center justify-center">
                            {data.signature && <img src={data.signature} className="max-h-full mix-blend-multiply" alt="signature"/>}
                        </div>
                        <p className="font-bold uppercase text-[9px]">{data.companyName || 'LOCATÁRIA'}</p>
                        <p className="text-[8px] text-slate-400">LOCATÁRIA</p>
                    </div>
                </div>
            </div>

            <div className="mt-6 text-center text-[7px] text-slate-400 uppercase tracking-[0.3em]">
                DOCUMENTO DIGITAL GERADO VIA NEXUS PORTAL • SOFTCASE TECNOLOGIA
            </div>
        </div>
    );
};
