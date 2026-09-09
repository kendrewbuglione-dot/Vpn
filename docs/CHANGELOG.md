# CI VPN — CHANGELOG

## 2026-09-07 — Architecture audit checkpoint

- Проведён аудит Git repository.
- Подтверждён Flutter frontend.
- Подтверждён Kotlin Android VPN service.
- Подтверждён Android TUN interface.
- Подтверждён VLESS URI parser.
- Подтверждён subscription parser.
- Подтверждена генерация Sing-box outbound JSON.
- Обнаружено отсутствие реальной интеграции Sing-box core.
- Обнаружено несовпадение MethodChannel.
- Подтверждено, что failover является skeleton.
- Проверен GitHub Actions debug APK pipeline.
- Зафиксирована архитектурная точка восстановления.
- Создана документация для continuation/handoff.

## Recent commits

aa787d1
ci: continue build after Dart analyzer diagnostics

adaa2e4
fix: prepare CI build and VPN service integration

542379e
fix: resolve kotlin compiler errors with explicit imports and restore verbose logging

ef2c7e7
feat: integrate GPT architecture for VpnService, MainActivity, and Dart bridge

5b5e161
fix: inject missing UI resources and styles to resolve AAPT2 compiler crash

## 2026-09-08 — Native sing-box libbox integration checkpoint

- Продолжена реальная интеграция sing-box core в Android VPN приложение.
- Подтверждено наличие `ProxyNode.toSingBoxOutboundJson()`.
- Flutter `VpnController` переведён с пустого JSON `{}` на генерацию sing-box конфигурации через `_buildSingBoxConfig()`.
- Добавлен `dart:convert` для `jsonEncode`.
- Добавлена проверка отсутствия активного узла перед подключением.
- Конфигурация включает TUN inbound, выбранный outbound и direct outbound.
- Создан `SingBoxManager` для управления native libbox.
- `SingBoxManager` использует `Libbox.setup()` и `CommandServer`.
- Для Android путей используются `context.filesDir.absolutePath` и `context.cacheDir.absolutePath`.
- API libbox исследован через `javap`.
- Подтверждены API: `PlatformInterface`, `TunOptions`, `CommandServer`, `CommandServerHandler`, `SetupOptions`.
- Начата реализация `AndroidPlatformInterface`.
- Следующий критический этап: реализовать `PlatformInterface.openTun(TunOptions)`.
- Архитектурный риск: необходимо исключить двойное создание TUN интерфейса.
- Целевая схема: sing-box вызывает Android `PlatformInterface.openTun()`, а Android `VpnService.Builder.establish()` возвращает file descriptor ядру.
- Текущий статус: native libbox integration in progress.
