package com.vpn

import android.content.Intent
import androidx.annotation.NonNull
import com.vpn.orchestrator.VpnOrchestratorService
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.vpn.orchestrator/control"

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startVpnService" -> {
                    val intent = Intent(this, VpnOrchestratorService::class.java)
                    intent.action = "START_ORCHESTRATOR"
                    startService(intent)
                    result.success("Service Started")
                }
                "stopVpnService" -> {
                    val intent = Intent(this, VpnOrchestratorService::class.java)
                    stopService(intent)
                    result.success("Service Stopped")
                }
                else -> result.notImplemented()
            }
        }
    }
}
