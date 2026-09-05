import 'package:flutter/services.dart';
import 'dart:async';

enum VpnConnectionState { disconnected, connecting, connected, disconnecting, error }

class VpnController {
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
  }

  Future<void> connect(String configJson) async {
    if (_currentState == VpnConnectionState.connected ||
        _currentState == VpnConnectionState.connecting) return;
    
    _updateState(VpnConnectionState.connecting);
    try {
      await _methodChannel.invokeMethod('startVpn', {'configJson': configJson});
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);
    }
  }

  Future<void> disconnect() async {
    if (_currentState == VpnConnectionState.disconnected) return;
    
    _updateState(VpnConnectionState.disconnecting);
    try {
      await _methodChannel.invokeMethod('stopVpn');
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);
    }
  }

  void dispose() {
    _stateController.close();
  }
}
