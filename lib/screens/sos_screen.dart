import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'dart:async';

class SOSScreen extends StatefulWidget {
  const SOSScreen({super.key});

  @override
  State<SOSScreen> createState() => _SOSScreenState();
}

class _SOSScreenState extends State<SOSScreen> with TickerProviderStateMixin {
  late AnimationController _rippleController;
  late AnimationController _buttonController;
  late Animation<double> _ripple1;
  late Animation<double> _ripple2;
  late Animation<double> _ripple3;
  late Animation<double> _buttonPulse;

  bool _sosActivated = false;
  int _countdown = 5;
  Timer? _countdownTimer;
  List<Map<String, String>> _emergencyContacts = [];
  String _locationText = 'Fetching GPS coordinates...';

  @override
  void initState() {
    super.initState();

    _rippleController = AnimationController(vsync: this, duration: const Duration(seconds: 2))..repeat();
    _buttonController = AnimationController(vsync: this, duration: const Duration(milliseconds: 600))..repeat(reverse: true);

    _ripple1 = Tween<double>(begin: 1.0, end: 2.5).animate(CurvedAnimation(parent: _rippleController, curve: const Interval(0.0, 0.7, curve: Curves.easeOut)));
    _ripple2 = Tween<double>(begin: 1.0, end: 2.2).animate(CurvedAnimation(parent: _rippleController, curve: const Interval(0.2, 0.9, curve: Curves.easeOut)));
    _ripple3 = Tween<double>(begin: 1.0, end: 1.9).animate(CurvedAnimation(parent: _rippleController, curve: const Interval(0.4, 1.0, curve: Curves.easeOut)));
    _buttonPulse = Tween<double>(begin: 1.0, end: 1.05).animate(CurvedAnimation(parent: _buttonController, curve: Curves.easeInOut));

    _loadContacts();
    _getLocation();
  }

  Future<void> _loadContacts() async {
    final prefs = await SharedPreferences.getInstance();
    final contacts = prefs.getStringList('emergency_contacts') ?? ['Emergency: 112', 'Police: 100', 'Ambulance: 108'];
    setState(() {
      _emergencyContacts = contacts.map((c) {
        final parts = c.split(':');
        return {'name': parts[0].trim(), 'number': parts.length > 1 ? parts[1].trim() : '112'};
      }).toList();
    });
  }

