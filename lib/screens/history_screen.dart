import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  List<Map<String, String>> _sosHistory = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    final prefs = await SharedPreferences.getInstance();
    final raw = prefs.getStringList('sos_history') ?? [];
    setState(() {
      _sosHistory = raw.map((item) {
        final parts = item.split('|');
        final dt = DateTime.tryParse(parts[0]) ?? DateTime.now();
        return {
          'date': '${dt.day}/${dt.month}/${dt.year}',
          'time': '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}',
          'location': parts.length > 1 ? parts[1] : 'Location not recorded',
        };
      }).toList();
      _loading = false;
    });
  }

  Future<void> _clearHistory() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('sos_history');
    setState(() => _sosHistory = []);
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('History cleared', style: GoogleFonts.outfit()), backgroundColor: const Color(0xFF132236), behavior: SnackBarBehavior.floating),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0D1B2A), Color(0xFF0A2744), Color(0xFF0D1B2A)])),
        child: SafeArea(
          child: Column(children: [
            _buildTopBar(context),
            Expanded(child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF00D4AA)))
                : _sosHistory.isEmpty ? _buildEmptyState() : _buildHistoryList()),
          ]),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 16),
      child: Row(children: [
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withOpacity(0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white12)),
            child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 18)),
        ),
        const SizedBox(width: 16),
        Text('SOS History', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
        const Spacer(),
        if (_sosHistory.isNotEmpty)
          GestureDetector(
            onTap: _clearHistory,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(color: Colors.red.withOpacity(0.15), borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.red.withOpacity(0.3))),
              child: Text('Clear', style: GoogleFonts.outfit(fontSize: 12, color: Colors.red, fontWeight: FontWeight.w600)),
            ),
          ),
      ]),
    );
  }

  Widget _buildEmptyState() {
    return Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
      Container(
        padding: const EdgeInsets.all(28),
        decoration: BoxDecoration(color: const Color(0xFF00D4AA).withOpacity(0.08), shape: BoxShape.circle, border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.2))),
        child: const Icon(Icons.history_rounded, color: Color(0xFF00D4AA), size: 50),
      ),
      const SizedBox(height: 24),
      Text('No SOS History', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
      const SizedBox(height: 8),
      Text('Your emergency activations will\nappear here for reference', textAlign: TextAlign.center, style: GoogleFonts.outfit(fontSize: 14, color: Colors.white38)),
    ]));
  }

  Widget _buildHistoryList() {
    return ConstrainedBox(
      constraints: const BoxConstraints(),
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _sosHistory.length,
        itemBuilder: (_, i) {
          final item = _sosHistory[i];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: const Color(0xFF132236),
              borderRadius: BorderRadius.circular(18),
              border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.15)),
            ),
            child: Row(children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: const Color(0xFFFF3B30).withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFFF3B30), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('SOS Activated', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 3),
                Text('${item['date']} at ${item['time']}', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFFFFB547))),
                const SizedBox(height: 3),
                Text(item['location']!, style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38), maxLines: 2, overflow: TextOverflow.ellipsis),
              ])),
            ]),
          );
        },
      ),
    );
  }
}
