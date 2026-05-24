import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  AccessibilityInfo,
} from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { detectObjects } from '../detection/detectionService';
import { initModels } from '../detection/mlPipeline';
import { speak, stopSpeaking } from '../tts/ttsService';
import {
  buildAnnouncement,
  isCloseEnough,
  prioritizeDetections,
} from '../utils/announcementUtils';

const DETECTION_INTERVAL_MS = 1000;

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Başlamak için Tara\'ya basın');
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runDetection = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      console.log('[TechEye] Capturing frame...');
      const photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.4,
        skipProcessing: true,
        shutterSound: false,
      });

      if (!photo?.uri || !photo.width || !photo.height) {
        console.warn('[TechEye] Frame capture returned empty result');
        return;
      }

      console.log(`[TechEye] Frame captured (${photo.width}x${photo.height}), running local ML...`);
      const detected = await detectObjects(photo.uri, photo.width, photo.height);
      console.log(`[TechEye] API returned ${detected.length} detection(s):`, detected.map(d => `${d.label} (${(d.confidence * 100).toFixed(1)}%)`).join(', ') || 'none');

      const close = detected.filter(isCloseEnough);
      const sorted = prioritizeDetections(close);

      if (sorted.length > 0) {
        const top = sorted[0];
        const message = buildAnnouncement(top);
        console.log(`[TechEye] Announcing: "${message}"`);
        setStatusText(message);
        await speak(message, top.label);
      } else {
        console.log('[TechEye] No nearby objects detected, skipping announcement');
      }
    } catch (err: any) {
      const isNetworkError = err?.message?.toLowerCase().includes('network') ||
        err?.message?.toLowerCase().includes('hostname') ||
        err?.message?.toLowerCase().includes('fetch failed');
      const displayMsg = isNetworkError
        ? 'Ağ hatası — internet bağlantısını kontrol edin'
        : 'Algılama hatası — yeniden deneniyor…';
      console.error('[TechEye] Detection error:', err);
      setStatusText(displayMsg);
    }
  }, []);

  const startScanning = useCallback(async () => {
    console.log('[TechEye] Scanning session started');
    setStatusText('Modeller hazırlanıyor…');
    try {
      await initModels();
    } catch (e) {
      console.error('[TechEye] Model yükleme hatası:', e);
      setStatusText('Model yüklenemedi — .onnx dosyaları eksik');
      return;
    }
    setIsScanning(true);
    setStatusText('Taranıyor…');
    speak('Tarama başladı');
    intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
  }, [runDetection]);

  const stopScanning = useCallback(() => {
    console.log('[TechEye] Scanning session stopped');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
    setStatusText('Tarama durduruldu');
    stopSpeaking();
    speak('Tarama durduruldu');
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.permissionText}>
          TechEye'ın çalışması için kamera erişimi gereklidir.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
          accessibilityLabel="Kameraya izin ver"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Kameraya İzin Ver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back' as CameraType}
      />

      <View style={styles.overlay}>
        <Text
          style={styles.statusText}
          accessibilityLiveRegion="polite"
          accessibilityLabel={statusText}
        >
          {statusText}
        </Text>

        <TouchableOpacity
          style={[styles.button, isScanning && styles.buttonStop]}
          onPress={isScanning ? stopScanning : startScanning}
          accessibilityLabel={isScanning ? 'Taramayı durdur' : 'Taramayı başlat'}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Durdur' : 'Tara'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E1A',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(10, 14, 26, 0.75)',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 30,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 32,
    lineHeight: 28,
  },
  button: {
    backgroundColor: '#1A8FE3',
    width: 160,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonStop: {
    backgroundColor: '#E3401A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
});
