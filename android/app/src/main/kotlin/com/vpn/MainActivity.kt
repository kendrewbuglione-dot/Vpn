package com.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Build
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val CHANNEL = "vpn_channel"
    private val VPN_REQUEST_CODE = 1001
    private var pendingStart = false
    private var pendingConfig: String? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startVpn" -> {
                    val config = call.argument<String>("config")
                    if (config.isNullOrEmpty()) {
                        result.error("INVALID_CONFIG", "VPN configuration is empty", null)
                        return@setMethodCallHandler
                    }
                    val intent = VpnService.prepare(this)
                    if (intent != null) {
                        pendingStart = true
                        pendingConfig = config
                        startActivityForResult(intent, VPN_REQUEST_CODE)
                        result.success(mapOf("status" to "permission_requested"))
                    } else {
                        startVpnService(config)
                        result.success(mapOf("status" to "started"))
                    }
                }
                "stopVpn" -> {
                    val intent = Intent(this, CustomVpnService::class.java).apply {
                        action = CustomVpnService.ACTION_STOP
                    }
                    startService(intent)
                    result.success(mapOf("status" to "stopped"))
                }
                "getVpnStatus" -> result.success(CustomVpnService.currentState.name)
                else -> result.notImplemented()
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_REQUEST_CODE && pendingStart) {
            if (resultCode == Activity.RESULT_OK) {
                pendingConfig?.let { startVpnService(it) }
            }
            pendingStart = false
            pendingConfig = null
        }
    }

    private fun startVpnService(config: String) {
        val intent = Intent(this, CustomVpnService::class.java).apply {
            action = CustomVpnService.ACTION_START
            putExtra(CustomVpnService.EXTRA_CONFIG, config)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent)
        } else {
            startService(intent)
        }
    }
}
