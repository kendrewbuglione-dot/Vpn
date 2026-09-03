import 'package:flutter/material.dart';
import '../controllers/vpn_controller.dart';
import '../../core/models/proxy_node.dart';

class ServersScreen extends StatefulWidget {
  final VpnController controller;

  const ServersScreen({super.key, required this.controller});

  @override
  State<ServersScreen> createState() => _ServersScreenState();
}

class _ServersScreenState extends State<ServersScreen> {
  final TextEditingController _importController = TextEditingController();

  void _showImportDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text("Импорт подписки", style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: _importController,
          maxLines: 4,
          style: const TextStyle(color: Colors.white, fontSize: 13),
          decoration: const InputDecoration(
            hintText: "Вставьте Base64 строку или vless:// ссылки",
            hintStyle: TextStyle(color: Colors.grey),
            border: OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text("Отмена", style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF10B981)),
            onPressed: () {
              widget.controller.loadSubscription(_importController.text);
              _importController.clear();
              Navigator.of(ctx).pop();
              setState(() {});
            },
            child: const Text("Загрузить"),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final nodes = widget.controller.nodePool;

    return Scaffold(
      backgroundColor: const Color(0xFF0B0F19),
      appBar: AppBar(
        title: const Text("Доступные серверы"),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add_link_rounded),
            tooltip: "Добавить подписку",
            onPressed: _showImportDialog,
          )
        ],
      ),
      body: nodes.isEmpty
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.cloud_off_rounded, size: 64, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text("Пул узлов пуст", style: TextStyle(color: Colors.grey, fontSize: 16)),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E293B)),
                    icon: const Icon(Icons.download_rounded, color: Colors.white),
                    label: const Text("Добавить подписку", style: TextStyle(color: Colors.white)),
                    onPressed: _showImportDialog,
                  )
                ],
              ),
            )
          : ListView.builder(
              itemCount: nodes.length,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              itemBuilder: (context, index) {
                final node = nodes[index];
                final isSelected = widget.controller.activeNode?.id == node.id;

                return Card(
                  color: isSelected ? const Color(0xFF1E293B) : const Color(0xFF131B2E),
                  margin: const EdgeInsets.symmetric(vertical: 6),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                    side: BorderSide(
                      color: isSelected ? const Color(0xFF10B981) : Colors.transparent,
                      width: 1.5,
                    ),
                  ),
                  child: ListTile(
                    leading: Icon(
                      node.security == SecurityType.reality ? Icons.shield_rounded : Icons.lock_outline,
                      color: node.security == SecurityType.reality ? const Color(0xFF10B981) : Colors.grey,
                    ),
                    title: Text(
                      node.remark,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    subtitle: Text(
                      "${node.address}:${node.port} • ${node.transport.toUpperCase()}",
                      style: const TextStyle(color: Colors.grey, fontSize: 12),
                    ),
                    trailing: Text(
                      node.latencyMs > 0 ? "${node.latencyMs} мс" : "--",
                      style: TextStyle(
                        color: node.latencyMs > 500 ? Colors.amberAccent : const Color(0xFF10B981),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                );
              },
            ),
    );
  }
}
