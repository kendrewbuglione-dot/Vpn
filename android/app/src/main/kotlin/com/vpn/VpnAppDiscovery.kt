package com.vpn

import android.content.Context
import android.content.Intent

object VpnAppDiscovery {

    fun discover(context: Context): List<Map<String, Any?>> {
        val packageManager = context.packageManager

        val vpnIntent = Intent("android.net.VpnService")
        val services = packageManager.queryIntentServices(vpnIntent, 0)

        return services
            .mapNotNull { info ->
                val serviceInfo = info.serviceInfo ?: return@mapNotNull null

                val packageName = serviceInfo.packageName
                val appInfo = serviceInfo.applicationInfo ?: return@mapNotNull null

                val launchIntent =
                    packageManager.getLaunchIntentForPackage(packageName)

                mapOf(
                    "packageName" to packageName,
                    "appName" to appInfo.loadLabel(packageManager).toString(),
                    "serviceName" to serviceInfo.name,
                    "launchable" to (launchIntent != null)
                )
            }
            .distinctBy { it["packageName"] }
            .sortedBy { it["appName"].toString().lowercase() }
    }
}
