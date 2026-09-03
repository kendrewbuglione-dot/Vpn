import 'dart:convert';

enum SecurityType { reality, tls, none }

class ProxyNode {
  final String id;
  final String remark;
  final String address;
  final int port;
  final String uuid;
  final SecurityType security;
  final String? sni;
  final String? publicKey;
  final String? shortId;
  final String? fingerprint;
  final String? flow;
  final String transport;
  
  int latencyMs;
  bool isAlive;
  int consecutiveFailures;

  ProxyNode({
    required this.id,
    required this.remark,
    required this.address,
    required this.port,
    required this.uuid,
    required this.security,
    this.sni,
    this.publicKey,
    this.shortId,
    this.fingerprint,
    this.flow,
    this.transport = 'tcp',
    this.latencyMs = -1,
    this.isAlive = true,
    this.consecutiveFailures = 0,
  });

  static ProxyNode? parseVlessUri(String uriString) {
    try {
      final uri = Uri.parse(uriString.trim());
      if (uri.scheme != 'vless') return null;

      final uuid = uri.userInfo;
      final host = uri.host;
      final port = uri.port;
      final remark = uri.fragment.isNotEmpty 
          ? Uri.decodeComponent(uri.fragment) 
          : '$host:$port';

      final query = uri.queryParameters;
      final securityStr = query['security']?.toLowerCase() ?? 'none';
      
      SecurityType security;
      if (securityStr == 'reality') {
        security = SecurityType.reality;
      } else if (securityStr == 'tls') {
        security = SecurityType.tls;
      } else {
        security = SecurityType.none;
      }

      if (security == SecurityType.reality && (query['pbk'] == null || query['pbk']!.isEmpty)) {
        return null;
      }

      return ProxyNode(
        id: '${host}_${port}_${DateTime.now().microsecondsSinceEpoch}',
        remark: remark,
        address: host,
        port: port,
        uuid: uuid,
        security: security,
        sni: query['sni'],
        publicKey: query['pbk'],
        shortId: query['sid'],
        fingerprint: query['fp'] ?? 'chrome',
        flow: query['flow'],
        transport: query['type'] ?? 'tcp',
      );
    } catch (_) {
      return null;
    }
  }

  static List<ProxyNode> parseSubscription(String rawBase64) {
    try {
      final normalized = base64.normalize(rawBase64.replaceAll(RegExp(r'\s+'), ''));
      final decoded = utf8.decode(base64.decode(normalized));
      final lines = const LineSplitter().convert(decoded);

      final nodes = <ProxyNode>[];
      for (final line in lines) {
        if (line.startsWith('vless://')) {
          final node = parseVlessUri(line);
          if (node != null) nodes.add(node);
        }
      }
      return nodes;
    } catch (_) {
      return [];
    }
  }

  Map<String, dynamic> toSingBoxOutboundJson() {
    final Map<String, dynamic> outbound = {
      'type': 'vless',
      'tag': id,
      'server': address,
      'server_port': port,
      'uuid': uuid,
      'network': transport,
    };

    if (flow != null && flow!.isNotEmpty) {
      outbound['flow'] = flow;
    }

    if (security == SecurityType.reality) {
      outbound['tls'] = {
        'enabled': true,
        'server_name': sni ?? address,
        'utls': {'enabled': true, 'fingerprint': fingerprint ?? 'chrome'},
        'reality': {
          'enabled': true,
          'public_key': publicKey,
          'short_id': shortId ?? '',
        }
      };
    } else if (security == SecurityType.tls) {
      outbound['tls'] = {
        'enabled': true,
        'server_name': sni ?? address,
        'utls': {'enabled': true, 'fingerprint': fingerprint ?? 'chrome'},
      };
    }

    return outbound;
  }
}
