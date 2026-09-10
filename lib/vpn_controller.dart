import 'dart:convert';
import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

import 'core/models/proxy_node.dart';
import 'core/state/failover_state_machine.dart';
import 'core/smart_connect/smart_connect_manager.dart';

enum VpnConnectionState {
  disconnected,
  connecting,
  connected,
  disconnecting,
  error,
}

class VpnController extends ChangeNotifier {
  static final VpnController _instance = VpnController._internal();

  factory VpnController() => _instance;

  VpnController._internal();

  static const MethodChannel _methodChannel =
      MethodChannel('vpn_channel');

  final StreamController<VpnConnectionState> _stateController =
      StreamController<VpnConnectionState>.broadcast();

  Stream<VpnConnectionState> get connectionStateStream =>
      _stateController.stream;

  VpnConnectionState _currentState =
      VpnConnectionState.disconnected;

  VpnConnectionState get currentState => _currentState;

  final List<ProxyNode> _nodePool = <ProxyNode>[];
  final SmartConnectManager _smartConnect = SmartConnectManager();

  List<ProxyNode> get nodePool =>
      List<ProxyNode>.unmodifiable(_nodePool);

  ProxyNode? _activeNode;

  ProxyNode? get activeNode => _activeNode;

  int _failuresCount = 0;

  int get failuresCount => _failuresCount;

  int _currentRtt = -1;

  int get currentRtt => _currentRtt;

  TunnelState get tunnelState {
    switch (_currentState) {
      case VpnConnectionState.connected:
        return TunnelState.active;

      case VpnConnectionState.connecting:
      case VpnConnectionState.disconnecting:
        return TunnelState.connecting;

      case VpnConnectionState.error:
        return TunnelState.error;

      case VpnConnectionState.disconnected:
        return TunnelState.disconnected;
    }
  }

  void _updateState(
    VpnConnectionState state,
  ) {
    if (_currentState == state) {
      return;
    }

    _currentState = state;

    if (!_stateController.isClosed) {
      _stateController.add(state);
    }

    notifyListeners();
  }

  static VpnConnectionState _parseNativeState(
    String? state,
  ) {
    switch (state?.toUpperCase()) {
      case 'CONNECTING':
        return VpnConnectionState.connecting;

      case 'CONNECTED':
        return VpnConnectionState.connected;

      case 'DISCONNECTING':
        return VpnConnectionState.disconnecting;

      case 'ERROR':
        return VpnConnectionState.error;

      case 'DISCONNECTED':
      default:
        return VpnConnectionState.disconnected;
    }
  }

  Future<VpnConnectionState> refreshState() async {
    try {
      final nativeState =
          await _methodChannel.invokeMethod<String>(
        'getVpnStatus',
      );

      final parsedState =
          _parseNativeState(nativeState);

      _updateState(parsedState);

      return parsedState;
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);

      throw StateError(
        'Failed to get VPN status: ${e.message}',
      );
    }
  }

  Future<void> initialize() async {
    await refreshState();
  }

  Future<void> connect(
    String configJson,
  ) async {
    if (
        _currentState ==
            VpnConnectionState.connected ||
        _currentState ==
            VpnConnectionState.connecting
    ) {
      return;
    }

    _updateState(
      VpnConnectionState.connecting,
    );

    try {
      final result =
          await _methodChannel.invokeMethod<String>(
        'startVpn',
        <String, dynamic>{
          'config': configJson,
        },
      );

      if (result == 'permission_requested') {
        return;
      }

      await refreshState();
    } on PlatformException catch (e) {
      _failuresCount++;
      _updateState(VpnConnectionState.error);

      throw StateError(
        'Failed to start VPN: ${e.message}',
      );
    }
  }

  Future<void> disconnect() async {
    if (
        _currentState ==
            VpnConnectionState.disconnected ||
        _currentState ==
            VpnConnectionState.disconnecting
    ) {
      return;
    }

    _updateState(
      VpnConnectionState.disconnecting,
    );

    try {
      await _methodChannel.invokeMethod<String>(
        'stopVpn',
      );

      await refreshState();
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);

      throw StateError(
        'Failed to stop VPN: ${e.message}',
      );
    }
  }

  String _buildSingBoxConfig() { return jsonEncode({'log': {'level': 'info'}, 'inbounds': [{'type': 'tun', 'tag': 'tun-in', 'address': ['172.19.0.1/30'], 'auto_route': true}], 'outbounds': [_activeNode!.toSingBoxOutboundJson(), {'type': 'direct', 'tag': 'direct'}], 'route': {'final': _activeNode!.id}}); }

  Future<void> toggleConnection() async {
    if (_nodePool.isEmpty) {
      return;
    }

    if (_currentState == VpnConnectionState.connected) {
      await disconnect();
      return;
    }

    final node = _activeNode ?? _nodePool.first;

    _activeNode = node;
    _currentRtt = node.latencyMs;
    notifyListeners();

    await connect(_buildSingBoxConfig());
  }

  void selectNode(ProxyNode node) {
    if (!_nodePool.any((item) => item.id == node.id)) {
      return;
    }

    _activeNode = node;
    _currentRtt = node.latencyMs;
    notifyListeners();
  }

  Future<void> loadSubscription(
    String input,
  ) async {
    final raw = input.trim();

    if (raw.isEmpty) {
      return;
    }

    final parsedNodes = <ProxyNode>[];

    if (raw.contains('vless://')) {
      for (final line in raw.split(RegExp(r'[\r\n]+'))) {
        final value = line.trim();

        if (!value.startsWith('vless://')) {
          continue;
        }

        final node = ProxyNode.parseVlessUri(value);

        if (node != null) {
          parsedNodes.add(node);
        }
      }
    } else {
      parsedNodes.addAll(
        ProxyNode.parseSubscription(raw),
      );
    }

    if (parsedNodes.isEmpty) {
      return;
    }

    _nodePool
      ..clear()
      ..addAll(parsedNodes);

    _activeNode = _nodePool.first;
    _currentRtt = _activeNode?.latencyMs ?? -1;

    notifyListeners();
  }

  @override
  void dispose() {
    _stateController.close();
    super.dispose();
  }
}
