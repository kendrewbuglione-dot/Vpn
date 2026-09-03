import 'package:flutter/material.dart';
import 'presentation/controllers/vpn_controller.dart';
import 'presentation/screens/minimal_home_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final vpnController = VpnController();
  runApp(VpnAggregatorApp(controller: vpnController));
}

class VpnAggregatorApp extends StatelessWidget {
  final VpnController controller;

  const VpnAggregatorApp({super.key, required this.controller});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VPN',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF0B0F19),
      ),
      home: MinimalHomeScreen(controller: controller),
    );
  }
}
