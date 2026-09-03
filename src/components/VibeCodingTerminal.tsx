import React, { useState } from 'react';
import { Terminal, Send, Sparkles, Copy, Check, ShieldAlert, Code2, Link2, Zap } from 'lucide-react';
import { PromptPreset, VibeCodingResponse } from '../types';
import { SystemLogFilterModule } from './SystemLogFilterModule';

const PRESETS: PromptPreset[] = [
  {
    title: 'UDP NAT Keepalive и фиксация MTU 1280 (безопасно для Android Doze)',
    query: 'Реализуй периодический UDP NAT keepalive в sing-box и ограничение MTU=1280 в VpnService.Builder для исключения фрагментации пакетов в LTE/5G сетях.',
    risk: 'Фрагментация IP-пакетов при MTU > 1420 на мобильных операторах (CGNAT) приводит к отбрасыванию UDP-дейтаграмм без ICMP-уведомлений (Silent Packet Drop) и ложному срабатыванию failover.',
    language: 'kotlin',
    code: `// Внедрение в SingBoxVpnService.kt (Фиксация MTU и защита от фрагментации)
fun configureMtuAndBuilder(): VpnService.Builder {
    return Builder().apply {
        // Установка безопасного MTU 1280 (гарантирует отсутствие IPv6 фрагментации)
        setMtu(1280)
        addAddress("172.19.0.1", 30)
        addRoute("0.0.0.0", 0)
        addAddress("fdfe:dcba:9876::1", 126)
        addRoute("::", 0)
        
        // Предотвращение захвата трафика самого приложения
        addDisallowedApplication(packageName)
        setSession("SingBox-Unrooted-Mtu1280")
    }
}`,
    binding:
      'MTU 1280 передается в sing-box JSON в секцию `"inbounds": [{"type": "tun", "mtu": 1280}]`. Стейт-машина failover исключает ложные срабатывания по тайм-аутам, так как пакеты больше не фрагментируются на стыках базовых станций.'
  },
  {
    title: 'Рукопожатие XTLS Vision Flow и рандомизация отпечатков uTLS',
    query: 'Сгенерируй Dart Isolate функцию генерации конфигурации VLESS XTLS Vision с рандомизацией uTLS fingerprint (chrome/safari/edge) для обхода DPI.',
    risk: 'Использование статического fingerprint и отсутствия проверки short_id демаскирует TLS-сессию на уровне SNI-фильтров DPI и провоцирует активное зондирование (Active Probing) со стороны провайдера.',
    language: 'dart',
    code: `// Внедрение в vpn_isolate_pool.dart
Map<String, dynamic> buildRealityOutbound({
  required String tag,
  required String host,
  required int port,
  required String uuid,
  required String sni,
  required String publicKey,
  required String shortId,
}) {
  final fingerprints = ['chrome', 'safari', 'firefox', 'edge', '360'];
  final randomizedFp = fingerprints[DateTime.now().microsecond % fingerprints.length];

  return {
    'type': 'vless',
    'tag': tag,
    'server': host,
    'server_port': port,
    'uuid': uuid,
    'flow': 'xtls-rprx-vision',
    'packet_encoding': 'xudp',
    'tls': {
      'enabled': true,
      'server_name': sni,
      'utls': {
        'enabled': true,
        'fingerprint': randomizedFp,
      },
      'reality': {
        'enabled': true,
        'public_key': publicKey,
        'short_id': shortId,
      }
    }
  };
}`,
    binding:
      'При каждом горячем переключении ноды через `FailoverStateMachine.onHotSwapTrigger` вызывается `buildRealityOutbound` с новым псевдослучайным fingerprint, исключая кластеризацию сигнатуры подключения.'
  },
  {
    title: 'Раздельное туннелирование по приложениям (фильтрация по packageName)',
    query: 'Реализуй unrooted split-tunneling (исключение/включение конкретных Android-приложений по packageName) без root-прав.',
    risk: 'Попытка вызова PackageManager из Go-потока или блокирование UI-потока при итерации по 300+ установленным пакетам приводит к зависанию на старте VPN.',
    language: 'kotlin',
    code: `// Внедрение в SingBoxVpnService.kt (Unrooted Split-Tunneling)
fun applySplitTunneling(
    builder: VpnService.Builder,
    disallowedPackages: List<String>,
    allowedPackages: List<String>
) {
    if (allowedPackages.isNotEmpty()) {
        // Режим белого списка: ТОЛЬКО указанные пакеты идут через VPN
        for (pkg in allowedPackages) {
            try {
                builder.addAllowedApplication(pkg)
            } catch (e: Exception) {
                Log.w(TAG, "Пакет не найден на устройстве: \$pkg")
            }
        }
    } else {
        // Режим черного списка: Все приложения, кроме исключенных
        for (pkg in disallowedPackages) {
            try {
                builder.addDisallowedApplication(pkg)
            } catch (e: Exception) {
                Log.w(TAG, "Ошибка исключения пакета: \$pkg")
            }
        }
        // Собственный пакет ВСЕГДА исключается для защиты от петель
        builder.addDisallowedApplication(packageName)
    }
}`,
    binding:
      'Список пакетов передается из Flutter через MethodChannel `setSplitTunnelingRules`. Стейт-машина проверяет целостность правил перед вызовом `builder.establish()`, исключая крах системного сервиса.'
  }
];

