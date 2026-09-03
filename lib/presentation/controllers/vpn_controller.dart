import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../core/models/proxy_node.dart';
import '../../core/state/failover_state_machine.dart';

class VpnController extends ChangeNotifier implements FailoverListener {
  static const MethodChannel _channel = MethodChannel('com.example.vpn_aggregator/vpn_control');

  FailoverStateMachine? _stateMachine;
  List<ProxyNode> _nodePool = [];

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
    if (_nodePool.isEmpty) return;

    try {
      final bool started = await _channel.invokeMethod('startVpn') ?? false;
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
    _stateMachine?.stop();
    _stateMachine = null;
    await _channel.invokeMethod('stopVpn');
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
    _channel.invokeMethod('updateOutbound', newNode.toSingBoxOutboundJson());
    notifyListeners();
  }

  @override
  void onMetricsUpdated(int currentRtt, int failuresCount) {
    _currentRtt = currentRtt;
    _failuresCount = failuresCount;
    notifyListeners();
  }
}
