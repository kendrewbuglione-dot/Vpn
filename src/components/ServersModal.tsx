import React, { useState } from 'react';
import { VpnServerNode } from '../types';
import {
  X,
  Check,
  Search,
  Plus,
  Shield,
  Zap,
  Sparkles,
  Link,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ServersModalProps {
  isOpen: boolean;
  onClose: () => void;
  servers: VpnServerNode[];
  activeServerId: string | null;
  onSelectServer: (server: VpnServerNode) => void;
  onAddCustomSubscription: (rawText: string) => boolean;
}

export const ServersModal: React.FC<ServersModalProps> = ({
  isOpen,
  onClose,
  servers,
  activeServerId,
  onSelectServer,
  onAddCustomSubscription,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showImportForm, setShowImportForm] = useState(false);
  const [importInput, setImportInput] = useState('');
  const [importMessage, setImportMessage] = useState<{ text: string; isError: boolean } | null>(null);

  if (!isOpen) return null;

  const filteredServers = servers.filter(
    (s) =>
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.city.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleImport = () => {
    if (!importInput.trim()) return;
    const success = onAddCustomSubscription(importInput.trim());
    if (success) {
      setImportMessage({ text: 'Подписка успешно импортирована в пул!', isError: false });
      setImportInput('');
      setTimeout(() => {
        setImportMessage(null);
        setShowImportForm(false);
      }, 1500);
    } else {
      setImportMessage({ text: 'Не удалось распознать конфигурацию VLESS/Reality', isError: true });
    }
  };

  const handleAutoFastest = () => {
    const aliveSorted = [...servers]
      .filter((s) => s.isAlive)
      .sort((a, b) => a.pingMs - b.pingMs);
    if (aliveSorted.length > 0) {
      onSelectServer(aliveSorted[0]);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm bg-[#131B2E] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 text-slate-100 shadow-2xl relative max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Шапка */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div>
            <h3 className="font-bold text-base text-white tracking-tight">
              Локации подключения
            </h3>
            <p className="text-[11px] text-slate-400">
              Доступно узлов: {servers.length}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Быстрые действия: Автовыбор и Добавить подписку */}
        <div className="mt-3 flex gap-2 shrink-0">
          <button
            onClick={handleAutoFastest}
            className="flex-1 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Быстрый автовыбор
          </button>
          <button
            onClick={() => setShowImportForm(!showImportForm)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Подписка
            {showImportForm ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* Форма импорта подписки */}
        {showImportForm && (
          <div className="mt-3 p-3 rounded-xl bg-[#0B0F19] border border-slate-800 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5 mb-1.5 text-xs text-slate-300 font-medium">
              <Link className="w-3.5 h-3.5 text-cyan-400" />
              Импорт vless:// или Base64
            </div>
            <textarea
              rows={2}
              value={importInput}
              onChange={(e) => setImportInput(e.target.value)}
              placeholder="Вставьте ссылку vless:// или base64 строку..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono resize-none"
            />
            {importMessage && (
              <div
                className={`text-[11px] mt-1.5 font-medium ${
                  importMessage.isError ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {importMessage.text}
              </div>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setShowImportForm(false)}
                className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200"
              >
                Отмена
              </button>
              <button
                onClick={handleImport}
                className="px-3 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white transition"
              >
                Загрузить
              </button>
            </div>
          </div>
        )}

        {/* Поиск */}
        <div className="mt-3 relative shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по странам и городам..."
            className="w-full bg-[#0B0F19] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700"
          />
        </div>

        {/* Список серверов */}
        <div className="mt-3 space-y-2 overflow-y-auto pr-1 flex-1 no-scrollbar">
          {filteredServers.map((server) => {
            const isSelected = server.id === activeServerId;

            return (
              <div
                key={server.id}
                onClick={() => {
                  onSelectServer(server);
                  onClose();
                }}
                className={`flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer active:scale-[0.98] ${
                  isSelected
                    ? 'bg-emerald-500/10 border-emerald-500/40'
                    : 'bg-[#0B0F19] border-slate-800/80 hover:border-slate-700 hover:bg-[#0e1422]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="text-2xl leading-none">{server.flag}</div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white tracking-tight">
                        {server.name}
                      </span>
                      {server.security === 'reality' && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-teal-950/80 text-teal-400 border border-teal-800/40">
                          REALITY
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {server.address} • {server.transport.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div
                      className={`text-xs font-bold ${
                        server.pingMs < 60
                          ? 'text-emerald-400'
                          : server.pingMs < 120
                          ? 'text-amber-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {server.pingMs} мс
                    </div>
                  </div>

                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition border ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                        : 'border-slate-700 bg-transparent'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
