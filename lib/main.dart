import 'package:flutter/material.dart';

import 'presentation/controllers/vpn_controller.dart';
import 'presentation/screens/minimal_home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const VpnApp());
}

class VpnApp extends StatefulWidget {
  const VpnApp({super.key});

  @override
  State<VpnApp> createState() => _VpnAppState();
}

class _VpnAppState extends State<VpnApp> {
  final VpnController _controller = VpnController();

  @override
  void initState() {
    super.initState();
    _initialize();
  }

  Future<void> _initialize() async {
    try {
      await _controller.initialize();
    } catch (_) {
      // Native VPN bridge may be unavailable during early startup.
      // The controller will expose the error state if needed.
    }
  }

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'VPN Aggregator',
      theme: ThemeData(
        brightness: Brightness.dark,
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF10B981),
          surface: Color(0xFF0B0F19),
        ),
      ),
      home: MinimalHomeScreen(
        controller: _controller,
      ),
    );
  }
}
