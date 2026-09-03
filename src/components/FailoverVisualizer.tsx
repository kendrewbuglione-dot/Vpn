import React, { useState, useEffect } from 'react';
import { VpnNode, NetworkLogEntry, VpnState } from '../types';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Flame,
  RotateCcw,
  ShieldCheck,
  Zap
} from 'lucide-react';

const STATE_LABELS_RU: Record<VpnState, string> = {
  DISCONNECTED: 'ОТКЛЮЧЕНО',
  INITIALIZING_JNI_CORE: 'ИНИЦИАЛИЗАЦИЯ ЯДРА JNI',
  ALLOCATING_TUN_FD: 'ВЫДЕЛЕНИЕ ДЕСКРИПТОРА TUN',
  SOCKET_PROTECT_HOOK: 'ПЕРЕХВАТ И ЗАЩИТА СОКЕТА',
  ROUTING_VERIFIED: 'МАРШРУТ ПРОВЕРЕН',
  ACTIVE_TUNNEL: 'АКТИВНЫЙ ТУННЕЛЬ',
  LATENCY_DEGRADED: 'ДЕГРАДАЦИЯ СВЯЗИ (RTT > 700мс)',
  FAILOVER_TRIGGERED: 'СБОЙ УЗЛА: ЗАПУСК FAILOVER',
  HOT_SWAP_SWITCHING: 'БЕСШОВНАЯ СМЕНА СЕРВЕРА',
  RECONNECTED: 'ПЕРЕПОДКЛЮЧЕНО',
  FATAL_ERROR_LMK: 'КРИТИЧЕСКАЯ ОШИБКА LMK'
};

const INITIAL_NODES: VpnNode[] = [
  {
    id: 'node-fra-01',
    name: 'Франкфурт Reality (Основной)',
    protocol: 'vless',
    server: '185.220.101.45',
    port: 443,
    security: 'reality',
    sni: 'www.microsoft.com',
    pingMs: 42,
    packetLoss: 0,
    status: 'healthy',
    active: true,
  },
  {
    id: 'node-ams-02',
    name: 'Амстердам Reality (Резерв 1)',
    protocol: 'vless',
    server: '194.87.142.18',
    port: 443,
    security: 'reality',
    sni: 'gateway.icloud.com',
    pingMs: 58,
    packetLoss: 0,
    status: 'healthy',
    active: false,
  },
  {
    id: 'node-hel-03',
    name: 'Хельсинки Shadowsocks (Резерв 2)',
    protocol: 'shadowsocks',
    server: '95.216.12.80',
    port: 8388,
    security: 'none',
    pingMs: 65,
    packetLoss: 0,
    status: 'healthy',
    active: false,
  },
  {
    id: 'node-sgp-04',
    name: 'Сингапур Hysteria2 (Крайний узел)',
    protocol: 'hysteria2',
    server: '139.180.200.11',
    port: 8443,
    security: 'tls',
    pingMs: 195,
    packetLoss: 0,
    status: 'healthy',
    active: false,
  }
];

