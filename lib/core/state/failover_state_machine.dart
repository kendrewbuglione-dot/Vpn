enum TunnelState {
  disconnected,
  connecting,
  active,
  failoverInProgress,
  error,
}

abstract class FailoverListener {
  void onStateChanged(TunnelState state);
}

class FailoverStateMachine {
  TunnelState currentState = TunnelState.disconnected;
  final FailoverListener? listener;

  FailoverStateMachine({this.listener});

  void transitionTo(TunnelState newState) {
    currentState = newState;
    listener?.onStateChanged(newState);
  }
}
