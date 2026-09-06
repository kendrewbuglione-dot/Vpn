import 'package:flutter/services.dart';

class NativeVpnService {
  static const MethodChannel _channel =
      MethodChannel('vpn_channel');

  static Future<String?> startVpn(
    String config,
  ) async {
    return _channel.invokeMethod<String>(
      'startVpn',
      <String, dynamic>{
        'config': config,
      },
    );
  }

  static Future<String?> stopVpn() async {
    return _channel.invokeMethod<String>(
      'stopVpn',
    );
  }

  static Future<String?> getStatus() async {
    return _channel.invokeMethod<String>(
      'getVpnStatus',
    );
  }
}
