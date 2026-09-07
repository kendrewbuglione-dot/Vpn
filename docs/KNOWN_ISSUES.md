# CI VPN — KNOWN ISSUES

## 1. MethodChannel mismatch

VpnController:

com.vpn/control

MainActivity:

vpn_channel

NativeVpnService:

vpn_channel

## 2. Duplicate bridge responsibility

VpnController и NativeVpnService используют разные abstraction layers.

Нужно выбрать единый bridge.

## 3. Incorrect connected state

Flutter VpnController может перейти в CONNECTED после успешного invokeMethod.

Это не гарантирует, что VPN реально работает.

Native service state должен быть authoritative.

## 4. Sing-box not integrated

CustomVpnService пока создаёт только TUN.

## 5. vpnConfig unused

Конфигурация сохраняется, но не передаётся в реальный Sing-box engine.

## 6. Failover skeleton

Нет:

- health checks
- RTT
- rotation
- thresholds
- reconnect
- recovery

## 7. CI analyzer non-blocking

flutter analyze имеет:

continue-on-error: true

## 8. Release signing

Release build использует debug signing config.

## 9. .gitignore

Требует расширения для:

- .env
- keystore
- key.properties
- local.properties
- Cloudflare credentials
- private keys

## 10. github-job.zip

Untracked.

Ранее размер был 0 bytes.

Проверить перед удалением.
