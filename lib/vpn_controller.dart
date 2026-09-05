import 'package:flutter/services.dart';
import 'dart:async';

enum VpnConnectionState { disconnected, connecting, connected, disconnecting, error }

class VpnController {
  static final VpnController _instance = VpnController._internal();
  factory VpnController() => _instance;
  VpnController._internal();

  static const MethodChannel _methodChannel = MethodChannel('com.vpn/control');
  
  final StreamController<VpnConnectionState> _stateController = 
      StreamController<VpnConnectionState>.broadcast();
        
  Stream<VpnConnectionState> get connectionStateStream => _stateController.stream;
  VpnConnectionState _currentState = VpnConnectionState.disconnected;
  VpnConnectionState get currentState => _currentState;

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
      _updateState(VpnConnectionState.connected);
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);
      print("Failed to start VPN: '${e.message}'.");
    }
  }

  Future<void> disconnect() async {
    if (_currentState == VpnConnectionState.disconnected) return;
    _updateState(VpnConnectionState.disconnecting);
    try {
      await _methodChannel.invokeMethod('stopVpn');
      _updateState(VpnConnectionState.disconnected);
    } on PlatformException catch (e) {
      _updateState(VpnConnectionState.error);
      print("Failed to stop VPN: '${e.message}'.");
    }
  }

  void dispose() {
    _stateController.close();
  }
}
