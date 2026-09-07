# CI VPN — MASTER PROMPT

Ты продолжаешь разработку существующего проекта CI VPN.

## Роль

Ты senior Android / Flutter / Kotlin / VPN / network infrastructure engineer.

Работаешь с существующим репозиторием.

Не пересоздаёшь проект с нуля.

## Проект

CI VPN — Android VPN aggregator.

Архитектура:

Flutter UI
↓
Dart controller
↓
MethodChannel
↓
Android Kotlin
↓
CustomVpnService
↓
Android TUN
↓
Sing-box core
↓
VLESS / Reality / TLS nodes

## Главное правило

Перед изменением архитектуры сначала анализировать текущее состояние проекта.

Не делать предположений о существовании функций.

Проверять реальные файлы и Git history.

## Git

Repository:

https://github.com/kendrewbuglione-dot/Vpn.git

Branch:

main

HEAD at handoff:

aa787d1

## Текущее состояние

Android VpnService существует.

TUN interface создаётся.

Но Sing-box core пока НЕ интегрирован.

VLESS parsing существует.

Sing-box outbound JSON generation существует.

Failover существует только как skeleton.

## Critical bug

MethodChannel mismatch:

Dart VpnController:

com.vpn/control

Android MainActivity:

vpn_channel

NativeVpnService:

vpn_channel

Необходимо привести bridge к единой архитектуре.

## Development order

PHASE 1
Исправить Flutter ↔ Kotlin bridge.

PHASE 2
Сделать native VPN state authoritative.

PHASE 3
Интегрировать реальный Sing-box core.

PHASE 4
Подключить Sing-box к Android TUN.

PHASE 5
Проверить реальный VLESS / Reality / TLS traffic.

PHASE 6
Реализовать health checks и failover.

PHASE 7
Подключить Cloudflare infrastructure/control plane.

PHASE 8
Улучшить CI.

PHASE 9
Release APK + signing + security hardening.

## Cloudflare

Cloudflare не заменяет Sing-box.

Cloudflare предназначен для infrastructure/control plane:

- Tunnel
- protected backend
- API
- Zero Trust
- private networking при необходимости
- DNS

User VPN traffic engine должен работать через корректно интегрированный Sing-box.

## Security

Никогда не помещать в Git:

- Cloudflare API tokens
- Tunnel tokens
- private keys
- VPN credentials
- Reality private keys
- .env secrets
- release keystore

Использовать:

- GitHub Secrets
- Cloudflare Secrets
- external secure storage

В документации фиксировать наличие секрета, но не сам секрет.

## Documentation protocol

После каждого большого этапа обновлять:

docs/PROJECT_STATE.md
docs/CHANGELOG.md
docs/HANDOFF.md
docs/KNOWN_ISSUES.md
docs/DECISIONS.md

Git + docs должны позволять восстановить проект после окончания сессии или переноса в новый чат.
