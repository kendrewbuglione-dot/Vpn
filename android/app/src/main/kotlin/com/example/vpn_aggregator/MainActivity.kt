package com.example.vpn_aggregator

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.example.vpn_aggregator.service.CustomVpnService

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.vpn_aggregator/vpn_control"
    private val VPN_REQUEST_CODE = 2026
    private var pendingResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startVpn" -> {
                    val intent = VpnService.prepare(this)
                    if (intent != null) {
                        pendingResult = result
                        startActivityForResult(intent, VPN_REQUEST_CODE)
                    } else {
                        startVpnAction(CustomVpnService.ACTION_START)
                        result.success(true)
                    }
                }
                "stopVpn" -> {
                    startVpnAction(CustomVpnService.ACTION_STOP)
                    result.success(true)
                }
                "updateOutbound" -> {
                    result.success(true)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun startVpnAction(action: String) {
        val intent = Intent(this, CustomVpnService::class.java).apply {
            this.action = action
        }
        startService(intent)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                startVpnAction(CustomVpnService.ACTION_START)
                pendingResult?.success(true)
            } else {
                pendingResult?.success(false)
            }
            pendingResult = null
        }
    }
}
