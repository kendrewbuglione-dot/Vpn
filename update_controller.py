path = "lib/presentation/controllers/vpn_controller.dart"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Старый вариант метода
old_code = """  Future<void> toggleConnection() async {
    if (_tunnelState == TunnelState.active || _tunnelState == TunnelState.connecting) {
      _tunnelState = TunnelState.disconnected;
      notifyListeners();
      try { await _channel.invokeMethod("stopVpn"); } catch (e) {}
    } else {
      _tunnelState = TunnelState.active;
      notifyListeners();
      try { await _channel.invokeMethod("startVpn"); } catch (e) {}
    }
  }"""

# Новый вариант с ожиданием статуса и обработкой ошибок
new_code = """  Future<void> toggleConnection() async {
    if (_tunnelState == TunnelState.active || _tunnelState == TunnelState.connecting) {
      _tunnelState = TunnelState.disconnected;
      notifyListeners();
      try {
        await _channel.invokeMethod("stopVpn");
      } catch (e) {
        print("Error stopping VPN: $e");
      }
    } else {
      _tunnelState = TunnelState.connecting;
      notifyListeners();
      try {
        final bool? success = await _channel.invokeMethod<bool>("startVpn");
        if (success == true) {
          _tunnelState = TunnelState.active;
        } else {
          _tunnelState = TunnelState.disconnected;
        }
      } catch (e) {
        print("Error starting VPN: $e");
        _tunnelState = TunnelState.disconnected;
      }
      notifyListeners();
    }
  }"""

if old_code in content:
    content = content.replace(old_code, new_code)
    with open(path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Успех: метод toggleConnection обновлен!")
else:
    print("Ошибка: старый код не найден, проверяем альтернативный формат...")
    # Если формат чуть отличается, заменим через поиск ключевой строки
    if "Future<void> toggleConnection()" in content:
        print("Найдена сигнатура, заменим вручную или через замену блока.")
