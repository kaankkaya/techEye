import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import HapticButton from './HapticButton';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import { detectObjects } from '../detection/detectionService';
import { initModels } from '../detection/mlPipeline';
import { speak, stopSpeaking } from '../tts/ttsService';
import {
  buildAnnouncement,
  isCloseEnough,
  prioritizeDetections,
  DetectedObject,
} from '../utils/announcementUtils';
import { useTheme } from '../theme/ThemeContext';
import { FontAwesome6 } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const DETECTION_INTERVAL_MS = 1000;

const BBOX_COLORS: Record<string, string> = {
  person:  '#00FF88',
  car:     '#FF4444',
  dog:     '#FFD700',
  bicycle: '#00CFFF',
  truck:   '#FF8C00',
  bus:     '#FF69B4',
  cat:     '#BF5FFF',
};

export default function CameraScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Başlamak için Tara\'ya basın');
  const [devMode, setDevMode] = useState(false);
  const [debugDetections, setDebugDetections] = useState<DetectedObject[]>([]);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const cameraRef = useRef<CameraView>(null);
  const cameraReady = useRef(false);
  const scanningRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const devModeRef = useRef(false);

  const scheduleNext = useCallback(() => {
    if (!scanningRef.current) return;
    timeoutRef.current = setTimeout(runDetectionLoop, DETECTION_INTERVAL_MS);
  }, []);

  const runDetectionLoop = useCallback(async () => {
    if (!scanningRef.current) return;

    if (!cameraRef.current || !cameraReady.current) {
      scheduleNext();
      return;
    }

    let photo;
    try {
      photo = await cameraRef.current.takePictureAsync({
        base64: false,
        quality: 0.4,
        skipProcessing: true,
        shutterSound: false,
      });
    } catch (err: any) {
      console.warn('[TechEye] Frame capture failed:', err?.message ?? err);
      scheduleNext();
      return;
    }

    if (!photo?.uri || !photo.width || !photo.height) {
      scheduleNext();
      return;
    }

    try {
      const detected = await detectObjects(photo.uri, photo.width, photo.height);

      if (devModeRef.current) {
        setDebugDetections(detected);
      }

      const close = detected.filter(isCloseEnough);
      const sorted = prioritizeDetections(close);

      if (sorted.length > 0) {
        const top = sorted[0];
        const message = buildAnnouncement(top);
        console.log(`[TechEye] Announcing: "${message}"`);
        setStatusText(message);
        await speak(message, top.label);
      } else {
        setStatusText('');
      }
    } catch (err: any) {
      console.warn('[TechEye] Detection error:', err?.message ?? err);
    }

    scheduleNext();
  }, [scheduleNext]);

  const startScanning = useCallback(async () => {
    setStatusText('Modeller hazırlanıyor…');
    try {
      await initModels();
    } catch (e) {
      console.error('[TechEye] Model yükleme hatası:', e);
      setStatusText('Model yüklenemedi — .onnx dosyaları eksik');
      return;
    }
    scanningRef.current = true;
    setIsScanning(true);
    setStatusText('Taranıyor…');
    speak('Tarama başladı');
    runDetectionLoop();
  }, [runDetectionLoop]);

  const stopScanning = useCallback(() => {
    scanningRef.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsScanning(false);
    setDebugDetections([]);
    setStatusText('Tarama durduruldu');
    stopSpeaking();
    speak('Tarama durduruldu');
  }, []);

  const toggleDevMode = useCallback(() => {
    const next = !devModeRef.current;
    devModeRef.current = next;
    setDevMode(next);
    if (!next) setDebugDetections([]);
  }, []);


  useEffect(() => {
    return () => {
      scanningRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.permissionText, { color: theme.text }]}>
          TechEye'ın çalışması için kamera erişimi gereklidir.
        </Text>
        <HapticButton
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={requestPermission}
          accessibilityLabel="Kameraya izin ver"
          accessibilityRole="button"
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>Kameraya İzin Ver</Text>
        </HapticButton>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={'back' as CameraType}
        onCameraReady={() => { cameraReady.current = true; }}
      />

      {/* Bounding box overlay — sadece dev mode açıkken */}
      {devMode && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {debugDetections.map((det, i) => {
            if (!det.boundingBox) return null;
            const { left, top, width, height } = det.boundingBox;
            const color = BBOX_COLORS[det.label] ?? theme.text;
            const distLabel = det.distanceMeters && det.distanceMeters > 0
              ? `${det.distanceMeters.toFixed(1)}m`
              : '—';
            return (
              <View
                key={i}
                style={[styles.bbox, {
                  left:        left   * screenWidth,
                  top:         top    * screenHeight,
                  width:       width  * screenWidth,
                  height:      height * screenHeight,
                  borderColor: color,
                }]}
              >
                <View style={[styles.bboxLabel, { backgroundColor: color }]}>
                  <Text style={styles.bboxLabelText}>
                    {det.label}  {(det.confidence * 100).toFixed(0)}%  {distLabel}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Dev mode toggle — sağ üst köşe */}
      <HapticButton
        style={[
          styles.devButton,
          { borderColor: theme.border, backgroundColor: theme.accentSoft },
          devMode && { borderColor: theme.accent, backgroundColor: theme.accentSoft },
        ]}
        onPress={toggleDevMode}
        accessibilityLabel="Dev mode toggle"
      >
        <Text style={[styles.devButtonText, { color: devMode ? theme.accent : theme.textSecondary }]}>
          DEV
        </Text>
      </HapticButton>

      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <FontAwesome6
          name="eye-low-vision"
          size={36}
          color={theme.accent}
          style={styles.appIcon}
        />
        <Text
          style={[styles.statusText, { color: theme.text }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={statusText}
        >
          {statusText}
        </Text>

        <HapticButton
          style={[
            styles.button,
            { backgroundColor: isScanning ? theme.danger : theme.accent },
          ]}
          onPress={isScanning ? stopScanning : startScanning}
          accessibilityLabel={isScanning ? 'Taramayı durdur' : 'Taramayı başlat'}
          accessibilityRole="button"
          onPressIn={() => {}}
        >
          <Text style={[styles.buttonText, { color: theme.text }]}>
            {isScanning ? 'Durdur' : 'Tara'}
          </Text>
        </HapticButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 20,
    paddingBottom: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  appIcon: {
    marginBottom: 16,
  },
  statusText: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 30,
  },
  permissionText: {
    fontSize: 20,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 32,
    lineHeight: 28,
  },
  button: {
    width: 160,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
  },
  devButton: {
    position: 'absolute',
    top: 56,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  devButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 1,
  },
  bbox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 2,
  },
  bboxLabel: {
    position: 'absolute',
    top: -22,
    left: -1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bboxLabelText: {
    color: '#000000',
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
  },
});
