import React, { useState } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
}

function TripField({ label, value, onChange }: FieldProps) {
  return (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={`Enter ${label.toLowerCase()}`}
        placeholderTextColor="#444"
        selectionColor="#fff"
      />
    </View>
  );
}

export default function TripScreen() {
  const insets = useSafeAreaInsets();
  
  const [name, setName] = useState('Abinav');
  const [emergencyContact, setEmergencyContact] = useState('+91 9876543210');
  const [trekName, setTrekName] = useState('Kuari Pass');
  const [organiser, setOrganiser] = useState('Indiahikes');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Your Trip</Text>
          
          <View style={styles.formArea}>
            <TripField label="NAME" value={name} onChange={setName} />
            <TripField label="EMERGENCY CONTACT" value={emergencyContact} onChange={setEmergencyContact} />
            <TripField label="TREK" value={trekName} onChange={setTrekName} />
            <TripField label="ORGANISER" value={organiser} onChange={setOrganiser} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  title: {
    fontFamily: 'Inter_700Bold',
    fontSize: 24,
    color: '#fff',
    marginTop: 32,
    marginBottom: 24,
  },
  formArea: {
    marginTop: 8,
  },
  fieldContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  fieldLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: '#666',
    letterSpacing: 2,
    marginBottom: 4,
  },
  fieldInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#fff',
    padding: 0,
  }
});
