import 'package:flutter/material.dart';
import 'vpn_controller.dart';

void main() {
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'VPN Aggregator',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.deepPurple),
        useMaterial3: true,
      ),
      home: const VpnHomePage(),
    );
  }
}

class VpnHomePage extends StatefulWidget {
  const VpnHomePage({super.key});

  @override
  State<VpnHomePage> createState() => _VpnHomePageState();
}

class _VpnHomePageState extends State<VpnHomePage> {
  final VpnController _vpnController = VpnController();
  VpnConnectionState _state = VpnConnectionState.disconnected;
  
  final TextEditingController _configController = TextEditingController(
    text: '{\n  "log": { "level": "info" },\n  "inbounds": [{\n    "type": "tun",\n    "tag": "tun-in",\n    "inet4_address": "172.19.0.1/30",\n    "auto_route": true\n  }]\n}'
  );

  @override
  void initState() {
    super.initState();
    _vpnController.initialize();
    _vpnController.connectionStateStream.listen((state) {
      setState(() {
        _state = state;
      });
    });
  }

  @override
  void dispose() {
    _configController.dispose();
    _vpnController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    bool isConnected = _state == VpnConnectionState.connected;
    bool isConnecting = _state == VpnConnectionState.connecting;

    return Scaffold(
      appBar: AppBar(
        title: const Text('VPN Aggregator (Sing-box)'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Text(
              'Статус: ${_state.name.toUpperCase()}',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isConnected ? Colors.green : Colors.grey,
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: TextField(
                controller: _configController,
                maxLines: null,
                expands: true,
                decoration: const InputDecoration(
                  labelText: 'Конфигурация Sing-box / VLESS (JSON)',
                  border: OutlineInputBorder(),
                ),
                style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
              ),
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isConnected ? Colors.red : Colors.blue,
                  foregroundColor: Colors.white,
                ),
                onPressed: isConnecting
                    ? null
                    : () {
                        if (isConnected) {
                          _vpnController.disconnect();
                        } else {
                          _vpnController.connect(_configController.text);
                        }
                      },
                child: Text(
                  isConnected ? 'Отключить VPN' : 'Подключить VPN',
                  style: const TextStyle(fontSize: 18),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
