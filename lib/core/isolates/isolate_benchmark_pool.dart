import 'dart:async';
import 'dart:io';
import 'dart:isolate';
import 'package:flutter/services.dart';
import '../models/proxy_node.dart';

class BenchmarkTask {
  final List<ProxyNode> nodes;
  final RootIsolateToken rootIsolateToken;
  final Duration timeout;

  BenchmarkTask({
    required this.nodes,
    required this.rootIsolateToken,
    this.timeout = const Duration(seconds: 3),
  });
}

class BenchmarkResult {
  final String nodeId;
  final int latencyMs;
  final bool isAlive;

  BenchmarkResult({
    required this.nodeId,
    required this.latencyMs,
    required this.isAlive,
  });
}

class IsolateBenchmarkPool {
  static void _workerEntryPoint(SendPort sendPort) {
    final receivePort = ReceivePort();
    sendPort.send(receivePort.sendPort);

    receivePort.listen((message) async {
      if (message is BenchmarkTask) {
        BackgroundIsolateBinaryMessenger.ensureInitialized(message.rootIsolateToken);

        final results = <BenchmarkResult>[];

        for (final node in message.nodes) {
          final stopwatch = Stopwatch()..start();
          Socket? socket;
          try {
            socket = await Socket.connect(
              node.address,
              node.port,
              timeout: message.timeout,
            );
            stopwatch.stop();

            results.add(
              BenchmarkResult(
                nodeId: node.id,
                latencyMs: stopwatch.elapsedMilliseconds,
                isAlive: true,
              ),
            );
          } catch (_) {
            stopwatch.stop();
            results.add(
              BenchmarkResult(
                nodeId: node.id,
                latencyMs: -1,
                isAlive: false,
              ),
            );
          } finally {
            socket?.destroy();
          }
        }

        sendPort.send(results);
      }
    });
  }

  static Future<List<BenchmarkResult>> runBenchmark(List<ProxyNode> nodes) async {
    final rootToken = RootIsolateToken.instance;
    if (rootToken == null) {
      throw StateError("RootIsolateToken недоступен");
    }

    final receivePort = ReceivePort();
    final isolate = await Isolate.spawn(_workerEntryPoint, receivePort.sendPort);

    final completer = Completer<List<BenchmarkResult>>();
    SendPort? workerSendPort;

    receivePort.listen((dynamic message) {
      if (message is SendPort) {
        workerSendPort = message;
        workerSendPort!.send(
          BenchmarkTask(
            nodes: nodes,
            rootIsolateToken: rootToken,
          ),
        );
      } else if (message is List<BenchmarkResult>) {
        completer.complete(message);
        receivePort.close();
        isolate.kill(priority: Isolate.immediate);
      }
    });

    return completer.future;
  }
}
