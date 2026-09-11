import 'package:flutter/material.dart';

import '../../core/state/failover_state_machine.dart';
import '../controllers/vpn_controller.dart';
import 'servers_screen.dart';
import 'installed_vpn_apps_screen.dart';

class MinimalHomeScreen extends StatefulWidget {
  final VpnController controller;

  const MinimalHomeScreen({
    super.key,
    required this.controller,
  });

  @override
  State<MinimalHomeScreen> createState() => _MinimalHomeScreenState();
}

class _MinimalHomeScreenState extends State<MinimalHomeScreen> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_refresh);
  }

  @override
  void dispose() {
    widget.controller.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() => setState(() {});

  Color _accentColor(TunnelState state) {
    switch (state) {
      case TunnelState.active:
        return const Color(0xFF10B981);
      case TunnelState.connecting:
      case TunnelState.failoverInProgress:
        return const Color(0xFFF59E0B);
      case TunnelState.error:
        return const Color(0xFFEF4444);
      case TunnelState.disconnected:
        return const Color(0xFF334155);
    }
  }

  String _statusTitle(TunnelState state) {
    switch (state) {
      case TunnelState.active:
        return 'Защита включена';
      case TunnelState.connecting:
        return 'Подключение...';
      case TunnelState.failoverInProgress:
        return 'Оптимизация узла...';
      case TunnelState.error:
        return 'Ошибка сети';
      case TunnelState.disconnected:
        return 'Не защищено';
    }
  }

  void _openDiagnosticsModal() {
    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(
          top: Radius.circular(24),
        ),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Техническая информация',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 16),
            _diagRow(
              'Задержка (RTT)',
              widget.controller.currentRtt >= 0
                  ? '${widget.controller.currentRtt} мс'
                  : '—',
            ),
            _diagRow(
              'Ошибки / Порог',
              '${widget.controller.failuresCount} / 3',
            ),
            _diagRow(
              'Протокол',
              'VLESS-Reality / sing-box',
            ),
            _diagRow(
              'Системный сокет',
              'Защищен (VpnService.protect)',
            ),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _diagRow(String title, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            title,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 14,
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white70,
              fontSize: 14,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final tunnelState = controller.tunnelState;
    final accent = _accentColor(tunnelState);
    final isOnline = tunnelState == TunnelState.active;

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
                vertical: 12,
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  IconButton(
                    icon: const Icon(
                      Icons.info_outline_rounded,
                      color: Colors.white38,
                    ),
                    tooltip: 'Диагностика',
                    onPressed: _openDiagnosticsModal,
                  ),
                  const Text(
                    'VPN',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w700,
                      letterSpacing: 1,
                    ),
                  ),
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: const Icon(
                          Icons.apps_rounded,
                          color: Colors.white70,
                        ),
                        tooltip: 'VPN-приложения',
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => const InstalledVpnAppsScreen(),
                            ),
                          );
                        },
                      ),
                      IconButton(
                        icon: const Icon(
                          Icons.add_link_rounded,
                          color: Colors.white70,
                        ),
                        tooltip: 'Подписки',
                        onPressed: () {
                          Navigator.of(context).push(
                            MaterialPageRoute(
                              builder: (_) => ServersScreen(
                                controller: controller,
                              ),
                            ),
                          );
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const Spacer(flex: 2),
            Text(
              _statusTitle(tunnelState),
              style: TextStyle(
                color: accent,
                fontSize: 26,
                fontWeight: FontWeight.w800,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              isOnline
                  ? 'Трафик зашифрован'
                  : 'Нажмите кнопку для старта',
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 14,
              ),
            ),
            const Spacer(flex: 2),
            Center(
              child: GestureDetector(
                onTap: () => controller.toggleConnection(),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 350),
                  curve: Curves.easeInOut,
                  width: 210,
                  height: 210,
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: const Color(0xFF131B2E),
                    border: Border.all(
                      color: isOnline
                          ? accent
                          : const Color(0xFF1E293B),
                      width: 4,
                    ),
                    boxShadow: [
                      if (isOnline)
                        BoxShadow(
                          color: accent.withAlpha(90),
                          blurRadius: 40,
                          spreadRadius: 8,
                        ),
                    ],
                  ),
                  child: Center(
                    child: Icon(
                      Icons.power_settings_new_rounded,
                      size: 96,
                      color: isOnline
                          ? accent
                          : Colors.white38,
                    ),
                  ),
                ),
              ),
            ),
            const Spacer(flex: 3),
            Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 24,
                vertical: 20,
              ),
              child: InkWell(
                borderRadius: BorderRadius.circular(20),
                onTap: () {
                  Navigator.of(context).push(
                    MaterialPageRoute(
                      builder: (_) => ServersScreen(
                        controller: controller,
                      ),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 16,
                  ),
                  decoration: BoxDecoration(
                    color: const Color(0xFF131B2E),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: const Color(0xFF1E293B),
                    ),
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(
                          Icons.public_rounded,
                          color: Colors.white70,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Локация подключения',
                              style: TextStyle(
                                color: Colors.white38,
                                fontSize: 12,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              controller.activeNode?.remark ??
                                  'Автовыбор (Быстрый сервер)',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      if (controller.currentRtt > 0)
                        Padding(
                          padding:
                              const EdgeInsets.only(right: 8),
                          child: Text(
                            '${controller.currentRtt} мс',
                            style: TextStyle(
                              color: controller.currentRtt > 600
                                  ? Colors.amberAccent
                                  : const Color(0xFF10B981),
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      const Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white38,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );

                                                                                                      const SizedBox(height: 12),

                                                                                                      Padding(
                                                                                                        padding: const EdgeInsets.symmetric(horizontal: 24),
                                                                                                        child: Container(
                                                                                                          width: double.infinity,
                                                                                                          padding: const EdgeInsets.all(16),
                                                                                                          decoration: BoxDecoration(
                                                                                                            color: const Color(0xFF111827),
                                                                                                            borderRadius: BorderRadius.circular(16),
                                                                                                            border: Border.all(
                                                                                                              color: const Color(0xFF1E293B),
                                                                                                            ),
                                                                                                          ),
                                                                                                          child: Column(
                                                                                                            crossAxisAlignment: CrossAxisAlignment.start,
                                                                                                            children: [
                                                                                                              Row(
                                                                                                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                                                                                children: [
                                                                                                                  const Text(
                                                                                                                    'Сканер пула',
                                                                                                                    style: TextStyle(
                                                                                                                      color: Colors.white,
                                                                                                                      fontSize: 15,
                                                                                                                      fontWeight: FontWeight.w700,
                                                                                                                    ),
                                                                                                                  ),
                                                                                                                  Text(
                                                                                                                    '${controller.poolScanResults.where((r) => r.alive).length}/${controller.poolScanResults.length} живых',
                                                                                                                    style: const TextStyle(
                                                                                                                      color: Colors.white54,
                                                                                                                      fontSize: 12,
                                                                                                                    ),
                                                                                                                  ),
                                                                                                                ],
                                                                                                              ),
                                                                                                              const SizedBox(height: 10),
                                                                                                              SizedBox(
                                                                                                                width: double.infinity,
                                                                                                                child: ElevatedButton.icon(
                                                                                                                  onPressed: controller.isPoolScanning
                                                                                                                      ? null
                                                                                                                      : () => controller.scanPool(),
                                                                                                                  icon: controller.isPoolScanning
                                                                                                                      ? const SizedBox(
                                                                                                                          width: 16,
                                                                                                                          height: 16,
                                                                                                                          child: CircularProgressIndicator(strokeWidth: 2),
                                                                                                                        )
                                                                                                                      : const Icon(Icons.radar_rounded),
                                                                                                                  label: Text(
                                                                                                                    controller.isPoolScanning
                                                                                                                        ? 'Сканирование...'
                                                                                                                        : 'Сканировать пул',
                                                                                                                  ),
                                                                                                                ),
                                                                                                              ),
                                                                                                              if (controller.poolScanResults.isNotEmpty) ...[
                                                                                                                const SizedBox(height: 10),
                                                                                                                ...controller.poolScanResults.take(5).map(
                                                                                                                  (result) => Padding(
                                                                                                                    padding: const EdgeInsets.symmetric(vertical: 3),
                                                                                                                    child: Row(
                                                                                                                      children: [
                                                                                                                        Icon(
                                                                                                                          result.alive
                                                                                                                              ? Icons.check_circle_rounded
                                                                                                                              : Icons.cancel_rounded,
                                                                                                                          size: 16,
                                                                                                                          color: result.alive
                                                                                                                              ? const Color(0xFF10B981)
                                                                                                                              : const Color(0xFFEF4444),
                                                                                                                        ),
                                                                                                                        const SizedBox(width: 8),
                                                                                                                        Expanded(
                                                                                                                          child: Text(
                                                                                                                            result.node.remark,
                                                                                                                            maxLines: 1,
                                                                                                                            overflow: TextOverflow.ellipsis,
                                                                                                                            style: const TextStyle(
                                                                                                                              color: Colors.white70,
                                                                                                                              fontSize: 12,
                                                                                                                            ),
                                                                                                                          ),
                                                                                                                        ),
                                                                                                                        Text(
                                                                                                                          result.alive
                                                                                                                              ? '${result.latencyMs} ms'
                                                                                                                              : result.status,
                                                                                                                          style: TextStyle(
                                                                                                                            color: result.alive
                                                                                                                                ? const Color(0xFF10B981)
                                                                                                                                : Colors.white38,
                                                                                                                            fontSize: 11,
                                                                                                                          ),
                                                                                                                        ),
                                                                                                                      ],
                                                                                                                    ),
                                                                                                                  ),
                                                                                                                ),
                                                                                                              ],
                                                                                                            ],
                                                                                                          ),
                                                                                                        ),
                                                                                                      ),

  }
}
