import React, { useState } from 'react';
import { PRODUCTION_MODULES } from '../data/productionCodeModules';
import { CodeModule } from '../types';
import { Code2, Copy, Check, FileCode, Layers, ShieldAlert, Link2 } from 'lucide-react';

export const CodeModuleViewer: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<CodeModule>(PRODUCTION_MODULES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedModule.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Селектор модулей */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 backdrop-blur-sm">
        <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          Архитектурные модули ядра VPN (Production)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PRODUCTION_MODULES.map(mod => (
            <button
              key={mod.id}
              onClick={() => setSelectedModule(mod)}
              className={`p-3 rounded-lg text-left border transition text-xs flex flex-col justify-between ${
                selectedModule.id === mod.id
                  ? 'bg-cyan-950/40 border-cyan-500 text-zinc-100 shadow-sm shadow-cyan-950'
                  : 'bg-zinc-950/60 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
              }`}
            >
              <div>
                <span className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-zinc-800 text-cyan-300">
                  {mod.layer}
                </span>
                <div className="font-semibold text-zinc-100 mt-2 line-clamp-1">{mod.title}</div>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 mt-2 truncate">{mod.filename}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Отображение выбранного кода */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h3 className="font-bold text-base text-zinc-100 flex items-center gap-2">
              <FileCode className="w-5 h-5 text-cyan-400" />
              {selectedModule.title}
            </h3>
            <p className="text-xs font-mono text-zinc-400 mt-0.5">{selectedModule.filename}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
              {selectedModule.language.toUpperCase()}
            </span>
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Скопировано' : 'Копировать модуль'}
            </button>
          </div>
        </div>

        {/* 1. Идентификация риска */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold font-mono text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            1. Идентификация архитектурного риска (утечки и блокировки)
          </div>
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-amber-200/90 text-xs leading-relaxed">
            {selectedModule.riskIdentification}
          </div>
        </div>

        {/* 2. Исходный код модуля */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Code2 className="w-4 h-4 text-cyan-400" />
            2. Исходный код модуля (готов к внедрению)
          </div>
          <div className="relative">
            <pre className="p-4 rounded-lg bg-zinc-950/90 border border-zinc-800 font-mono text-xs text-zinc-200 overflow-x-auto max-h-[500px] overflow-y-auto leading-relaxed">
              {selectedModule.code}
            </pre>
          </div>
        </div>

        {/* 3. Привязка к стейт-машине failover */}
        <div className="space-y-1.5">
          <div className="text-xs font-bold font-mono text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <Link2 className="w-4 h-4 text-emerald-400" />
            3. Инструкция по привязке к стейт-машине failover-переключений
          </div>
          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 text-emerald-200/90 text-xs leading-relaxed">
            {selectedModule.failoverBinding}
          </div>
        </div>
      </div>
    </div>
  );
};
