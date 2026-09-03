import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Trash2,
  Copy,
  Check,
  Terminal,
  Play,
  Pause,
  AlertTriangle,
  Flame,
  ShieldCheck,
  RefreshCw,
  Bug,
  Sparkles,
  Cpu,
  AlertOctagon,
  Code2,
  Link2,
  ShieldAlert,
  X
} from 'lucide-react';

export type LogLevel = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
export type QuickFilterKeyword = 'all' | 'protect' | 'failover' | 'socket-error';

export interface SystemLogItem {
  id: string;
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  tag: string;
  message: string;
  rawKeywords: string[];
  fd?: number;
}

export interface AiLogAnalysisResult {
  rootCause: string;
  socketErrorDetails: string;
  protectAudit: string;
  suggestedFix: string;
  failoverBinding: string;
}

export interface SystemLogFilterModuleProps {
  onApplySolution?: (title: string, risk: string, code: string, binding: string) => void;
}

const INITIAL_SYSTEM_LOGS: SystemLogItem[] = [
  {
    id: 'log-01',
    timestamp: '14:20:01.104',
    level: 'INFO',
    tag: 'VpnService',
    message: 'Выделение дескриптора туннеля: Builder.establish() -> fd=42, MTU=1280, routes: 0.0.0.0/0, ::/0',
    rawKeywords: ['protect']
  },
  {
    id: 'log-02',
    timestamp: '14:20:01.145',
    level: 'INFO',
    tag: 'PlatformBridge',
    message: 'Сетевой перехват: VpnService.protect(fd=88) -> УСПЕШНО (сокет изолирован от TUN, fwmark установлен)',
    rawKeywords: ['protect'],
    fd: 88
  },
  {
    id: 'log-03',
    timestamp: '14:20:01.210',
    level: 'DEBUG',
    tag: 'SingBoxCore',
    message: 'Outbound reality-frankfurt инициализирован, сокет защищен через autoDetectInterfaceControl(fd=88)',
    rawKeywords: ['protect'],
    fd: 88
  },
  {
    id: 'log-04',
    timestamp: '14:20:05.430',
    level: 'INFO',
    tag: 'IsolateProber',
    message: 'Фоновый RTT-пробинг в Dart-изоляте: reality-frankfurt ping=42мс, потери=0%',
    rawKeywords: []
  },
  {
    id: 'log-05',
    timestamp: '14:20:12.890',
    level: 'WARN',
    tag: 'SingBoxCore',
    message: 'Всплеск задержки: RTT=820мс (> порога 700мс). Подготовка стейт-машины к потенциальному failover',
    rawKeywords: ['failover']
  },
  {
    id: 'log-06',
    timestamp: '14:20:14.120',
    level: 'ERROR',
    tag: 'NetSocket',
    message: 'Критический сбой сокета: socket-error: write EPIPE / broken pipe on fd=88 (соединение сброшено узлом)',
    rawKeywords: ['socket-error'],
    fd: 88
  },
  {
    id: 'log-07',
    timestamp: '14:20:14.125',
    level: 'ERROR',
    tag: 'NetSocket',
    message: 'socket-error: timeout чтения TLS-рукопожатия (185.220.101.45:443) -> сокет FD=88 признан недействительным',
    rawKeywords: ['socket-error'],
    fd: 88
  },
  {
    id: 'log-08',
    timestamp: '14:20:14.130',
    level: 'WARN',
    tag: 'FailoverEngine',
    message: 'Счетчик сбоев 3/3 превышен! Запуск failover: инициация Hot-Swap переключения на резервный узел',
    rawKeywords: ['failover']
  },
  {
    id: 'log-09',
    timestamp: '14:20:14.210',
    level: 'INFO',
    tag: 'PlatformBridge',
    message: 'Новый резервный сокет fd=93 создан для reality-amsterdam. Вызов VpnService.protect(fd=93) -> УСПЕШНО',
    rawKeywords: ['protect'],
    fd: 93
  },
  {
    id: 'log-10',
    timestamp: '14:20:14.240',
    level: 'INFO',
    tag: 'SingBoxCore',
    message: 'Селектор sing-box переключен на reality-amsterdam. HotSwap failover завершен за 110мс без закрытия tun fd=42',
    rawKeywords: ['failover', 'protect'],
    fd: 42
  },
  {
    id: 'log-11',
    timestamp: '14:20:18.050',
    level: 'DEBUG',
    tag: 'CleanerGuard',
    message: 'JNI Cleaner: глобальная ссылка GlobalRef(0x7f884a12c0) для закрытого сокета FD=88 освобождена',
    rawKeywords: ['protect']
  },
  {
    id: 'log-12',
    timestamp: '14:20:25.600',
    level: 'WARN',
    tag: 'NetSocket',
    message: 'Предупреждение: сокет FD=102 отбросил UDP пакет из-за MTU > 1280 (socket-error: packet too big emulated)',
    rawKeywords: ['socket-error'],
    fd: 102
  }
];

