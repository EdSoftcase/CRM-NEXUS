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
                    <p className="text-slate-400 uppercase text-xs font-bold">Data:</p>
                    <p className="font-medium">{new Date(data.createdDate).toLocaleDateString()}</p>
                    <p className="text-slate-400 uppercase text-xs font-bold mt-2">Validade:</p>
                    <p className="font-medium">{new Date(data.validUntil).toLocaleDateString()}</p>
                </div>
            </div>
        </div>

        {/* Body */}
        <div className="space-y-8 flex-1">
            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">Introdução</h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap text-justify">
                    {data.introduction || 'Texto de introdução...'}
                </p>
            </section>

            <section>
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-2 border-b border-blue-100 pb-1">Escopo do Projeto</h3>
                {data.scope.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-2 text-sm text-slate-700">
                        {data.scope.map((item, i) => (
                            <li key={i}>{item}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-slate-400 italic">Itens do escopo aparecerão aqui.</p>
                )}
            </section>

            <section className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-4 border-b border-blue-100 pb-1">Investimento & Prazo</h3>
                <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-600 font-medium">Investimento Total</span>
                    <span className="text-2xl font-bold text-slate-900">{formatCurrency(data.price)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600 font-medium">Prazo Estimado</span>
                    <span className="font-bold text-slate-700">{data.timeline}</span>
                </div>
            </section>

            {/* Força uma quebra de página antes das cláusulas se houver muito conteúdo, ou deixa fluir */}
            <div className="html2pdf__page-break"></div>

            <section className="mt-8 pt-4">
                <h3 className="text-sm font-bold text-[#0ea5e9] uppercase tracking-wider mb-4 border-b border-blue-100 pb-1">Termos e Condições</h3>
                <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed text-justify">
                    {data.terms}
                </div>
            </section>
        </div>

        {/* Footer / Signature Area */}
        <div className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex justify-between items-end">
                <div className="text-center w-1/3">
                    {/* Placeholder para assinatura da empresa */}
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