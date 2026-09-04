import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter/foundation.dart";
import "../../core/models/proxy_node.dart";
import "../../core/state/failover_state_machine.dart";

class VpnController extends ChangeNotifier implements FailoverListener {
  static const MethodChannel _channel = MethodChannel("com.example.vpn_aggregator/vpn_control");

  FailoverStateMachine? _stateMachine;
  List<ProxyNode> _nodePool = [
    ProxyNode.parseVlessUri("vless://e1d88bb0-0193-4b6a-9d6e-821b36e81a34@nl.freefq.com:443?security=reality&sni=yahoo.com&fp=chrome&pbk=1Ab2Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St1Uv2Wx3Yz4=&type=tcp&flow=xtls-rprx-vision#Нидерланды (Бесплатно)")!,
    ProxyNode.parseVlessUri("vless://f2e99cc1-1204-5c7b-ae7f-932c47f92b45@de.freefq.com:443?security=reality&sni=speedtest.net&fp=chrome&pbk=2Bc3De4Fg5Hi6Jk7Lm8No9Pq0Rs1Tu2Vw3Xy4Za5=&type=tcp&flow=xtls-rprx-vision#Германия (Бесплатно)")!,
    ProxyNode.parseVlessUri("vless://a3b88dd2-3405-6d8c-bf8a-843d58a03c56@fi.freefq.com:443?security=reality&sni=cloudflare.com&fp=chrome&pbk=3Cd4Ef5Gh6Ij7Kl8Mn9Op0Qr1St2Uv3Wx4Yz5Ab6=&type=tcp&flow=xtls-rprx-vision#Финляндия (Бесплатно)")!,
  ];

  TunnelState _tunnelState = TunnelState.disconnected;
  ProxyNode? _activeNode;
  int _currentRtt = -1;
  int _failuresCount = 0;

  TunnelState get tunnelState => _tunnelState;
  ProxyNode? get activeNode => _activeNode;
  int get currentRtt => _currentRtt;
  int get failuresCount => _failuresCount;
  List<ProxyNode> get nodePool => _nodePool;
  bool get isConnected => _tunnelState == TunnelState.active;

  void loadSubscription(String base64Data) {
    _nodePool = ProxyNode.parseSubscription(base64Data);
    notifyListeners();
  }

  Future<void> toggleConnection() async {
    if (isConnected || _tunnelState == TunnelState.connecting) {
      await _disconnect();
    } else {
      await _connect();
    }
  }

  Future<void> _connect() async {
    if (kIsWeb) {
      _tunnelState = TunnelState.active;
      _activeNode = _nodePool.isNotEmpty ? _nodePool.first : null;
      _currentRtt = 45;
      notifyListeners();
      return;
    }

    // if (_nodePool.isEmpty) return; -- bypassed for direct vpn start

    try {
      final bool started = await _channel.invokeMethod("startVpn") ?? false;
      if (started) {
        _stateMachine = FailoverStateMachine(
          nodePool: _nodePool,
          listener: this,
        );
        await _stateMachine!.start();
      }
    } on PlatformException catch (e) {
      debugPrint("VPN activation error: ${e.message}");
      _tunnelState = TunnelState.error;
      notifyListeners();
    }
  }

  Future<void> _disconnect() async {
    if (kIsWeb) {
      _tunnelState = TunnelState.disconnected;
      _currentRtt = -1;
      _failuresCount = 0;
      notifyListeners();
      return;
    }

    _stateMachine?.stop();
    _stateMachine = null;
    await _channel.invokeMethod("stopVpn");
    _tunnelState = TunnelState.disconnected;
    _currentRtt = -1;
    _failuresCount = 0;
    notifyListeners();
  }

  @override
  void onStateChanged(TunnelState state) {
    _tunnelState = state;
    notifyListeners();
  }

  @override
  void onNodeRotated(ProxyNode newNode) {
    _activeNode = newNode;
    _currentRtt = 45;
    _channel.invokeMethod("updateOutbound", newNode.toSingBoxOutboundJson());
    notifyListeners();
  }

  @override
  void onMetricsUpdated(int currentRtt, int failuresCount) {
    _currentRtt = currentRtt;
    _failuresCount = failuresCount;
    notifyListeners();
  }
}
