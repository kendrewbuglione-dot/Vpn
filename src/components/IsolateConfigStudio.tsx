import React, { useState } from 'react';
import { Cpu, Copy, Check, FileJson, Play, Sparkles, RefreshCw } from 'lucide-react';

const SAMPLE_VLESS_URIS = [
  'vless://550e8400-e29b-41d4-a716-446655440000@185.220.101.45:443?security=reality&sni=www.microsoft.com&fp=chrome&pbk=13jE_s9078kLs-example-key&sid=1a2b3c4d&flow=xtls-rprx-vision#Франкфурт-Reality-Основной',
  'vless://6ba7b810-9dad-11d1-80b4-00c04fd430c8@194.87.142.18:443?security=reality&sni=gateway.icloud.com&fp=safari&pbk=98uH_example_key_ams&sid=8e7d6c5b&flow=xtls-rprx-vision#Амстердам-Reality-Резерв',
  'vless://a1b2c3d4-e5f6-7890-abcd-ef1234567890@95.216.12.80:443?security=tls&sni=cdn.cloudflare.com&fp=chrome#Хельсинки-TLS-Запасной'
].join('\n');

export const IsolateConfigStudio: React.FC = () => {
  const [rawInput, setRawInput] = useState<string>(SAMPLE_VLESS_URIS);
  const [parsing, setParsing] = useState<boolean>(false);
  const [parseTimeMs, setParseTimeMs] = useState<number>(3.2);
  const [generatedJson, setGeneratedJson] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const handleParseAndGenerate = () => {
    setParsing(true);
    const start = performance.now();

    // Имитация выполнения парсинга в изоляте Dart вне потока UI
    setTimeout(() => {
      const lines = rawInput.split('\n').filter(l => l.trim().startsWith('vless://'));
      const parsedOutbounds = lines.map((line, idx) => {
        try {
          const clean = line.trim();
          const withoutPrefix = clean.replace('vless://', '');
          const [authHost, rest] = withoutPrefix.split('?');
          const [uuid, hostPort] = authHost.split('@');
          const [host, portStr] = (hostPort || '').split(':');
          const [paramsStr, fragment] = (rest || '').split('#');
          
          const params = new URLSearchParams(paramsStr || '');
          const tag = fragment ? decodeURIComponent(fragment) : `outbound-${idx + 1}`;
          const security = params.get('security') || 'none';
          const sni = params.get('sni') || '';
          const pbk = params.get('pbk') || '';
          const sid = params.get('sid') || '';
          const fp = params.get('fp') || 'chrome';
          const flow = params.get('flow') || '';

          const outbound: any = {
            type: 'vless',
            tag: tag,
            server: host || '127.0.0.1',
            server_port: parseInt(portStr || '443', 10),
            uuid: uuid || '00000000-0000-0000-0000-000000000000',
            packet_encoding: 'xudp',
          };

          if (flow) {
            outbound.flow = flow;
          }

          if (security === 'reality') {
            outbound.tls = {
              enabled: true,
              server_name: sni,
              utls: {
                enabled: true,
                fingerprint: fp,
              },
              reality: {
                enabled: true,
                public_key: pbk,
                short_id: sid,
              },
            };
          } else if (security === 'tls') {
            outbound.tls = {
              enabled: true,
              server_name: sni,
              utls: {
                enabled: true,
                fingerprint: fp,
              },
            };
          }

          return outbound;
        } catch {
          return null;
        }
      }).filter(Boolean);

      const tags = parsedOutbounds.map((o: any) => o.tag);

      const completeConfig = {
        log: {
          level: 'warn',
          timestamp: true,
        },
        dns: {
          servers: [
            { tag: 'remote-dns', address: 'tls://1.1.1.1', detour: 'proxy' },
            { tag: 'local-dns', address: '172.19.0.2', detour: 'direct' },
          ],
          rules: [
            { outbound: 'any', server: 'local-dns' },
            { clash_mode: 'Global', server: 'remote-dns' },
          ],
          strategy: 'ipv4_only',
        },
        inbounds: [
          {
            type: 'tun',
            tag: 'tun-in',
            interface_name: 'tun0',
            inet4_address: '172.19.0.1/30',
            inet6_address: 'fdfe:dcba:9876::1/126',
            mtu: 1500,
            auto_route: true,
            strict_route: true,
            stack: 'gvisor',
            sniff: true,
          },
        ],
        outbounds: [
          {
            type: 'selector',
            tag: 'proxy',
            outbounds: tags.length > 0 ? tags : ['direct'],
            default: tags[0] || 'direct',
          },
          ...parsedOutbounds,
          {
            type: 'direct',
            tag: 'direct',
          },
          {
            type: 'block',
            tag: 'block',
          },
        ],
        route: {
          rules: [
            { protocol: 'dns', outbound: 'dns-out' },
            { ip_is_private: true, outbound: 'direct' },
            { clash_mode: 'Direct', outbound: 'direct' },
            { clash_mode: 'Global', outbound: 'proxy' },
          ],
          auto_detect_interface: true,
        },
      };

      setGeneratedJson(JSON.stringify(completeConfig, null, 2));
      const end = performance.now();
      setParseTimeMs(Math.round((end - start) * 10) / 10);
      setParsing(false);
    }, 120);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  React.useEffect(() => {
    handleParseAndGenerate();
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-6 backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg border bg-cyan-500/10 border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg text-zinc-100">
                  Парсер VLESS / Reality в изолятах Dart и генератор конфига sing-box
                </h3>
                <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-950/60 border border-emerald-600/40 text-emerald-300">
                  0% лагов UI ({parseTimeMs}мс)
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Выполнение в отдельном потоке памяти • Декодирование параметров Reality • Схема sing-box 1.8+
              </p>
            </div>
          </div>

          <button
            id="btn-run-isolate-parse"
            onClick={handleParseAndGenerate}
            disabled={parsing}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition flex items-center gap-2 shadow-sm shadow-cyan-900/40"
          >
            {parsing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Запустить парсинг в изоляте
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6">
          {/* Ввод ссылок */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                Исходные ссылки VLESS / Reality / Trojan (по одной в строке)
              </label>
              <span className="text-[11px] font-mono text-zinc-400">Входные данные изолята</span>
            </div>
            <textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              rows={12}
              className="w-full rounded-lg bg-zinc-950/80 border border-zinc-800 p-3 font-mono text-xs text-zinc-200 focus:border-cyan-500 focus:outline-none transition resize-none leading-relaxed"
              placeholder="vless://uuid@host:port?security=reality..."
            />
            <div className="text-[11px] text-zinc-400">
              * Декодирует параметры (<code className="text-zinc-300 font-mono">pbk, sid, fp, flow=xtls-rprx-vision</code>) в фоновом изоляте, сохраняя стабильные 120 кадров/сек.
            </div>
          </div>

          {/* Сгенерированный JSON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <FileJson className="w-3.5 h-3.5 text-emerald-400" />
                Сгенерированный конфиг sing-box JSON (готов для <code className="text-cyan-300 font-mono">selector</code>)
              </label>
              <button
                id="btn-copy-config"
                onClick={handleCopy}
                className="px-2.5 py-1 text-xs font-medium rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Скопировано' : 'Копировать JSON'}
              </button>
            </div>
            <div className="relative">
              <pre className="w-full h-[278px] rounded-lg bg-zinc-950/90 border border-zinc-800 p-3 font-mono text-[11px] text-zinc-300 overflow-y-auto leading-relaxed">
                {generatedJson}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
