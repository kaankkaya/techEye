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
} from 'react-native';
import HapticButton from './HapticButton';
import AppText from './AppText';
import * as Speech from 'expo-speech';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getTurkishVoices, saveVoice, loadSavedVoice } from '../tts/ttsService';
import {
  DistanceUnit,
  UNIT_LABELS,
  loadSavedUnit,
  saveUnit,
} from '../utils/unitService';

const PREVIEW_TEXT = 'Selam, ben yeni asistanınız.';
const UNIT_OPTIONS: DistanceUnit[] = ['metre', 'adim'];

type Props = { onClose: () => void };

export default function SettingsScreen({ onClose }: Props) {
  const theme = useTheme();
  const [voices, setVoices]             = useState<Speech.Voice[]>([]);
  const [selectedId, setSelectedId]     = useState<string | undefined>();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [unit, setUnit]                 = useState<DistanceUnit>('metre');
  const [unitPickerVisible, setUnitPickerVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const [turkishVoices, savedId, savedUnit] = await Promise.all([
        getTurkishVoices(),
        loadSavedVoice(),
        loadSavedUnit(),
      ]);
      const sorted = [...turkishVoices].sort((a, b) => {
        if (a.quality === b.quality) return a.name.localeCompare(b.name);
        return a.quality === Speech.VoiceQuality.Enhanced ? -1 : 1;
      });
      setVoices(sorted);
      setSelectedId(savedId ?? sorted[0]?.identifier);
      setUnit(savedUnit);
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

        {/* Ses bölümü */}
        <View style={[styles.sectionHeader, { borderBottomColor: theme.border, marginTop: 24 }]}>
          <FontAwesome6 name="microphone" size={14} color={theme.accent} />
          <AppText weight="bold" size={13} style={{ color: theme.textSecondary, letterSpacing: 0.8 }}>
            SES
          </AppText>
        </View>

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