export const FailoverVisualizer: React.FC = () => {
  const [nodes, setNodes] = useState<VpnNode[]>(INITIAL_NODES);
  const [vpnState, setVpnState] = useState<VpnState>('ACTIVE_TUNNEL');
  const [consecutiveFails, setConsecutiveFails] = useState(0);
  const [packetsRouted, setPacketsRouted] = useState(14829);
  const [hotSwapCount, setHotSwapCount] = useState(0);
  const [tunFd] = useState(42);
  const [logs, setLogs] = useState<NetworkLogEntry[]>([
    {
      id: '1',
      timestamp: '00:00.120',
      level: 'INFO',
      subsystem: 'VPN-СЛУЖБА',
      message: 'Интерфейс TUN выделен: fd=42 mtu=1500 addRoute(0.0.0.0/0)',
      fd: 42,
    },
    {
      id: '2',
      timestamp: '00:00.150',
      level: 'INFO',
      subsystem: 'JNI-СЛОЙ',
      message: 'VpnService.protect(fd=88) -> УСПЕШНО (сокет изолирован через fwmark)',
      fd: 88,
    },
    {
      id: '3',
      timestamp: '00:00.180',
      level: 'INFO',
      subsystem: 'SING-BOX',
      message: 'Селектор sing-box инициализирован -> Франкфурт Reality (Основной)',
    }
  ]);

  const activeNode = nodes.find(n => n.active) || nodes[0];

  const addLog = (level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG', subsystem: string, message: string, fd?: number) => {
    const now = new Date();
    const timeStr = `${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    setLogs(prev => [{ id: Math.random().toString(), timestamp: timeStr, level, subsystem: subsystem as any, message, fd }, ...prev.slice(0, 30)]);
  };

  // Счетчик пакетов
  useEffect(() => {
    if (vpnState === 'ACTIVE_TUNNEL' || vpnState === 'LATENCY_DEGRADED') {
      const timer = setInterval(() => {
        setPacketsRouted(p => p + Math.floor(Math.random() * 8) + 3);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [vpnState]);

  // Имитация всплеска задержки / деградации связи
  const handleSimulateLatencySpike = () => {
    setNodes(prev =>
      prev.map(n =>
        n.active
          ? { ...n, pingMs: 920, status: 'warning' as const, packetLoss: 28 }
          : n
      )
    );
    setVpnState('LATENCY_DEGRADED');
    setConsecutiveFails(prev => prev + 1);
    addLog('WARN', 'ИЗОЛЯТ-ПРОБИНГ', `Всплеск задержки RTT=920мс (>700мс порог), потери=28% на узле ${activeNode.name}`);
  };

  // Имитация полного сбоя ноды / таймаута сокета
  const handleSimulateNodeDrop = () => {
    setNodes(prev =>
      prev.map(n =>
        n.active
          ? { ...n, pingMs: 9999, status: 'dead' as const, packetLoss: 100 }
          : n
      )
    );
    setVpnState('FAILOVER_TRIGGERED');
    setConsecutiveFails(3);
    addLog('ERROR', 'FAILOVER-СТЕЙТ', `Зафиксировано 3 таймаута подряд на ${activeNode.name}. Запуск горячей смены сервера!`);

    // Запуск бесшовного переключения
    setTimeout(() => {
      executeHotSwap();
    }, 1200);
  };

  const executeHotSwap = () => {
    setVpnState('HOT_SWAP_SWITCHING');
    addLog('INFO', 'SING-BOX', 'Вызов HotSwapOutbound() -> выбор следующего доступного узла...');

    setTimeout(() => {
      setNodes(prev => {
        const activeIdx = prev.findIndex(n => n.active);
        const nextIdx = (activeIdx + 1) % prev.length;
        return prev.map((n, i) => ({
          ...n,
          active: i === nextIdx,
          status: 'healthy',
          pingMs: i === nextIdx ? Math.floor(Math.random() * 30 + 45) : n.pingMs,
          packetLoss: 0,
        }));
      });

      setHotSwapCount(c => c + 1);
      setConsecutiveFails(0);
      setVpnState('ACTIVE_TUNNEL');
      addLog('INFO', 'JNI-СЛОЙ', `Новый сокет защищен через protect(). Смена завершена без перезапуска TUN FD (${tunFd}).`);
    }, 800);
  };

  const handleManualSwitch = (nodeId: string) => {
    if (activeNode.id === nodeId) return;
    setVpnState('HOT_SWAP_SWITCHING');
    addLog('INFO', 'FAILOVER-СТЕЙТ', `Ручное горячее переключение на узел id=${nodeId}`);
    
    setTimeout(() => {
      setNodes(prev =>
        prev.map(n => ({
          ...n,
          active: n.id === nodeId,
          status: 'healthy',
        }))
      );
      setVpnState('ACTIVE_TUNNEL');
      setHotSwapCount(c => c + 1);
      addLog('INFO', 'SING-BOX', `Селектор переключен в памяти Go. Дескриптор TUN сохранен.`);
    }, 600);
  };

  const handleReset = () => {
    setNodes(INITIAL_NODES);
    setVpnState('ACTIVE_TUNNEL');
    setConsecutiveFails(0);
    addLog('INFO', 'FAILOVER-СТЕЙТ', 'Стейт-машина возвращена в исходное состояние');
  };

  return (
    <div id="failover-simulator-root" className="space-y-6">
      {/* Главная плашка статуса */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              vpnState === 'ACTIVE_TUNNEL'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : vpnState === 'LATENCY_DEGRADED'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : vpnState === 'FAILOVER_TRIGGERED' || vpnState === 'HOT_SWAP_SWITCHING'
                ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-zinc-100">Детерминированный движок Failover</h3>
                <span className={`px-2 py-0.5 text-xs font-mono rounded-full border ${
                  vpnState === 'ACTIVE_TUNNEL'
                    ? 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300'
                    : vpnState === 'LATENCY_DEGRADED'
                    ? 'bg-amber-950/60 border-amber-600/40 text-amber-300'
                    : 'bg-cyan-950/60 border-cyan-600/40 text-cyan-300'
                }`}>
                  СТАТУС: {STATE_LABELS_RU[vpnState]}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Android VpnService без root • Бесшовный Hot-Swap в sing-box • Пробинг в Dart-изолятах
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-simulate-lag"
              onClick={handleSimulateLatencySpike}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 transition flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              Имитировать задержку (920мс)
            </button>
            <button
              id="btn-simulate-drop"
              onClick={handleSimulateNodeDrop}
              className="px-3 py-2 text-xs font-medium rounded-lg bg-red-500/10 text-red-300 border border-red-500/30 hover:bg-red-500/20 transition flex items-center gap-1.5"
            >
              <Flame className="w-3.5 h-3.5" />
              Спровоцировать обрыв (Failover)
            </button>
            <button
              id="btn-reset-simulator"
              onClick={handleReset}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition"
              title="Сброс симулятора"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Сетка метрик */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400">Дескриптор туннеля (FD)</div>
            <div className="text-xl font-bold font-mono text-cyan-400 mt-1 flex items-center gap-2">
              <span>fd={tunFd}</span>
              <span className="text-[11px] font-normal text-zinc-400 font-sans">(постоянный)</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">VpnService.protect() успешен</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400">Пинг активного узла</div>
            <div className={`text-xl font-bold font-mono mt-1 ${
              activeNode.pingMs > 500 ? 'text-red-400' : activeNode.pingMs > 100 ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {activeNode.pingMs === 9999 ? 'ТАЙМАУТ' : `${activeNode.pingMs} мс`}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">TCP-пробинг в изоляте</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400">Ошибок подряд</div>
            <div className="text-xl font-bold font-mono text-zinc-200 mt-1 flex items-center gap-2">
              <span>{consecutiveFails} / 3</span>
              {consecutiveFails >= 3 && <span className="text-xs text-red-400 font-semibold">ПОРОГ</span>}
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">Анти-флэппинг кулдаун: 15с</div>
          </div>

          <div className="p-3.5 rounded-lg bg-zinc-950/60 border border-zinc-800/80">
            <div className="text-xs font-mono text-zinc-400">Выполнено переключений</div>
            <div className="text-xl font-bold font-mono text-cyan-300 mt-1">
              {hotSwapCount} <span className="text-xs font-normal text-zinc-400 font-sans">без разрыва связи</span>
            </div>
            <div className="text-[11px] text-zinc-400 mt-0.5">{packetsRouted.toLocaleString()} пакетов передано</div>
          </div>
        </div>
      </div>

      {/* Таблица серверов и поток телеметрии */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Список кандидатов в пуле */}
        <div className="lg:col-span-2 rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              Пул серверов Failover (селектор sing-box в памяти)
            </h4>
            <span className="text-xs font-mono text-zinc-400">4 узла в пуле</span>
          </div>

          <div className="space-y-2.5">
            {nodes.map(node => (
              <div
                key={node.id}
                onClick={() => handleManualSwitch(node.id)}
                className={`p-3.5 rounded-lg border transition-all cursor-pointer ${
                  node.active
                    ? 'bg-cyan-950/30 border-cyan-500/50 shadow-sm shadow-cyan-950/50'
                    : 'bg-zinc-950/40 border-zinc-800/80 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      node.status === 'healthy'
                        ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                        : node.status === 'warning'
                        ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                        : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-zinc-100">{node.name}</span>
                        {node.active && (
                          <span className="px-1.5 py-0.2 text-[10px] font-mono bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                            АКТИВЕН
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 text-[10px] font-mono uppercase bg-zinc-800 text-zinc-300 rounded">
                          {node.protocol} {node.security ? `• ${node.security}` : ''}
                        </span>
                      </div>
                      <div className="text-xs font-mono text-zinc-400 mt-0.5">
                        {node.server}:{node.port} {node.sni ? `(sni: ${node.sni})` : ''}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className={`text-sm font-mono font-bold ${
                        node.pingMs > 500 ? 'text-red-400' : node.pingMs > 100 ? 'text-amber-400' : 'text-emerald-400'
                      }`}>
                        {node.pingMs === 9999 ? 'Таймаут' : `${node.pingMs} мс`}
                      </div>
                      <div className="text-[10px] text-zinc-400">
                        потери: {node.packetLoss}%
                      </div>
                    </div>

                    {!node.active && (
                      <button
                        className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition"
                      >
                        Переключить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-zinc-950/60 rounded-lg border border-zinc-800 text-xs text-zinc-400 flex items-start gap-2">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-zinc-200">Гарантия Zero-Downtime HotSwap:</strong> Переключение между серверами происходит через селектор в памяти sing-box (`tagSelector.SelectOutbound(newTag)`). Устройство TUN ядра Linux (FD {tunFd}) остается открытым, не мигает системная иконка ключа в статус-баре Android и не рвутся пользовательские TCP-сессии.
            </div>
          </div>
        </div>

        {/* Поток событий подсистем */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm flex flex-col space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <h4 className="font-semibold text-sm text-zinc-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Поток событий подсистем
            </h4>
            <span className="text-[11px] font-mono text-zinc-400">Телеметрия онлайн</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[340px] space-y-2 pr-1 font-mono text-xs">
            {logs.map(log => (
              <div
                key={log.id}
                className="p-2 rounded bg-zinc-950/80 border border-zinc-900 text-zinc-300"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-400 mb-0.5">
                  <span className="text-zinc-400">{log.timestamp}</span>
                  <span className={`px-1 rounded font-semibold ${
                    log.level === 'ERROR'
                      ? 'bg-red-950 text-red-400'
                      : log.level === 'WARN'
                      ? 'bg-amber-950 text-amber-400'
                      : 'bg-zinc-800 text-cyan-300'
                  }`}>
                    [{log.subsystem}]
                  </span>
                </div>
                <div className="text-zinc-200 break-words">{log.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
