package com.vpn

import io.flutter.plugin.common.EventChannel

object VpnStateMonitor : EventChannel.StreamHandler {
    private var eventSink: EventChannel.EventSink? = null

    override fun onListen(arguments: Object?, sink: EventChannel.EventSink?) {
        eventSink = sink
    }

    override fun onCancel(arguments: Object?) {
        eventSink = null
    }

    fun updateState(state: String) {
        try {
            eventSink?.success(state)
        } catch (e: Exception) {
            // Игнорируем ошибки, если стрим не активен
        }
    }
}
