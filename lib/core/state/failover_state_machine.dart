import '../models/proxy_node.dart';

enum TunnelState {
  disconnected,
  connecting,
  active,
  failoverInProgress,
  error,
}

abstract class FailoverListener {
  void onStateChanged(TunnelState state);
  void onNodeRotated(ProxyNode newNode);
  void onMetricsUpdated(int currentRtt, int failuresCount);
}

class FailoverStateMachine {
  final List<ProxyNode> nodePool;
  final FailoverListener? listener;
  TunnelState currentState = TunnelState.disconnected;

  FailoverStateMachine({
    required this.nodePool,
    this.listener,
  });

  Future<void> start() async {
    currentState = TunnelState.connecting;
    listener?.onStateChanged(currentState);
    if (nodePool.isNotEmpty) {
      listener?.onNodeRotated(nodePool.first);
      currentState = TunnelState.active;
      listener?.onStateChanged(currentState);
    }
  }

  void stop() {
    currentState = TunnelState.disconnected;
    listener?.onStateChanged(currentState);
  }

  void transitionTo(TunnelState newState) {
    currentState = newState;
    listener?.onStateChanged(newState);
  }
}
