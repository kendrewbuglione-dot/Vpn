package com.vpn.orchestrator

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log

class VpnOrchestratorService : Service() {
    private val TAG = "VpnOrchestrator"

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "Service Created: Ready to manage VPN processes")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        Log.d(TAG, "Command received: $action")
        
        // TODO: Добавить логику маршрутизации к сторонним VPN-клиентам
        
        return START_STICKY
    }

    override fun onBind(intent: Intent?): IBinder? {
        return null
    }
}
