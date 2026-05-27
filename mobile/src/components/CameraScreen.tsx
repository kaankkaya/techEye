import { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  useWindowDimensions,
  Modal,
} from 'react-native';
import HapticButton from './HapticButton';
import AppText from './AppText';
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
import { evaluateProximityHaptics } from '../utils/proximityHaptics';
import { useTheme } from '../theme/ThemeContext';
import { FontAwesome6 } from '@expo/vector-icons';
import SettingsScreen from './SettingsScreen';
import ScanningEye from './ScanningEye';

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
  const [settingsOpen, setSettingsOpen] = useState(false);
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

      evaluateProximityHaptics(detected);

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
      <View style={[styles.container, styles.permissionContainer, { backgroundColor: theme.background }]}>
        <FontAwesome6 name="camera" size={48} color={theme.accent} style={styles.permissionIcon} />
        <AppText weight="bold" size={26} style={[styles.permissionTitle, { color: theme.text }]}>
          Kamera Erişimi
        </AppText>
        <AppText size={18} style={[styles.permissionText, { color: theme.textSecondary }]}>
          TechEye çevrendeki nesneleri algılamak için kameraya ihtiyaç duyar.
        </AppText>
        <HapticButton
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={requestPermission}
          accessibilityLabel="Kameraya izin ver"
          accessibilityRole="button"
        >
          <AppText weight="bold" size={20} style={{ color: theme.text }}>
            İzin Ver
          </AppText>
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
                  <AppText weight="bold" size={11} style={{ color: '#000000' }}>
                    {det.label}  {(det.confidence * 100).toFixed(0)}%  {distLabel}
                  </AppText>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <HapticButton
        haptic="light"
        style={[styles.settingsButton, { borderColor: theme.border, backgroundColor: theme.accentSoft }]}
        onPress={() => { stopScanning(); setSettingsOpen(true); }}
        accessibilityLabel="Ayarları aç"
        accessibilityRole="button"
      >
        <FontAwesome6 name="gear" size={18} color={theme.textSecondary} />
      </HapticButton>

      <HapticButton
        haptic="selection"
        style={[
          styles.devButton,
          { borderColor: theme.border, backgroundColor: theme.accentSoft },
          devMode && { borderColor: theme.accent },
        ]}
        onPress={toggleDevMode}
        accessibilityLabel="Dev mode toggle"
      >
        <AppText weight="bold" size={12} style={[styles.devButtonText, { color: devMode ? theme.accent : theme.textSecondary }]}>
          DEV
        </AppText>
      </HapticButton>

      <Modal
        visible={settingsOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSettingsOpen(false)}
      >
        <SettingsScreen onClose={() => setSettingsOpen(false)} />
      </Modal>

      <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
        <ScanningEye isScanning={isScanning} style={styles.appIcon} />
        <AppText
          weight="bold"
          size={22}
          style={[styles.statusText, { color: theme.text }]}
          accessibilityLiveRegion="polite"
          accessibilityLabel={statusText}
        >
          {statusText}
        </AppText>

        <HapticButton
          style={[
            styles.button,
            isScanning
              ? { backgroundColor: theme.accent }
              : { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.accent },
          ]}
          onPress={isScanning ? stopScanning : startScanning}
          accessibilityLabel={isScanning ? 'Taramayı durdur' : 'Taramayı başlat'}
          accessibilityRole="button"
          onPressIn={() => {}}
        >
          <AppText weight="bold" size={22} style={{ color: isScanning ? theme.text : theme.textSecondary }}>
            {isScanning ? 'Durdur' : 'Tara'}
          </AppText>
        </HapticButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingBottom: 48,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  permissionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 16,
  },
  permissionIcon: { marginBottom: 8 },
  permissionTitle: { textAlign: 'center' },
  permissionText: {
    textAlign: 'center',
    lineHeight: 28,
    marginBottom: 8,
  },
  appIcon: { marginBottom: 16 },
  statusText: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 30,
  },
  permissionText: {
    textAlign: 'center',
    marginHorizontal: 32,
    marginBottom: 32,
    lineHeight: 28,
  },
  button: {
    alignSelf: 'stretch',
    height: 64,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButton: {
    position: 'absolute',
    top: 56,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
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
  devButtonText: { letterSpacing: 1 },
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
});
