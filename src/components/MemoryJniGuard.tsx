import React, { useState } from 'react';
import { Database, Shield, AlertOctagon, Trash2, Cpu } from 'lucide-react';
import { JniRefStatus } from '../types';

const INITIAL_REFS: JniRefStatus[] = [
  {
    id: 'ref-1',
    objectType: 'PlatformInterface$ProxyCallback',
    refAddress: '0x7f884a12c0',
    createdTimestamp: Date.now() - 34000,
    cleaned: false,
    leakRisk: 'safe',
  },
  {
    id: 'ref-2',
    objectType: 'BoxService$CommandListener',
    refAddress: '0x7f884a19e0',
    createdTimestamp: Date.now() - 25000,
    cleaned: false,
    leakRisk: 'safe',
  },
  {
    id: 'ref-3',
    objectType: 'VpnService$SocketProtectToken',
    refAddress: '0x7f884b2310',
    createdTimestamp: Date.now() - 12000,
    cleaned: true,
    leakRisk: 'safe',
  }
];

export const MemoryJniGuard: React.FC = () => {
  const [activeRefs, setActiveRefs] = useState<JniRefStatus[]>(INITIAL_REFS);
  const [cleanerEnabled, setCleanerEnabled] = useState<boolean>(true);
  const [lmkRiskLevel, setLmkRiskLevel] = useState<'low' | 'moderate' | 'critical'>('low');

  const handleSimulateAllocation = () => {
    const objectTypes = [
      'PlatformInterface$NetworkCallback',
      'BoxService$InboundHandler',
      'TunInterface$SocketHook',
      'SingBoxJni$CommandBridge'
    ];
    const pickedType = objectTypes[Math.floor(Math.random() * objectTypes.length)];

    const newRef: JniRefStatus = {
      id: `ref-${Date.now()}`,
      objectType: pickedType,
      refAddress: `0x7f88${Math.floor(Math.random() * 89999 + 10000).toString(16)}`,
      createdTimestamp: Date.now(),
      cleaned: false,
      leakRisk: cleanerEnabled ? 'safe' : 'warning',
    };

    setActiveRefs(prev => [newRef, ...prev]);

    if (cleanerEnabled) {
      // Авто-очистка через 2 секунды с помощью Cleaner
      setTimeout(() => {
        setActiveRefs(prev =>
          prev.map(r => (r.id === newRef.id ? { ...r, cleaned: true } : r))
        );
      }, 2000);
    } else {
      // Утечка накапливается!
      if (activeRefs.length >= 6) {
        setLmkRiskLevel('critical');
      } else if (activeRefs.length >= 4) {
        setLmkRiskLevel('moderate');
      }
    }
  };

  const handleForceGc = () => {
    setActiveRefs(prev => prev.filter(r => !r.cleaned));
    setLmkRiskLevel('low');
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              lmkRiskLevel === 'critical'
                ? 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
                : 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400'
            }`}>
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-zinc-100">
                  Монитор ссылок JNI GlobalRef и защита от Android LMK
                </h3>
                <span className={`px-2 py-0.5 text-xs font-mono rounded ${
                  cleanerEnabled
                    ? 'bg-emerald-950/60 border border-emerald-600/40 text-emerald-300'
                    : 'bg-red-950/60 border border-red-600/40 text-red-300'
                }`}>
                  {cleanerEnabled ? 'Паттерн Cleaner: АКТИВЕН' : 'Ручные ссылки: РИСК УТЕЧКИ'}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Лимиты памяти CGO • Очередь финализаторов PhantomReference • Защита таблицы глобальных ссылок JNI
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-zinc-950 px-3 py-1.5 rounded-lg border border-zinc-800">
              <input
                type="checkbox"
                checked={cleanerEnabled}
                onChange={e => setCleanerEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-zinc-700"
              />
              <span className="text-xs font-medium text-zinc-200">
                Использовать <code className="text-cyan-400 font-mono">Cleaner.create()</code>
              </span>
            </label>

            <button
              id="btn-alloc-ref"
              onClick={handleSimulateAllocation}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-1.5"
            >
              <Cpu className="w-3.5 h-3.5" />
              Имитировать выделение CGO / JNI
            </button>

            <button
              id="btn-force-gc"
              onClick={handleForceGc}
              className="p-2 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 transition"
              title="Принудительная очистка сборщиком мусора"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Баннер статуса памяти LMK */}
        {lmkRiskLevel === 'critical' && (
          <div className="mt-5 p-4 rounded-lg bg-red-950/60 border border-red-800 text-red-200 text-xs flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-300 text-sm">Опасность LMK OOM: Таблица JNI GlobalRef приближается к лимиту</div>
              <p className="mt-1 text-red-200/90 leading-relaxed">
                Android допускает не более 51,200 глобальных ссылок JNI перед принудительным завершением процесса (<code className="font-mono">JNI global reference table overflow</code>). Без использования Phantom Cleaner висячие колбэки CGO накапливаются при частых переключениях серверов.
              </p>
            </div>
          </div>
        )}

        {/* Таблица активных ссылок */}
        <div className="pt-6">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Активные ссылки JNI GlobalRef в среде выполнения ART
          </div>

          <div className="space-y-2">
            {activeRefs.map(ref => (
              <div
                key={ref.id}
                className={`p-3 rounded-lg border text-xs font-mono transition-all flex items-center justify-between ${
                  ref.cleaned
                    ? 'bg-zinc-950/30 border-zinc-900 text-zinc-500 line-through'
                    : 'bg-zinc-950/80 border-zinc-800 text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${ref.cleaned ? 'bg-zinc-600' : 'bg-emerald-400'}`} />
                  <div>
                    <span className="font-semibold text-zinc-100">{ref.objectType}</span>
                    <span className="ml-2 text-zinc-400 text-[11px]">{ref.refAddress}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px]">
                  {ref.cleaned ? (
                    <span className="text-zinc-400">Освобождено через Cleaner</span>
                  ) : (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Управляемая ссылка
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
