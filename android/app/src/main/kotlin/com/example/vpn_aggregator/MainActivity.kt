package com.example.vpn_aggregator

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.util.Log
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel
import com.example.vpn_aggregator.service.CustomVpnService

class MainActivity: FlutterActivity() {
    private val CHANNEL = "com.example.vpn_aggregator/vpn_control"
    private val VPN_REQUEST_CODE = 2026
    private var pendingResult: MethodChannel.Result? = null
    private val TAG = "VPN_MAIN"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, CHANNEL).setMethodCallHandler { call, result ->
            Log.d(TAG, "Получен вызов метода из Flutter: ${call.method}")
            when (call.method) {
                "startVpn" -> {
                    val configJson = call.argument<String>("configJson") ?: "{}"
                    Log.d(TAG, "Запрос старта VPN с конфигурацией length: ${configJson.length}")
                    
                    val prepareIntent = VpnService.prepare(this)
                    if (prepareIntent != null) {
                        Log.d(TAG, "Требуется системное разрешение VPN. Запускаем диалог...")
                        pendingResult = result
                        try {
                            startActivityForResult(prepareIntent, VPN_REQUEST_CODE)
                        } catch (e: Exception) {
                            Log.e(TAG, "Ошибка запуска системного диалога VPN", e)
                            pendingResult = null
                            result.error("VPN_PREPARE_ERROR", e.message, null)
                        }
                    } else {
                        Log.d(TAG, "Разрешения уже есть. Запускаем сервис напрямую.")
                        startVpnServiceDirectly(configJson)
                        result.success(true)
                    }
                }
                "stopVpn" -> {
                    Log.d(TAG, "Запрос остановки VPN")
                    val serviceIntent = Intent(this, CustomVpnService::class.java).apply {
                        action = CustomVpnService.ACTION_STOP
                    }
                    startService(serviceIntent)
                    result.success(true)
                }
                else -> {
                    Log.w(TAG, "Неизвестный метод: ${call.method}")
                    result.notImplemented()
                }
            }
        }
    }

    private fun startVpnServiceDirectly(configJson: String) {
        val serviceIntent = Intent(this, CustomVpnService::class.java).apply {
            action = CustomVpnService.ACTION_START
            putExtra("config_json", configJson)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        Log.d(TAG, "onActivityResult requestCode: $requestCode, resultCode: $resultCode")
        if (requestCode == VPN_REQUEST_CODE) {
            if (resultCode == Activity.RESULT_OK) {
                Log.d(TAG, "Пользователь дал разрешение на VPN!")
                startVpnServiceDirectly("{}")
                pendingResult?.success(true)
            } else {
                Log.w(TAG, "Пользователь отклонил запрос разрешения VPN")
                pendingResult?.success(false)
            }
            pendingResult = null
        }
    }
}
