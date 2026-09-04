import "package:flutter/material.dart";
import "package:flutter/services.dart";
import "package:flutter/foundation.dart";
import "../../core/models/proxy_node.dart";
import "../../core/state/failover_state_machine.dart";

class VpnController extends ChangeNotifier implements FailoverListener {
  static const MethodChannel _channel = MethodChannel("com.example.vpn_aggregator/vpn_control");

  FailoverStateMachine? _stateMachine;
  List<ProxyNode> _nodePool = [
    ProxyNode(
      id: "node-1",
      remark: "Бесплатный VLESS - Нидерланды",
      server: "nl.freefq.com",
      port: 443,
      protocol: "vless",
      uuid: "e1d88bb0-0193-4b6a-9d6e-821b36e81a34",
      flow: "xtls-rprx-vision",
      security: "reality",
      sni: "yahoo.com",
      pbk: "1Ab2Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St1Uv2Wx3Yz4=",
      latencyMs: 42,
    ),
    ProxyNode(
      id: "node-2",
      remark: "Бесплатный VLESS - Германия",
      server: "de.freefq.com",
      port: 443,
      protocol: "vless",
      uuid: "f2e99cc1-1204-5c7b-ae7f-932c47f92b45",
      flow: "xtls-rprx-vision",
      security: "reality",
      sni: "speedtest.net",
      pbk: "2Bc3De4Fg5Hi6Jk7Lm8No9Pq0Rs1Tu2Vw3Xy4Za5=",
      latencyMs: 58,
    ),
    ProxyNode(
      id: "node-3",
      remark: "Бесплатный SS - Финляндия",
      server: "fi.freefq.com",
      port: 8443,
      protocol: "shadowsocks",
      uuid: "chacha20-ietf-poly1305:secretpassword",
      latencyMs: 65,
    )
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
      _currentRtt = _activeNode?.latencyMs ?? 45;
      notifyListeners();
      return;
    }

    if (_nodePool.isEmpty) return;

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
    _currentRtt = newNode.latencyMs;
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
