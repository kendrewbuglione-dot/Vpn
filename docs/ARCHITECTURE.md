# CI VPN — ARCHITECTURE

## Current architecture

Flutter UI
    ↓
VpnController
    ↓
MethodChannel
    ↓
MainActivity
    ↓
CustomVpnService
    ↓
Android VpnService.Builder
    ↓
TUN

## Current limitation

TUN существует.

Но Sing-box traffic engine отсутствует.

Следовательно VLESS config пока не обрабатывается реальным proxy engine.

## Target data plane

Android Application
    ↓
Flutter UI
    ↓
Dart VPN controller
    ↓
Single MethodChannel bridge
    ↓
Native Android coordinator
    ↓
CustomVpnService
    ↓
Sing-box Core
    ↓
Android TUN
    ↓
Selected VLESS node
    ↓
Internet

## Target node layer

ProxyNode pool
    ↓
health checks
    ↓
RTT / failure metrics
    ↓
best node selection
    ↓
active node
    ↓
failure threshold
    ↓
failover
    ↓
recovery

## Target control plane

Cloudflare
    ↓
Protected backend/API
    ↓
Configuration/subscription services
    ↓
Optional private networking / Zero Trust
    ↓
Android client management

Cloudflare control plane не заменяет Sing-box data plane.
