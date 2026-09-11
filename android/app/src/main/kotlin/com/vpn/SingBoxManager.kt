package com.vpn

import android.content.Context
import android.util.Log
import io.nekohasekai.libbox.CommandServer
import io.nekohasekai.libbox.CommandServerHandler
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.OverrideOptions
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.SystemProxyStatus
import io.nekohasekai.libbox.SetupOptions

class SingBoxManager(
    private val context: Context,
    private val platform: PlatformInterface,
    private val onStage: (String) -> Unit = {}
) {
    private var commandServer: CommandServer? = null

    fun version(): String {
        return Libbox.version()
    }

    fun start(config: String) {
        if (commandServer != null) {
            throw IllegalStateException("sing-box is already running")
        }

        onStage("SETUP_OPTIONS")
        val setup = SetupOptions()
        setup.setBasePath(platformBasePath())
        setup.setWorkingPath(platformBasePath())
        setup.setTempPath(platformTempPath())
        setup.setFixAndroidStack(true)
        setup.setCommandServerListenPort(0)
        setup.setCommandServerSecret("")
        setup.setLogMaxLines(300)
        setup.setDebug(false)

        onStage("LIBBOX_SETUP")
        Libbox.setup(setup)

        onStage("HANDLER")
        val handler = object : CommandServerHandler {
            override fun getSystemProxyStatus(): SystemProxyStatus {
                val status = SystemProxyStatus()
                status.setAvailable(false)
                status.setEnabled(false)
                return status
            }

            override fun serviceReload() {
                Log.d(TAG, "serviceReload")
            }

            override fun serviceStop() {
                stop()
            }

            override fun setSystemProxyEnabled(enabled: Boolean) {
                Log.d(TAG, "setSystemProxyEnabled=$enabled")
            }

            override fun writeDebugMessage(message: String) {
                Log.d(TAG, message)
            }
        }

        onStage("CONFIG_CHECK")
        Libbox.checkConfig(config)

        onStage("COMMAND_SERVER")
        val server = Libbox.newCommandServer(handler, platform)

        onStage("SERVICE_START")
        val options = OverrideOptions()

        server.startOrReloadService(config, options)

        onStage("SERVICE_STARTED")
        commandServer = server
    }

    fun stop() {
        val server = commandServer ?: return

        try {
            server.closeService()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to stop sing-box", e)
        } finally {
            server.close()
            commandServer = null
        }
    }

    private fun platformBasePath(): String {
        return context.filesDir.absolutePath
    }

    private fun platformTempPath(): String {
        return context.cacheDir.absolutePath
    }

    companion object {
        private const val TAG = "SingBoxManager"
    }
}
