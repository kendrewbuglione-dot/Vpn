package com.vpn

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.os.Bundle
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {

    companion object {
        private const val CHANNEL = "vpn_channel"
        private const val VPN_REQUEST_CODE = 1001
    }

    private var pendingConfig: String? = null

    override fun configureFlutterEngine(
        flutterEngine: FlutterEngine
    ) {
        super.configureFlutterEngine(flutterEngine)

        MethodChannel(
            flutterEngine.dartExecutor.binaryMessenger,
            CHANNEL
        ).setMethodCallHandler { call, result ->

            when (call.method) {

                "startVpn" -> {

                    val config =
                        call.argument<String>("config")

                    if (config.isNullOrBlank()) {

                        result.error(
                            "INVALID_CONFIG",
                            "VPN configuration is empty",
                            null
                        )

                        return@setMethodCallHandler
                    }

                    pendingConfig = config

                    val prepareIntent =
                        VpnService.prepare(this)

                    if (prepareIntent != null) {

                        startActivityForResult(
                            prepareIntent,
                            VPN_REQUEST_CODE
                        )

                        result.success(
                            "permission_requested"
                        )

                    } else {

                        startVpnService(config)

                        result.success(
                            "started"
                        )
                    }
                }

                "stopVpn" -> {

                    stopVpnService()

                    result.success(
                        "stopped"
                    )
                }

                "getVpnStatus" -> {

                    result.success(
                        CustomVpnService
                            .currentState
                            .name
                    )
                }

                else -> {
                    result.notImplemented()
                }
            }
        }
    }

    private fun startVpnService(
        config: String
    ) {

        val intent = Intent(
            this,
            CustomVpnService::class.java
        )

        intent.action =
            CustomVpnService.ACTION_START

        intent.putExtra(
            CustomVpnService.EXTRA_CONFIG,
            config
        )

        startForegroundService(intent)
    }

    private fun stopVpnService() {

        val intent = Intent(
            this,
            CustomVpnService::class.java
        )

        intent.action =
            CustomVpnService.ACTION_STOP

        startService(intent)
    }

    @Deprecated("Deprecated in Android API")
    override fun onActivityResult(
        requestCode: Int,
        resultCode: Int,
        data: Intent?
    ) {
        super.onActivityResult(
            requestCode,
            resultCode,
            data
        )

        if (requestCode != VPN_REQUEST_CODE) {
            return
        }

        val config = pendingConfig
        pendingConfig = null

        if (
            resultCode == Activity.RESULT_OK &&
            !config.isNullOrBlank()
        ) {
            startVpnService(config)
        }
    }
}
