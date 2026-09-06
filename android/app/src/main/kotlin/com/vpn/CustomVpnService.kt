package com.vpn

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor

class CustomVpnService : VpnService() {
    companion object {
        const val ACTION_START = "com.vpn.START"
        const val ACTION_STOP = "com.vpn.STOP"
        const val EXTRA_CONFIG = "VPN_CONFIG"
        @Volatile var currentState = VpnState.DISCONNECTED
    }

    private var tunInterface: ParcelFileDescriptor? = null
    private var vpnConfig: String? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_START -> {
                vpnConfig = intent.getStringExtra(EXTRA_CONFIG)
                startVpn()
            }
            ACTION_STOP -> stopVpn()
        }
        return START_STICKY
    }

    private fun startVpn() {
        if (currentState == VpnState.CONNECTED || currentState == VpnState.CONNECTING) return
        currentState = VpnState.CONNECTING
        try {
            startVpnInterface()
            currentState = VpnState.CONNECTED
        } catch (e: Exception) {
            currentState = VpnState.ERROR
            stopVpn()
        }
    }

    private fun startVpnInterface() {
        val builder = Builder()
        builder.setSession("Native VPN").setMtu(1500)
        builder.addAddress("10.0.0.2", 32)
        builder.addRoute("0.0.0.0", 0)
        builder.addDnsServer("1.1.1.1")
        
        tunInterface = builder.establish()
        if (tunInterface == null) throw IllegalStateException("Failed to establish VPN interface")
    }

    private fun stopVpn() {
        currentState = VpnState.DISCONNECTING
        try {
            tunInterface?.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            tunInterface = null
            currentState = VpnState.DISCONNECTED
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
        }
    }

    override fun onDestroy() {
        stopVpn()
        super.onDestroy()
    }

    override fun onRevoke() {
        stopVpn()
        super.onRevoke()
    }
}
