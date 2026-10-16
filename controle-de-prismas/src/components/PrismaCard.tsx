import React, { useState } from 'react';
import { Prisma, PrismaEstado } from '../types';
import { PrismaVisual } from './PrismaVisual';
import { Clock, Home, Camera, AlertCircle } from 'lucide-react';
import {
  formatDataHoraRetirada,
  calcularTempoDecorrido,
} from './PrismaTooltip';

interface PrismaCardProps {
  prisma: Prisma;
  onClick: () => void;
  variant?: 'entrega' | 'receber' | 'geral';
  disabled?: boolean;
}

export const PrismaCard: React.FC<PrismaCardProps> = ({
  prisma,
  onClick,
  variant = 'geral',
  disabled = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getStatusLabel = () => {
    switch (prisma.estado) {
      case PrismaEstado.DISPONIVEL:
        return 'DISPONÍVEL';
      case PrismaEstado.EM_USO:
        return 'EM USO';
      case PrismaEstado.PENDENTE:
        return 'PENDENTE';
      case PrismaEstado.INDISPONIVEL:
        return 'INDISPONÍVEL';
    }
  };

  const getStatusStyle = () => {
    switch (prisma.estado) {
      case PrismaEstado.DISPONIVEL:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
      case PrismaEstado.EM_USO:
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case PrismaEstado.PENDENTE:
        return 'text-amber-800 bg-amber-100 border-amber-300 font-black';
      case PrismaEstado.INDISPONIVEL:
        return 'text-slate-500 bg-slate-50 border-slate-200';
    }
  };

  // Time elapsed if in use
  const getElapsedFormatted = (dateStr?: string) => {
    if (!dateStr) return '';
    const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
    if (diffMin < 60) return `Há ${diffMin} min`;
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `Há ${hours}h ${mins}m`;
  };

  const getTimeFormatted = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  const rawCasa = (prisma.casaAtual || '').trim();
  const cleanCasa = rawCasa.replace(/^casa\s*:?\s*/i, '').trim();
  const casaDisplay = cleanCasa || rawCasa || 'Não informada';
  const moradorDisplay =
    (prisma as any).morador ||
    (prisma as any).moradorNome ||
    (cleanCasa ? `Morador da Casa ${cleanCasa}` : 'Não informado');

  return (
    <button
      id={`prisma-card-${prisma.id}`}
      onClick={onClick}
      disabled={disabled}
      type="button"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`w-full group relative flex flex-col justify-between items-center p-2 sm:p-2.5 rounded-xl border text-center transition-all cursor-pointer select-none active:scale-[0.98] ${
        disabled
          ? 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200'
          : prisma.estado === PrismaEstado.PENDENTE
          ? 'bg-amber-50/60 hover:bg-amber-100/70 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
          : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-slate-400 hover:shadow-xs'
      }`}
    >
      {/* TOOLTIP CONTEXTUAL AO PASSAR O MOUSE (SEM ALTERAR O LAYOUT) */}
      {isHovered && (
        <div
          role="tooltip"
          className={`absolute ${
            prisma.estado === PrismaEstado.PENDENTE
              ? 'top-full left-1/2 -translate-x-1/2 mt-2.5'
              : 'bottom-full left-1/2 -translate-x-1/2 mb-2.5'
          } z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-2xl bg-slate-950/95 text-white border border-slate-700/80 rounded-xl p-2.5 text-xs text-left min-w-[210px] backdrop-blur-xs`}
        >
          {prisma.estado === PrismaEstado.DISPONIVEL ? (
            <div className="flex items-center gap-1.5 font-black text-emerald-400 text-xs whitespace-nowrap py-0.5">
              <span>🟢</span>
              <span>DISPONÍVEL</span>
            </div>
          ) : (
            <div className="space-y-1 text-xs text-slate-200 whitespace-nowrap">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🏠</span>
                <span className="text-slate-400 font-medium">Casa:</span>
                <span className="font-bold text-white">{casaDisplay}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">👤</span>
                <span className="text-slate-400 font-medium">Morador:</span>
                <span className="font-bold text-white truncate max-w-[170px]">{moradorDisplay}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🕐</span>
                <span className="text-slate-400 font-medium">Retirado:</span>
                <span className="font-bold text-white">{formatDataHoraRetirada(prisma.horarioEntregaAtual)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⏱️</span>
                <span className="text-slate-400 font-medium">Tempo:</span>
                <span className="font-bold text-white">{calcularTempoDecorrido(prisma.horarioEntregaAtual)}</span>
              </div>
              <div className="pt-1 mt-1 border-t border-slate-800 flex items-center gap-1.5 font-black">
                {prisma.estado === PrismaEstado.PENDENTE ? (
                  <span className="text-amber-400 flex items-center gap-1.5 font-black">
                    <span>🟠</span> PENDENTE
                  </span>
                ) : (
                  <span className="text-rose-400 flex items-center gap-1.5 font-black">
                    <span>🔴</span> EM USO
                  </span>
                )}
              </div>
            </div>
          )}
          {/* Seta indicador da tooltip */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 transform rotate-45 ${
              prisma.estado === PrismaEstado.PENDENTE
                ? '-top-1 border-t border-l border-slate-700/80'
                : '-bottom-1 border-r border-b border-slate-700/80'
            }`}
          />
        </div>
      )}

      {/* 1. STATUS (CENTRALIZADO NO TOPO) */}
      <div className="w-full flex justify-center mb-1">
        <span
          className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border leading-tight ${getStatusStyle()}`}
        >
          {getStatusLabel()}
        </span>
      </div>

      {/* 2. REPRESENTAÇÃO DO PRISMA COM NÚMERO GRANDE INTEGRADO */}
      <div className="my-0.5 flex items-center justify-center">
        <PrismaVisual numero={prisma.numero} corIdOrNome={prisma.corNome} size="md" />
      </div>

      {/* 3. NOME DA COR ABAIXO DO NÚMERO */}
      <div className="mt-1 text-center w-full">
        <span className="text-[11px] sm:text-xs font-black text-slate-800 uppercase tracking-wider block truncate">
          {prisma.corNome}
        </span>
      </div>

      {/* 4. INFORMAÇÕES DE DESTINO E HORÁRIO (QUANDO EM USO OU PENDENTE) */}
      {(prisma.estado === PrismaEstado.EM_USO || prisma.estado === PrismaEstado.PENDENTE) && (
        <div
          className={`mt-1.5 pt-1.5 border-t w-full space-y-0.5 text-[10px] sm:text-[11px] ${
            prisma.estado === PrismaEstado.PENDENTE ? 'border-amber-200' : 'border-slate-100'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-slate-900">
            <div
              className={`flex items-center gap-1 truncate ${
                prisma.estado === PrismaEstado.PENDENTE ? 'text-amber-950 font-black' : 'text-blue-800 font-black'
              }`}
            >
              <Home className="w-3 h-3 flex-shrink-0" />
              <span className="truncate font-black">{prisma.casaAtual || 'Casa não inf.'}</span>
            </div>

            {prisma.fotoEntregaAtual && (
              <span className="flex items-center gap-0.5 text-[9px] text-indigo-700 bg-indigo-50 px-1 py-0.2 rounded font-medium flex-shrink-0">
                <Camera className="w-2.5 h-2.5" /> Foto
              </span>
            )}
          </div>

          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5 text-slate-400" />
              <span>{getTimeFormatted(prisma.horarioEntregaAtual)}</span>
            </span>
            <span
              className={`font-semibold ${
                prisma.estado === PrismaEstado.PENDENTE ? 'text-amber-800 font-bold' : 'text-slate-600'
              }`}
            >
              {getElapsedFormatted(prisma.horarioEntregaAtual)}
            </span>
          </div>

          {prisma.estado === PrismaEstado.PENDENTE && (
            <div className="mt-1 pt-0.5 text-[9px] text-amber-900 bg-amber-100/90 border border-amber-300 rounded px-1.5 py-0.5 flex items-center justify-center gap-1 font-bold">
              <AlertCircle className="w-2.5 h-2.5 text-amber-700 flex-shrink-0" />
              <span className="truncate">{prisma.observacao || 'Prazo 24h vencido'}</span>
            </div>
          )}
        </div>
      )}
    </button>
  );
};
