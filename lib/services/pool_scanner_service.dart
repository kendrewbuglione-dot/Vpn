import 'dart:async';
import 'dart:io';

import '../core/models/proxy_node.dart';

class PoolScanResult {
  final ProxyNode node;
  final bool alive;
  final int latencyMs;
  final String status;
  final DateTime checkedAt;

  const PoolScanResult({
    required this.node,
    required this.alive,
    required this.latencyMs,
    required this.status,
    required this.checkedAt,
  });
}

class PoolScannerService {
  Duration timeout = const Duration(seconds: 4);

  Future<PoolScanResult> scanNode(ProxyNode node) async {
    final started = Stopwatch()..start();

    try {
      final socket = await Socket.connect(
        node.address,
        node.port,
        timeout: timeout,
      );

      started.stop();
      socket.destroy();

      final latency = started.elapsedMilliseconds;

      node.latencyMs = latency;
      node.isAlive = true;
      node.consecutiveFailures = 0;

      return PoolScanResult(
        node: node,
        alive: true,
        latencyMs: latency,
        status: 'TCP OK',
        checkedAt: DateTime.now(),
      );
    } on SocketException catch (e) {
      started.stop();

      node.latencyMs = -1;
      node.isAlive = false;
      node.consecutiveFailures++;

      return PoolScanResult(
        node: node,
        alive: false,
        latencyMs: -1,
        status: 'SOCKET: ${e.message}',
        checkedAt: DateTime.now(),
      );
    } on TimeoutException {
      started.stop();

      node.latencyMs = -1;
      node.isAlive = false;
      node.consecutiveFailures++;

      return PoolScanResult(
        node: node,
        alive: false,
        latencyMs: -1,
        status: 'TIMEOUT',
        checkedAt: DateTime.now(),
      );
    } catch (e) {
      started.stop();

      node.latencyMs = -1;
      node.isAlive = false;
      node.consecutiveFailures++;

      return PoolScanResult(
        node: node,
        alive: false,
        latencyMs: -1,
        status: 'ERROR: ${e.runtimeType}',
        checkedAt: DateTime.now(),
      );
    }
  }

  Future<List<PoolScanResult>> scanPool(
    List<ProxyNode> nodes, {
    int parallel = 8,
  }) async {
    final results = <PoolScanResult>[];

    for (var i = 0; i < nodes.length; i += parallel) {
      final batch = nodes.skip(i).take(parallel).toList();

      final batchResults = await Future.wait(
        batch.map(scanNode),
      );

      results.addAll(batchResults);
    }

    results.sort((a, b) {
      if (a.alive != b.alive) {
        return a.alive ? -1 : 1;
      }

      if (a.latencyMs < 0 && b.latencyMs < 0) {
        return 0;
      }

      if (a.latencyMs < 0) {
        return 1;
      }

      if (b.latencyMs < 0) {
        return -1;
      }

      return a.latencyMs.compareTo(b.latencyMs);
    });

    return results;
  }
}
