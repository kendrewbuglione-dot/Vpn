# CI VPN — PROJECT STATE

Дата: 2026-09-07

## Git

- Branch: main
- Remote: https://github.com/kendrewbuglione-dot/Vpn.git
- HEAD: aa787d1
- Working tree: основной tracked-код синхронизирован с origin/main
- Untracked: github-job.zip

`github-job.zip` ранее был замечен размером 0 байт.
Пока не удалять и не добавлять в Git без проверки.

## CI

Файл:

.github/workflows/build.yml

Текущий pipeline:

- Java 17 / Zulu
- Flutter 3.19.x stable
- flutter pub get
- flutter analyze
- analyzer имеет continue-on-error: true
- flutter test
- flutter build apk --debug --verbose
- upload debug APK artifact

## Android

- compileSdk 34
- targetSdk 34
- minSdk 24
- Java 17
- Kotlin JVM target 17
- Kotlin plugin 1.9.22
- Android Gradle Plugin 8.3.0

## Native VPN

Существующие файлы:

- android/app/src/main/kotlin/com/vpn/MainActivity.kt
- android/app/src/main/kotlin/com/vpn/CustomVpnService.kt
- android/app/src/main/kotlin/com/vpn/VpnState.kt

Реализовано:

- VPN permission flow
- Android VpnService
- Foreground service
- Notification channel
- Android VPN TUN interface
- DNS configuration
- Default route

Текущая TUN-конфигурация:

- address: 10.0.0.2/32
- route: 0.0.0.0/0
- DNS: 1.1.1.1
- MTU: 1500

## Flutter

Существуют:

- lib/main.dart
- lib/vpn_controller.dart
- lib/services/native_vpn_service.dart
- lib/core/models/proxy_node.dart
- lib/core/state/failover_state_machine.dart

Также существуют presentation screens/controllers и isolate benchmark code.

## VLESS

ProxyNode умеет:

- parse VLESS URI
- parse subscription Base64
- Reality
- TLS
- no security

Также существует генерация Sing-box outbound JSON.

## Sing-box

ВАЖНО:

Sing-box core пока реально НЕ интегрирован.

CustomVpnService создаёт Android TUN interface, но реальный traffic engine отсутствует.

В коде существует placeholder для будущего:

SingBoxManager.start(
    config = vpnConfig,
    tunFd = tunInterface!!.fd
)

Но SingBoxManager пока не существует.

## Failover

FailoverStateMachine сейчас является skeleton.

Реализовано:

- состояния
- выбор первого node
- переход в active

Не реализовано:

- реальные health checks
- RTT measurement
- failure threshold
- node rotation
- reconnect
- backoff
- recovery

## Critical bridge issue

Обнаружено несовпадение MethodChannel.

lib/vpn_controller.dart:

com.vpn/control

MainActivity.kt:

vpn_channel

lib/services/native_vpn_service.dart:

vpn_channel

Следовательно основной VpnController сейчас не совпадает с native MethodChannel.

## Current priority

1. Унифицировать Flutter ↔ Kotlin bridge.
2. Сделать native VPN state authoritative.
3. Интегрировать реальный Sing-box core.
4. Подключить Sing-box к TUN.
5. Проверить реальный VLESS/Reality/TLS traffic.
6. Реализовать настоящий failover.
7. После этого проектировать Cloudflare infrastructure/control plane.
