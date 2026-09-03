package com.example.vpn_aggregator.service

interface SocketProtector {
    fun protectSocket(socketFd: Int): Boolean
}
