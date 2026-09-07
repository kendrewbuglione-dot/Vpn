import 'package:flutter/material.dart';

import '../../services/vpn_app_discovery_service.dart';

class InstalledVpnAppsScreen extends StatefulWidget {
  const InstalledVpnAppsScreen({super.key});

  @override
  State<InstalledVpnAppsScreen> createState() =>
      _InstalledVpnAppsScreenState();
}

class _InstalledVpnAppsScreenState
    extends State<InstalledVpnAppsScreen> {
  final VpnAppDiscoveryService _service =
      VpnAppDiscoveryService();

  List<VpnAppInfo> _apps = const <VpnAppInfo>[];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final apps = await _service.discover();

      if (!mounted) {
        return;
      }

      setState(() {
        _apps = apps;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) {
        return;
      }

      setState(() {
        _loading = false;
        _error = e.toString();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        title: const Text('VPN-приложения'),
        backgroundColor: const Color(0xFF0B0F19),
      ),
      body: RefreshIndicator(
        onRefresh: _load,
        child: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: [
          Text(
            'Ошибка обнаружения',
            style: const TextStyle(
              color: Colors.redAccent,
              fontSize: 18,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 12),
          Text(
            _error!,
            style: const TextStyle(
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 20),
          FilledButton(
            onPressed: _load,
            child: const Text('Повторить'),
          ),
        ],
      );
    }

    if (_apps.isEmpty) {
      return ListView(
        padding: const EdgeInsets.all(24),
        children: const [
          SizedBox(height: 80),
          Icon(
            Icons.vpn_lock_outlined,
            size: 72,
            color: Colors.white38,
          ),
          SizedBox(height: 20),
          Center(
            child: Text(
              'VPN-приложения не найдены',
              style: TextStyle(
                color: Colors.white70,
                fontSize: 18,
              ),
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _apps.length,
      itemBuilder: (context, index) {
        final app = _apps[index];

        return Card(
          color: const Color(0xFF131B2E),
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            leading: const Icon(
              Icons.vpn_lock_rounded,
              color: Colors.white70,
            ),
            title: Text(
              app.appName,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
            subtitle: Text(
              '${app.packageName}\n${app.serviceName}',
              style: const TextStyle(
                color: Colors.white38,
                fontSize: 12,
              ),
            ),
            trailing: app.launchable
                ? const Icon(
                    Icons.open_in_new,
                    color: Colors.white54,
                  )
                : const Icon(
                    Icons.block,
                    color: Colors.white24,
                  ),
          ),
        );
      },
    );
  }
}
