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
import { ThemeProvider } from './src/theme/ThemeContext';
import { initTTS } from './src/tts/ttsService';
import { initUnit } from './src/utils/unitService';

SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [voicePicked, setVoicePicked] = useState(false);

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
      initTTS();
      initUnit();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider>
      <StatusBar style="light" />
      {voicePicked
        ? <CameraScreen />
        : <VoicePickerScreen onDone={() => setVoicePicked(true)} />
      }
    </ThemeProvider>
  );
}
