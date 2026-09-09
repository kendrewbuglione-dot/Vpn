import '../isolates/isolate_benchmark_pool.dart';
import '../models/proxy_node.dart';

class SmartConnectManager {
  Future<ProxyNode?> findBestNode(List<ProxyNode> nodes) async {
    if (nodes.isEmpty) {
      return null;
    }

    final results = await IsolateBenchmarkPool.runBenchmark(nodes);

    for (final result in results) {
      ProxyNode? node;
      for (final item in nodes) {
        if (item.id == result.nodeId) {
          node = item;
          break;
        }
      }

      if (node == null) {
        continue;
      }

      node.latencyMs = result.latencyMs;
      node.isAlive = result.isAlive;

      if (result.isAlive) {
        node.consecutiveFailures = 0;
      } else {
        node.consecutiveFailures++;
      }
    }

    final aliveNodes = nodes.where((node) => node.isAlive).toList();

    if (aliveNodes.isEmpty) {
      return null;
    }

    aliveNodes.sort((a, b) {
      final latencyCompare = a.latencyMs.compareTo(b.latencyMs);

      if (latencyCompare != 0) {
        return latencyCompare;
      }

      return a.consecutiveFailures.compareTo(b.consecutiveFailures);
    });

    return aliveNodes.first;
  }
}
