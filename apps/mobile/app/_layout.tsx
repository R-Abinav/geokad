import { Slot } from 'expo-router';
import { useFonts } from 'expo-font';
import { 
  Inter_400Regular, 
  Inter_500Medium, 
  Inter_700Bold, 
  Inter_800ExtraBold 
} from '@expo-google-fonts/inter';
import { 
  Cormorant_400Regular,
  Cormorant_600SemiBold,
  Cormorant_700Bold 
} from '@expo-google-fonts/cormorant';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import React, { useRef, useState, useEffect } from 'react';
import IntroAnimation from '../components/IntroAnimation';
import { useSosStore } from '../store/useSosStore';
import { connectToRelay } from '../services/GeoKadService';
import '../global.css';


export default function RootLayout() {
  useEffect(() => {
    // Auto-connect to relay on startup
    // TODO: Make this configurable via the UI. For now hardcoded.
    // Change this IP to your laptop's IP when testing.
    connectToRelay('10.96.63.200:3002');
  }, []);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_700Bold,
    Inter_800ExtraBold,
    Cormorant_400Regular,
    Cormorant_600SemiBold,
    Cormorant_700Bold
  });

  const hasShownIntro = useRef(false);
  const [showIntro, setShowIntro] = useState(true);
  
  const sosCenterY = useSosStore(s => s.introSosCenterY);

  if (!fontsLoaded) return null;

  return (
    <View style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" backgroundColor="transparent" translucent />
      <Slot />
      {showIntro && !hasShownIntro.current && (
        <IntroAnimation 
          sosCenterY={sosCenterY}
          onComplete={() => {
            hasShownIntro.current = true;
            setShowIntro(false);
          }} 
        />
      )}
    </View>
  );
}
