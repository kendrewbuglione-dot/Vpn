import 'package:flutter/services.dart';

class VpnAppInfo {
  final String packageName;
  final String appName;
  final String serviceName;
  final bool launchable;

  const VpnAppInfo({
    required this.packageName,
    required this.appName,
    required this.serviceName,
    required this.launchable,
  });

  factory VpnAppInfo.fromMap(Map<dynamic, dynamic> map) {
    return VpnAppInfo(
      packageName: map['packageName']?.toString() ?? '',
      appName: map['appName']?.toString() ?? '',
      serviceName: map['serviceName']?.toString() ?? '',
      launchable: map['launchable'] == true,
    );
  }
}

class VpnAppDiscoveryService {
  static const MethodChannel _channel = MethodChannel('vpn_channel');

  Future<List<VpnAppInfo>> discover() async {
    final result = await _channel.invokeMethod<List<dynamic>>(
      'getInstalledVpnApps',
    );

    if (result == null) {
      return const <VpnAppInfo>[];
    }

    return result
        .whereType<Map>()
        .map(VpnAppInfo.fromMap)
        .toList(growable: false);
  }
}
