
import React from 'react';
import { Invoice } from '../types';

interface InvoiceDocumentProps {
    data: Invoice;
    id?: string;
}

export const InvoiceDocument: React.FC<InvoiceDocumentProps> = ({ data, id }) => (
    <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl text-slate-800 flex flex-col relative printable-area mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                    N
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">Fatura de Serviço</h1>
                    <p className="text-xs text-slate-500">Nexus CRM Enterprise</p>
                </div>
            </div>
            <div className="text-right">
                <p className="text-sm font-bold text-slate-400 uppercase">Fatura Nº</p>
                <p className="text-xl font-mono font-bold text-slate-800">#{data.id.split('-')[1] || data.id}</p>
                <p className="text-xs text-slate-500 mt-1">Emissão: {new Date().toLocaleDateString()}</p>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-12 mb-12">
            <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Cobrado de:</h3>
                <p className="text-lg font-bold text-slate-800">{data.customer}</p>
                <p className="text-sm text-slate-600">Cliente Corporativo</p>
            </div>
            <div className="text-right">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Pago para:</h3>
                <p className="text-lg font-bold text-slate-800">Sua Empresa Ltda</p>
                <p className="text-sm text-slate-600">CNPJ: 00.000.000/0001-00</p>
                <p className="text-sm text-slate-600">financeiro@suaempresa.com</p>
            </div>
        </div>

        {/* Details Box */}
        <div className="bg-slate-50 rounded-lg border border-slate-200 p-6 mb-8">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-4">
                <span className="text-sm font-bold text-slate-500 uppercase">Descrição do Serviço</span>
                <span className="text-sm font-bold text-slate-500 uppercase">Valor</span>
            </div>
            <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-slate-800">{data.description}</span>
                <span className="font-mono text-slate-800">R$ {data.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
            </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end mb-12">
            <div className="w-1/2">
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="font-mono">R$ {data.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Impostos (0%)</span>
                    <span className="font-mono">R$ 0,00</span>
                </div>
                <div className="flex justify-between py-4">
                    <span className="text-lg font-bold text-emerald-600">Total a Pagar</span>
                    <span className="text-2xl font-bold text-emerald-600">R$ {data.amount.toLocaleString('pt-BR', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
        </div>

        {/* Payment Info */}
        <div className="mt-auto pt-8 border-t-2 border-slate-100 border-dashed">
            <div className="flex gap-6 items-center">
                <div className="w-24 h-24 bg-slate-800 flex items-center justify-center text-white text-[10px] text-center p-2">
                    [QR CODE PIX]
                </div>
                <div className="flex-1">
                    <h4 className="font-bold text-slate-800 mb-1">Instruções de Pagamento</h4>
                    <p className="text-sm text-slate-600 mb-2">Vencimento: <strong>{new Date(data.dueDate).toLocaleDateString()}</strong></p>
                    <p className="text-xs text-slate-500 leading-relaxed">
                        Utilize o QR Code ao lado para pagar via Pix ou faça uma transferência bancária.
                        Após o vencimento, sujeito a multa de 2% e juros de 1% ao mês.
                    </p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-[10px] text-slate-400 uppercase tracking-widest">
            Documento gerado automaticamente por Nexus CRM
        </div>
    </div>
);
