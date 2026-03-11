import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});
  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _vibrationOnSOS = true;
  bool _autoCalllEmergency = false;
  bool _saveLocationHistory = true;
  bool _soundAlerts = true;
  String _countdownDuration = '5 seconds';
  String _defaultLanguage = 'English';

  @override
  void initState() {
    super.initState();
    _loadSettings();
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _vibrationOnSOS = prefs.getBool('vibration_sos') ?? true;
      _autoCalllEmergency = prefs.getBool('auto_call') ?? false;
      _saveLocationHistory = prefs.getBool('save_location') ?? true;
      _soundAlerts = prefs.getBool('sound_alerts') ?? true;
      _countdownDuration = prefs.getString('countdown') ?? '5 seconds';
      _defaultLanguage = prefs.getString('language') ?? 'English';
    });
  }

  Future<void> _saveSetting(String key, dynamic value) async {
    final prefs = await SharedPreferences.getInstance();
    if (value is bool) await prefs.setBool(key, value);
    if (value is String) await prefs.setString(key, value);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF0D1B2A), Color(0xFF0A2744), Color(0xFF0D1B2A)])),
        child: SafeArea(
          child: Column(children: [
            _buildTopBar(context),
            Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(children: [
              _buildSection('Emergency SOS Settings', Icons.sos_rounded, const Color(0xFFFF3B30), [
                _buildToggle('Vibration on SOS', 'Vibrate device when SOS is activated', Icons.vibration_rounded, _vibrationOnSOS, (v) { setState(() => _vibrationOnSOS = v); _saveSetting('vibration_sos', v); }),
                _buildToggle('Auto-Call Emergency', 'Automatically call 112 after countdown', Icons.call_rounded, _autoCalllEmergency, (v) { setState(() => _autoCalllEmergency = v); _saveSetting('auto_call', v); }),
                _buildToggle('Sound Alerts', 'Play alarm sound during SOS', Icons.volume_up_rounded, _soundAlerts, (v) { setState(() => _soundAlerts = v); _saveSetting('sound_alerts', v); }),
                _buildDropdown('Countdown Duration', Icons.timer_rounded, _countdownDuration, ['3 seconds', '5 seconds', '10 seconds'], (v) { setState(() => _countdownDuration = v!); _saveSetting('countdown', v!); }),
              ]),
              const SizedBox(height: 20),
              _buildSection('Privacy & Data', Icons.privacy_tip_rounded, const Color(0xFF7B61FF), [
                _buildToggle('Save Location History', 'Store GPS history for SOS logs', Icons.history_rounded, _saveLocationHistory, (v) { setState(() => _saveLocationHistory = v); _saveSetting('save_location', v); }),
              ]),
              const SizedBox(height: 20),
              _buildSection('General', Icons.tune_rounded, const Color(0xFF4FC3F7), [
                _buildDropdown('Language', Icons.language_rounded, _defaultLanguage, ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada'], (v) { setState(() => _defaultLanguage = v!); _saveSetting('language', v!); }),
              ]),
              const SizedBox(height: 20),
              _buildAboutCard(),
            ]))),
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
        Text('Settings', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
      ]),
    );
  }

  Widget _buildSection(String title, IconData icon, Color color, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: const Color(0xFF132236), borderRadius: BorderRadius.circular(20), border: Border.all(color: color.withOpacity(0.15))),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [Icon(icon, color: color, size: 18), const SizedBox(width: 8), Text(title, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white))]),
        const SizedBox(height: 16),
        ...children,
      ]),
    );
  }

  Widget _buildToggle(String title, String subtitle, IconData icon, bool value, ValueChanged<bool> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: Colors.white54, size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
          Text(subtitle, style: GoogleFonts.outfit(fontSize: 11, color: Colors.white38)),
        ])),
        Switch(value: value, onChanged: onChanged, activeColor: const Color(0xFF00D4AA), inactiveTrackColor: Colors.white12),
      ]),
    );
  }

  Widget _buildDropdown(String title, IconData icon, String value, List<String> options, ValueChanged<String?> onChanged) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: Row(children: [
        Container(padding: const EdgeInsets.all(8), decoration: BoxDecoration(color: Colors.white.withOpacity(0.06), borderRadius: BorderRadius.circular(10)), child: Icon(icon, color: Colors.white54, size: 18)),
        const SizedBox(width: 12),
        Expanded(child: Text(title, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white))),
        DropdownButton<String>(
          value: value,
          dropdownColor: const Color(0xFF132236),
          style: GoogleFonts.outfit(fontSize: 13, color: const Color(0xFF00D4AA)),
          underline: const SizedBox(),
          items: options.map((o) => DropdownMenuItem(value: o, child: Text(o))).toList(),
          onChanged: onChanged,
        ),
      ]),
    );
  }

  Widget _buildAboutCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF132236),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.15)),
      ),
      child: Column(children: [
        Row(children: [
          const Icon(Icons.info_outline_rounded, color: Color(0xFF00D4AA), size: 18),
          const SizedBox(width: 8),
          Text('About Tour Safe', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
        const SizedBox(height: 14),
        Text('Version 1.0.0 • Emergency travel companion\nAll data stored locally on your device.\nWorks fully offline for SOS emergencies.',
          textAlign: TextAlign.center,
          style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38, height: 1.7)),
      ]),
    );
  }
}
