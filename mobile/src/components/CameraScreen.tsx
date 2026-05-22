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
  const [statusText, setStatusText] = useState('Tap Start to begin scanning');
  const cameraRef = useRef<CameraView>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runDetection = useCallback(async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.4,
        skipProcessing: true,
      });

      if (!photo?.base64 || !photo.width || !photo.height) return;

      const detected = await detectObjects(photo.base64, photo.width, photo.height);
      const close = detected.filter(isCloseEnough);
      const sorted = prioritizeDetections(close);

      if (sorted.length > 0) {
        const top = sorted[0];
        const message = buildAnnouncement(top);
        setStatusText(message);
        await speak(message, top.label);
      }
    } catch {
      // Silent failure — never crash the detection loop
    }
  }, []);

  const startScanning = useCallback(() => {
    setIsScanning(true);
    setStatusText('Scanning…');
    speak('Scanning started');
    intervalRef.current = setInterval(runDetection, DETECTION_INTERVAL_MS);
  }, [runDetection]);

  const stopScanning = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsScanning(false);
    setStatusText('Scanning stopped');
    stopSpeaking();
    speak('Scanning stopped');
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
          Camera access is required for TechEye to work.
        </Text>
        <TouchableOpacity
          style={styles.button}
          onPress={requestPermission}
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Allow Camera</Text>
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
          accessibilityLabel={isScanning ? 'Stop scanning' : 'Start scanning'}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {isScanning ? 'Stop' : 'Start'}
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
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 30,
  },
  permissionText: {
    color: '#FFFFFF',
    fontSize: 20,
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
    fontWeight: '700',
  },
});
