# CI VPN — DECISIONS

## DEC-001

Продолжать существующий Git repository.

Не пересоздавать проект.

## DEC-002

Сначала исправить local Android VPN data plane.

Cloudflare подключать после этого.

## DEC-003

Использовать единый Flutter ↔ Kotlin bridge.

## DEC-004

Native VPN service является источником истины для VPN state.

## DEC-005

TUN без traffic engine не считается полноценной VPN реализацией.

## DEC-006

Sing-box должен быть реально интегрирован до заявления о поддержке VLESS/Reality traffic.

## DEC-007

Cloudflare является infrastructure/control plane.

Не заменяет Sing-box.

## DEC-008

Secrets не коммитить и не включать в handoff files.

## DEC-009

После крупных этапов обновлять project documentation.

Git commit + docs являются checkpoint проекта.
