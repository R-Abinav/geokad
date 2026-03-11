import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});
  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  final _nameController = TextEditingController(text: 'Traveller');
  final _bloodController = TextEditingController(text: 'O+');
  final _allergiesController = TextEditingController(text: 'None');
  List<String> _contacts = [];
  final _contactController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _nameController.text = prefs.getString('user_name') ?? 'Traveller';
      _bloodController.text = prefs.getString('blood_type') ?? 'O+';
      _allergiesController.text = prefs.getString('allergies') ?? 'None';
      _contacts = prefs.getStringList('emergency_contacts') ?? ['Emergency: 112', 'Police: 100'];
    });
  }

  Future<void> _saveData() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('user_name', _nameController.text);
    await prefs.setString('blood_type', _bloodController.text);
    await prefs.setString('allergies', _allergiesController.text);
    await prefs.setStringList('emergency_contacts', _contacts);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Profile saved!', style: GoogleFonts.outfit()), backgroundColor: const Color(0xFF00D4AA), behavior: SnackBarBehavior.floating),
      );
    }
  }

  void _addContact() {
    if (_contactController.text.trim().isEmpty) return;
    setState(() => _contacts.add(_contactController.text.trim()));
    _contactController.clear();
  }

  @override
  void dispose() {
    _nameController.dispose(); _bloodController.dispose();
    _allergiesController.dispose(); _contactController.dispose();
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
            Expanded(child: SingleChildScrollView(padding: const EdgeInsets.all(20), child: Column(children: [
              _buildAvatarSection(),
              const SizedBox(height: 24),
              _buildSection('Personal Info', Icons.person_rounded, const Color(0xFF00D4AA), [
                _buildField('Full Name', _nameController, Icons.person_outline_rounded),
                _buildField('Blood Type', _bloodController, Icons.water_drop_outlined),
                _buildField('Allergies / Medical Notes', _allergiesController, Icons.medical_services_outlined),
              ]),
              const SizedBox(height: 20),
              _buildContactsSection(),
              const SizedBox(height: 24),
              _buildSaveButton(),
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
        Text('My Profile', style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white)),
      ]),
    );
  }

  Widget _buildAvatarSection() {
    return Column(children: [
      Container(
        width: 90, height: 90,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          gradient: const LinearGradient(colors: [Color(0xFF00D4AA), Color(0xFF007A63)]),
          boxShadow: [BoxShadow(color: const Color(0xFF00D4AA).withOpacity(0.4), blurRadius: 20, spreadRadius: 2)],
        ),
        child: const Icon(Icons.person_rounded, color: Colors.white, size: 46),
      ),
      const SizedBox(height: 10),
      Text(_nameController.text, style: GoogleFonts.outfit(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white)),
      Text('Emergency Profile', style: GoogleFonts.outfit(fontSize: 12, color: Colors.white38)),
    ]);
  }

  Widget _buildSection(String title, IconData icon, Color color, List<Widget> children) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF132236),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.15)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Text(title, style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
        const SizedBox(height: 16),
        ...children,
      ]),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: ctrl,
        style: GoogleFonts.outfit(color: Colors.white, fontSize: 14),
        decoration: InputDecoration(
          labelText: label,
          labelStyle: GoogleFonts.outfit(color: Colors.white38, fontSize: 12),
          prefixIcon: Icon(icon, color: const Color(0xFF00D4AA), size: 18),
          filled: true,
          fillColor: Colors.white.withOpacity(0.05),
          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF00D4AA), width: 1.5)),
        ),
      ),
    );
  }

  Widget _buildContactsSection() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: const Color(0xFF132236),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFFF3B30).withOpacity(0.15)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          const Icon(Icons.contact_phone_rounded, color: Color(0xFFFF3B30), size: 18),
          const SizedBox(width: 8),
          Text('Emergency Contacts', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
        ]),
        const SizedBox(height: 16),
        ..._contacts.asMap().entries.map((e) => Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(color: Colors.white.withOpacity(0.04), borderRadius: BorderRadius.circular(10)),
          child: Row(children: [
            const Icon(Icons.phone_rounded, color: Color(0xFF00D4AA), size: 16),
            const SizedBox(width: 10),
            Expanded(child: Text(e.value, style: GoogleFonts.outfit(fontSize: 13, color: Colors.white70))),
            GestureDetector(
              onTap: () => setState(() => _contacts.removeAt(e.key)),
              child: const Icon(Icons.close_rounded, color: Colors.red, size: 18),
            ),
          ]),
        )).toList(),
        const SizedBox(height: 8),
        Row(children: [
          Expanded(child: TextField(
            controller: _contactController,
            style: GoogleFonts.outfit(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Name: 9876543210',
              hintStyle: GoogleFonts.outfit(color: Colors.white30, fontSize: 13),
              filled: true, fillColor: Colors.white.withOpacity(0.05),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10), borderSide: BorderSide.none),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            ),
          )),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _addContact,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(color: const Color(0xFF00D4AA).withOpacity(0.2), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFF00D4AA).withOpacity(0.4))),
              child: const Icon(Icons.add_rounded, color: Color(0xFF00D4AA), size: 22),
            ),
          ),
        ]),
      ]),
    );
  }

  Widget _buildSaveButton() {
    return GestureDetector(
      onTap: _saveData,
      child: Container(
        width: double.infinity, height: 54,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
          gradient: const LinearGradient(colors: [Color(0xFF00D4AA), Color(0xFF007A63)]),
          boxShadow: [BoxShadow(color: const Color(0xFF00D4AA).withOpacity(0.4), blurRadius: 16, offset: const Offset(0, 6))],
        ),
        child: Center(child: Text('Save Profile', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white))),
      ),
    );
  }
}