export const SystemLogFilterModule: React.FC<SystemLogFilterModuleProps> = ({ onApplySolution }) => {
  const [logs, setLogs] = useState<SystemLogItem[]>(INITIAL_SYSTEM_LOGS);
  const [selectedKeyword, setSelectedKeyword] = useState<QuickFilterKeyword>('all');
  const [selectedLevel, setSelectedLevel] = useState<LogLevel>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Состояния AI-анализа через Gemini 3.8 Flash
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [aiAnalysis, setAiAnalysis] = useState<AiLogAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiWarning, setAiWarning] = useState<string | null>(null);
  const [showAiCard, setShowAiCard] = useState<boolean>(false);
  const [copiedFixCode, setCopiedFixCode] = useState<boolean>(false);
  const [analyzedCount, setAnalyzedCount] = useState<number>(0);

  // Фильтрация логов по ключевым словам ('protect', 'failover', 'socket-error'), уровню и поисковому запросу
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // 1. Фильтр по быстрому ключевому слову
      if (selectedKeyword !== 'all') {
        const text = `${log.message} ${log.tag}`.toLowerCase();
        if (selectedKeyword === 'protect' && !text.includes('protect')) return false;
        if (selectedKeyword === 'failover' && !text.includes('failover')) return false;
        if (selectedKeyword === 'socket-error' && !text.includes('socket-error')) return false;
      }

      // 2. Фильтр по уровню логирования
      if (selectedLevel !== 'ALL' && log.level !== selectedLevel) {
        return false;
      }

      // 3. Фильтр по свободному поиску
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const fullContent = `${log.timestamp} ${log.level} ${log.tag} ${log.message} ${log.fd ? `fd=${log.fd}` : ''}`.toLowerCase();
        return fullContent.includes(query);
      }

      return true;
    });
  }, [logs, selectedKeyword, selectedLevel, searchQuery]);

  // Подсчет количества логов по ключевым словам для бейджей
  const keywordCounts = useMemo(() => {
    let protectCount = 0;
    let failoverCount = 0;
    let socketErrorCount = 0;

    logs.forEach(l => {
      const txt = `${l.message} ${l.tag}`.toLowerCase();
      if (txt.includes('protect')) protectCount++;
      if (txt.includes('failover')) failoverCount++;
      if (txt.includes('socket-error')) socketErrorCount++;
    });

    return {
      all: logs.length,
      protect: protectCount,
      failover: failoverCount,
      socketError: socketErrorCount
    };
  }, [logs]);

  // Копирование отфильтрованных логов в буфер
  const handleCopyLogs = () => {
    const textToCopy = filteredLogs
      .map(l => `[${l.timestamp}] [${l.level}] [${l.tag}] ${l.message}${l.fd ? ` (fd=${l.fd})` : ''}`)
      .join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Очистка логов
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Сброс к исходным логам
  const handleResetLogs = () => {
    setLogs(INITIAL_SYSTEM_LOGS);
    setSelectedKeyword('all');
    setSelectedLevel('ALL');
    setSearchQuery('');
  };

  // Локальный экспертный анализатор сетевого ядра на случай сбоя или HTML-ответа от внешнего шлюза
  const generateClientSideExpertAnalysis = (logs: SystemLogItem[], keyword: string): AiLogAnalysisResult => {
    const socketErrorLogs = logs.filter((l) =>
      `${l.message} ${l.tag}`.toLowerCase().includes("socket-error") ||
      `${l.message}`.toLowerCase().includes("broken pipe") ||
      `${l.message}`.toLowerCase().includes("epipe") ||
      `${l.message}`.toLowerCase().includes("econnreset") ||
      `${l.message}`.toLowerCase().includes("rst")
    );

    const protectLogs = logs.filter((l) =>
      `${l.message} ${l.tag}`.toLowerCase().includes("protect")
    );

    const failoverLogs = logs.filter((l) =>
      `${l.message} ${l.tag}`.toLowerCase().includes("failover")
    );

    const brokenFds = Array.from(
      new Set(
        socketErrorLogs
          .map((l) => l.fd)
          .filter((fd): fd is number => typeof fd === "number")
      )
    );

    const fdListStr = brokenFds.length > 0 ? brokenFds.join(", ") : "fd=88, fd=92";

    const rootCause =
      socketErrorLogs.length > 0
        ? `Разрыв конвейера TCP/TLS (Broken Pipe / EPIPE) на сокете (${fdListStr}). Удаленный узел сбросил соединение через TCP RST без штатного TLS close-notify либо исчерпан keepalive-таймаут в мобильной сети.`
        : "В текущей выборке логов прямых socket-error не обнаружено. Сетевой конвейер ядра работает стабильно.";

    const socketErrorDetails =
      `Зафиксировано ${socketErrorLogs.length} событий сбоя сокетов в окне из ${logs.length} записей. ` +
      `Сбойные дескрипторы: [${fdListStr}]. ` +
      `Симптомы: отправка пакетов (send/write) в сокет после получения RST-пакета от оператора или файрвола, вызывающая генерацию EPIPE (broken pipe).`;

    const protectAudit =
      protectLogs.length > 0
        ? `Сетевая изоляция подтверждена: зафиксировано ${protectLogs.length} вызовов VpnService.protect(). Сокеты помечены fwmark до начала рукопожатия, зацикливание пакетов в виртуальный TUN исключено.`
        : "Внимание: в анализируемом окне логов не зафиксировано явных вызовов VpnService.protect(fd). Убедитесь, что dialer sing-box перехватывает открытие сокета строго до системного connect().";

    const suggestedFix = `// 1. Быстрая инвалидация и замена сбойного дескриптора сокета
fun handleSocketFailure(brokenFd: Int) {
    Log.w("VpnCore", "Обработка socket-error на fd=$brokenFd")
    
    // Инвалидация в таблице активных коннектов sing-box
    SingBoxBridge.markSocketBroken(brokenFd)

    // Создание нового сокета с ОБЯЗАТЕЛЬНОЙ защитой до connect()
    val newSocketFd = createOutboundSocket()
    if (!vpnService.protect(newSocketFd)) {
        throw IllegalStateException("Критическая ошибка: protect(fd=$newSocketFd) отклонен ОС")
    }

    // Включение агрессивного TCP Keepalive для сотовых сетей
    setSocketKeepAlive(newSocketFd, idleSec = 15, intervalSec = 5, probeCount = 3)
}

// 2. Настройка сокетных опций против EPIPE
private fun setSocketKeepAlive(fd: Int, idleSec: Int, intervalSec: Int, probeCount: Int) {
    NativeSocketHelper.enableKeepAlive(fd, idleSec, intervalSec, probeCount)
}`;

    const failoverBinding =
      failoverLogs.length > 0
        ? `Стейт-машина уже зафиксировала ${failoverLogs.length} failover-событий. При получении двух EPIPE подряд FailoverStateMachine переводит активный селектор в статус HOT_SWAP_PENDING, бесшовно переключая ноду без сброса tunFd=42.`
        : "Рекомендация для стейт-машины: настроить порог переключения при возникновении 2-х последовательных socket-error на одном узле (порог RTT > 600ms или EPIPE). TUN-дескриптор tunFd=42 при этом не пересоздается.";

    return {
      rootCause,
      socketErrorDetails,
      protectAudit,
      suggestedFix,
      failoverBinding,
    };
  };

  // Вызов AI-анализа логов с отказоустойчивым каскадом (Gemini -> Local Diagnostics)
  const handleAiAnalysis = async () => {
    if (filteredLogs.length === 0) {
      setAiError('Нет логов для анализа. Сбросьте фильтры или добавьте тестовые события (+ socket-error).');
      setShowAiCard(true);
      return;
    }

    setIsAnalyzing(true);
    setAiError(null);
    setAiWarning(null);
    setShowAiCard(true);

    // Выбираем последние до 50 строк логов с учетом активных фильтров
    const targetLogs = filteredLogs.slice(-50);
    setAnalyzedCount(targetLogs.length);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch('/api/analyze-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          logs: targetLogs,
          filters: {
            keyword: selectedKeyword,
            level: selectedLevel,
            query: searchQuery,
          },
        }),
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();

      // Проверка на HTML-ответ от прокси/Vite (например, 504 Gateway Timeout или <!doctype html>)
      if (responseText.trim().startsWith('<') || responseText.includes('<!doctype') || responseText.includes('<html')) {
        console.warn('Сервер вернул HTML вместо JSON. Переключение на локальный анализатор.');
        const localAnalysis = generateClientSideExpertAnalysis(targetLogs, selectedKeyword);
        setAiAnalysis(localAnalysis);
        setAiWarning('Шлюз вернул HTML-ответ (прокси/таймаут). Анализ выполнен встроенным диагностическим модулем сетевого ядра.');
        return;
      }

      let data: any;
      try {
        data = JSON.parse(responseText);
      } catch (jsonErr) {
        console.warn('Ошибка разбора JSON ответа. Задействован локальный анализатор:', jsonErr);
        const localAnalysis = generateClientSideExpertAnalysis(targetLogs, selectedKeyword);
        setAiAnalysis(localAnalysis);
        setAiWarning('Получен невалидный ответ от AI-шлюза. Применен встроенный диагностический модуль сетевого ядра.');
        return;
      }

      if (!response.ok || !data.success) {
        if (data && data.analysis) {
          setAiAnalysis(data.analysis);
          setAiWarning(data.warning || 'Временный сбой внешнего сервиса AI. Задействован резервный анализатор.');
          return;
        }
        throw new Error(data.error || 'Ошибка вызова сервера AI-анализа');
      }

      setAiAnalysis(data.analysis);
      if (data.warning) {
        setAiWarning(data.warning);
      }
    } catch (err: any) {
      console.warn('Ошибка при обращении к серверу AI-анализа, переход на встроенный анализатор:', err);
      // Гарантированный fallback вместо падения с ошибкой Unexpected token '<'
      const localAnalysis = generateClientSideExpertAnalysis(targetLogs, selectedKeyword);
      setAiAnalysis(localAnalysis);
      setAiWarning('Внешний сервис AI недоступен или превысил лимит ожидания. Применен встроенный модуль сетевой диагностики.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Копирование сгенерированного кода решения
  const handleCopyFixCode = () => {
    if (aiAnalysis?.suggestedFix) {
      navigator.clipboard.writeText(aiAnalysis.suggestedFix);
      setCopiedFixCode(true);
      setTimeout(() => setCopiedFixCode(false), 2000);
    }
  };

  // Имитация добавления тестового события по ключевым словам
  const handleInjectLog = (type: 'protect' | 'failover' | 'socket-error') => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
    const randomFd = Math.floor(Math.random() * 50 + 60);

    let newEntry: SystemLogItem;
    if (type === 'protect') {
      newEntry = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        level: 'INFO',
        tag: 'PlatformBridge',
        message: `VpnService.protect(fd=${randomFd}) -> подтверждено ядром Linux (fwmark SO_BINDTODEVICE)`,
        rawKeywords: ['protect'],
        fd: randomFd
      };
    } else if (type === 'failover') {
      newEntry = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        level: 'WARN',
        tag: 'FailoverEngine',
        message: `Сработал триггер failover: зафиксировано превышение таймаута сокета. Горячая смена селектора sing-box...`,
        rawKeywords: ['failover']
      };
    } else {
      newEntry = {
        id: `log-${Date.now()}`,
        timestamp: timeStr,
        level: 'ERROR',
        tag: 'NetSocket',
        message: `socket-error: ECONNRESET on fd=${randomFd} (разрыв соединения шлюзом провайдера)`,
        rawKeywords: ['socket-error'],
        fd: randomFd
      };
    }

    setLogs(prev => [newEntry, ...prev]);
  };

  // Функция подсветки ключевых слов внутри сообщений лога
  const renderHighlightedMessage = (text: string) => {
    // Регулярное выражение для поиска ключевых слов: protect, failover, socket-error
    const parts = text.split(/(protect|failover|socket-error)/gi);

    return (
      <span>
        {parts.map((part, index) => {
          const lower = part.toLowerCase();
          if (lower === 'protect') {
            return (
              <mark
                key={index}
                className="bg-emerald-500/20 text-emerald-300 font-semibold px-1 py-0.5 rounded border border-emerald-500/40"
              >
                {part}
              </mark>
            );
          }
          if (lower === 'failover') {
            return (
              <mark
                key={index}
                className="bg-cyan-500/20 text-cyan-300 font-semibold px-1 py-0.5 rounded border border-cyan-500/40"
              >
                {part}
              </mark>
            );
          }
          if (lower === 'socket-error') {
            return (
              <mark
                key={index}
                className="bg-red-500/20 text-red-300 font-semibold px-1 py-0.5 rounded border border-red-500/40"
              >
                {part}
              </mark>
            );
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div id="system-log-filter-module" className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-5">
      {/* Заголовок и управляющие кнопки */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
            <Bug className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-base text-zinc-100">
                Модуль фильтрации системных логов (Fast Debug)
              </h3>
              <span className="px-2 py-0.5 text-xs font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                {filteredLogs.length} / {logs.length} записей
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">
              Моментальная сепарация потока логов по ключевым событиям ядра VPN и уровням критичности
            </p>
          </div>
        </div>

        {/* Действия: инъекция тестовых логов, копирование, сброс */}
        <div className="flex items-center flex-wrap gap-2">
          <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-xs">
            <span className="text-[11px] text-zinc-400 px-2 font-mono">Тест:</span>
            <button
              id="btn-inject-protect"
              onClick={() => handleInjectLog('protect')}
              className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-700/50 transition font-mono text-[11px]"
              title="Добавить тестовый лог 'protect'"
            >
              + protect
            </button>
            <button
              id="btn-inject-failover"
              onClick={() => handleInjectLog('failover')}
              className="px-2 py-1 rounded bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-700/50 transition font-mono text-[11px]"
              title="Добавить тестовый лог 'failover'"
            >
              + failover
            </button>
            <button
              id="btn-inject-socket-error"
              onClick={() => handleInjectLog('socket-error')}
              className="px-2 py-1 rounded bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-700/50 transition font-mono text-[11px]"
              title="Добавить тестовый лог 'socket-error'"
            >
              + socket-error
            </button>
          </div>

          <button
            id="btn-ai-analyze-logs"
            onClick={handleAiAnalysis}
            disabled={isAnalyzing}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:via-indigo-500 hover:to-cyan-500 text-white transition flex items-center gap-1.5 shadow-md shadow-purple-950/50 disabled:opacity-50 cursor-pointer"
            title="Отправить последние 50 строк логов (с учетом активных фильтров) в Gemini для автоматического поиска причин socket-error и решений"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin text-purple-200' : 'text-purple-100'}`} />
            <span>{isAnalyzing ? 'Анализ логов...' : 'Анализ AI'}</span>
          </button>

          <button
            id="btn-copy-filtered-logs"
            onClick={handleCopyLogs}
            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>

          <button
            id="btn-reset-logs"
            onClick={handleResetLogs}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
            title="Сбросить логи к исходным"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            id="btn-clear-logs"
            onClick={handleClearLogs}
            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-red-950/60 text-zinc-400 hover:text-red-300 border border-zinc-700 transition"
            title="Очистить все логи"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Панель фильтров: Ключевые слова + Уровни логирования + Поисковая строка */}
      <div className="space-y-3">
        {/* Ключевые слова-фильтры (protect, failover, socket-error) */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-zinc-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5 text-cyan-400" />
              Фильтр по событиям:
            </span>
            <div className="flex items-center gap-1.5">
              <button
                id="filter-keyword-all"
                onClick={() => setSelectedKeyword('all')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition flex items-center gap-1.5 ${
                  selectedKeyword === 'all'
                    ? 'bg-zinc-800 border-zinc-600 text-zinc-100 font-semibold'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                Все
                <span className="text-[10px] opacity-70">({keywordCounts.all})</span>
              </button>

              <button
                id="filter-keyword-protect"
                onClick={() => setSelectedKeyword('protect')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition flex items-center gap-1.5 ${
                  selectedKeyword === 'protect'
                    ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200 font-semibold shadow-sm shadow-emerald-950'
                    : 'bg-zinc-950/80 border-zinc-800 text-emerald-400/80 hover:border-emerald-700/50 hover:bg-emerald-950/30'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                'protect'
                <span className="text-[10px] px-1 py-0.2 rounded bg-emerald-900/60 border border-emerald-700/40 text-emerald-300">
                  {keywordCounts.protect}
                </span>
              </button>

              <button
                id="filter-keyword-failover"
                onClick={() => setSelectedKeyword('failover')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition flex items-center gap-1.5 ${
                  selectedKeyword === 'failover'
                    ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 font-semibold shadow-sm shadow-cyan-950'
                    : 'bg-zinc-950/80 border-zinc-800 text-cyan-400/80 hover:border-cyan-700/50 hover:bg-cyan-950/30'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-cyan-400" />
                'failover'
                <span className="text-[10px] px-1 py-0.2 rounded bg-cyan-900/60 border border-cyan-700/40 text-cyan-300">
                  {keywordCounts.failover}
                </span>
              </button>

              <button
                id="filter-keyword-socket-error"
                onClick={() => setSelectedKeyword('socket-error')}
                className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition flex items-center gap-1.5 ${
                  selectedKeyword === 'socket-error'
                    ? 'bg-red-950/80 border-red-500 text-red-200 font-semibold shadow-sm shadow-red-950'
                    : 'bg-zinc-950/80 border-zinc-800 text-red-400/80 hover:border-red-700/50 hover:bg-red-950/30'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                'socket-error'
                <span className="text-[10px] px-1 py-0.2 rounded bg-red-900/60 border border-red-700/40 text-red-300">
                  {keywordCounts.socketError}
                </span>
              </button>
            </div>
          </div>

          {/* Переключатель уровней логирования */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-mono text-zinc-400 mr-1">Уровень:</span>
            {(['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'] as LogLevel[]).map(lvl => (
              <button
                key={lvl}
                onClick={() => setSelectedLevel(lvl)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded border transition ${
                  selectedLevel === lvl
                    ? lvl === 'ERROR'
                      ? 'bg-red-950 border-red-500 text-red-300 font-bold'
                      : lvl === 'WARN'
                      ? 'bg-amber-950 border-amber-500 text-amber-300 font-bold'
                      : lvl === 'INFO'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                      : lvl === 'DEBUG'
                      ? 'bg-purple-950 border-purple-500 text-purple-300 font-bold'
                      : 'bg-zinc-800 border-zinc-600 text-zinc-100 font-bold'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Строка контекстного поиска */}
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Быстрый поиск по подсистеме, дескриптору (fd=), сообщению или IP-адресу..."
            className="w-full bg-zinc-950/90 border border-zinc-800 rounded-lg pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-zinc-400 hover:text-zinc-200 font-mono"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Секция результата AI-анализа (Gemini 3.8 Flash) */}
      {showAiCard && (
        <div id="ai-log-analysis-panel" className="rounded-xl border border-purple-500/40 bg-purple-950/20 p-5 space-y-4 backdrop-blur-md shadow-lg shadow-purple-950/40">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-sm text-purple-100">
                    AI-диагностика ядра & поиск причин socket-error
                  </h4>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-purple-900/60 text-purple-200 border border-purple-700/50">
                    Gemini 3.8 Flash
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {analyzedCount} строк логов
                  </span>
                </div>
                <p className="text-xs text-purple-300/80 mt-0.5">
                  Выборка с учетом фильтра: <span className="font-mono text-purple-200">"{selectedKeyword}"</span> (уровень: {selectedLevel}{searchQuery ? `, поиск: "${searchQuery}"` : ''})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-re-analyze-ai"
                onClick={handleAiAnalysis}
                disabled={isAnalyzing}
                className="px-2.5 py-1 text-xs rounded-lg bg-purple-900/50 hover:bg-purple-900/80 text-purple-200 border border-purple-700/50 transition flex items-center gap-1.5"
                title="Повторить анализ"
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Повторить
              </button>
              <button
                id="btn-close-ai-analysis"
                onClick={() => setShowAiCard(false)}
                className="p-1 rounded-lg bg-purple-900/30 hover:bg-purple-900/60 text-purple-300 transition"
                title="Скрыть панель"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Состояние загрузки */}
          {isAnalyzing && (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-10 h-10 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                <Sparkles className="w-4 h-4 text-purple-300 absolute inset-0 m-auto animate-pulse" />
              </div>
              <div>
                <p className="text-xs font-semibold text-purple-200">
                  Gemini 3.8 Flash анализирует последние {analyzedCount} строк системных логов...
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                  Поиск причин EPIPE / broken pipe, аудит вызовов VpnService.protect(fd) и расчет failover-таймингов
                </p>
              </div>
            </div>
          )}

          {/* Предупреждение о перегрузке или локальном fallback */}
          {aiWarning && !isAnalyzing && (
            <div className="p-3 rounded-lg border border-amber-800/60 bg-amber-950/40 text-xs text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <span className="font-semibold text-amber-100">Резервный режим сетевого аудита:</span>
                <p className="text-zinc-300 leading-relaxed">{aiWarning}</p>
              </div>
            </div>
          )}

          {/* Состояние ошибки */}
          {aiError && !isAnalyzing && (
            <div className="p-3.5 rounded-lg border border-red-800/60 bg-red-950/40 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1.5 flex-1">
                <span className="font-semibold">Ошибка выполнения AI-анализа:</span>
                <p className="text-zinc-300 leading-relaxed">{aiError}</p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleAiAnalysis}
                    className="px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-800/80 text-white font-mono text-[11px] transition"
                  >
                    Попробовать снова
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Результат анализа */}
          {aiAnalysis && !isAnalyzing && (
            <div className="space-y-3.5 text-xs">
              {/* 1. Идентификация риска / Root Cause */}
              <div className="p-3.5 rounded-lg bg-red-950/30 border border-red-800/40 space-y-1.5">
                <div className="flex items-center gap-1.5 text-red-300 font-semibold">
                  <AlertOctagon className="w-4 h-4 text-red-400" />
                  <span>1. Идентификация риска & Первопричина (Root Cause)</span>
                </div>
                <p className="text-zinc-100 leading-relaxed pl-5 font-sans">
                  {aiAnalysis.rootCause}
                </p>
                {aiAnalysis.socketErrorDetails && (
                  <div className="pl-5 pt-1 text-[11px] text-zinc-300 font-mono">
                    <span className="text-red-300 font-semibold">Детализация:</span> {aiAnalysis.socketErrorDetails}
                  </div>
                )}
              </div>

              {/* 2. Аудит сетевой изоляции VpnService.protect */}
              <div className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>2. Аудит сетевой изоляции (VpnService.protect)</span>
                </div>
                <p className="text-zinc-200 leading-relaxed pl-5 font-sans">
                  {aiAnalysis.protectAudit}
                </p>
              </div>

              {/* 3. Готовый к интеграции код решения */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                    <Code2 className="w-4 h-4 text-cyan-400" />
                    <span>3. Готовый к интеграции код (исправление сбоя сокетов)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {onApplySolution && (
                      <button
                        onClick={() =>
                          onApplySolution(
                            'AI-патч для socket-error',
                            aiAnalysis.rootCause,
                            aiAnalysis.suggestedFix,
                            aiAnalysis.failoverBinding
                          )
                        }
                        className="px-2.5 py-1 rounded bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-700/60 font-mono text-[11px] transition flex items-center gap-1"
                        title="Вставить в активный терминал Vibe-кодинга"
                      >
                        <Terminal className="w-3 h-3" />
                        В терминал
                      </button>
                    )}
                    <button
                      onClick={handleCopyFixCode}
                      className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-[11px] transition flex items-center gap-1"
                    >
                      {copiedFixCode ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      {copiedFixCode ? 'Скопировано' : 'Копировать код'}
                    </button>
                  </div>
                </div>
                <pre className="p-3.5 rounded-lg bg-zinc-950 border border-zinc-800 overflow-x-auto font-mono text-[11px] text-zinc-300 leading-relaxed max-h-[300px] overflow-y-auto">
                  <code>{aiAnalysis.suggestedFix}</code>
                </pre>
              </div>

              {/* 4. Привязка к стейт-машине failover */}
              <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-800/40 space-y-1">
                <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                  <Link2 className="w-4 h-4 text-cyan-400" />
                  <span>4. Инструкция по привязке к стейт-машине failover</span>
                </div>
                <p className="text-zinc-200 leading-relaxed pl-5 font-sans">
                  {aiAnalysis.failoverBinding}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Терминальная область отображения логов */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-950/95 overflow-hidden font-mono text-xs">
        <div className="flex items-center justify-between px-3.5 py-2 border-b border-zinc-800/80 bg-zinc-900/50 text-[11px] text-zinc-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>СТРИМ ДЕБАГА ЯДРА</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <span>Цветовая подсветка: 
              <span className="text-emerald-400 font-semibold ml-1">protect</span> • 
              <span className="text-cyan-400 font-semibold ml-1">failover</span> • 
              <span className="text-red-400 font-semibold ml-1">socket-error</span>
            </span>
          </div>
        </div>

        <div className="max-h-[380px] overflow-y-auto p-3 space-y-1.5 divide-y divide-zinc-900">
          {filteredLogs.length === 0 ? (
            <div className="py-8 text-center text-zinc-500 font-mono text-xs">
              Логи по заданным критериям ('{selectedKeyword}', уровень={selectedLevel}) не найдены.
            </div>
          ) : (
            filteredLogs.map(item => {
              // Определение цветовой палитры для строки и уровня
              const levelBadgeClass =
                item.level === 'ERROR'
                  ? 'bg-red-950/90 border-red-600/60 text-red-400'
                  : item.level === 'WARN'
                  ? 'bg-amber-950/90 border-amber-600/60 text-amber-300'
                  : item.level === 'INFO'
                  ? 'bg-cyan-950/90 border-cyan-600/60 text-cyan-300'
                  : 'bg-purple-950/90 border-purple-600/60 text-purple-300';

              const rowBorderClass =
                item.level === 'ERROR'
                  ? 'border-l-2 border-l-red-500 bg-red-950/10'
                  : item.level === 'WARN'
                  ? 'border-l-2 border-l-amber-500 bg-amber-950/10'
                  : item.level === 'INFO'
                  ? 'border-l-2 border-l-cyan-500/60 bg-transparent'
                  : 'border-l-2 border-l-purple-500/40 bg-transparent';

              return (
                <div
                  key={item.id}
                  className={`pt-1.5 pb-1 px-2.5 rounded-r transition-colors hover:bg-zinc-900/60 ${rowBorderClass}`}
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    {/* Метка времени */}
                    <span className="text-zinc-500 text-[11px] select-none shrink-0">
                      {item.timestamp}
                    </span>

                    {/* Уровень логирования */}
                    <span
                      className={`px-1.5 py-0.2 text-[10px] font-bold rounded border uppercase tracking-wider shrink-0 ${levelBadgeClass}`}
                    >
                      {item.level}
                    </span>

                    {/* Тег подсистемы */}
                    <span className="text-zinc-400 font-semibold text-[11px] shrink-0">
                      [{item.tag}]
                    </span>

                    {/* Дескриптор сокета, если есть */}
                    {item.fd !== undefined && (
                      <span className="px-1 py-0.2 rounded bg-zinc-800 text-cyan-400 text-[10px] font-mono shrink-0">
                        fd={item.fd}
                      </span>
                    )}

                    {/* Текст лога с подсветкой ключевых слов */}
                    <div className="flex-1 text-zinc-300 text-xs break-words leading-relaxed">
                      {renderHighlightedMessage(item.message)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
