import React from 'react';
import { NetworkDiagnosticsData, TunnelState, VpnServerNode } from '../types';
import {
  X,
  ShieldCheck,
  Zap,
  Activity,
  Server,
  RefreshCw,
  Cpu,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface DiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TunnelState;
  activeNode: VpnServerNode | null;
  diagnostics: NetworkDiagnosticsData;
  onTriggerSimulatedFailover: () => void;
}

export const DiagnosticsModal: React.FC<DiagnosticsModalProps> = ({
  isOpen,
  onClose,
  state,
  activeNode,
  diagnostics,
  onTriggerSimulatedFailover,
}) => {
  if (!isOpen) return null;

  const isConnected = state === 'active';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-[#131B2E] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Заголовок */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white tracking-tight">
                Техническая диагностика
              </h3>
              <p className="text-[11px] text-slate-400">
                Телеметрия ядра sing-box & Android VPN
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Список метрик */}
        <div className="mt-4 space-y-3">
          {/* RTT Задержка */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Zap className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Задержка (RTT)</div>
                <div className="text-sm font-semibold text-white">
                  {isConnected && diagnostics.rttMs > 0 ? `${diagnostics.rttMs} мс` : '—'}
                </div>
              </div>
            </div>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${
                !isConnected
                  ? 'bg-slate-800 text-slate-400 border-slate-700'
                  : diagnostics.rttMs < 60
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : diagnostics.rttMs < 120
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
              }`}
            >
              {!isConnected ? 'ОТКЛ' : diagnostics.rttMs < 60 ? 'ОТЛИЧНО' : 'СТАБИЛЬНО'}
            </span>
          </div>

          {/* VpnService.protect(fd) */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">VpnService.protect</div>
                <div className="text-xs font-mono text-emerald-300">
                  {diagnostics.socketProtectorActive ? 'Защищен (без петель)' : 'Ожидание'}
                </div>
              </div>
            </div>
            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50">
              SO_MARK ok
            </span>
          </div>

          {/* Сетевой протокол и ядро */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-cyan-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Протокол / Ядро</div>
                <div className="text-xs font-semibold text-white">
                  {activeNode?.security === 'reality' ? 'VLESS-Reality / XTLS' : 'VLESS-TLS'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              sing-box 1.9
            </span>
          </div>

          {/* TUN & Стек */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <Cpu className="w-4 h-4 text-blue-400" />
              <div>
                <div className="text-xs text-slate-400 font-medium">Интерфейс / L4 стек</div>
                <div className="text-xs font-mono text-slate-200">
                  {isConnected ? `tunFd=${diagnostics.tunFd} • gVisor` : 'tun закрыт'}
                </div>
              </div>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              MTU 1280
            </span>
          </div>

          {/* Failover стейт-машина */}
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-slate-400 font-medium">Failover стейт-машина</span>
              </div>
              <span className="text-[11px] font-semibold text-slate-300">
                Сбои: {diagnostics.failuresCount} / {diagnostics.maxFailuresThreshold}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span>Горячих ротаций (Hot-Swap):</span>
              <span className="font-mono text-white font-semibold">
                {diagnostics.hotSwapCount}
              </span>
            </div>
          </div>
        </div>

        {/* Действие тестирования ротации */}
        {isConnected && (
          <div className="mt-4 pt-3 border-t border-slate-800/80">
            <button
              onClick={onTriggerSimulatedFailover}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Смоделировать сбой узла (Hot-Swap)
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1.5">
              Проверяет автопереключение без сброса виртуального дескриптора tunFd
            </p>
          </div>
        )}

        <div className="mt-4 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
