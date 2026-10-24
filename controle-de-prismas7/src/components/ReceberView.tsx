import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Prisma, PrismaEstado } from '../types';
import { PrismaVisual } from './PrismaVisual';
import { PrismaTooltip, getPrismaTooltipPlainText } from './PrismaTooltip';
import { sortPrismasNumericos } from '../utils/prismaSort';
import {
  Clock,
  Home,
  CheckCircle2,
  Camera,
  AlertCircle,
  Search,
  ListChecks,
  Check,
} from 'lucide-react';

interface ReceberViewProps {
  prismasEmUso?: Prisma[];
  prismasParaRecolher?: Prisma[];
  prismas?: Prisma[];
  onReceberPrisma: (
    prismaId: string,
    options?: { origin?: 'CARD' | 'BUTTON' }
  ) => Promise<void>;
  isLoading: boolean;
  onOpenHistorico: (prisma: Prisma) => void;
  isModoMultiplo?: boolean;
  onToggleModoMultiplo?: () => void;
  onReceberMultiplosPrismas?: (prismas: Prisma[]) => Promise<void>;
}

export const ReceberView: React.FC<ReceberViewProps> = ({
  prismasEmUso,
  prismasParaRecolher,
  prismas,
  onReceberPrisma,
  isLoading,
  onOpenHistorico,
  isModoMultiplo = false,
  onToggleModoMultiplo,
  onReceberMultiplosPrismas,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [processingPrismaId, setProcessingPrismaId] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [selectedPrismaIds, setSelectedPrismaIds] = useState<string[]>([]);
  const [limitWarning, setLimitWarning] = useState<string | null>(null);
  const [isConfirmingMultiplo, setIsConfirmingMultiplo] = useState(false);

  // Limpa a seleção e avisos quando o modo múltiplo for desativado
  useEffect(() => {
    if (!isModoMultiplo) {
      setSelectedPrismaIds([]);
      setLimitWarning(null);
    }
  }, [isModoMultiplo]);

  // REGRA DEFINITIVA: A área RECOLHER deve listar TODOS os prismas que estão atualmente com moradores
  // e que podem ser devolvidos à portaria: EM USO + PENDENTES.
  const rawList = prismas || prismasParaRecolher || prismasEmUso || [];

  const prismasRecolhiveis = React.useMemo(() => {
    return rawList.filter(
      (p) => p.estado === PrismaEstado.EM_USO || p.estado === PrismaEstado.PENDENTE
    );
  }, [rawList]);

  const filtered = React.useMemo(() => {
    const q = searchTerm.toLowerCase().trim();
    const result = prismasRecolhiveis.filter((p) => {
      if (!q) return true;
      return (
        p.numero.includes(q) ||
        p.corNome.toLowerCase().includes(q) ||
        (p.casaAtual && p.casaAtual.toLowerCase().includes(q))
      );
    });
    return sortPrismasNumericos(result);
  }, [prismasRecolhiveis, searchTerm]);

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

  const processingRef = useRef<Set<string>>(new Set());

  // Baixa direta e imediata pelo CARD ou pelo botão interno (Modo Normal)
  const handleBaixaDireta = async (prisma: Prisma) => {
    if (processingRef.current.has(prisma.id) || processingPrismaId || isLoading) return;

    processingRef.current.add(prisma.id);
    setProcessingPrismaId(prisma.id);
    setGlobalError(null);
    try {
      // origin: 'CARD' garante explicitamente que a navegação permanece em 'RECEBER'
      await onReceberPrisma(prisma.id, { origin: 'CARD' });
    } catch (err: any) {
      setGlobalError(err.message || 'Erro ao registrar devolução do prisma.');
    } finally {
      processingRef.current.delete(prisma.id);
      setProcessingPrismaId(null);
    }
  };

  // Clique no card: bifurcação entre modo normal e modo múltiplo
  const handleCardClick = (prisma: Prisma) => {
    if (isModoMultiplo) {
      if (isConfirmingMultiplo || isLoading) return;
      const isSelected = selectedPrismaIds.includes(prisma.id);
      if (isSelected) {
        setSelectedPrismaIds((prev) => prev.filter((id) => id !== prisma.id));
        setLimitWarning(null);
      } else {
        if (selectedPrismaIds.length >= 3) {
          setLimitWarning('Limite máximo de 3 prismas por operação atingido. Desmarque um para selecionar outro.');
          return;
        }
        setSelectedPrismaIds((prev) => [...prev, prisma.id]);
        setLimitWarning(null);
      }
    } else {
      handleBaixaDireta(prisma);
    }
  };

  // Cancelar seleção do modo múltiplo
  const handleCancelarSelecao = () => {
    setSelectedPrismaIds([]);
    setLimitWarning(null);
    if (onToggleModoMultiplo) {
      onToggleModoMultiplo();
    }
  };

  // Prismas selecionados no modo múltiplo na ordem exata de seleção
  const selectedPrismas = useMemo(() => {
    return selectedPrismaIds
      .map((id) => rawList.find((p) => p.id === id))
      .filter((p): p is Prisma => Boolean(p));
  }, [selectedPrismaIds, rawList]);

  // Rótulo do botão de confirmação com a numeração real dos prismas selecionados
  const confirmButtonLabel = useMemo(() => {
    if (selectedPrismas.length === 0) {
      return 'CONFIRMAR BAIXAS (0)';
    }
    const numeros = selectedPrismas.map((p) => p.numero).join(', ');
    return `CONFIRMAR BAIXAS (${numeros})`;
  }, [selectedPrismas]);

  // Confirmar baixas múltiplas
  const handleConfirmarBaixas = async () => {
    if (selectedPrismas.length === 0 || isConfirmingMultiplo || isLoading) return;
    setIsConfirmingMultiplo(true);
    setGlobalError(null);
    setLimitWarning(null);
    try {
      if (onReceberMultiplosPrismas) {
        await onReceberMultiplosPrismas(selectedPrismas);
        setSelectedPrismaIds([]);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Erro ao processar baixas múltiplas.');
    } finally {
      setIsConfirmingMultiplo(false);
    }
  };

  return (
    <div id="view-recolher-prisma" className="space-y-3">
      {/* Quick filter input */}
      {prismasRecolhiveis.length > 3 && (
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

      {/* Barra de Ações do Modo Múltiplo */}
      {isModoMultiplo && (
        <div
          id="toolbar-baixas-multiplas"
          className="p-3 bg-gradient-to-r from-blue-900 to-indigo-950 text-white rounded-xl shadow-sm border border-blue-700/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-800/90 text-amber-300 ring-1 ring-blue-600 shadow-xs flex-shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-blue-200">
                  Baixas Múltiplas
                </span>
                <span className="text-[10px] font-black bg-amber-400 text-slate-950 px-1.5 py-0.2 rounded-full uppercase">
                  Até 3
                </span>
              </div>
              <div className="text-xs sm:text-sm font-black text-white mt-0.5">
                {selectedPrismaIds.length} de 3 selecionados
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-end flex-wrap">
            <button
              type="button"
              id="btn-cancelar-baixas-multiplas"
              onClick={handleCancelarSelecao}
              disabled={isConfirmingMultiplo || isLoading}
              className="py-1.5 px-3 rounded-lg text-xs font-bold text-slate-300 hover:text-white bg-slate-800/90 hover:bg-slate-700 active:bg-slate-900 border border-slate-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar Seleção
            </button>

            <button
              type="button"
              id="btn-confirmar-baixas-multiplas"
              onClick={handleConfirmarBaixas}
              disabled={selectedPrismaIds.length === 0 || isConfirmingMultiplo || isLoading}
              className={`py-1.5 px-3.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 shadow-xs ${
                selectedPrismaIds.length > 0 && !isConfirmingMultiplo && !isLoading
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer active:scale-95 ring-2 ring-emerald-400/40'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              {isConfirmingMultiplo ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>REGISTRANDO BAIXAS...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>{confirmButtonLabel}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Alerta discreto de limite de 3 atingido */}
      {isModoMultiplo && limitWarning && (
        <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{limitWarning}</span>
          </div>
          <button
            type="button"
            onClick={() => setLimitWarning(null)}
            className="text-[11px] font-bold text-amber-800 hover:underline cursor-pointer"
          >
            OK
          </button>
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
            {searchTerm ? 'Nenhum prisma corresponde à busca' : 'Nenhum prisma em uso ou pendente para recolhimento!'}
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
            const isBeingProcessed = processingPrismaId === prisma.id;
            const isAnyProcessing = processingPrismaId !== null || isLoading || isConfirmingMultiplo;
            const isSelected = isModoMultiplo && selectedPrismaIds.includes(prisma.id);

            return (
              <div
                key={prisma.id}
                id={`card-recolher-${prisma.id}`}
                onClick={() => handleCardClick(prisma)}
                className={`rounded-xl p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between cursor-pointer group relative ${
                  isSelected
                    ? 'bg-blue-50/90 border-2 border-blue-600 shadow-md ring-2 ring-blue-500/40'
                    : prisma.estado === PrismaEstado.PENDENTE
                    ? 'bg-amber-50/50 hover:bg-amber-100/60 border-2 border-amber-300 hover:border-amber-400'
                    : 'bg-white hover:bg-slate-50 border border-slate-200 hover:border-blue-400'
                } ${isAnyProcessing && !isModoMultiplo ? 'pointer-events-none opacity-80' : ''}`}
              >
                <div>
                  {/* Top Bar: Status + Badge de Seleção no Modo Múltiplo */}
                  <div className="flex items-center justify-between mb-1.5">
                    {isModoMultiplo ? (
                      isSelected ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-600 text-white flex items-center gap-1 shadow-xs">
                          <Check className="w-3 h-3 stroke-[3]" />
                          SELECIONADO ({selectedPrismaIds.indexOf(prisma.id) + 1}/3)
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 px-1">
                          Não selecionado
                        </span>
                      )
                    ) : (
                      <div />
                    )}

                    <span
                      className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.2 rounded-full uppercase border ${
                        prisma.estado === PrismaEstado.PENDENTE
                          ? 'text-amber-800 bg-amber-100 border-amber-300 ring-1 ring-amber-400 font-black'
                          : 'text-blue-700 bg-blue-50 border-blue-200'
                      }`}
                    >
                      {prisma.estado === PrismaEstado.PENDENTE ? 'PENDENTE (>24H)' : 'EM USO'}
                    </span>
                  </div>

                  {/* Physical Prisma Miniature & House Info */}
                  <div className="flex items-center gap-3.5 my-2">
                    <PrismaTooltip prisma={prisma} position={prisma.estado === PrismaEstado.PENDENTE ? 'bottom' : 'top'}>
                      <PrismaVisual
                        numero={prisma.numero}
                        corIdOrNome={prisma.corNome}
                        size="sm"
                        className="flex-shrink-0 group-hover:scale-105 transition-transform"
                      />
                    </PrismaTooltip>

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

                {/* Bottom Action: Histórico + Orientação de clique no card */}
                <div className="pt-2 mt-1.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenHistorico(prisma);
                    }}
                    className="py-1 px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex-shrink-0"
                    title="Ver histórico do prisma"
                  >
                    Histórico
                  </button>

                  <div className="flex items-center gap-1.5 min-w-0">
                    {isModoMultiplo ? (
                      isSelected ? (
                        <span className="text-[11px] sm:text-xs font-bold text-blue-700 select-none truncate">
                          ✓ Selecionado para baixa (clique para remover)
                        </span>
                      ) : (
                        <span className="text-[11px] sm:text-xs font-semibold text-slate-500 select-none truncate">
                          👆 Clique para selecionar
                        </span>
                      )
                    ) : isBeingProcessed ? (
                      <div
                        className={`flex items-center gap-1.5 text-xs font-black ${
                          prisma.estado === PrismaEstado.PENDENTE ? 'text-amber-800' : 'text-blue-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 border-2 ${
                            prisma.estado === PrismaEstado.PENDENTE ? 'border-amber-700' : 'border-blue-600'
                          } border-t-transparent rounded-full animate-spin`}
                        />
                        <span>RECOLHENDO...</span>
                      </div>
                    ) : (
                      <span className="text-[11px] sm:text-xs font-semibold text-slate-500 select-none">
                        👆 Clique no card para recolher
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
