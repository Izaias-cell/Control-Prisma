import React, { useState } from 'react';
import { Prisma } from '../types';
import { PrismaVisual } from './PrismaVisual';
import { sortPrismasNumericos } from '../utils/prismaSort';
import {
  Clock,
  Home,
  CheckCircle2,
  Camera,
  AlertCircle,
  Search,
  X,
} from 'lucide-react';

interface ReceberViewProps {
  prismasEmUso: Prisma[];
  onReceberPrisma: (
    prismaId: string,
    options?: { origin?: 'CARD' | 'BUTTON' }
  ) => Promise<void>;
  isLoading: boolean;
  onOpenHistorico: (prisma: Prisma) => void;
}

export const ReceberView: React.FC<ReceberViewProps> = ({
  prismasEmUso,
  onReceberPrisma,
  isLoading,
  onOpenHistorico,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPrisma, setSelectedPrisma] = useState<Prisma | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const result = prismasEmUso.filter((p) => {
      if (!q) return true;
      return (
        p.numero.includes(q) ||
        p.corNome.toLowerCase().includes(q) ||
        (p.casaAtual && p.casaAtual.toLowerCase().includes(q))
      );
    });
    return sortPrismasNumericos(result);
  }, [prismasEmUso, searchTerm]);

  const getTimeFormatted = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const getElapsed = (dateStr?: string) => {
    if (!dateStr) return '';
    const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (diffMin < 60) return `Há ${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `Há ${hours}h ${mins}m`;
  };

  // Abrir modal de confirmação ao clicar no CARD ou no botão
  const handleOpenRecolhimentoModal = (prisma: Prisma) => {
    if (isSubmitting || isLoading) return;
    setModalError(null);
    setSelectedPrisma(prisma);
  };

  // Cancelar devolução
  const handleCloseModal = () => {
    if (isSubmitting) return;
    setSelectedPrisma(null);
    setModalError(null);
  };

  // Confirmar devolução (Modo Contínuo pelo CARD -> permanece em RECOLHER)
  const handleConfirmDevolucao = async () => {
    if (!selectedPrisma || isSubmitting || isLoading) return;

    setIsSubmitting(true);
    setModalError(null);
    try {
      // origin: 'CARD' garante explicitamente que a navegação permanece em 'RECEBER'
      await onReceberPrisma(selectedPrisma.id, { origin: 'CARD' });
      setSelectedPrisma(null);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao registrar devolução do prisma.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div id="view-recolher-prisma" className="space-y-3">
      {/* Quick filter input */}
      {prismasEmUso.length > 3 && (
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar por nº, cor ou casa..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:border-blue-500 outline-none shadow-2xs font-medium"
          />
        </div>
      )}

      {/* Global Error alert if any */}
      {globalError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{globalError}</span>
          </div>
          <button
            onClick={() => setGlobalError(null)}
            className="text-xs font-bold text-rose-700 underline cursor-pointer"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Cards Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 bg-white rounded-xl border border-dashed border-slate-300 p-5">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
          <h3 className="text-sm sm:text-base font-bold text-slate-800">
            {searchTerm ? 'Nenhum prisma corresponde à busca' : 'Nenhum prisma em uso para recolhimento!'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            {searchTerm
              ? 'Tente buscar por outro número, cor ou casa.'
              : 'Todos os prismas já foram recolhidos e estão disponíveis.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {filtered.map((prisma) => {
            const isBeingProcessed = isSubmitting && selectedPrisma?.id === prisma.id;

            return (
              <div
                key={prisma.id}
                id={`card-recolher-${prisma.id}`}
                onClick={() => handleOpenRecolhimentoModal(prisma)}
                className="bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400 rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Bar: Color Name (left) and EM USO (right) */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-800">
                      {prisma.corNome.toUpperCase()}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.2 rounded-full uppercase">
                      EM USO
                    </span>
                  </div>

                  {/* Physical Prisma Miniature & House Info */}
                  <div className="flex items-center gap-3.5 my-2">
                    <PrismaVisual
                      numero={prisma.numero}
                      corIdOrNome={prisma.corNome}
                      size="sm"
                      className="flex-shrink-0 group-hover:scale-105 transition-transform"
                    />

                    <div className="min-w-0">
                      <div className="text-lg sm:text-xl font-black text-slate-900 leading-tight truncate">
                        {prisma.numero} — {prisma.corNome.toUpperCase()}
                      </div>
                      <div className="flex items-center gap-1 text-xs sm:text-sm font-black text-blue-800 mt-1 truncate">
                        <Home className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span className="truncate">{prisma.casaAtual || 'Casa N/A'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Delivery time metadata */}
                  <div className="bg-slate-50 rounded-lg p-2 my-1.5 border border-slate-100 text-xs space-y-0.5">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Clock className="w-3 h-3 text-slate-400" />
                        Entregue às {getTimeFormatted(prisma.horarioEntregaAtual)}
                      </span>
                      <span className="font-bold text-slate-700 bg-white px-1.5 py-0.2 rounded border border-slate-200 text-[10px]">
                        {getElapsed(prisma.horarioEntregaAtual)}
                      </span>
                    </div>

                    {prisma.fotoEntregaAtual && (
                      <div className="pt-0.5 flex items-center gap-1 text-indigo-700 font-semibold text-[10px]">
                        <Camera className="w-3 h-3" />
                        <span>Evidência fotográfica anexada</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Action: Instant Recolher / Baixa */}
                <div className="pt-1.5 mt-1 border-t border-slate-100 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenHistorico(prisma);
                    }}
                    className="py-2 px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    title="Ver histórico do prisma"
                  >
                    Histórico
                  </button>

                  <button
                    id={`btn-confirmar-recolhimento-${prisma.id}`}
                    type="button"
                    disabled={isLoading || isSubmitting}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenRecolhimentoModal(prisma);
                    }}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isBeingProcessed ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>RECOLHER PRISMA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =========================================================================
          MODAL DE DEVOLUÇÃO / RECOLHIMENTO (INICIADO PELO CARD DO PRISMA)
          ========================================================================= */}
      {selectedPrisma && (
        <div
          id="modal-devolucao-prisma-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              handleCloseModal();
            }
          }}
        >
          <div
            id="modal-devolucao-prisma"
            className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Recolhimento de Prisma
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Confirmar devolução na portaria
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCloseModal}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Prisma Highlight Info */}
              <div className="flex items-center gap-4 p-3.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                <PrismaVisual
                  numero={selectedPrisma.numero}
                  corIdOrNome={selectedPrisma.corNome}
                  size="md"
                  className="flex-shrink-0 shadow-xs"
                />

                <div className="min-w-0">
                  <span className="text-[11px] font-black uppercase text-blue-700 tracking-wider">
                    {selectedPrisma.corNome}
                  </span>
                  <h4 className="text-xl font-black text-slate-900 leading-tight">
                    PRISMA {selectedPrisma.numero}
                  </h4>
                  <div className="flex items-center gap-1.5 text-sm font-black text-slate-800 mt-1">
                    <Home className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>{selectedPrisma.casaAtual || 'Casa N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Time Metadata */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Horário da entrega:
                  </span>
                  <span className="font-bold text-slate-800">
                    {getTimeFormatted(selectedPrisma.horarioEntregaAtual) || 'Registrado'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Tempo decorrido:</span>
                  <span className="font-bold text-blue-800 bg-blue-100/70 px-2 py-0.5 rounded text-[11px]">
                    {getElapsed(selectedPrisma.horarioEntregaAtual) || 'Em uso'}
                  </span>
                </div>

                {selectedPrisma.fotoEntregaAtual && (
                  <div className="pt-1 border-t border-slate-200/60 flex items-center gap-1.5 text-indigo-700 font-semibold text-xs">
                    <Camera className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Evidência fotográfica registrada na entrega</span>
                  </div>
                )}
              </div>

              {/* Error in modal if any */}
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="px-5 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleCloseModal}
                className="px-4 py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                CANCELAR
              </button>

              <button
                id="btn-confirmar-modal-devolucao"
                type="button"
                disabled={isSubmitting || isLoading}
                onClick={handleConfirmDevolucao}
                className="px-5 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-w-[170px]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>REGISTRANDO...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                    <span>CONFIRMAR ENTREGA</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
