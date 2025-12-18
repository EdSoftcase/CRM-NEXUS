
import React from 'react';
import { Project } from '../types';

interface AcceptanceDocumentProps {
    project: Project;
    id?: string;
}

export const AcceptanceDocument: React.FC<AcceptanceDocumentProps> = ({ project, id }) => {
    const today = new Date().toLocaleDateString('pt-BR');

    return (
        <div id={id} className="bg-white w-[210mm] min-h-[297mm] p-[20mm] text-slate-800 flex flex-col relative mx-auto font-sans shadow-none border border-slate-100">
            {/* Header Branding */}
            <div className="flex justify-between items-center mb-10 border-b-2 border-slate-100 pb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-tl-2xl rounded-br-2xl bg-gradient-to-br from-[#0ea5e9] to-[#0f172a] flex items-center justify-center shadow-sm">
                        <span className="text-white font-bold text-xl">S</span>
                    </div>
                    <div className="flex flex-col leading-none">
                        <span className="text-2xl font-black text-[#0f172a] tracking-tighter">SOFT</span>
                        <span className="text-2xl font-bold text-[#0ea5e9] tracking-widest">CASE</span>
                    </div>
                </div>
                <div className="text-right">
                    <h1 className="text-xl font-bold text-slate-900 uppercase">Termo de Aceite</h1>
                    <p className="text-xs text-slate-500">Protocolo de Entrega de Serviços</p>
                </div>
            </div>

            {/* Content Body */}
            <div className="space-y-8 flex-1 text-sm">
                <section>
                    <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-3 uppercase text-xs tracking-wider">1. Identificação do Cliente</h3>
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg">
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Cliente / Razão Social</p>
                            <p className="font-bold text-slate-800">{project.clientName}</p>
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Projeto</p>
                            <p className="font-bold text-slate-800">{project.title}</p>
                        </div>
                        <div className="col-span-2">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Local de Instalação</p>
                            <p className="text-slate-700">{project.installAddress || 'Endereço registrado no sistema'}</p>
                        </div>
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-3 uppercase text-xs tracking-wider">2. Escopo Entregue</h3>
                    <p className="mb-4 text-slate-600">Declaramos para os devidos fins que os seguintes itens foram instalados e testados conforme o projeto aprovado:</p>
                    <div className="border border-slate-100 rounded-lg overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-bold uppercase text-slate-500">
                                <tr>
                                    <th className="p-3">Item / Produto</th>
                                    <th className="p-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {project.products?.map((prod, i) => (
                                    <tr key={i}>
                                        <td className="p-3 font-medium text-slate-700">{prod}</td>
                                        <td className="p-3 text-center text-green-600 font-bold">Instalado & OK</td>
                                    </tr>
                                ))}
                                {(!project.products || project.products.length === 0) && (
                                    <tr><td colSpan={2} className="p-4 text-center text-slate-400 italic">Lista de produtos vinculada ao escopo do projeto.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-3 uppercase text-xs tracking-wider">3. Prazos e Vigência</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 border border-slate-100 rounded-lg">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Data de Início</p>
                            <p className="font-medium">{new Date(project.startDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div className="p-3 border border-slate-100 rounded-lg">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">Data de Conclusão</p>
                            <p className="font-medium">{project.completedAt ? new Date(project.completedAt).toLocaleDateString('pt-BR') : today}</p>
                        </div>
                    </div>
                </section>

                <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 mt-10">
                    <h3 className="font-bold text-blue-900 mb-2">Declaração de Conformidade</h3>
                    <p className="text-blue-800 text-xs text-justify leading-relaxed">
                        O CLIENTE declara, através deste termo, que os serviços foram prestados em sua totalidade, os equipamentos instalados encontram-se em perfeito estado de funcionamento e a equipe técnica realizou o treinamento operacional básico necessário para a utilização da solução. A partir desta data, inicia-se o período de garantia legal conforme estipulado em contrato.
                    </p>
                </section>
            </div>

            {/* Signature Area */}
            <div className="mt-16 pt-10 border-t border-slate-100">
                <div className="flex justify-between items-end gap-20">
                    <div className="flex-1 text-center">
                        <div className="border-b border-slate-300 mb-2 h-10"></div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Soft Case Tecnologia</p>
                        <p className="text-xs text-slate-600">{project.manager}</p>
                    </div>
                    <div className="flex-1 text-center">
                        <div className="border-b border-slate-300 mb-2 h-10"></div>
                        <p className="text-[10px] font-bold uppercase text-slate-400">Aceite do Cliente</p>
                        <p className="text-xs text-slate-600">{project.clientName}</p>
                    </div>
                </div>
                <div className="mt-12 text-center text-[8px] text-slate-400 uppercase tracking-widest">
                    Nexus CRM Enterprise • Documento Gerado em {today} às {new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};
