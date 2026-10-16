import React, { useState, useMemo } from 'react';
import { Prisma, PrismaEstado } from '../types';

interface PrismaTooltipProps {
  prisma: Prisma;
  children: React.ReactNode;
  position?: 'top' | 'bottom';
  className?: string;
}

export function formatDataHoraRetirada(isoStr?: string): string {
  if (!isoStr) return 'Não informado';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Não informado';
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const ano = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  } catch {
    return 'Não informado';
  }
}

export function calcularTempoDecorrido(dateStr?: string): string {
  if (!dateStr) return '0 min';
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000));
  if (diffMin < 60) return `Há ${diffMin} min`;
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  return `Há ${hours}h ${mins}m`;
}

export function getPrismaTooltipPlainText(prisma: Prisma): string {
  if (prisma.estado === PrismaEstado.DISPONIVEL) {
    return '🟢 DISPONÍVEL';
  }

  const rawCasa = (prisma.casaAtual || '').trim();
  const cleanCasa = rawCasa.replace(/^casa\s*:?\s*/i, '').trim();
  const casaDisplay = cleanCasa || rawCasa || 'Não informada';
  const moradorDisplay =
    (prisma as any).morador ||
    (prisma as any).moradorNome ||
    (cleanCasa ? `Morador da Casa ${cleanCasa}` : 'Não informado');
  const retiradoDisplay = formatDataHoraRetirada(prisma.horarioEntregaAtual);
  const tempoDisplay = calcularTempoDecorrido(prisma.horarioEntregaAtual);

  if (prisma.estado === PrismaEstado.PENDENTE) {
    return `🏠 Casa: ${casaDisplay}\n👤 Morador: ${moradorDisplay}\n🕐 Retirado: ${retiradoDisplay}\n⏱️ Tempo: ${tempoDisplay}\n🟠 PENDENTE`;
  }

  return `🏠 Casa: ${casaDisplay}\n👤 Morador: ${moradorDisplay}\n🕐 Retirado: ${retiradoDisplay}\n⏱️ Tempo: ${tempoDisplay}\n🔴 EM USO`;
}

export const PrismaTooltip: React.FC<PrismaTooltipProps> = ({
  prisma,
  children,
  position,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const rawCasa = (prisma.casaAtual || '').trim();
  const cleanCasa = rawCasa.replace(/^casa\s*:?\s*/i, '').trim();
  const casaDisplay = cleanCasa || rawCasa || 'Não informada';
  const moradorDisplay =
    (prisma as any).morador ||
    (prisma as any).moradorNome ||
    (cleanCasa ? `Morador da Casa ${cleanCasa}` : 'Não informado');
  const retiradoDisplay = formatDataHoraRetirada(prisma.horarioEntregaAtual);
  const tempoDisplay = calcularTempoDecorrido(prisma.horarioEntregaAtual);

  const isDisponivel = prisma.estado === PrismaEstado.DISPONIVEL;
  const isPendente = prisma.estado === PrismaEstado.PENDENTE;

  const effectivePosition = position ?? (isPendente ? 'bottom' : 'top');

  const positionClasses =
    effectivePosition === 'bottom'
      ? 'top-full left-1/2 -translate-x-1/2 mt-2'
      : 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}

      {isHovered && (
        <div
          role="tooltip"
          className={`absolute ${positionClasses} z-50 pointer-events-none animate-in fade-in zoom-in-95 duration-150 shadow-2xl bg-slate-950/95 text-white border border-slate-700/80 rounded-xl p-2.5 text-xs text-left min-w-[210px] backdrop-blur-xs`}
        >
          {isDisponivel ? (
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
                <span className="font-bold text-white">{retiradoDisplay}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm">⏱️</span>
                <span className="text-slate-400 font-medium">Tempo:</span>
                <span className="font-bold text-white">{tempoDisplay}</span>
              </div>
              <div className="pt-1 mt-1 border-t border-slate-800 flex items-center gap-1.5 font-black">
                {isPendente ? (
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
            className={`absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-950 border-slate-700/80 transform rotate-45 ${
              effectivePosition === 'bottom'
                ? '-top-1 border-t border-l'
                : '-bottom-1 border-b border-r'
            }`}
          />
        </div>
      )}
    </div>
  );
};
