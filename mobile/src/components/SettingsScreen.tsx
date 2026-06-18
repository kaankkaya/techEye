import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Switch,
} from 'react-native';
import HapticButton from './HapticButton';
import AppText from './AppText';
import * as Speech from 'expo-speech';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getTurkishVoices, saveVoice, loadSavedVoice, saveRate, loadSavedRate } from '../tts/ttsService';
import {
  DistanceUnit,
  UNIT_LABELS,
  loadSavedUnit,
  saveUnit,
} from '../utils/unitService';
import {
  DisplayMode,
  DISPLAY_MODE_LABELS,
  DISPLAY_MODE_OPTIONS,
  loadDisplayMode,
  saveDisplayMode,
} from '../utils/displayService';
import {
  loadHapticEnabled,
  saveHapticEnabled,
} from '../utils/proximityHaptics';
import {
  loadDirectionEnabled,
  saveDirectionEnabled,
} from '../utils/directionService';
import {
  ScanFrequency,
  SCAN_FREQ_OPTIONS,
  SCAN_FREQ_LABELS,
  loadScanFrequency,
  saveScanFrequency,
} from '../utils/scanFrequencyService';

const PREVIEW_TEXT = 'Selam, ben yeni asistanınız.';
const UNIT_OPTIONS: DistanceUnit[] = ['metre', 'adim'];

type TtsRate = 0.6 | 0.8 | 0.9 | 1.1 | 1.3;
const TTS_RATE_OPTIONS: TtsRate[] = [0.6, 0.8, 0.9, 1.1, 1.3];
const TTS_RATE_LABELS: Record<TtsRate, string> = {
  0.6: 'Çok Yavaş',
  0.8: 'Yavaş',
  0.9: 'Normal',
  1.1: 'Hızlı',
  1.3: 'Çok Hızlı',
};


type Props = { onClose: () => void };

