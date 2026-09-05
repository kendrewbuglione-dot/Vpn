package com.vpn

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*

class CustomVpnService : VpnService() {

    private var vpnInterface: ParcelFileDescriptor? = null
    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)

    companion object {
        const val ACTION_START = "com.vpn.START"
        const val ACTION_STOP = "com.vpn.STOP"
        const val EXTRA_CONFIG = "config_json"
        private const val NOTIFICATION_CHANNEL_ID = "vpn_channel_01"
        private const val NOTIFICATION_ID = 101
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        when (action) {
            ACTION_START -> {
                val configJson = intent.getStringExtra(EXTRA_CONFIG)
                startVpnTunnel(configJson)
            }
            ACTION_STOP -> stopVpnTunnel()
        }
        return START_NOT_STICKY
    }

    private fun startVpnTunnel(configJson: String?) {
        val notificationIntent = Intent(this, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, notificationIntent, PendingIntent.FLAG_IMMUTABLE
        )

        val stopIntent = Intent(this, CustomVpnService::class.java).apply {
            action = ACTION_STOP
        }
        val stopPendingIntent = PendingIntent.getService(
            this, 1, stopIntent, PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("VPN-Агрегатор")
            .setContentText("Туннель защищает ваше соединение")
            .setSmallIcon(android.R.drawable.ic_menu_upload)
            .setContentIntent(pendingIntent)
            .addAction(android.R.drawable.ic_menu_close_clear_cancel, "Отключить", stopPendingIntent)
            .setOngoing(true)
            .build()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        serviceScope.launch {
            try {
                val builder = Builder()
                builder.setSession("VpnAggregator Session")
                builder.addAddress("172.19.0.1", 30)
                builder.addRoute("0.0.0.0", 0)
                builder.addDnsServer("8.8.8.8")
                builder.setMtu(1500)

                vpnInterface = builder.establish()

                if (vpnInterface != null) {
                    Log.d("CustomVpnService", "TUN интерфейс успешно создан, fd: ${vpnInterface!!.fd}")
                } else {
                    stopVpnTunnel()
                }
            } catch (e: Exception) {
                Log.e("CustomVpnService", "Ошибка запуска туннеля", e)
                stopVpnTunnel()
            }
        }
    }

    private fun stopVpnTunnel() {
        serviceScope.launch {
            try {
                vpnInterface?.close()
                vpnInterface = null
            } catch (e: Exception) {
                Log.e("CustomVpnService", "Ошибка закрытия дескриптора", e)
            }
            stopForeground(true)
            stopSelf()
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VPN Service Status",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        serviceJob.cancel()
        super.onDestroy()
    }
}
