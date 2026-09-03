import React, { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle2, XCircle, Info, Zap, Terminal } from 'lucide-react';

export const VpnProtectSimulator: React.FC = () => {
  const [isProtected, setIsProtected] = useState<boolean>(true);
  const [simulatingPacket, setSimulatingPacket] = useState<boolean>(false);
  const [packetStep, setPacketStep] = useState<number>(0);
  const [loopDetected, setLoopDetected] = useState<boolean>(false);

  const triggerPacketFlow = () => {
    setSimulatingPacket(true);
    setPacketStep(1);
    setLoopDetected(false);

    // Шаг 1: Приложение (Chrome) отправляет TCP SYN на 1.1.1.1
    setTimeout(() => {
      setPacketStep(2); // Шаг 2: Таблица маршрутов перенаправляет 0.0.0.0/0 в интерфейс tun0 (FD=42)

      setTimeout(() => {
        setPacketStep(3); // Шаг 3: Адаптер TUN sing-box читает сырой IP-пакет из FD=42

        setTimeout(() => {
          setPacketStep(4); // Шаг 4: sing-box определяет outbound и создает сокет в физ. сеть (FD=91)

          setTimeout(() => {
            if (!isProtected) {
              // Катастрофическая петля маршрутизации
              setPacketStep(5);
              setLoopDetected(true);
              setSimulatingPacket(false);
            } else {
              // Безопасный обход туннеля
              setPacketStep(6);
              setTimeout(() => {
                setSimulatingPacket(false);
              }, 1200);
            }
          }, 800);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Главная информационная плашка */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg border ${
              isProtected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400 animate-pulse'
            }`}>
              {isProtected ? <Shield className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-zinc-100">
                Сетевая изоляция без Root: Механизм VpnService.protect(fd)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Обход системной таблицы маршрутизации • Метка FWMARK на сокете • Исключение рекурсивных петель
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer select-none bg-zinc-950 px-3.5 py-2 rounded-lg border border-zinc-800">
              <input
                type="checkbox"
                checked={isProtected}
                onChange={e => {
                  setIsProtected(e.target.checked);
                  setPacketStep(0);
                  setLoopDetected(false);
                }}
                className="w-4 h-4 rounded text-cyan-500 focus:ring-0 focus:ring-offset-0 bg-zinc-800 border-zinc-700"
              />
              <span className="text-xs font-medium text-zinc-200">
                Принудительно <code className="text-cyan-400 font-mono">VpnService.protect(fd)</code>
              </span>
            </label>

            <button
              id="btn-trigger-packet"
              disabled={simulatingPacket}
              onClick={triggerPacketFlow}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition disabled:opacity-50 flex items-center gap-2 shadow-sm shadow-cyan-900/40"
            >
              <Zap className="w-3.5 h-3.5" />
              {simulatingPacket ? 'Трассировка пакета в ядре...' : 'Трассировать исходящий пакет'}
            </button>
          </div>
        </div>

        {/* Визуализатор трассировки */}
        <div className="pt-6">
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            Маршрут прохождения пакета (уровень ядра Linux)
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Шаг 1: Приложение */}
            <div className={`p-4 rounded-xl border transition-all ${
              packetStep === 1
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                : 'bg-zinc-950/60 border-zinc-800/80'
            }`}>
              <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>01. ПРИЛОЖЕНИЯ ПОЛЬЗОВАТЕЛЯ</span>
                {packetStep === 1 && <span className="text-cyan-400 animate-pulse">АКТИВЕН</span>}
              </div>
              <div className="font-semibold text-sm text-zinc-100 mt-2">Браузер / Программы</div>
              <p className="text-xs text-zinc-400 mt-1">
                Генерируют сокетный запрос к целевому хосту <code className="text-zinc-300 font-mono">1.1.1.1:443</code>
              </p>
            </div>

            {/* Шаг 2: Интерфейс TUN */}
            <div className={`p-4 rounded-xl border transition-all ${
              packetStep === 2 || packetStep === 3
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                : 'bg-zinc-950/60 border-zinc-800/80'
            }`}>
              <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>02. ИНТЕРФЕЙС TUN ANDROID</span>
                {(packetStep === 2 || packetStep === 3) && <span className="text-cyan-400 animate-pulse">АКТИВЕН</span>}
              </div>
              <div className="font-semibold text-sm text-zinc-100 mt-2">tun0 (FD=42)</div>
              <p className="text-xs text-zinc-400 mt-1">
                Таблица маршрутизации направляет <code className="text-cyan-400 font-mono">0.0.0.0/0</code> в виртуальный дескриптор TUN.
              </p>
            </div>

            {/* Шаг 3: Ядро sing-box */}
            <div className={`p-4 rounded-xl border transition-all ${
              packetStep === 4
                ? 'bg-cyan-950/40 border-cyan-500 shadow-md shadow-cyan-950'
                : 'bg-zinc-950/60 border-zinc-800/80'
            }`}>
              <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>03. ЯДРО SING-BOX (GO)</span>
                {packetStep === 4 && <span className="text-cyan-400 animate-pulse">АКТИВЕН</span>}
              </div>
              <div className="font-semibold text-sm text-zinc-100 mt-2">Инкапсулятор VLESS</div>
              <p className="text-xs text-zinc-400 mt-1">
                Оборачивает полезную нагрузку в TLS/Reality и открывает сокет <code className="text-cyan-400 font-mono">FD=91</code>.
              </p>
            </div>

            {/* Шаг 4: Выход в физ. сеть */}
            <div className={`p-4 rounded-xl border transition-all ${
              loopDetected
                ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950'
                : packetStep === 6
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950'
                : 'bg-zinc-950/60 border-zinc-800/80'
            }`}>
              <div className="text-[10px] font-mono text-zinc-400 flex items-center justify-between">
                <span>04. МАРШРУТИЗАЦИЯ В ФИЗ. СЕТЬ</span>
                {packetStep === 6 && <span className="text-emerald-400">УСПЕХ</span>}
                {loopDetected && <span className="text-red-400 font-bold">ПЕТЛЯ МАРШРУТА</span>}
              </div>
              <div className="font-semibold text-sm mt-2 text-zinc-100">
                {isProtected ? 'wlan0 (Прямой выход)' : 'Захвачен tun0 (Петля)'}
              </div>
              <p className="text-xs text-zinc-400 mt-1">
                {isProtected
                  ? 'VpnService.protect(FD=91) пометил сокет SO_BINDTODEVICE. Трафик уходит на вышку.'
                  : 'Незащищенный FD снова пойман маршрутом 0.0.0.0/0! Бесконечная петля вешает систему.'}
              </p>
            </div>
          </div>
        </div>

        {/* Предупреждения и статусные карточки */}
        {loopDetected && (
          <div className="mt-5 p-4 rounded-lg bg-red-950/50 border border-red-800 text-red-200 text-xs flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-red-300 text-sm">КРИТИЧЕСКИЙ СБОЙ: Обнаружена бесконечная петля маршрутизации</div>
              <p className="mt-1 text-red-200/90 leading-relaxed">
                Так как вызов <code className="bg-red-900/60 px-1 py-0.5 rounded font-mono">VpnService.protect(fd)</code> не был выполнен ДО <code className="bg-red-900/60 px-1 py-0.5 rounded font-mono">connect()</code>, ядро восприняло трафик прокси как обычный пользовательский и направило его обратно в <code className="bg-red-900/60 px-1 py-0.5 rounded font-mono">tun0</code>. Это вызывает рекурсивный шторм пакетов, загружает CPU на 100% и ведет к уничтожению процесса подсистемой Android LMK.
              </p>
            </div>
          </div>
        )}

        {packetStep === 6 && (
          <div className="mt-5 p-4 rounded-lg bg-emerald-950/50 border border-emerald-800 text-emerald-200 text-xs flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-emerald-300 text-sm">ЗАЩИЩЕНО: Маршрут проверен, утечек нет</div>
              <p className="mt-1 text-emerald-200/90 leading-relaxed">
                Дескриптор сокета sing-box (FD=91) был синхронно перехвачен через CGO <code className="bg-emerald-900/60 px-1 py-0.5 rounded font-mono">PlatformInterface.autoDetectInterfaceControl(fd)</code> и защищен. Ядро Linux пропускает его мимо VPN-туннеля и передает зашифрованные данные напрямую в сетевой адаптер WiFi / сотовой связи.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Инженерные пояснения */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm">
          <h4 className="font-semibold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Terminal className="w-4 h-4 text-cyan-400" />
            Почему категорически отклоняется Root-доступ
          </h4>
          <div className="mt-3 space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              1. <strong>Совместимость с unrooted-устройствами:</strong> Обычные приложения Android не имеют прав изменять правила <code className="text-zinc-200 font-mono">iptables</code>, <code className="text-zinc-200 font-mono">nftables</code> или выполнять шелл-команды <code className="text-zinc-200 font-mono">ip route</code>.
            </p>
            <p>
              2. <strong>Песочница VpnService:</strong> Android управляет маршрутизацией через политики ядра (policy routing). Вызов <code className="text-cyan-400 font-mono">VpnService.protect(fd)</code> привязывает сокет к физическому сетевому интерфейсу через специальный <code className="text-zinc-200 font-mono">SO_MARK</code> в ядре.
            </p>
            <p>
              3. <strong>Отсутствие блокировок SELinux:</strong> Клиент стабильно работает на устройствах без root (Samsung Knox, Pixel Enterprise, Android 8–15) без отказов безопасности.
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-5 backdrop-blur-sm">
          <h4 className="font-semibold text-sm text-zinc-200 flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Info className="w-4 h-4 text-emerald-400" />
            Предотвращение утечек IPv6
          </h4>
          <div className="mt-3 space-y-3 text-xs text-zinc-300 leading-relaxed">
            <p>
              1. <strong>Перехват IPv6 в туннель:</strong> Выделение адреса <code className="text-emerald-400 font-mono">builder.addAddress("fdfe:dcba:9876::1", 126)</code> и маршрута <code className="text-emerald-400 font-mono">builder.addRoute("::", 0)</code> гарантирует, что IPv6 трафик не пойдет в открытую сеть мимо VPN.
            </p>
            <p>
              2. <strong>Защита от DNS-утечек:</strong> Локальный DNS-сервер (<code className="text-zinc-200 font-mono">172.19.0.2</code>) перенаправляет все запросы порта 53 / DoH строго во внутренний DNS-модуль ядра sing-box.
            </p>
            <p>
              3. <strong>Исключение собственного пакета:</strong> Метод `addDisallowedApplication(packageName)` предотвращает захват собственного трафика клиента в TUN.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
