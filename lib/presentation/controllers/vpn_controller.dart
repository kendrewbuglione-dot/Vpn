import 'package:flutter/services.dart';
import 'package:flutter/foundation.dart';
import 'dart:async';

enum VpnConnectionState { disconnected, connecting, connected, disconnecting, error }

enum VpnTunnelState { active, inactive, connecting }

enum VpnSecurityType { reality, standard, none }

class VpnNode {
  final String id;
  final String name;
  final String address;
  final int port;
  final String transport;
  final String remark;
  final VpnSecurityType security;
  final int latencyMs;

  VpnNode({
    required this.id,
    required this.name,
    this.address = '127.0.0.1',
    this.port = 443,
    this.transport = 'tcp',
    this.remark = '',
    this.security = VpnSecurityType.none,
    this.latencyMs = 45,
  });
}

class VpnController extends ChangeNotifier {
  static final VpnController instance = VpnController._internal();
  factory VpnController() => instance;
  VpnController._internal();

  static const MethodChannel _methodChannel =
      MethodChannel('com.example.vpn_aggregator/vpn_control');
  static const EventChannel _eventChannel =
      EventChannel('com.example.vpn_aggregator/events');

  final StreamController<VpnConnectionState> _stateController =
      StreamController<VpnConnectionState>.broadcast();

  Stream<VpnConnectionState> get connectionStateStream => _stateController.stream;
  VpnConnectionState _currentState = VpnConnectionState.disconnected;
  VpnConnectionState get currentState => _currentState;

  int _failuresCount = 0;
  int get failuresCount => _failuresCount;

  VpnTunnelState get tunnelState {
    switch (_currentState) {
      case VpnConnectionState.connected:
        return VpnTunnelState.active;
      case VpnConnectionState.connecting:
      case VpnConnectionState.disconnecting:
        return VpnTunnelState.connecting;
      default:
        return VpnTunnelState.inactive;
    }
  }

  final VpnNode? _activeNode = VpnNode(id: '1', name: 'Автовыбор (Быстрый сервер)', remark: 'Основной');
  VpnNode? get activeNode => _activeNode;

  final List<VpnNode> _nodePool = [
    VpnNode(id: '1', name: 'Автовыбор (Быстрый сервер)', remark: 'Основной', latencyMs: 35),
    VpnNode(id: '2', name: 'Сервер резервный', remark: 'Запасной', latencyMs: 70)
  ];
  List<VpnNode> get nodePool => _nodePool;

  final int _currentRtt = 45;
  int get currentRtt => _currentRtt;

  void initialize() {
    _eventChannel.receiveBroadcastStream().listen(
      _onNativeEventReceived,
      onError: (error) {
        _updateState(VpnConnectionState.error);
      },
    );
    _updateState(VpnConnectionState.disconnected);
  }

  void _onNativeEventReceived(dynamic event) {
    if (event is String) {
      switch (event) {
        case "CONNECTED":
          _updateState(VpnConnectionState.connected);
          break;
        case "DISCONNECTED":
          _updateState(VpnConnectionState.disconnected);
          break;
        default:
          if (event.startsWith("ERROR")) {
            _updateState(VpnConnectionState.error);
          }
      }
    }
  }

  void _updateState(VpnConnectionState state) {
    if (_currentState == state) return;
    _currentState = state;
    _stateController.sink.add(state);
    notifyListeners();
  }

  Future<void> toggleConnection() async {
    if (_currentState == VpnConnectionState.connected) {
      await disconnect();
    } else {
      await connect('{}');
    }
  }

  Future<void> loadSubscription(String url) async {}

  Future<void> connect(String configJson) async {
    if (_currentState == VpnConnectionState.connected ||
        _currentState == VpnConnectionState.connecting) return;
    
    _updateState(VpnConnectionState.connecting);
    try {
      await _methodChannel.invokeMethod('startVpn', {'configJson': configJson});
    } on PlatformException {
      _failuresCount++;
      _updateState(VpnConnectionState.error);
    }
  }

  Future<void> disconnect() async {
    if (_currentState == VpnConnectionState.disconnected) return;
    
    _updateState(VpnConnectionState.disconnecting);
    try {
      await _methodChannel.invokeMethod('stopVpn');
    } on PlatformException {
      _updateState(VpnConnectionState.error);
    }
  }

  @override
  void dispose() {
    _stateController.close();
    super.dispose();
  }
}
