package com.example.vpn_aggregator.service

import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import android.os.Handler
import android.os.Looper

class VpnOrchestratorService : Service() {
    private val TAG = "VPN_ORCHESTRATOR"
    private val handler = Handler(Looper.getMainLooper())
    
    private val vpnPackages = listOf(
        "com.example.vpn.one",
        "com.example.vpn.two",
        "com.example.vpn.three"
    )
    private var currentIndex = 0
    private val rotationIntervalMillis = 30 * 60 * 1000L

    private val rotationRunnable = object : Runnable {
        override fun run() {
            rotateVpnClient()
            handler.postDelayed(this, rotationIntervalMillis)
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "Оркестратор запущен в фоновом режиме")
        handler.post(rotationRunnable)
        return START_STICKY
    }

    private fun rotateVpnClient() {
        val currentPackage = vpnPackages[currentIndex]
        Log.d(TAG, "Завершаем работу текущего VPN: $currentPackage")
        stopVpnPackage(currentPackage)

        currentIndex = (currentIndex + 1) % vpnPackages.size
        val nextPackage = vpnPackages[currentIndex]
        
        Log.d(TAG, "Запускаем следующий VPN из пула: $nextPackage")
        startVpnPackage(nextPackage)
    }

    private fun stopVpnPackage(packageName: String) {
        try {
            val process = Runtime.getRuntime().exec("su -c am force-stop $packageName")
            process.waitFor()
        } catch (e: Exception) {
            Log.e(TAG, "Не удалось остановить процесс", e)
        }
    }

    private fun startVpnPackage(packageName: String) {
        try {
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launchIntent)
            } else {
                Log.w(TAG, "Пакет не найден в системе: $packageName")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Ошибка запуска пакета $packageName", e)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        handler.removeCallbacks(rotationRunnable)
        Log.d(TAG, "Оркестратор остановлен")
    }
}