export default function SettingsScreen({ onClose }: Props) {
  const theme = useTheme();
  const [voices, setVoices]             = useState<Speech.Voice[]>([]);
  const [selectedId, setSelectedId]     = useState<string | undefined>();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [unit, setUnit]                 = useState<DistanceUnit>('metre');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);
  const [hapticOn, setHapticOn]         = useState(true);
  const [displayMode, setDisplayMode]   = useState<DisplayMode>('gelismis');
  const [displayPickerVisible, setDisplayPickerVisible] = useState(false);
  const [ttsRate, setTtsRate]           = useState<TtsRate>(0.9);
  const [ratePickerVisible, setRatePickerVisible] = useState(false);
  const [directionOn, setDirectionOn]   = useState(true);
  const [scanFreq, setScanFreq]         = useState<ScanFrequency>(2);
  const [freqPickerVisible, setFreqPickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [turkishVoices, savedId, savedUnit, savedHaptic, savedDisplay, savedRate, savedDirection, savedFreq] = await Promise.all([
        getTurkishVoices(),
        loadSavedVoice(),
        loadSavedUnit(),
        loadHapticEnabled(),
        loadDisplayMode(),
        loadSavedRate(),
        loadDirectionEnabled(),
        loadScanFrequency(),
      ]);
      const sorted = [...turkishVoices].sort((a, b) => {
        if (a.quality === b.quality) return a.name.localeCompare(b.name);
        return a.quality === Speech.VoiceQuality.Enhanced ? -1 : 1;
      });
      setVoices(sorted);
      setSelectedId(savedId ?? sorted[0]?.identifier);
      setUnit(savedUnit);
      setHapticOn(savedHaptic);
      setDirectionOn(savedDirection);
      setScanFreq(savedFreq);
      setDisplayMode(savedDisplay);
      const closest = TTS_RATE_OPTIONS.reduce((prev, cur) =>
        Math.abs(cur - savedRate) < Math.abs(prev - savedRate) ? cur : prev
      );
      setTtsRate(closest);
      setLoading(false);
    })();
  }, []);

  const selectVoice = useCallback(async (id: string) => {
    setSelectedId(id);
    await saveVoice(id);
  }, []);

  const selectUnit = useCallback(async (u: DistanceUnit) => {
    setUnit(u);
    setUnitPickerVisible(false);
    await saveUnit(u);
  }, []);

  const selectDisplayMode = useCallback(async (mode: DisplayMode) => {
    setDisplayMode(mode);
    setDisplayPickerVisible(false);
    await saveDisplayMode(mode);
  }, []);

  const toggleHaptic = useCallback(async (value: boolean) => {
    setHapticOn(value);
    await saveHapticEnabled(value);
  }, []);

  const toggleDirection = useCallback(async (value: boolean) => {
    setDirectionOn(value);
    await saveDirectionEnabled(value);
  }, []);

  const selectRate = useCallback(async (rate: TtsRate) => {
    setTtsRate(rate);
    setRatePickerVisible(false);
    await saveRate(rate);
  }, []);

  const selectScanFreq = useCallback(async (freq: ScanFrequency) => {
    setScanFreq(freq);
    setFreqPickerVisible(false);
    await saveScanFrequency(freq);
  }, []);

  const preview = useCallback((voice: Speech.Voice) => {
    Speech.stop();
    setPreviewingId(voice.identifier);
    Speech.speak(PREVIEW_TEXT, {
      language: 'tr-TR',
      rate: 0.9,
      voice: voice.identifier,
      onDone:    () => setPreviewingId(null),
      onStopped: () => setPreviewingId(null),
      onError:   () => setPreviewingId(null),
    });
  }, []);

  const handleClose = useCallback(() => {
    Speech.stop();
    onClose();
  }, [onClose]);

  const renderVoiceItem = useCallback(({ item }: { item: Speech.Voice }) => {
    const isSelected   = item.identifier === selectedId;
    const isPreviewing = item.identifier === previewingId;
    const isEnhanced   = item.quality === Speech.VoiceQuality.Enhanced;

    return (
      <HapticButton
        style={[
          styles.voiceRow,
          {
            borderColor: isSelected ? theme.accent : theme.border,
            backgroundColor: isSelected ? theme.accentSoft : 'transparent',
          },
        ]}
        onPress={() => selectVoice(item.identifier)}
        accessibilityLabel={item.name}
        accessibilityHint="Bu sesi eyeTech için seçer"
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
      >
        <View style={styles.voiceInfo}>
          <View style={styles.voiceNameRow}>
            <AppText weight="bold" size={17} style={{ color: theme.text }}>
              {item.name}
            </AppText>
            {isEnhanced && (
              <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                <AppText weight="bold" size={11} style={{ color: '#fff' }}>
                  Enhanced
                </AppText>
              </View>
            )}
          </View>
          <AppText size={13} style={[styles.voiceLang, { color: theme.textSecondary }]}>
            {item.language}
          </AppText>
        </View>

        <HapticButton
          style={[styles.previewBtn, { borderColor: theme.border }]}
          onPress={() => preview(item)}
          accessibilityLabel={`${item.name} sesini dinle`}
          accessibilityHint="Seçmeden önce sesi kısa bir örnekle dinler"
        >
          {isPreviewing
            ? <ActivityIndicator size="small" color={theme.accent} />
            : <FontAwesome6 name="play" size={14} color={theme.accent} />
          }
        </HapticButton>

        {isSelected && (
          <FontAwesome6 name="circle-check" size={22} color={theme.accent} style={styles.check} />
        )}
      </HapticButton>
    );
  }, [selectedId, previewingId, theme, preview, selectVoice]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerSpacer} />
        <AppText weight="bold" size={22} style={{ color: theme.text }}>
          Ayarlar
        </AppText>
        <HapticButton
          haptic="light"
          style={styles.closeBtn}
          onPress={handleClose}
          accessibilityLabel="Ayarları kapat"
          accessibilityHint="Ayarlar ekranını kapatır ve kamera ekranına döner"
          accessibilityRole="button"
        >
          <FontAwesome6 name="xmark" size={20} color={theme.text} />
        </HapticButton>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Genel bölümü */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border }]}>
          <FontAwesome6 name="sliders" size={14} color={theme.accent} />
          <AppText weight="bold" size={13} style={{ color: theme.textSecondary, letterSpacing: 0.8 }}>
            GENEL
          </AppText>
        </View>

        {/* Birim satırı */}
        <HapticButton
          haptic="light"
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => setUnitPickerVisible(true)}
          accessibilityLabel={`Birim: ${UNIT_LABELS[unit]}`}
          accessibilityHint="Mesafe gösterim birimini değiştirir"
          accessibilityRole="button"
        >
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="ruler" size={14} color={theme.accent} />
            </View>
            <AppText weight="bold" size={17} style={{ color: theme.text }}>
              Birim
            </AppText>
          </View>
          <View style={styles.settingRowRight}>
            <AppText size={17} style={{ color: theme.textSecondary }}>
              {UNIT_LABELS[unit]}
            </AppText>
            <FontAwesome6 name="chevron-right" size={13} color={theme.textSecondary} />
          </View>
        </HapticButton>

        {/* Tarama sıklığı satırı */}
        <HapticButton
          haptic="light"
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => setFreqPickerVisible(true)}
          accessibilityLabel={`Tarama sıklığı: ${SCAN_FREQ_LABELS[scanFreq]}`}
          accessibilityHint="Saniyedeki detection sayısını değiştirir"
          accessibilityRole="button"
        >
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="rotate" size={14} color={theme.accent} />
            </View>
            <AppText weight="bold" size={17} style={{ color: theme.text }}>
              Tarama Sıklığı
            </AppText>
          </View>
          <View style={styles.settingRowRight}>
            <AppText size={17} style={{ color: theme.textSecondary }}>
              {SCAN_FREQ_LABELS[scanFreq]}
            </AppText>
            <FontAwesome6 name="chevron-right" size={13} color={theme.textSecondary} />
          </View>
        </HapticButton>

        {/* Haptic satırı */}
        <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="hand-pointer" size={14} color={theme.accent} />
            </View>
            <View>
              <AppText weight="bold" size={17} style={{ color: theme.text }}>
                Titreşim
              </AppText>
              <AppText size={13} style={{ color: theme.textSecondary, marginTop: 2 }}>
                Yakın nesne uyarısı
              </AppText>
            </View>
          </View>
          <Switch
            value={hapticOn}
            onValueChange={toggleHaptic}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Titreşim uyarısını aç veya kapat"
            accessibilityHint="Yakın bir nesne algılandığında cihaz titreşir"
            accessibilityRole="switch"
          />
        </View>

        {/* Yön bölümü */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border, marginTop: 24 }]}>
          <FontAwesome6 name="compass" size={14} color={theme.accent} />
          <AppText weight="bold" size={13} style={{ color: theme.textSecondary, letterSpacing: 0.8 }}>
            YÖN
          </AppText>
        </View>

        <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="left-right" size={14} color={theme.accent} />
            </View>
            <View>
              <AppText weight="bold" size={17} style={{ color: theme.text }}>
                Yön Bildirimi
              </AppText>
              <AppText size={13} style={{ color: theme.textSecondary, marginTop: 2 }}>
                Sağınız, solunuz, önünüz
              </AppText>
            </View>
          </View>
          <Switch
            value={directionOn}
            onValueChange={toggleDirection}
            trackColor={{ false: theme.border, true: theme.accent }}
            thumbColor="#FFFFFF"
            accessibilityLabel="Yön bildirimini aç veya kapat"
            accessibilityHint="Nesnenin sağda, solda veya önde olduğunu sesli bildirir"
            accessibilityRole="switch"
          />
        </View>

        {/* Görüntü bölümü */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border, marginTop: 24 }]}>
          <FontAwesome6 name="display" size={14} color={theme.accent} />
          <AppText weight="bold" size={13} style={{ color: theme.textSecondary, letterSpacing: 0.8 }}>
            GÖRÜNTÜ
          </AppText>
        </View>

        <HapticButton
          haptic="light"
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => setDisplayPickerVisible(true)}
          accessibilityLabel={`Tarama ekranı: ${DISPLAY_MODE_LABELS[displayMode]}`}
          accessibilityHint="Kamera ekranının HUD görünümünü değiştirir"
          accessibilityRole="button"
        >
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="eye" size={14} color={theme.accent} />
            </View>
            <AppText weight="bold" size={17} style={{ color: theme.text }}>
              Tarama ekranı
            </AppText>
          </View>
          <View style={styles.settingRowRight}>
            <AppText size={17} style={{ color: theme.textSecondary }}>
              {DISPLAY_MODE_LABELS[displayMode]}
            </AppText>
            <FontAwesome6 name="chevron-right" size={13} color={theme.textSecondary} />
          </View>
        </HapticButton>

        {/* Ses bölümü */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border, marginTop: 24 }]}>
          <FontAwesome6 name="microphone" size={14} color={theme.accent} />
          <AppText weight="bold" size={13} style={{ color: theme.textSecondary, letterSpacing: 0.8 }}>
            SES
          </AppText>
        </View>

        {/* TTS Hız satırı */}
        <HapticButton
          haptic="light"
          style={[styles.settingRow, { borderBottomColor: theme.border }]}
          onPress={() => setRatePickerVisible(true)}
          accessibilityLabel={`Konuşma hızı: ${TTS_RATE_LABELS[ttsRate]}`}
          accessibilityHint="Sesli anlatım hızını değiştirir"
          accessibilityRole="button"
        >
          <View style={styles.settingRowLeft}>
            <View style={[styles.settingIcon, { backgroundColor: theme.accentSoft }]}>
              <FontAwesome6 name="gauge-high" size={14} color={theme.accent} />
            </View>
            <AppText weight="bold" size={17} style={{ color: theme.text }}>
              Konuşma Hızı
            </AppText>
          </View>
          <View style={styles.settingRowRight}>
            <AppText size={17} style={{ color: theme.textSecondary }}>
              {TTS_RATE_LABELS[ttsRate]}
            </AppText>
            <FontAwesome6 name="chevron-right" size={13} color={theme.textSecondary} />
          </View>
        </HapticButton>

        {loading ? (
          <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
        ) : voices.length === 0 ? (
          <AppText size={16} style={[styles.empty, { color: theme.textSecondary }]}>
            Cihazda yüklü Türkçe ses bulunamadı.{'\n'}
            Ayarlar → Erişilebilirlik → Sesler → Türkçe bölümünden indirin.
          </AppText>
        ) : (
          <View style={styles.list}>
            {voices.map(item => (
              <View key={item.identifier}>
                {renderVoiceItem({ item })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Birim picker modal */}
      <Modal
        visible={unitPickerVisible}
        transparent
        animationType="fade"
        accessibilityViewIsModal
        onRequestClose={() => setUnitPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setUnitPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText weight="bold" size={15} style={[styles.pickerTitle, { color: theme.textSecondary }]}>
                  Birim Seç
                </AppText>
                {UNIT_OPTIONS.map((opt, i) => (
                  <HapticButton
                    key={opt}
                    style={[
                      styles.pickerOption,
                      { borderTopColor: theme.border },
                      i === 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => selectUnit(opt)}
                    accessibilityLabel={UNIT_LABELS[opt]}
                    accessibilityHint="Uzaklıkları bu birimde gösterir"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: unit === opt }}
                  >
                    <AppText
                      weight={unit === opt ? 'bold' : 'regular'}
                      size={18}
                      style={{ color: unit === opt ? theme.accent : theme.text }}
                    >
                      {UNIT_LABELS[opt]}
                    </AppText>
                    {unit === opt && (
                      <FontAwesome6 name="check" size={16} color={theme.accent} />
                    )}
                  </HapticButton>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Display mode picker modal */}
      <Modal
        visible={displayPickerVisible}
        transparent
        animationType="fade"
        accessibilityViewIsModal
        onRequestClose={() => setDisplayPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDisplayPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText weight="bold" size={15} style={[styles.pickerTitle, { color: theme.textSecondary }]}>
                  Tarama Ekranı
                </AppText>
                {DISPLAY_MODE_OPTIONS.map((opt, i) => (
                  <HapticButton
                    key={opt}
                    style={[
                      styles.pickerOption,
                      { borderTopColor: theme.border },
                      i === 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => selectDisplayMode(opt)}
                    accessibilityLabel={DISPLAY_MODE_LABELS[opt]}
                    accessibilityHint="Tarama ekranı görünümünü bu moda geçirir"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: displayMode === opt }}
                  >
                    <AppText
                      weight={displayMode === opt ? 'bold' : 'regular'}
                      size={18}
                      style={{ color: displayMode === opt ? theme.accent : theme.text }}
                    >
                      {DISPLAY_MODE_LABELS[opt]}
                    </AppText>
                    {displayMode === opt && (
                      <FontAwesome6 name="check" size={16} color={theme.accent} />
                    )}
                  </HapticButton>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* Tarama sıklığı picker modal */}
      <Modal
        visible={freqPickerVisible}
        transparent
        animationType="fade"
        accessibilityViewIsModal
        onRequestClose={() => setFreqPickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setFreqPickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText weight="bold" size={15} style={[styles.pickerTitle, { color: theme.textSecondary }]}>
                  Tarama Sıklığı
                </AppText>
                {SCAN_FREQ_OPTIONS.map((opt, i) => (
                  <HapticButton
                    key={opt}
                    style={[
                      styles.pickerOption,
                      { borderTopColor: theme.border },
                      i === 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => selectScanFreq(opt)}
                    accessibilityLabel={SCAN_FREQ_LABELS[opt]}
                    accessibilityHint="Nesne algılama bu sıklıkta çalışır"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: scanFreq === opt }}
                  >
                    <AppText
                      weight={scanFreq === opt ? 'bold' : 'regular'}
                      size={18}
                      style={{ color: scanFreq === opt ? theme.accent : theme.text }}
                    >
                      {SCAN_FREQ_LABELS[opt]}
                    </AppText>
                    {scanFreq === opt && (
                      <FontAwesome6 name="check" size={16} color={theme.accent} />
                    )}
                  </HapticButton>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* TTS hız picker modal */}
      <Modal
        visible={ratePickerVisible}
        transparent
        animationType="fade"
        accessibilityViewIsModal
        onRequestClose={() => setRatePickerVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setRatePickerVisible(false)}>
          <View style={styles.pickerOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.pickerCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <AppText weight="bold" size={15} style={[styles.pickerTitle, { color: theme.textSecondary }]}>
                  Konuşma Hızı
                </AppText>
                {TTS_RATE_OPTIONS.map((opt, i) => (
                  <HapticButton
                    key={opt}
                    style={[
                      styles.pickerOption,
                      { borderTopColor: theme.border },
                      i === 0 && { borderTopWidth: StyleSheet.hairlineWidth },
                    ]}
                    onPress={() => selectRate(opt)}
                    accessibilityLabel={TTS_RATE_LABELS[opt]}
                    accessibilityHint="Sesli anlatım bu hızda yapılır"
                    accessibilityRole="radio"
                    accessibilityState={{ checked: ttsRate === opt }}
                  >
                    <AppText
                      weight={ttsRate === opt ? 'bold' : 'regular'}
                      size={18}
                      style={{ color: ttsRate === opt ? theme.accent : theme.text }}
                    >
                      {TTS_RATE_LABELS[opt]}
                    </AppText>
                    {ttsRate === opt && (
                      <FontAwesome6 name="check" size={16} color={theme.accent} />
                    )}
                  </HapticButton>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerSpacer: { width: 44 },
  closeBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { marginTop: 32 },
  empty: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  list: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  voiceInfo: { flex: 1 },
  voiceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceLang: { marginTop: 2 },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  check: { marginLeft: 4 },
  // Picker
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  pickerCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  pickerTitle: {
    textAlign: 'center',
    paddingVertical: 14,
    letterSpacing: 0.5,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
