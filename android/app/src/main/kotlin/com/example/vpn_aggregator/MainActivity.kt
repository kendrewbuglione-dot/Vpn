package com.example.vpn_aggregator

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import androidx.annotation.NonNull
import com.example.vpn_aggregator.service.CustomVpnService
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import org.json.JSONObject

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.vpn_aggregator/vpn_control"
    private val VPN_REQUEST_CODE = 2026
    private var pendingResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(@NonNull flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            when (call.method) {
                "startVpn" -> {
                    val prepareIntent = VpnService.prepare(this)
                    if (prepareIntent != null) {
                        pendingResult = result
                        startActivityForResult(prepareIntent, VPN_REQUEST_CODE)
                    } else {
                        startServiceAction(CustomVpnService.ACTION_START)
                        result.success(true)
                    }
                }
                "stopVpn" -> {
                    startServiceAction(CustomVpnService.ACTION_STOP)
                    result.success(true)
                }
                "updateOutbound" -> {
                    try {
                        val outboundMap = call.arguments as? Map<*, *>
                        if (outboundMap != null) {
                            val jsonString = JSONObject(outboundMap).toString()
                            // Вызов метода горячей подмены узла в ядре
                            try {
                                val coreClass = Class.forName("vpncore.Vpncore")
                                val method = coreClass.getMethod("hotSwapOutbound", String::class.java)
                                method.invoke(null, jsonString)
                            } catch (_: Exception) {}
                            result.success(true)
                        } else {
                            result.error("INVALID_ARGS", "Пустая конфигурация", null)
                        }
                    } catch (e: Exception) {
                        result.error("HOTSWAP_ERROR", e.localizedMessage, null)
                    }
                }
                "isRunning" -> {
                    result.success(CustomVpnService.isRunning.get())
                }
                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startServiceAction(action: String) {
        val intent = Intent(this, CustomVpnService::class.java).apply {
            this.action = action
        }
        startService(intent)
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                startServiceAction(CustomVpnService.ACTION_START)
                pendingResult?.success(true)
            } else {
                pendingResult?.error("PERMISSION_DENIED", "Доступ отклонен", null)
            }
            pendingResult = null
        }
    }
}
