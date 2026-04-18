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
import React, { useRef, useState } from 'react';
import IntroAnimation from '../components/IntroAnimation';
import { useSosStore } from '../store/useSosStore';
import '../global.css';

// NOTE: initBLE() is called in app/(tabs)/index.tsx AFTER event listeners
// are registered. Do NOT call it here — it would fire BLE_READY before any
// listener is attached, permanently leaving the UI stuck at "initializing".

export default function RootLayout() {

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
