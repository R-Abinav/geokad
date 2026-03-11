import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PlanningScreen extends StatefulWidget {
  const PlanningScreen({super.key});
  @override
  State<PlanningScreen> createState() => _PlanningScreenState();
}

class _PlanningScreenState extends State<PlanningScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Map<String, dynamic>> _checklist = [];
  List<Map<String, String>> _routes = [];
  final _itemController = TextEditingController();
  final _routeController = TextEditingController();
  final _routeNotesController = TextEditingController();

  final List<Map<String, dynamic>> _safetyTips = [
    {'icon': Icons.wifi_off_rounded, 'title': 'Download Offline Maps', 'tip': 'Save Maps.me or Google Maps offline for your travel area before leaving.', 'color': Color(0xFF00D4AA)},
    {'icon': Icons.battery_full_rounded, 'title': 'Keep Phone Charged', 'tip': 'Carry a power bank. Emergency SOS needs at least 10% battery.', 'color': Color(0xFFFFB547)},
    {'icon': Icons.contact_phone_rounded, 'title': 'Share Itinerary', 'tip': 'Always share your travel plan with at least 2 trusted contacts.', 'color': Color(0xFF7B61FF)},
    {'icon': Icons.local_hospital_rounded, 'title': 'Carry Medical Info', 'tip': 'Keep a physical card with blood type, allergies, and emergency contacts.', 'color': Color(0xFFFF3B30)},
    {'icon': Icons.water_rounded, 'title': 'Stay Hydrated', 'tip': 'In remote areas, carry at least 2L of water per person per day.', 'color': Color(0xFF4FC3F7)},
    {'icon': Icons.signal_cellular_alt_rounded, 'title': 'Know Signal Dead Zones', 'tip': 'Research network coverage at your destination before traveling.', 'color': Color(0xFFFF6B35)},
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    final checklistRaw = prefs.getStringList('checklist') ?? [
      'Passport / ID|false', 'First Aid Kit|false', 'Emergency Contacts Saved|false',
      'Offline Maps Downloaded|false', 'Power Bank Charged|false', 'Local Currency|false',
    ];
    final routesRaw = prefs.getStringList('routes') ?? [];
    setState(() {
      _checklist = checklistRaw.map((e) {
        final p = e.split('|');
        return {'title': p[0], 'done': p.length > 1 && p[1] == 'true'};
      }).toList();
      _routes = routesRaw.map((e) {
        final p = e.split('||');
        return {'name': p[0], 'notes': p.length > 1 ? p[1] : ''};
      }).toList();
    });
  }

  Future<void> _saveChecklist() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('checklist', _checklist.map((e) => '${e['title']}|${e['done']}').toList());
  }

  Future<void> _saveRoutes() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setStringList('routes', _routes.map((e) => '${e['name']}||${e['notes']}').toList());
  }

  void _addChecklistItem() {
    if (_itemController.text.trim().isEmpty) return;
    setState(() => _checklist.add({'title': _itemController.text.trim(), 'done': false}));
    _itemController.clear();
    _saveChecklist();
  }

  void _addRoute() {
    if (_routeController.text.trim().isEmpty) return;
    setState(() => _routes.add({'name': _routeController.text.trim(), 'notes': _routeNotesController.text.trim()}));
    _routeController.clear(); _routeNotesController.clear();
    _saveRoutes();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _itemController.dispose();
    _routeController.dispose();
    _routeNotesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0D1B2A), Color(0xFF0A2744), Color(0xFF0D1B2A)])),
        child: SafeArea(
          child: Column(children: [
            _buildTopBar(context),
            _buildTabBar(),
            Expanded(child: TabBarView(controller: _tabController, children: [
              _buildChecklistTab(),
              _buildRoutesTab(),
              _buildSafetyTipsTab(),
            ])),
          ]),
        ),
      ),
    );
  }

  Widget _buildTopBar(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Row(children: [
        GestureDetector(
          onTap: () => Navigator.pop(context),
          child: Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: Colors.white.withOpacity(0.08), borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.white12)),
            child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 18)),
        ),
        const SizedBox(width: 16),
        Text('Trip Planning', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
      ]),
    );
  }

  Widget _buildTabBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        padding: const EdgeInsets.all(4),
        decoration: BoxDecoration(color: const Color(0xFF132236), borderRadius: BorderRadius.circular(14)),
        child: TabBar(
          controller: _tabController,
          indicator: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF00D4AA), Color(0xFF007A63)]), borderRadius: BorderRadius.circular(10)),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          labelStyle: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700),
          unselectedLabelStyle: GoogleFonts.outfit(fontSize: 12),
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white38,
          tabs: const [Tab(text: 'Checklist'), Tab(text: 'Routes'), Tab(text: 'Safety Tips')],
        ),
      ),
    );
  }

  Widget _buildChecklistTab() {
    final done = _checklist.where((e) => e['done'] == true).length;
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(color: const Color(0xFF00D4AA).withOpacity(0.1), borderRadius: BorderRadius.circular(14), border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.25))),
          child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            Text('Progress: $done/${_checklist.length}', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: const Color(0xFF00D4AA))),
            Text('${_checklist.isEmpty ? 0 : ((done / _checklist.length) * 100).round()}% Ready', style: GoogleFonts.outfit(fontSize: 14, color: Colors.white70)),
          ]),
        ),
        const SizedBox(height: 16),
        ..._checklist.asMap().entries.map((e) => _buildCheckItem(e.key, e.value)).toList(),
        const SizedBox(height: 16),
        Row(children: [
          Expanded(child: TextField(
            controller: _itemController,
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Add checklist item...',
              hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 13),
              filled: true, fillColor: const Color(0xFF132236),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            ),
          )),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _addChecklistItem,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFF00D4AA).withOpacity(0.2), borderRadius: BorderRadius.circular(12), border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.4))),
              child: const Icon(Icons.add_rounded, color: Color(0xFF00D4AA), size: 22),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _buildCheckItem(int index, Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () { setState(() => _checklist[index]['done'] = !_checklist[index]['done']); _saveChecklist(); },
      child: Container(
        margin: const EdgeInsets.only(bottom: 10),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        decoration: BoxDecoration(
          color: const Color(0xFF132236),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: item['done'] ? const Color(0xFF00D4AA).withOpacity(0.3) : Colors.white.withOpacity(0.05)),
        ),
        child: Row(children: [
          Container(
            width: 22, height: 22,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: item['done'] ? const Color(0xFF00D4AA) : Colors.transparent,
              border: Border.all(color: item['done'] ? const Color(0xFF00D4AA) : Colors.white30, width: 2),
            ),
            child: item['done'] ? const Icon(Icons.check_rounded, color: Colors.white, size: 14) : null,
          ),
          const SizedBox(width: 14),
          Expanded(child: Text(item['title'], style: GoogleFonts.outfit(fontSize: 14, color: item['done'] ? Colors.white54 : Colors.white, decoration: item['done'] ? TextDecoration.lineThrough : null))),
          GestureDetector(
            onTap: () { setState(() => _checklist.removeAt(index)); _saveChecklist(); },
            child: const Icon(Icons.close_rounded, color: Colors.white24, size: 18),
          ),
        ]),
      ),
    );
  }

  Widget _buildRoutesTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        ..._routes.map((r) => Container(
          margin: const EdgeInsets.only(bottom: 12),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF132236), borderRadius: BorderRadius.circular(16), border: Border.all(color: const Color(0xFF4FC3F7).withOpacity(0.2))),
          child: Row(children: [
            Container(padding: const EdgeInsets.all(10), decoration: BoxDecoration(color: const Color(0xFF4FC3F7).withOpacity(0.15), borderRadius: BorderRadius.circular(10)), child: const Icon(Icons.route_rounded, color: Color(0xFF4FC3F7), size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(r['name']!, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
              if (r['notes']!.isNotEmpty) Text(r['notes']!, style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
            ])),
          ]),
        )).toList(),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(color: const Color(0xFF132236), borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            TextField(
              controller: _routeController,
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
              decoration: InputDecoration(hintText: 'Route name (e.g. Manali → Rohtang Pass)', hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 13), filled: true, fillColor: Colors.white.withOpacity(0.04), border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _routeNotesController,
              style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
              maxLines: 2,
              decoration: InputDecoration(hintText: 'Notes (offline areas, hazards, checkpoints...)', hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 13), filled: true, fillColor: Colors.white.withOpacity(0.04), border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none), contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10)),
            ),
            const SizedBox(height: 10),
            GestureDetector(
              onTap: _addRoute,
              child: Container(
                width: double.infinity, height: 44,
                decoration: BoxDecoration(gradient: const LinearGradient(colors: [Color(0xFF4FC3F7), Color(0xFF0288D1)]), borderRadius: BorderRadius.circular(10)),
                child: Center(child: Text('Add Route', style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white))),
              ),
            ),
          ]),
        ),
      ]),
    );
  }

  Widget _buildSafetyTipsTab() {
    return ListView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: _safetyTips.length,
      itemBuilder: (_, i) {
        final tip = _safetyTips[i];
        return Container(
          margin: const EdgeInsets.only(bottom: 14),
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: const Color(0xFF132236),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: (tip['color'] as Color).withOpacity(0.2)),
          ),
          child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: (tip['color'] as Color).withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
              child: Icon(tip['icon'] as IconData, color: tip['color'] as Color, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tip['title']!, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
              const SizedBox(height: 5),
              Text(tip['tip']!, style: GoogleFonts.outfit(fontSize: 12, color: Colors.white54, height: 1.5)),
            ])),
          ]),
        );
      },
    );
  }
}
