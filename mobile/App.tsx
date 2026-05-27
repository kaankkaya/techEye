import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import CameraScreen from './src/components/CameraScreen';
import VoicePickerScreen from './src/components/VoicePickerScreen';
import LoadingScreen from './src/components/LoadingScreen';
import { ThemeProvider } from './src/theme/ThemeContext';
import { initTTS, loadSavedVoice } from './src/tts/ttsService';
import { initUnit } from './src/utils/unitService';
import { initHaptics } from './src/utils/proximityHaptics';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [voicePicked, setVoicePicked] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      initTTS();
      initUnit();
      initHaptics();
      loadSavedVoice().then(id => {
        if (id) setVoicePicked(true);
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      {!loadingDone
        ? <LoadingScreen onDone={() => setLoadingDone(true)} />
        : voicePicked
          ? <CameraScreen />
          : <VoicePickerScreen onDone={() => setVoicePicked(true)} />
      }
    </ThemeProvider>
  );
}
