package com.vpn

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.IBinder

class CustomVpnService : VpnService() {

    override fun onCreate() {
        super.onCreate()
        val platform = AndroidPlatformInterface(this)
        singBoxManager = SingBoxManager(this, platform)
    }

    companion object {
        const val ACTION_START = "com.vpn.START"
        const val ACTION_STOP = "com.vpn.STOP"
        const val EXTRA_CONFIG = "VPN_CONFIG"

        private const val NOTIFICATION_CHANNEL_ID =
            "vpn_service_channel"

        private const val NOTIFICATION_ID = 1001

        @Volatile
        var currentState = VpnState.DISCONNECTED
            private set
    }

    private var vpnConfig: String? = null
    private lateinit var singBoxManager: SingBoxManager

    override fun onStartCommand(
        intent: Intent?,
        flags: Int,
        startId: Int
    ): Int {

        when (intent?.action) {

            ACTION_START -> {
                vpnConfig =
                    intent.getStringExtra(EXTRA_CONFIG)

                startVpn()
            }

            ACTION_STOP -> {
                stopVpn()
            }
        }

        return Service.START_STICKY
    }

    private fun startVpn() {

        if (
            currentState == VpnState.CONNECTED ||
            currentState == VpnState.CONNECTING
        ) {
            return
        }

        currentState = VpnState.CONNECTING

        try {

            startAsForegroundService()
            singBoxManager.start(vpnConfig ?: throw IllegalStateException("VPN config is missing"))

            /*
             * Пока здесь только TUN.
             *
             * На следующем этапе:
             *
             * SingBoxManager.start(
             *     config = vpnConfig,
             * )
             */

            currentState = VpnState.CONNECTED

        } catch (e: Exception) {

            e.printStackTrace()

            currentState = VpnState.ERROR

            stopVpn()
        }
    }

    private fun startAsForegroundService() {

        createNotificationChannel()

        val notification =
            Notification.Builder(
                this,
                NOTIFICATION_CHANNEL_ID
            )
                .setContentTitle("VPN is active")
                .setContentText("Native VPN tunnel is running")
                .setSmallIcon(
                    android.R.drawable.stat_sys_warning
                )
                .setOngoing(true)
                .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {

            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )

        } else {

            startForeground(
                NOTIFICATION_ID,
                notification
            )
        }
    }

    private fun createNotificationChannel() {

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            return
        }

        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "VPN Service",
            NotificationManager.IMPORTANCE_LOW
        )

        channel.description =
            "Foreground notification for VPN service"

        val manager =
            getSystemService(
                NotificationManager::class.java
            )

        manager.createNotificationChannel(channel)
    }

    private fun stopVpn() {
        currentState = VpnState.DISCONNECTING
        try {
            singBoxManager.stop()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            vpnConfig = null
            currentState = VpnState.DISCONNECTED
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
                stopForeground(STOP_FOREGROUND_REMOVE)
            } else {
                @Suppress("DEPRECATION")
                stopForeground(true)
            }
            stopSelf()
        }
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onBind(
        intent: Intent?
    ): IBinder? {
        return super.onBind(intent)
    }
}
