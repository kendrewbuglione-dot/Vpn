import 'package:flutter/services.dart';

class NativeVpnService {
  static const MethodChannel _channel = MethodChannel('vpn_channel');

  static Future<Map<dynamic, dynamic>?> start(String config) async {
    return await _channel.invokeMethod('startVpn', {'config': config});
  }

  static Future<Map<dynamic, dynamic>?> stop() async {
    return await _channel.invokeMethod('stopVpn');
  }

  static Future<String?> getStatus() async {
    return await _channel.invokeMethod<String>('getVpnStatus');
  }
}
