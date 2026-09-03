export type TunnelState = 'disconnected' | 'connecting' | 'active' | 'failoverInProgress' | 'error';

export interface VpnServerNode {
  id: string;
  name: string;
  country: string;
  flag: string;
  city: string;
  address: string;
  port: number;
  protocol: 'vless' | 'trojan' | 'shadowsocks';
  security: 'reality' | 'tls' | 'none';
  transport: 'tcp' | 'grpc' | 'ws';
  sni: string;
  pingMs: number;
  isAlive: boolean;
  consecutiveFailures: number;
}

export interface NetworkDiagnosticsData {
  rttMs: number;
  socketProtectorActive: boolean;
  tunFd: number;
  coreEngine: string;
  transportStack: string;
  failuresCount: number;
  maxFailuresThreshold: number;
  hotSwapCount: number;
  lastRotatedNodeName?: string;
  bytesReceived: number;
  bytesSent: number;
  connectionUptimeSeconds: number;
}

// Типы для обратной совместимости модулей
export type VpnState =
  | 'DISCONNECTED'
  | 'INITIALIZING_JNI_CORE'
  | 'ALLOCATING_TUN_FD'
  | 'SOCKET_PROTECT_HOOK'
  | 'ROUTING_VERIFIED'
  | 'ACTIVE_TUNNEL'
  | 'LATENCY_DEGRADED'
  | 'FAILOVER_TRIGGERED'
  | 'HOT_SWAP_SWITCHING'
  | 'RECONNECTED'
  | 'FATAL_ERROR_LMK';

export interface VpnNode {
  id: string;
  name: string;
  protocol: 'vless' | 'shadowsocks' | 'trojan' | 'hysteria2' | 'wireguard';
  server: string;
  port: number;
  uuid?: string;
  flow?: string;
  security?: 'reality' | 'tls' | 'none';
  sni?: string;
  fingerprint?: string;
  publicKey?: string;
  shortId?: string;
  pingMs: number;
  packetLoss: number;
  status: 'healthy' | 'warning' | 'dead';
  active: boolean;
}

export interface JniRefTrack {
  id: string;
  objectType: string;
  refAddress: string;
  createdTimestamp: number;
  cleaned: boolean;
  leakRisk: 'safe' | 'warning' | 'critical';
}

export type JniRefStatus = JniRefTrack;

export interface PromptPreset {
  title: string;
  query: string;
  risk: string;
  language: string;
  code: string;
  binding: string;
}

export interface VibeCodingResponse {
  title: string;
  language: string;
  risk: string;
  code: string;
  binding: string;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  subsystem: 'JNI' | 'SING-BOX' | 'DART-ISOLATE' | 'VPN-SERVICE' | 'FAILOVER-SM';
  message: string;
  fd?: number;
}

export interface CodeModule {
  id: string;
  title: string;
  layer: 'Kotlin / JNI' | 'Go / sing-box' | 'Dart / Flutter' | 'Failover State Machine';
  filename: string;
  language: 'kotlin' | 'go' | 'dart' | 'json';
  riskIdentification: string;
  code: string;
  failoverBinding: string;
}
