package com.vpn

import io.nekohasekai.libbox.Libbox

class SingBoxManager {

    fun version(): String {
        return Libbox.version()
    }
}
