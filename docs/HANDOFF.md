# CI VPN — HANDOFF

## Last completed

Проведён аудит репозитория и текущей архитектуры.

## Current task

Подготовить существующий Android VPN проект к реальной работе.

## Next work

1. Унифицировать MethodChannel.
2. Убрать или объединить дублирующий NativeVpnService.
3. Сделать native VPN state authoritative.
4. Проверить permission flow.
5. Выбрать способ интеграции Sing-box core.
6. Интегрировать Sing-box.
7. Подключить Sing-box к TUN file descriptor.
8. Проверить реальный traffic.
9. Реализовать failover.
10. После этого перейти к Cloudflare.

## Important

CustomVpnService сейчас создаёт TUN.

Но traffic engine отсутствует.

Sing-box пока не запущен.

## Do not repeat

Не пересоздавать проект.

Не удалять существующую архитектуру без аудита.

Не подключать Cloudflare на основе предположений.

Не коммитить секреты.

Не называть текущую TUN-only реализацию полноценным VPN.

## Useful commands

cd ~/Vpn

git status

git log --oneline -10

git ls-files

find lib -type f | sort

find android -type f | sort

## Transfer protocol

Перед переносом проекта:

1. git status
2. git log --oneline -10
3. обновить PROJECT_STATE
4. обновить CHANGELOG
5. обновить KNOWN_ISSUES
6. обновить HANDOFF
7. создать Git commit
8. push
9. использовать HEAD commit как точку восстановления