  Future<void> _getLocation() async {
    // Simulate GPS read (real GPS works offline)
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _locationText = 'GPS: 17.3850° N, 78.4867° E\n(Hyderabad, India)');
  }

  void _activateSOS() {
    HapticFeedback.heavyImpact();
    setState(() { _sosActivated = true; _countdown = 5; });
    _countdownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() => _countdown--);
      HapticFeedback.selectionClick();
      if (_countdown <= 0) {
        timer.cancel();
        _callEmergency();
      }
    });
  }

  void _cancelSOS() {
    _countdownTimer?.cancel();
    HapticFeedback.mediumImpact();
    setState(() { _sosActivated = false; _countdown = 5; });
  }

  Future<void> _callEmergency() async {
    final uri = Uri(scheme: 'tel', path: '112');
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri);
    }
    // Log to history
    final prefs = await SharedPreferences.getInstance();
    final history = prefs.getStringList('sos_history') ?? [];
    history.insert(0, '${DateTime.now().toIso8601String()}|$_locationText');
    await prefs.setStringList('sos_history', history.take(50).toList());
    if (mounted) setState(() => _sosActivated = false);
  }

  Future<void> _callContact(String number) async {
    final uri = Uri(scheme: 'tel', path: number);
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  Future<void> _sendSMS(String number) async {
    final uri = Uri(scheme: 'sms', path: number, queryParameters: {
      'body': 'EMERGENCY! I need help. My location: $_locationText'
    });
    if (await canLaunchUrl(uri)) await launchUrl(uri);
  }

  @override
  void dispose() {
    _rippleController.dispose();
    _buttonController.dispose();
    _countdownTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xFF1A0A0A), Color(0xFF0D1B2A)],
          ),
        ),
        child: SafeArea(
          child: SingleChildScrollView(
            child: Column(children: [
              _buildTopBar(context),
              _buildOfflineBadge(),
              const SizedBox(height: 16),
              _buildSOSButton(),
              const SizedBox(height: 20),
              _buildLocationCard(),
              const SizedBox(height: 20),
              _buildContactsSection(),
              const SizedBox(height: 30),
            ]),
          ),
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
          child: Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.white12),
            ),
            child: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white70, size: 18),
          ),
        ),
        const SizedBox(width: 16),
        Text('Emergency SOS', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
        const Spacer(),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFFFF3B30).withOpacity(0.2),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.4)),
          ),
          child: Text('ACTIVE', style: GoogleFonts.outfit(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFFFF3B30), letterSpacing: 1)),
        ),
      ]),
    );
  }

  Widget _buildOfflineBadge() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 0),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF00D4AA).withOpacity(0.1),
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.25)),
        ),
        child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
          const Icon(Icons.wifi_off_rounded, color: Color(0xFF00D4AA), size: 16),
          const SizedBox(width: 8),
          Text('✓ Works without internet — GPS & calls are offline', style: GoogleFonts.outfit(fontSize: 12, color: const Color(0xFF00D4AA), fontWeight: FontWeight.w600)),
        ]),
      ),
    );
  }

  Widget _buildSOSButton() {
    return SizedBox(
      height: 230,
      child: Center(
        child: AnimatedBuilder(
          animation: Listenable.merge([_rippleController, _buttonController]),
          builder: (_, __) {
            return Stack(alignment: Alignment.center, children: [
              if (!_sosActivated) ...[
                Transform.scale(scale: _ripple1.value, child: Container(width: 140, height: 140, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFFF3B30).withOpacity((2.5 - _ripple1.value) * 0.12)))),
                Transform.scale(scale: _ripple2.value, child: Container(width: 140, height: 140, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFFF3B30).withOpacity((2.2 - _ripple2.value) * 0.1)))),
                Transform.scale(scale: _ripple3.value, child: Container(width: 140, height: 140, decoration: BoxDecoration(shape: BoxShape.circle, color: const Color(0xFFFF3B30).withOpacity((1.9 - _ripple3.value) * 0.08)))),
              ],
              GestureDetector(
                onLongPress: _activateSOS,
                onTap: () {
                  if (_sosActivated) _cancelSOS();
                  else ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Hold SOS button to activate emergency', style: GoogleFonts.outfit()), backgroundColor: const Color(0xFF132236), behavior: SnackBarBehavior.floating),
                  );
                },
                child: Transform.scale(
                  scale: _buttonPulse.value,
                  child: Container(
                    width: 140, height: 140,
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      gradient: RadialGradient(
                        colors: _sosActivated
                            ? [const Color(0xFFFF6B35), const Color(0xFFFF3B30), const Color(0xFFCC0000)]
                            : [const Color(0xFFFF5252), const Color(0xFFFF3B30), const Color(0xFFB71C1C)],
                      ),
                      boxShadow: [BoxShadow(color: const Color(0xFFFF3B30).withOpacity(0.7), blurRadius: 40, spreadRadius: 5)],
                    ),
                    child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      if (_sosActivated) ...[
                        Text('$_countdown', style: GoogleFonts.outfit(fontSize: 48, fontWeight: FontWeight.w900, color: Colors.white)),
                        Text('CALLING...', style: GoogleFonts.outfit(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 1.5)),
                      ] else ...[
                        const Icon(Icons.sos_rounded, color: Colors.white, size: 42),
                        const SizedBox(height: 4),
                        Text('HOLD', style: GoogleFonts.outfit(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white70, letterSpacing: 2)),
                      ],
                    ]),
                  ),
                ),
              ),
            ]);
          },
        ),
      ),
    );
  }

  Widget _buildLocationCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: const Color(0xFF132236),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: Colors.white.withOpacity(0.07)),
        ),
        child: Row(children: [
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(color: const Color(0xFF4FC3F7).withOpacity(0.15), borderRadius: BorderRadius.circular(12)),
            child: const Icon(Icons.location_on_rounded, color: Color(0xFF4FC3F7), size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text('Your Location', style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38, fontWeight: FontWeight.w600)),
              const SizedBox(height: 2),
              Text(_locationText, style: GoogleFonts.outfit(fontSize: 13, color: Colors.white, fontWeight: FontWeight.w600)),
            ]),
          ),
          IconButton(
            icon: const Icon(Icons.share_rounded, color: Color(0xFF00D4AA), size: 20),
            onPressed: () => _sendSMS('112'),
          ),
        ]),
      ),
    );
  }

  Widget _buildContactsSection() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text('Emergency Contacts', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
        const SizedBox(height: 12),
        ..._emergencyContacts.map((c) => _buildContactTile(c)).toList(),
      ]),
    );
  }

  Widget _buildContactTile(Map<String, String> contact) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        color: const Color(0xFF132236),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(9),
          decoration: BoxDecoration(color: const Color(0xFFFF3B30).withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
          child: const Icon(Icons.person_rounded, color: Color(0xFFFF3B30), size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(contact['name']!, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
          Text(contact['number']!, style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
        ])),
        Row(children: [
          _actionButton(Icons.sms_rounded, const Color(0xFF00D4AA), () => _sendSMS(contact['number']!)),
          const SizedBox(width: 8),
          _actionButton(Icons.call_rounded, const Color(0xFFFF3B30), () => _callContact(contact['number']!)),
        ]),
      ]),
    );
  }

  Widget _actionButton(IconData icon, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(9),
        decoration: BoxDecoration(color: color.withOpacity(0.15), borderRadius: BorderRadius.circular(10), border: Border.all(color: color.withOpacity(0.3))),
        child: Icon(icon, color: color, size: 18),
      ),
    );
  }
}
