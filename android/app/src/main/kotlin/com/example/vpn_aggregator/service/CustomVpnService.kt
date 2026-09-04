package com.example.vpn_aggregator.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import androidx.core.app.NotificationCompat
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

class CustomVpnService : VpnService(), SocketProtector {

    companion object {
        const val ACTION_START = "com.example.vpn_aggregator.START"
        const val ACTION_STOP = "com.example.vpn_aggregator.STOP"
        private const val NOTIFICATION_CHANNEL_ID = "vpn_channel"
        private const val NOTIFICATION_ID = 1001

        @Volatile
        var instance: CustomVpnService? = null
            private set

        val isRunning = AtomicBoolean(false)
    }

    private var tunInterface: ParcelFileDescriptor? = null

    override fun onCreate() {
        super.onCreate()
        instance = this
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> startVpnTunnel()
            ACTION_STOP -> stopVpnTunnel()
        }
        return START_NOT_STICKY
    }

    private fun startVpnTunnel() {
        if (isRunning.get()) return

        createNotificationChannel()
        val notification = buildForegroundNotification("VPN активен")
        startForeground(NOTIFICATION_ID, notification)

        try {
            val builder = Builder().apply {
                setSession("CustomSingBoxVpn")
                setMtu(1408)
                addAddress("172.19.0.1", 30)
                addDnsServer("1.1.1.1")
                addDnsServer("8.8.8.8")
                addRoute("0.0.0.0", 0)
            }

            tunInterface = builder.establish()
            if (tunInterface == null) {
                stopVpnTunnel()
                return
            }

            isRunning.set(true)
        } catch (e: Exception) {
            e.printStackTrace()
            stopVpnTunnel()
        }
    }

    private fun stopVpnTunnel() {
        try {
            tunInterface?.close()
            tunInterface = null
        } catch (e: IOException) {
            e.printStackTrace()
        } finally {
            isRunning.set(false)
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    override fun protectSocket(socketFd: Int): Boolean {
        if (socketFd <= 0) return false
        return try {
            protect(socketFd)
        } catch (e: Exception) {
            false
        }
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "VPN Подключение",
                NotificationManager.IMPORTANCE_LOW
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }
    }

    private fun buildForegroundNotification(statusText: String): Notification {
        val intent = packageManager.getLaunchIntentForPackage(packageName)
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("VPN Защита")
            .setContentText(statusText)
            .setSmallIcon(applicationInfo.icon)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        stopVpnTunnel()
        instance = null
        super.onDestroy()
    }
}
