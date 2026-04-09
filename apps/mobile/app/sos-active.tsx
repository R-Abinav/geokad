import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useSosStore } from '../store/useSosStore';

export default function SosActiveScreen() {
  const router = useRouter();
  const { peersNotified, activate, cancel, incrementPeers } = useSosStore();
  const [apiStatus, setApiStatus] = useState('');

  useEffect(() => {
    activate();

    const triggerBackend = async () => {
      try {
        const res = await fetch('http://localhost:8080/api/v1/sos/trigger', { method: 'POST' });
        if (!res.ok) setApiStatus('API Not responding');
      } catch (e) {
        setApiStatus('API Not responding');
      }
    };
    triggerBackend();

    const interval = setInterval(() => {
      incrementPeers();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCancel = () => {
    cancel();
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }} className="items-center justify-between py-20 px-6">
      <View 
        style={{ backgroundColor: 'rgba(255, 59, 48, 0.08)' }} 
        className="absolute inset-0 pointer-events-none"
      />

      <View className="flex-1 justify-center items-center mt-12 w-full">
        <View style={{ width: 200, height: 200, borderRadius: 100, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Inter_800ExtraBold', letterSpacing: 4 }} className="text-white text-3xl">
            SOS
          </Text>
        </View>
        
        <Text style={{ fontFamily: 'Inter_800ExtraBold', letterSpacing: 4 }} className="text-white text-3xl mt-16 text-center uppercase">
          SOS Active
        </Text>
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-[#aaaaaa] text-sm mt-4 text-center">
          Alerting peers via mesh...
        </Text>
        <Text style={{ fontFamily: 'Inter_500Medium' }} className="text-white text-lg mt-2 text-center">
          {peersNotified} peers notified
        </Text>
        {apiStatus ? (
          <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-red-500 text-sm mt-4 text-center">
            {apiStatus}
          </Text>
        ) : null}
      </View>

      <Pressable onPress={handleCancel} className="mt-8 py-4 px-8">
        <Text style={{ fontFamily: 'Inter_400Regular' }} className="text-white text-sm border-b border-white pb-1">
          Cancel
        </Text>
      </Pressable>
    </View>
  );
}
