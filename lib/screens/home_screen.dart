import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'sos_screen.dart';
import 'profile_screen.dart';
import 'settings_screen.dart';
import 'history_screen.dart';
import 'planning_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with TickerProviderStateMixin {
  final TextEditingController _searchController = TextEditingController();
  late AnimationController _pulseController;
  late AnimationController _fadeController;
  late Animation<double> _pulseAnimation;
  late Animation<double> _fadeAnimation;
  String _searchQuery = '';

  final List<Map<String, dynamic>> _allItems = [
    {'title': 'Profile', 'subtitle': 'Manage your info & emergency contacts', 'icon': Icons.person_rounded, 'screen': 'profile', 'color': Color(0xFF00D4AA)},
    {'title': 'Settings', 'subtitle': 'App preferences & notifications', 'icon': Icons.settings_rounded, 'screen': 'settings', 'color': Color(0xFF7B61FF)},
    {'title': 'History', 'subtitle': 'Past SOS alerts & trip records', 'icon': Icons.history_rounded, 'screen': 'history', 'color': Color(0xFFFFB547)},
    {'title': 'Planning', 'subtitle': 'Plan your next adventure safely', 'icon': Icons.map_rounded, 'screen': 'planning', 'color': Color(0xFF4FC3F7)},
  ];

  List<Map<String, dynamic>> get _filteredItems {
    if (_searchQuery.isEmpty) return _allItems;
    return _allItems
        .where((item) =>
            item['title'].toString().toLowerCase().contains(_searchQuery.toLowerCase()) ||
            item['subtitle'].toString().toLowerCase().contains(_searchQuery.toLowerCase()))
        .toList();
  }

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat(reverse: true);
    _fadeController = AnimationController(vsync: this, duration: const Duration(milliseconds: 800))..forward();
    _pulseAnimation = Tween<double>(begin: 1.0, end: 1.12).animate(CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut));
    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(CurvedAnimation(parent: _fadeController, curve: Curves.easeOut));
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _fadeController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  void _navigate(String screen) {
    Widget page;
    switch (screen) {
      case 'profile': page = const ProfileScreen(); break;
      case 'settings': page = const SettingsScreen(); break;
      case 'history': page = const HistoryScreen(); break;
      case 'planning': page = const PlanningScreen(); break;
      default: return;
    }
    Navigator.push(context, PageRouteBuilder(
      pageBuilder: (_, a, __) => page,
      transitionsBuilder: (_, anim, __, child) => FadeTransition(opacity: anim, child: SlideTransition(
        position: Tween<Offset>(begin: const Offset(0, 0.05), end: Offset.zero).animate(anim),
        child: child,
      )),
      transitionDuration: const Duration(milliseconds: 350),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0D1B2A), Color(0xFF0A2744), Color(0xFF0D1B2A)],
          ),
        ),
        child: SafeArea(
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: CustomScrollView(
              slivers: [
                SliverToBoxAdapter(child: _buildHeader()),
                SliverToBoxAdapter(child: _buildSearchBar()),
                SliverToBoxAdapter(child: _buildSOSButton()),
                SliverToBoxAdapter(child: _buildSectionTitle()),
                SliverPadding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, i) => _buildDashboardCard(_filteredItems[i]),
                      childCount: _filteredItems.length,
                    ),
                  ),
                ),
                const SliverToBoxAdapter(child: SizedBox(height: 30)),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 4),
      child: Row(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tour Safe', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.white)),
              Text('Stay safe, explore freely', style: GoogleFonts.outfit(fontSize: 13, color: Colors.white38)),
            ],
          ),
          const Spacer(),
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: const Color(0xFF00D4AA).withOpacity(0.15),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.3)),
            ),
            child: const Icon(Icons.shield_rounded, color: Color(0xFF00D4AA), size: 22),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF132236).withOpacity(0.9),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.08)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.3), blurRadius: 20, offset: const Offset(0, 8))],
        ),
        child: TextField(
          controller: _searchController,
          onChanged: (v) => setState(() => _searchQuery = v),
          style: GoogleFonts.outfit(color: Colors.white, fontSize: 15),
          decoration: InputDecoration(
            hintText: 'Search features, contacts, trips...',
            hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 15),
            prefixIcon: const Icon(Icons.search_rounded, color: Color(0xFF00D4AA), size: 22),
            suffixIcon: _searchQuery.isNotEmpty
                ? IconButton(
                    icon: const Icon(Icons.close_rounded, color: Colors.white38, size: 20),
                    onPressed: () { _searchController.clear(); setState(() => _searchQuery = ''); },
                  )
                : const Icon(Icons.mic_rounded, color: Colors.white30, size: 20),
            border: InputBorder.none,
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          ),
        ),
      ),
    );
  }

  Widget _buildSOSButton() {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => const SOSScreen())),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 28, 20, 10),
        child: AnimatedBuilder(
          animation: _pulseAnimation,
          builder: (_, child) => Transform.scale(
            scale: _pulseAnimation.value,
            child: child,
          ),
          child: Container(
            height: 160,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [Color(0xFFFF3B30), Color(0xFFFF6B35), Color(0xFFCC0000)],
              ),
              boxShadow: [
                BoxShadow(color: const Color(0xFFFF3B30).withOpacity(0.5), blurRadius: 30, spreadRadius: 2, offset: const Offset(0, 8)),
              ],
            ),
            child: Stack(
              children: [
                Positioned(top: -20, right: -20,
                  child: Container(width: 120, height: 120,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.05)))),
                Positioned(bottom: -30, left: -10,
                  child: Container(width: 100, height: 100,
                    decoration: BoxDecoration(shape: BoxShape.circle, color: Colors.white.withOpacity(0.04)))),
                Center(
                  child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                    const Icon(Icons.sos_rounded, color: Colors.white, size: 48),
                    const SizedBox(height: 8),
                    Text('EMERGENCY SOS', style: GoogleFonts.outfit(fontSize: 22, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1.5)),
                    const SizedBox(height: 4),
                    Text('Works without internet • Tap to activate', style: GoogleFonts.outfit(fontSize: 12, color: Colors.white60)),
                  ]),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSectionTitle() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 12),
      child: Row(
        children: [
          Text('Quick Access', style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.white)),
          const Spacer(),
          Container(
            width: 6, height: 6,
            decoration: const BoxDecoration(color: Color(0xFF00D4AA), shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text('${_filteredItems.length} items', style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
        ],
      ),
    );
  }

  Widget _buildDashboardCard(Map<String, dynamic> item) {
    return GestureDetector(
      onTap: () => _navigate(item['screen']),
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: const Color(0xFF132236).withOpacity(0.85),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: (item['color'] as Color).withOpacity(0.2)),
          boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: Row(
          children: [
            Container(
              width: 52, height: 52,
              decoration: BoxDecoration(
                color: (item['color'] as Color).withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: (item['color'] as Color).withOpacity(0.3)),
              ),
              child: Icon(item['icon'] as IconData, color: item['color'] as Color, size: 26),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(item['title'], style: GoogleFonts.outfit(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
                const SizedBox(height: 3),
                Text(item['subtitle'], style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
              ]),
            ),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: (item['color'] as Color).withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.arrow_forward_ios_rounded, color: item['color'] as Color, size: 14),
            ),
          ],
        ),
      ),
    );
  }
}
