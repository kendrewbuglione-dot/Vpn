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

  @override
  void initState() {
    super.initState();
    _vpnController.connectionStateStream.listen((state) {
      setState(() {
        _state = state;
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    bool isConnected = _state == VpnConnectionState.connected;
    bool isConnecting = _state == VpnConnectionState.connecting;

    return Scaffold(
      appBar: AppBar(
        title: const Text('VPN Aggregator (Sing-box)'),
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Статус: ${_state.name.toUpperCase()}',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: isConnected ? Colors.green : Colors.grey,
              ),
            ),
            const SizedBox(height: 40),
            ElevatedButton.styleFrom(
              backgroundColor: isConnected ? Colors.red : Colors.blue,
            ).let((_) => ElevatedButton(
              onPressed: isConnecting
                  ? null
                  : () {
                      if (isConnected) {
                        _vpnController.disconnect();
                      } else {
                        // Передаем базовый тестовый JSON конфигурации
                        _vpnController.connect('{"test": "config"}');
                      }
                    },
              child: Text(isConnected ? 'Отключить VPN' : 'Подключить VPN'),
            )),
          ],
        ),
      ),
    );
  }
}

extension on ButtonStyle {
  Widget let(Widget Function(ButtonStyle style) builder) => builder(this);
}
