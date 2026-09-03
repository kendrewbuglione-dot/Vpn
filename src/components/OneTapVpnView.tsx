import React, { useState, useEffect, useRef } from 'react';
import {
  TunnelState,
  VpnServerNode,
  NetworkDiagnosticsData,
} from '../types';
import { INITIAL_SERVERS } from '../data/defaultServers';
import { DiagnosticsModal } from './DiagnosticsModal';
import { ServersModal } from './ServersModal';
import {
  Info,
  Plus,
  Power,
  Globe,
  ChevronRight,
  Wifi,
  Battery,
  Shield,
  Zap,
} from 'lucide-react';

export const OneTapVpnView: React.FC = () => {
  // Список серверов
  const [servers, setServers] = useState<VpnServerNode[]>(INITIAL_SERVERS);
  const [activeServer, setActiveServer] = useState<VpnServerNode>(INITIAL_SERVERS[0]);

  // Состояние туннеля
  const [tunnelState, setTunnelState] = useState<TunnelState>('disconnected');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Модальные окна
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [isServersOpen, setIsServersOpen] = useState<boolean>(false);

  // Телеметрия и диагностика
  const [diagnostics, setDiagnostics] = useState<NetworkDiagnosticsData>({
    rttMs: 38,
    socketProtectorActive: true,
    tunFd: 42,
    coreEngine: 'sing-box v1.9.0',
    transportStack: 'gVisor L4 Userspace',
    failuresCount: 0,
    maxFailuresThreshold: 3,
    hotSwapCount: 0,
    lastRotatedNodeName: undefined,
    bytesReceived: 1024 * 1024 * 8.4,
    bytesSent: 1024 * 1024 * 1.2,
    connectionUptimeSeconds: 0,
  });

  // Таймер времени соединения
  const [sessionSeconds, setSessionSeconds] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  // Часы смартфона
  const [currentTime, setCurrentTime] = useState<string>('12:45');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}`);
    };
    updateClock();
    const clockInterval = setInterval(updateClock, 30000);
    return () => clearInterval(clockInterval);
  }, []);

  // Управление секундомером сессии
  useEffect(() => {
    if (tunnelState === 'active') {
      timerRef.current = window.setInterval(() => {
        setSessionSeconds((prev) => prev + 1);
        setDiagnostics((prev) => ({
          ...prev,
          bytesReceived: prev.bytesReceived + Math.floor(Math.random() * 45000 + 12000),
          bytesSent: prev.bytesSent + Math.floor(Math.random() * 12000 + 4000),
          rttMs: Math.max(22, activeServer.pingMs + Math.floor(Math.random() * 7 - 3)),
        }));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setSessionSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tunnelState, activeServer]);

  // Форматирование времени сессии: ЧЧ:ММ:СС
  const formatSessionTime = (totalSeconds: number): string => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Переключение состояния VPN (One-Tap)
  const handleToggleVpn = () => {
    if (isProcessing) return;

    if (tunnelState === 'active' || tunnelState === 'connecting' || tunnelState === 'failoverInProgress') {
      // Отключение
      setIsProcessing(true);
      setTimeout(() => {
        setTunnelState('disconnected');
        setIsProcessing(false);
        setDiagnostics((prev) => ({
          ...prev,
          failuresCount: 0,
        }));
      }, 400);
    } else {
      // Включение через стейт-машину
      setIsProcessing(true);
      setTunnelState('connecting');

      setTimeout(() => {
        setTunnelState('active');
        setIsProcessing(false);
        setDiagnostics((prev) => ({
          ...prev,
          rttMs: activeServer.pingMs,
          socketProtectorActive: true,
          tunFd: 42,
        }));
      }, 1200);
    }
  };

  // Выбор сервера из списка (бесшовный Hot-Swap)
  const handleSelectServer = (server: VpnServerNode) => {
    setActiveServer(server);
    setDiagnostics((prev) => ({
      ...prev,
      rttMs: server.pingMs,
    }));

    // Если туннель уже активен, симулируем мгновенный Hot-Swap селектора без разрыва TUN
    if (tunnelState === 'active') {
      setTunnelState('failoverInProgress');
      setTimeout(() => {
        setTunnelState('active');
        setDiagnostics((prev) => ({
          ...prev,
          hotSwapCount: prev.hotSwapCount + 1,
          lastRotatedNodeName: server.name,
        }));
      }, 500);
    }
  };

  // Симуляция сбоя узла (Hot-Swap) из шторки диагностики
  const handleSimulatedFailover = () => {
    if (tunnelState !== 'active') return;

    setTunnelState('failoverInProgress');
    setDiagnostics((prev) => ({
      ...prev,
      failuresCount: 3,
    }));

    setTimeout(() => {
      // Подбор следующего живого узла
      const otherServers = servers.filter((s) => s.id !== activeServer.id);
      const nextServer = otherServers[0] || activeServer;
      setActiveServer(nextServer);

      setTunnelState('active');
      setDiagnostics((prev) => ({
        ...prev,
        failuresCount: 0,
        hotSwapCount: prev.hotSwapCount + 1,
        lastRotatedNodeName: nextServer.name,
        rttMs: nextServer.pingMs,
      }));
    }, 900);
  };

  // Добавление новой подписки
  const handleAddCustomSubscription = (rawText: string): boolean => {
    try {
      let remark = 'Кастомный узел';
      let serverHost = 'custom.edge-node.net';
      let port = 443;

      if (rawText.includes('#')) {
        const parts = rawText.split('#');
        if (parts[1]) remark = decodeURIComponent(parts[1].trim());
      }

      if (rawText.includes('@')) {
        const atSplit = rawText.split('@');
        if (atSplit[1]) {
          const hostPort = atSplit[1].split(':')[0];
          if (hostPort) serverHost = hostPort;
        }
      }

      const newNode: VpnServerNode = {
        id: `custom-${Date.now()}`,
        name: remark || 'Импортированный Reality',
        country: 'Пользовательский',
        flag: '🌐',
        city: 'Edge',
        address: serverHost,
        port: port,
        protocol: 'vless',
        security: 'reality',
        transport: 'tcp',
        sni: 'gateway.icloud.com',
        pingMs: Math.floor(Math.random() * 35 + 30),
        isAlive: true,
        consecutiveFailures: 0,
      };

      setServers((prev) => [newNode, ...prev]);
      setActiveServer(newNode);
      return true;
    } catch {
      return false;
    }
  };

  // Цвета и тексты статуса
  const isOnline = tunnelState === 'active';
  const isBusy = tunnelState === 'connecting' || tunnelState === 'failoverInProgress';

  const getStatusTitle = () => {
    switch (tunnelState) {
      case 'active':
        return 'Защита включена';
      case 'connecting':
        return 'Подключение...';
      case 'failoverInProgress':
        return 'Оптимизация узла...';
      case 'error':
        return 'Ошибка сети';
      case 'disconnected':
      default:
        return 'Не защищено';
    }
  };

  const getStatusSubtitle = () => {
    switch (tunnelState) {
      case 'active':
        return 'Трафик зашифрован через TUN (gVisor)';
      case 'connecting':
        return 'Согласование XTLS-Reality ключей...';
      case 'failoverInProgress':
        return 'Бесшовная горячая замена узла (Hot-Swap)...';
      case 'error':
        return 'Проверьте доступность серверов';
      case 'disconnected':
      default:
        return 'Нажмите кнопку для старта защиты';
    }
  };

  const getStatusColorClass = () => {
    switch (tunnelState) {
      case 'active':
        return 'text-emerald-400';
      case 'connecting':
      case 'failoverInProgress':
        return 'text-amber-400';
      case 'error':
        return 'text-rose-400';
      case 'disconnected':
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="w-full max-w-[390px] mx-auto min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col justify-between shadow-2xl relative select-none border-x border-slate-800/50 sm:rounded-3xl sm:my-4 sm:min-h-[844px] overflow-hidden">
      {/* 1. Верхний системный статус-бар смартфона */}
      <div className="px-6 pt-3 pb-1 flex items-center justify-between text-xs font-medium text-slate-400 shrink-0">
        <span className="font-semibold text-slate-200">{currentTime}</span>

        <div className="flex items-center gap-2">
          {/* Иконка VPN при активном туннеле */}
          {isOnline && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 animate-in fade-in">
              <Shield className="w-2.5 h-2.5" />
              VPN
            </span>
          )}
          <Wifi className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[11px] font-bold text-slate-300">5G</span>
          <Battery className="w-4 h-4 text-slate-300" />
        </div>
      </div>

      {/* 2. AppBar */}
      <header className="px-5 py-3 flex items-center justify-between shrink-0">
        {/* Слева: Информация / скрытая техническая диагностика */}
        <button
          onClick={() => setIsDiagnosticsOpen(true)}
          className="w-10 h-10 rounded-full bg-[#131B2E] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition active:scale-95"
          title="Техническая диагностика"
          aria-label="Техническая диагностика"
        >
          <Info className="w-4 h-4" />
        </button>

        {/* По центру: заголовок VPN */}
        <div className="text-center">
          <h1 className="font-extrabold text-base tracking-wider text-white">
            VPN
          </h1>
          <span className="text-[10px] font-medium text-slate-400 block tracking-tight">
            VLESS • Reality
          </span>
        </div>

        {/* Справа: добавление подписки / выбор серверов */}
        <button
          onClick={() => setIsServersOpen(true)}
          className="w-10 h-10 rounded-full bg-[#131B2E] border border-slate-800 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-slate-700 transition active:scale-95"
          title="Добавить подписку или выбрать сервер"
          aria-label="Добавить подписку или выбрать сервер"
        >
          <Plus className="w-4 h-4" />
        </button>
      </header>

      {/* 3. Центральный блок: Статус подключения */}
      <div className="text-center px-6 pt-4 shrink-0">
        <h2
          className={`text-2xl font-extrabold tracking-tight transition-colors duration-300 ${getStatusColorClass()}`}
        >
          {getStatusTitle()}
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 transition-all duration-300">
          {getStatusSubtitle()}
        </p>

        {/* Таймер сессии при подключении */}
        {isOnline && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#131B2E] border border-slate-800 text-[11px] font-mono text-slate-300 animate-in fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{formatSessionTime(sessionSeconds)}</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400">{diagnostics.rttMs} мс</span>
          </div>
        )}
      </div>

      {/* 4. Большая круглая кнопка One-Tap по центру */}
      <div className="my-auto py-6 flex flex-col items-center justify-center relative">
        {/* Мягкие пульсирующие неоновые круги при активном состоянии */}
        {isOnline && (
          <>
            <div className="absolute w-64 h-64 rounded-full bg-emerald-500/10 animate-ping pointer-events-none duration-1000" />
            <div className="absolute w-56 h-56 rounded-full bg-emerald-500/15 blur-xl pointer-events-none" />
          </>
        )}

        {isBusy && (
          <div className="absolute w-56 h-56 rounded-full bg-amber-500/15 blur-xl pointer-events-none animate-pulse" />
        )}

        {/* Сама кнопка */}
        <button
          onClick={handleToggleVpn}
          disabled={isProcessing}
          aria-label="Включить или выключить VPN"
          className={`relative z-10 w-48 h-48 sm:w-52 sm:h-52 rounded-full flex flex-col items-center justify-center transition-all duration-300 active:scale-95 cursor-pointer ${
            isOnline
              ? 'bg-[#131B2E] border-[4px] border-emerald-500 shadow-[0_0_55px_rgba(16,185,129,0.35)] text-emerald-400'
              : isBusy
              ? 'bg-[#131B2E] border-[4px] border-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)] text-amber-400'
              : 'bg-[#131B2E] border-[4px] border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300 shadow-lg'
          }`}
        >
          {isBusy ? (
            <div className="w-16 h-16 border-4 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          ) : (
            <Power
              className={`w-20 h-20 transition-transform duration-300 ${
                isOnline ? 'scale-110 drop-shadow-[0_0_12px_rgba(16,185,129,0.6)]' : ''
              }`}
            />
          )}

          <span className="text-[11px] font-bold tracking-wider uppercase mt-2 opacity-80 font-mono">
            {isOnline ? 'ОТКЛЮЧИТЬ' : isBusy ? 'ПОДКЛЮЧЕНИЕ' : 'ПОДКЛЮЧИТЬ'}
          </span>
        </button>

        <span className="text-[11px] text-slate-500 mt-4 tracking-wide font-medium">
          {isOnline ? 'Нажмите для отключения' : 'Нажмите для быстрого запуска'}
        </span>
      </div>

      {/* 5. Внизу кликабельная карточка локации подключения */}
      <div className="px-5 pb-6 pt-2 shrink-0">
        <div
          onClick={() => setIsServersOpen(true)}
          className="w-full p-4 rounded-2xl bg-[#131B2E] border border-slate-800 hover:border-slate-700 transition active:scale-[0.98] cursor-pointer flex items-center justify-between shadow-md"
        >
          {/* Левая часть: Иконка глобуса или флаг */}
          <div className="flex items-center gap-3.5 overflow-hidden">
            <div className="w-11 h-11 rounded-xl bg-slate-800/80 flex items-center justify-center text-slate-300 shrink-0 text-xl border border-slate-700/50">
              {activeServer.flag || <Globe className="w-5 h-5 text-emerald-400" />}
            </div>
            <div className="truncate">
              <div className="text-[11px] font-medium text-slate-400">
                Локация подключения
              </div>
              <div className="text-sm font-bold text-white truncate mt-0.5">
                {activeServer.name}
              </div>
            </div>
          </div>

          {/* Правая часть: Зеленый бейдж пинга и стрелка перехода */}
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <div
              className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${
                !isOnline
                  ? 'bg-slate-800/80 text-slate-400 border-slate-700'
                  : diagnostics.rttMs < 60
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}
            >
              <Zap className="w-3 h-3" />
              <span>{isOnline ? `${diagnostics.rttMs} мс` : `${activeServer.pingMs} мс`}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-500" />
          </div>
        </div>
      </div>

      {/* 6. Модальные окна */}
      <DiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        state={tunnelState}
        activeNode={activeServer}
        diagnostics={diagnostics}
        onTriggerSimulatedFailover={handleSimulatedFailover}
      />

      <ServersModal
        isOpen={isServersOpen}
        onClose={() => setIsServersOpen(false)}
        servers={servers}
        activeServerId={activeServer.id}
        onSelectServer={handleSelectServer}
        onAddCustomSubscription={handleAddCustomSubscription}
      />
    </div>
  );
};
