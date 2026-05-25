import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import HapticButton from './HapticButton';
import * as Speech from 'expo-speech';
import { FontAwesome6 } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { getTurkishVoices, saveVoice, loadSavedVoice } from '../tts/ttsService';

const PREVIEW_TEXT = 'Selam, ben yeni asistanınız.';

function openAccessibilityVoices() {
  Alert.alert(
    'Diğer Seslere Nasıl Ulaşılır?',
    'Ayarlar → Erişilebilirlik → Konuşulan İçerik → Sesler → Türkçe\n\nBuradan Enhanced veya Premium ses indirip listeye ekleyebilirsiniz.',
    [{ text: 'Tamam' }],
  );
}

type Props = { onDone: () => void };

export default function VoicePickerScreen({ onDone }: Props) {
  const theme = useTheme();
  const [voices, setVoices]         = useState<Speech.Voice[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const [turkishVoices, savedId] = await Promise.all([
        getTurkishVoices(),
        loadSavedVoice(),
      ]);

      // Enhanced sesleri önce göster
      const sorted = [...turkishVoices].sort((a, b) => {
        if (a.quality === b.quality) return a.name.localeCompare(b.name);
        return a.quality === Speech.VoiceQuality.Enhanced ? -1 : 1;
      });

      setVoices(sorted);
      setSelectedId(savedId ?? sorted[0]?.identifier);
      setLoading(false);
    })();
  }, []);

  const preview = useCallback((voice: Speech.Voice) => {
    Speech.stop();
    setPreviewingId(voice.identifier);
    Speech.speak(PREVIEW_TEXT, {
      language: 'tr-TR',
      rate: 0.9,
      voice: voice.identifier,
      onDone: () => setPreviewingId(null),
      onStopped: () => setPreviewingId(null),
      onError: () => setPreviewingId(null),
    });
  }, []);

  const confirm = useCallback(async () => {
    Speech.stop();
    await saveVoice(selectedId);
    onDone();
  }, [selectedId, onDone]);

  const skip = useCallback(() => {
    Speech.stop();
    onDone();
  }, [onDone]);

  const renderItem = useCallback(({ item }: { item: Speech.Voice }) => {
    const isSelected  = item.identifier === selectedId;
    const isPreviewing = item.identifier === previewingId;
    const isEnhanced  = item.quality === Speech.VoiceQuality.Enhanced;

    return (
      <HapticButton
        style={[
          styles.voiceRow,
          { borderColor: isSelected ? theme.accent : theme.border,
            backgroundColor: isSelected ? theme.accentSoft : 'transparent' },
        ]}
        onPress={() => setSelectedId(item.identifier)}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
      >
        <View style={styles.voiceInfo}>
          <View style={styles.voiceNameRow}>
            <Text style={[styles.voiceName, { color: theme.text }]}>{item.name}</Text>
            {isEnhanced && (
              <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                <Text style={styles.badgeText}>Enhanced</Text>
              </View>
            )}
          </View>
          <Text style={[styles.voiceLang, { color: theme.textSecondary }]}>{item.language}</Text>
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
  }, [selectedId, previewingId, theme, preview]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <FontAwesome6 name="eye-low-vision" size={36} color={theme.accent} />
        <Text style={[styles.title, { color: theme.text }]}>Ses Seç</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          TechEye'ın kullanacağı Türkçe sesi seçin.{'\n'}
          Sesleri dinlemek için ▶ tuşuna basın.
        </Text>
        <HapticButton
          onPress={openAccessibilityVoices}
          accessibilityLabel="Erişilebilirlik ayarlarında diğer seslere göz at"
          accessibilityRole="link"
        >
          <Text style={[styles.settingsLink, { color: theme.textSecondary }]}>
            Diğer seslere göz at
          </Text>
        </HapticButton>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={theme.accent} style={styles.loader} />
      ) : voices.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textSecondary }]}>
          Cihazda yüklü Türkçe ses bulunamadı.{'\n'}
          Ayarlar → Erişilebilirlik → Sesler → Türkçe bölümünden indirin.
        </Text>
      ) : (
        <FlatList
          data={voices}
          keyExtractor={v => v.identifier}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <HapticButton
          style={[styles.btn, styles.btnSkip, { borderColor: theme.border }]}
          onPress={skip}
          accessibilityLabel="Atla"
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, { color: theme.textSecondary }]}>Atla</Text>
        </HapticButton>

        <HapticButton
          style={[styles.btn, { backgroundColor: theme.accent }]}
          onPress={confirm}
          accessibilityLabel="Seçimi onayla"
          accessibilityRole="button"
        >
          <Text style={[styles.btnText, { color: '#fff' }]}>Seç ve Devam Et</Text>
        </HapticButton>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 24,
    paddingHorizontal: 24,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  settingsLink: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
  loader: { flex: 1 },
  empty: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
    paddingTop: 32,
  },
  list: { paddingHorizontal: 16, paddingBottom: 16 },
  voiceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 6,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  voiceInfo: { flex: 1 },
  voiceNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  voiceName: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
  },
  voiceLang: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginTop: 2,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    color: '#fff',
  },
  previewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  check: { marginLeft: 4 },
  footer: {
    flexDirection: 'row',
    gap: 12,
    padding: 24,
    paddingBottom: 48,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSkip: {
    borderWidth: 1.5,
  },
  btnText: {
    fontSize: 17,
    fontFamily: 'Inter_700Bold',
  },
});
