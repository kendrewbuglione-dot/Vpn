package com.vpn

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.os.Process
import android.system.OsConstants
import io.nekohasekai.libbox.ConnectionOwner
import io.nekohasekai.libbox.InterfaceUpdateListener
import io.nekohasekai.libbox.LocalDNSTransport
import io.nekohasekai.libbox.NetworkInterfaceIterator
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.StringIterator
import io.nekohasekai.libbox.TunOptions
import io.nekohasekai.libbox.Notification
import io.nekohasekai.libbox.WIFIState
import java.net.InetSocketAddress
import java.net.NetworkInterface

class AndroidPlatformInterface(
    private val service: CustomVpnService
) : PlatformInterface {

    private val connectivity: ConnectivityManager
        get() = service.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager

    override fun usePlatformAutoDetectInterfaceControl(): Boolean = true

    override fun autoDetectInterfaceControl(fd: Int) {
        if (!service.protect(fd)) {
            throw IllegalStateException("Failed to protect VPN socket")
        }
    }

    override fun openTun(options: TunOptions): Int {
        val builder = service.Builder()
        builder.setSession("sing-box")
        builder.setMtu(options.getMTU())

        val addresses4 = options.getInet4Address()
        while (addresses4.hasNext()) {
            val prefix = addresses4.next()
            builder.addAddress(prefix.address(), prefix.prefix())
        }

        val addresses6 = options.getInet6Address()
        while (addresses6.hasNext()) {
            val prefix = addresses6.next()
            builder.addAddress(prefix.address(), prefix.prefix())
        }

        if (options.getAutoRoute()) {
            val routes4 = options.getInet4RouteAddress()
            while (routes4.hasNext()) {
                val route = routes4.next()
                builder.addRoute(route.address(), route.prefix())
            }

            val routes6 = options.getInet6RouteAddress()
            while (routes6.hasNext()) {
                val route = routes6.next()
                builder.addRoute(route.address(), route.prefix())
            }
        }

        val tun = builder.establish()
            ?: throw IllegalStateException("Failed to establish VPN interface")

        return tun.detachFd()
    }

    override fun useProcFS(): Boolean =
        Build.VERSION.SDK_INT < Build.VERSION_CODES.Q

    override fun findConnectionOwner(
        ipProtocol: Int,
        sourceAddress: String,
        sourcePort: Int,
        destinationAddress: String,
        destinationPort: Int
    ): ConnectionOwner {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            throw UnsupportedOperationException("Connection owner lookup requires Android 10+")
        }

        val uid = connectivity.getConnectionOwnerUid(
            ipProtocol,
            InetSocketAddress(sourceAddress, sourcePort),
            InetSocketAddress(destinationAddress, destinationPort)
        )

        if (uid == Process.INVALID_UID) {
            throw IllegalStateException("Connection owner not found")
        }

        val owner = ConnectionOwner()
        owner.userId = uid

        val packages = service.packageManager.getPackagesForUid(uid) ?: emptyArray()
        owner.userName = packages.firstOrNull() ?: ""
        owner.setAndroidPackageNames(
            object : StringIterator {
                private val iterator = packages.iterator()

                override fun hasNext(): Boolean = iterator.hasNext()
                override fun len(): Int = packages.size
                override fun next(): String = iterator.next()
            }
        )

        return owner
    }

    private var defaultNetworkCallback: ConnectivityManager.NetworkCallback? = null

    override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        closeDefaultInterfaceMonitor(listener)

        val request = android.net.NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_RESTRICTED)
            .build()

        val callback = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: android.net.Network) {
                updateDefaultInterface(listener, network)
            }

            override fun onCapabilitiesChanged(
                network: android.net.Network,
                networkCapabilities: NetworkCapabilities
            ) {
                updateDefaultInterface(listener, network)
            }

            override fun onLinkPropertiesChanged(
                network: android.net.Network,
                linkProperties: android.net.LinkProperties
            ) {
                updateDefaultInterface(listener, network)
            }

            override fun onLost(network: android.net.Network) {
                listener.updateDefaultInterface("", 0, false, false)
            }
        }

        defaultNetworkCallback = callback

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            connectivity.registerBestMatchingNetworkCallback(
                request,
                callback,
                service.mainExecutor
            )
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            connectivity.requestNetwork(
                request,
                callback,
                service.mainExecutor
            )
        } else {
            connectivity.registerDefaultNetworkCallback(callback)
        }
    }

    override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
        val callback = defaultNetworkCallback ?: return
        runCatching {
            connectivity.unregisterNetworkCallback(callback)
        }
        defaultNetworkCallback = null
    }

    private fun updateDefaultInterface(
        listener: InterfaceUpdateListener,
        network: android.net.Network
    ) {
        val capabilities = connectivity.getNetworkCapabilities(network) ?: return
        val linkProperties = connectivity.getLinkProperties(network) ?: return
        val name = linkProperties.interfaceName ?: return

        val interfaceIndex =
            runCatching {
                NetworkInterface.getByName(name)?.index ?: 0
            }.getOrDefault(0)

        listener.updateDefaultInterface(
            name,
            interfaceIndex,
            true,
            capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
        )
    }

    override fun getInterfaces(): NetworkInterfaceIterator {
        val interfaces = NetworkInterface.getNetworkInterfaces()?.toList() ?: emptyList()

        return object : NetworkInterfaceIterator {
            private val iterator = interfaces.iterator()

            override fun hasNext(): Boolean = iterator.hasNext()

            override fun next(): io.nekohasekai.libbox.NetworkInterface {
                val networkInterface = iterator.next()
                val result = io.nekohasekai.libbox.NetworkInterface()

                result.index = networkInterface.index
                result.name = networkInterface.name

                runCatching {
                    result.mtu = networkInterface.mtu
                }

                result.addresses = object : StringIterator {
                    private val values = networkInterface.interfaceAddresses.map { it.toString() }.iterator()

                    override fun hasNext(): Boolean = values.hasNext()
                    override fun len(): Int = networkInterface.interfaceAddresses.size
                    override fun next(): String = values.next()
                }

                var flags = 0
                if (networkInterface.isUp) flags = flags or OsConstants.IFF_UP
                if (networkInterface.isLoopback) flags = flags or OsConstants.IFF_LOOPBACK
                if (networkInterface.isPointToPoint) flags = flags or OsConstants.IFF_POINTOPOINT
                if (networkInterface.supportsMulticast()) flags = flags or OsConstants.IFF_MULTICAST

                result.flags = flags
                result.type = detectInterfaceType(networkInterface.name)
                result.metered = true

                return result
            }
        }
    }

    override fun underNetworkExtension(): Boolean = false

    override fun includeAllNetworks(): Boolean = false

    override fun clearDNSCache() {
    }

    override fun readWIFIState(): WIFIState? {
        val wifiManager =
            service.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
                ?: return null

        @Suppress("DEPRECATION")
        val info = wifiManager.connectionInfo ?: return null

        var ssid = info.ssid ?: ""
        if (ssid == "<unknown ssid>") return WIFIState("", "")

        if (ssid.length >= 2 && ssid.startsWith("\"") && ssid.endsWith("\"")) {
            ssid = ssid.substring(1, ssid.length - 1)
        }

        @Suppress("DEPRECATION")
        return WIFIState(ssid, info.bssid ?: "")
    }

    override fun localDNSTransport(): LocalDNSTransport? = null

    override fun systemCertificates(): StringIterator = object : StringIterator {
        override fun hasNext(): Boolean = false
        override fun len(): Int = 0
        override fun next(): String = throw NoSuchElementException()
    }

    override fun sendNotification(notification: Notification) {
        // Notifications are not required for the initial VPN core integration.
    }

    private fun detectInterfaceType(name: String): Int {
        val lower = name.lowercase()

        return when {
            lower.startsWith("wlan") || lower.startsWith("wifi") ->
                io.nekohasekai.libbox.Libbox.InterfaceTypeWIFI

            lower.startsWith("rmnet") ||
                lower.startsWith("ccmni") ||
                lower.startsWith("wwan") ->
                io.nekohasekai.libbox.Libbox.InterfaceTypeCellular

            lower.startsWith("eth") ->
                io.nekohasekai.libbox.Libbox.InterfaceTypeEthernet

            else ->
                io.nekohasekai.libbox.Libbox.InterfaceTypeOther
        }
    }
}
