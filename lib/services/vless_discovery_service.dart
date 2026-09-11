import 'dart:async';
import 'dart:convert';
import 'dart:io';

import '../core/models/proxy_node.dart';

class VlessDiscoveryService {
  static const List<String> sources = [
    'https://raw.githubusercontent.com/mehrtat/vless-collector/main/vless.txt',
    'https://raw.githubusercontent.com/Baarcuda/vpn-configs/master/top100-vless.txt',
  ];

  Future<List<ProxyNode>> discover() async {
    final client = HttpClient();
    final allNodes = <ProxyNode>[];

    try {
      for (final source in sources) {
        try {
          final nodes = await _loadSource(client, source);
          allNodes.addAll(nodes);
        } catch (_) {
          // Один упавший источник не должен ломать остальные.
        }
      }
    } finally {
      client.close(force: true);
    }

    return _deduplicate(allNodes);
  }

  Future<List<ProxyNode>> _loadSource(
    HttpClient client,
    String source,
  ) async {
    final request = await client
        .getUrl(Uri.parse(source))
        .timeout(const Duration(seconds: 15));

    request.headers.set(
      HttpHeaders.userAgentHeader,
      'VPN-Aggregator/1.0',
    );

    final response = await request.close().timeout(
          const Duration(seconds: 20),
        );

    if (response.statusCode != HttpStatus.ok) {
      throw HttpException(
        'HTTP ${response.statusCode}',
        uri: Uri.parse(source),
      );
    }

    final body = await response
        .transform(utf8.decoder)
        .join();

    return _parseBody(body);
  }

  List<ProxyNode> _parseBody(String body) {
    final nodes = <ProxyNode>[];

    // Сначала пробуем обычный список vless://.
    for (final line in const LineSplitter().convert(body)) {
      final value = line.trim();

      if (!value.startsWith('vless://')) {
        continue;
      }

      final node = ProxyNode.parseVlessUri(value);

      if (node != null) {
        nodes.add(node);
      }
    }

    if (nodes.isNotEmpty) {
      return nodes;
    }

    // Если это Base64 subscription.
    final decodedNodes = ProxyNode.parseSubscription(body);

    if (decodedNodes.isNotEmpty) {
      return decodedNodes;
    }

    // Иногда Base64 содержит пробелы/переносы строк.
    try {
      final normalized = body.replaceAll(RegExp(r'\s+'), '');
      final decoded = utf8.decode(base64.decode(normalized));

      for (final line in const LineSplitter().convert(decoded)) {
        final value = line.trim();

        if (!value.startsWith('vless://')) {
          continue;
        }

        final node = ProxyNode.parseVlessUri(value);

        if (node != null) {
          nodes.add(node);
        }
      }
    } catch (_) {
      // Источник не распознан — просто пропускаем его.
    }

    return nodes;
  }

  List<ProxyNode> _deduplicate(List<ProxyNode> nodes) {
    final result = <ProxyNode>[];
    final seen = <String>{};

    for (final node in nodes) {
      final key = [
        node.address,
        node.port,
        node.uuid,
        node.security.name,
        node.sni ?? '',
        node.publicKey ?? '',
        node.shortId ?? '',
      ].join('|');

      if (seen.add(key)) {
        result.add(node);
      }
    }

    return result;
  }
}
