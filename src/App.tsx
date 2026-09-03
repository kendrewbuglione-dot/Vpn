import React from 'react';
import { OneTapVpnView } from './components/OneTapVpnView';

export default function App() {
  return (
    <main className="min-h-screen w-full bg-[#070A11] flex items-center justify-center p-0 sm:p-4 text-slate-100 selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Декоративное мягкое фоновое рассеивание на десктопе */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-40">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-emerald-600/10 rounded-full blur-[140px]" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-cyan-600/5 rounded-full blur-[120px]" />
      </div>

      {/* Мобильный контейнер смартфона формата 9:16 */}
      <div className="relative z-10 w-full flex items-center justify-center">
        <OneTapVpnView />
      </div>
    </main>
  );
}
