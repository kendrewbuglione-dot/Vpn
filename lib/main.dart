import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

void main() {
  runApp(const VpnApp());
}

class VpnApp extends StatelessWidget {
  const VpnApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      home: const VpnControlScreen(),
    );
  }
}

class VpnControlScreen extends StatefulWidget {
  const VpnControlScreen({Key? key}) : super(key: key);

  @override
  State<VpnControlScreen> createState() => _VpnControlScreenState();
}

class _VpnControlScreenState extends State<VpnControlScreen> {
  static const platform = MethodChannel('com.vpn.orchestrator/control');
  String _status = 'VPN Disconnected';

  Future<void> _manageVpn(String command) async {
    try {
      final String result = await platform.invokeMethod(command);
      setState(() {
        _status = result;
      });
    } on PlatformException catch (e) {
      setState(() {
        _status = "Error: '${e.message}'.";
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('VPN Orchestrator')),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('Status: $_status', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 30),
            ElevatedButton(
              onPressed: () => _manageVpn('startVpnService'),
              child: const Text('Start VPN Service'),
            ),
            const SizedBox(height: 15),
            ElevatedButton(
              onPressed: () => _manageVpn('stopVpnService'),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
              child: const Text('Stop VPN Service'),
            ),
          ],
        ),
      ),
    );
  }
}