export const VibeCodingTerminal: React.FC = () => {
  const [selectedPreset, setSelectedPreset] = useState<PromptPreset>(PRESETS[0]);
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const [activeOutput, setActiveOutput] = useState<VibeCodingResponse>({
    title: PRESETS[0].title,
    language: PRESETS[0].language,
    risk: PRESETS[0].risk,
    code: PRESETS[0].code,
    binding: PRESETS[0].binding,
  });

  const handleSelectPreset = (preset: PromptPreset) => {
    setSelectedPreset(preset);
    setActiveOutput({
      title: preset.title,
      language: preset.language,
      risk: preset.risk,
      code: preset.code,
      binding: preset.binding,
    });
  };

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPrompt.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      const output: VibeCodingResponse = {
        title: `Инженерная директива: ${customPrompt}`,
        language: 'kotlin',
        risk: 'Прямой вызов платформенных методов сетевого интерфейса без проверки состояния сокета FD приводит к возникновению EBADF / EPIPE и зависанию потока ввода-вывода (IO Thread Stalling).',
        code: `// Реализация для unrooted Android VpnService
class DynamicSocketInterceptor(
    private val vpnService: VpnService
) : PlatformInterface {

    private val isInterceptionActive = AtomicBoolean(true)

    override fun autoDetectInterfaceControl(fd: Int) {
        if (!isInterceptionActive.get()) return
        // Строгая сетевая изоляция: вызов VpnService.protect(fd)
        val protectedOk = vpnService.protect(fd)
        if (!protectedOk) {
            throw java.io.IOException("Сетевое ядро Android отклонило защиту для FD=\$fd")
        }
    }

    override fun openTun(options: TunOptions): Int {
        return -1 // Управляется основным дескриптором VpnService
    }
}`,
        binding:
          'Этот перехватчик регистрируется в основном экземпляре `Libbox.newService`. При поступлении сигнала от `FailoverStateMachine` вызов `isInterceptionActive.set(false)` безопасно прерывает текущий конвейер до перепривязки к новому сокету.'
      };

      setActiveOutput(output);
      setIsGenerating(false);
    }, 600);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(activeOutput.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleApplyAiSolution = (title: string, risk: string, code: string, binding: string) => {
    setActiveOutput({
      title,
      language: 'kotlin',
      risk,
      code,
      binding,
    });
    const codeContainer = document.getElementById('active-code-output');
    if (codeContainer) {
      codeContainer.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Верхний блок консоли */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-zinc-100">
                Консоль Vibe-кодинга (Senior Mobile Engineer)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Android без root • Flutter Dart 3.0 • Ядро sing-box (Go) • Перехват сокетов JNI
              </p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-mono rounded-full bg-cyan-950/60 border border-cyan-600/40 text-cyan-300">
            Строгий 3-секционный формат
          </span>
        </div>

        {/* Быстрые пресеты */}
        <div className="pt-5 space-y-2">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
            Готовые инженерные сценарии
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelectPreset(p)}
                className={`p-3 rounded-lg text-left border transition text-xs ${
                  selectedPreset.title === p.title
                    ? 'bg-cyan-950/40 border-cyan-500 text-zinc-100 shadow-sm shadow-cyan-950'
                    : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                }`}
              >
                <div className="font-semibold text-zinc-100">{p.title}</div>
                <div className="text-[11px] text-zinc-400 mt-1 line-clamp-2">{p.query}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Форма ввода запроса */}
        <form onSubmit={handleGenerate} className="pt-5 flex flex-wrap sm:flex-nowrap gap-2">
          <input
            type="text"
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Сформулируй задачу (например: реализация UDP GSO, DNS-over-QUIC или WireGuard roaming)..."
            className="flex-1 min-w-[200px] rounded-lg bg-zinc-950 border border-zinc-800 px-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-sans"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-cyan-900/40 shrink-0"
          >
            {isGenerating ? <Sparkles className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Сгенерировать код
          </button>
          <button
            type="button"
            id="btn-trigger-ai-logs"
            onClick={() => {
              const el = document.getElementById('btn-ai-analyze-logs');
              if (el) {
                el.scrollIntoView({ behavior: 'smooth' });
                el.click();
              }
            }}
            className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition flex items-center gap-1.5 shadow-sm shadow-purple-950/40 shrink-0 cursor-pointer"
            title="Отправить последние 50 строк логов в Gemini для поиска причин socket-error и решений"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            Анализ AI
          </button>
        </form>
      </div>

      {/* Результат генерации по строгой структуре */}
      <div id="active-code-output" className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h4 className="font-bold text-base text-zinc-100">{activeOutput.title}</h4>
          </div>
          <span className="text-xs font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
            {activeOutput.language.toUpperCase()}
          </span>
        </div>

        {/* Секция 1: Риски */}
        <div className="space-y-2">
          <div className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            1. Идентификация риска (утечки памяти, race conditions и блокировки)
          </div>
          <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-xs leading-relaxed">
            {activeOutput.risk}
          </div>
        </div>

        {/* Секция 2: Готовый код */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Code2 className="w-4 h-4 text-cyan-400" />
              2. Готовый к интеграции код
            </div>
            <button
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedCode ? 'Скопировано' : 'Копировать код'}
            </button>
          </div>
          <pre className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800 font-mono text-xs text-zinc-200 overflow-x-auto leading-relaxed">
            {activeOutput.code}
          </pre>
        </div>

        {/* Секция 3: Привязка к стейт-машине */}
        <div className="space-y-2">
          <div className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-emerald-400" />
            3. Привязка к стейт-машине failover-переключений
          </div>
          <div className="p-3.5 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-200/90 text-xs leading-relaxed">
            {activeOutput.binding}
          </div>
        </div>
      </div>

      {/* Модуль быстрой фильтрации системных логов ('protect', 'failover', 'socket-error') */}
      <SystemLogFilterModule onApplySolution={handleApplyAiSolution} />
    </div>
  );
};
