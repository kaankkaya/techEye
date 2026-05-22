# TechEye — PROD_SPEC.md

Mobil uygulamanın tasarım sistemi, ekran yapısı, bileşen davranışları ve iş mantığı bu dosyada tanımlanır. React Native kodu yazılırken bu dosya referans alınır.

---

## Uygulama Kimliği

| Alan | Değer |
|---|---|
| App Name | TechEye |
| Bundle ID (iOS) | com.anonymous.techeye |
| Slug | techeye |
| Versiyon | 1.0.0 |
| Yönlendirme | Portrait only |
| Dil | Türkçe |

---

## Tasarım Sistemi

### Renk Paleti

| Token | Hex | Kullanım |
|---|---|---|
| `background` | `#0A0E1A` | Tüm ekranların arka planı |
| `overlay` | `rgba(10, 14, 26, 0.75)` | Kamera üzerindeki kontrol paneli |
| `primary` | `#1A8FE3` | Start butonu, vurgu rengi |
| `danger` | `#E3401A` | Stop butonu |
| `text` | `#FFFFFF` | Tüm metinler |

### Tipografi

**Font: Inter** — Uygulamalarda yaygın olarak kullanılan, okunabilirliği yüksek, Türkçe karakter desteği tam olan modern bir sans-serif font. `@expo-google-fonts/inter` paketi ile yüklenir.

| Kullanım | Font Family | Font Size | Font Weight | Line Height |
|---|---|---|---|---|
| Status text | `Inter_600SemiBold` | 22px | 600 | 30px |
| Buton etiketi | `Inter_700Bold` | 22px | 700 | — |
| İzin mesajı | `Inter_400Regular` | 20px | 400 | 28px |
| Küçük yardımcı metin | `Inter_400Regular` | 16px | 400 | — |

Minimum body font size: **18sp**. Tüm metinler yüksek kontrastlı beyaz (`#FFFFFF`) üzerine koyu arka plan.

Font yükleme tamamlanana kadar `SplashScreen` tutulur (`expo-splash-screen`). Font yüklenemezse sistem fontu (`System`) fallback olarak kullanılır.

### Buton Spesifikasyonu

| Özellik | Değer |
|---|---|
| Genişlik | 160dp |
| Yükseklik | 64dp |
| Border radius | 32dp (tam yuvarlak) |
| Min tap target | 64×64dp |

Butonlar accessibility için `accessibilityRole="button"` ve `accessibilityLabel` içerir.

---

## Ekranlar

### 1. Kamera İzni Ekranı

**Tetikleyici:** Kamera izni henüz verilmemiş.

**Elemanlar:**
- Açıklama metni: `"TechEye'ın çalışması için kamera erişimi gereklidir."`
- Buton: `"Kameraya İzin Ver"` → `requestPermission()` çağırır

**Stil:** Tam ekran koyu arka plan, ortalanmış içerik.

---

### 2. Ana Kamera Ekranı (`CameraScreen`)

**Durum makinesi:**

```
idle → scanning → idle
         ↓
      error (network / API)
```

**Elemanlar:**

| Eleman | Açıklama |
|---|---|
| `CameraView` | Arka kamera, tam ekran, `flex: 1` |
| Status Text | Ekranın alt kısmında, mevcut durumu yansıtır |
| Start/Stop Butonu | Tarama başlatır / durdurur |

**Status Text durumları:**

| Durum | Gösterilen Metin |
|---|---|
| İlk açılış | `"Başlamak için Tara'ya basın"` |
| Tarama aktif | `"Taranıyor…"` |
| Nesne tespit edildi | `"Önünüzde bir kişi var"` vb. |
| Tarama durdu | `"Tarama durduruldu"` |
| Ağ hatası | `"Ağ hatası — internet bağlantısını kontrol edin"` |
| API hatası | `"Algılama hatası — yeniden deneniyor…"` |

**Buton durumları:**

| `isScanning` | Renk | Etiket | `accessibilityLabel` |
|---|---|---|---|
| `false` | `#1A8FE3` | `"Tara"` | `"Taramayı başlat"` |
| `true` | `#E3401A` | `"Durdur"` | `"Taramayı durdur"` |

**Overlay:** `position: absolute`, ekranın altına sabitlenmiş, `paddingBottom: 48`, `paddingHorizontal: 24`.

---

## Detection Logic

### Tarama Döngüsü

```
Start →
  setInterval(runDetection, 1000ms)
    ↓
  takePictureAsync({ quality: 0.4, shutterSound: false })
    ↓
  detectObjects(base64, width, height)   ← Gemini API
    ↓
  isCloseEnough() ile filtrele
    ↓
  prioritizeDetections() ile sırala
    ↓
  buildAnnouncement() → speak()
```

**Sabitler:**

| Sabit | Değer | Açıklama |
|---|---|---|
| `DETECTION_INTERVAL_MS` | `1000` | Her detection arası süre (ms) |
| `COOLDOWN_MS` | `4000` | Aynı label için TTS cooldown süresi |
| `PROXIMITY_THRESHOLD` | `0.15` | Bounding box alan eşiği (oran) |

### Takip Edilen Nesne Sınıfları

`person`, `car`, `dog`, `bicycle`, `truck`, `bus`, `cat`

### Öncelik Sırası

```
person > car > dog > bicycle > truck > bus > cat
```

Birden fazla nesne tespit edildiğinde en yüksek öncelikli olan duyurulur.

### Proximity Kuralı

- Gemini bounding box vermediğinden `isCloseEnough()` her zaman `true` döner (Gemini zaten "close or prominent" olanları filtreler).
- Bounding box varsa: `width × height >= 0.15` koşulu aranır.

---

## API Entegrasyonu

### Gemini Vision API

| Alan | Değer |
|---|---|
| Model | `gemini-2.0-flash` |
| Endpoint | `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` |
| Auth | Query param: `?key=EXPO_PUBLIC_GEMINI_API_KEY` |
| Content-Type | `application/json` |
| Temperature | `0` (deterministik) |
| Max output tokens | `256` |

**Request gövdesi:**
```json
{
  "contents": [{
    "parts": [
      { "inline_data": { "mime_type": "image/jpeg", "data": "<base64>" } },
      { "text": "<PROMPT>" }
    ]
  }],
  "generationConfig": { "temperature": 0, "maxOutputTokens": 256 }
}
```

**Beklenen yanıt formatı:**
```json
[{"label": "person", "confidence": 0.95}]
```

**Hata senaryoları:**

| Hata | Davranış |
|---|---|
| API anahtarı yok | Exception fırlatır, loglar |
| HTTP `!ok` | Exception fırlatır, status + body loglar |
| JSON parse hatası | `[]` döner, loglar |
| Ağ erişim hatası | `isNetworkError` kontrolü, ekranda mesaj gösterir |

---

## TTS Davranışı

- Dil: `tr-TR`
- Hız: `0.9` (hafif yavaş, net anlaşılır)
- Pitch: `1.0`
- Cooldown: Her `objectClass` için bağımsız, `4000ms`
- Cooldown dolmadan gelen aynı label sessizce yok sayılır
- `stopSpeaking()` → `expo-speech` stop çağrısı

**Türkçe duyuru cümleleri:**

| Label | TTS Çıktısı |
|---|---|
| `person` | `"Önünüzde bir kişi var"` |
| `car` | `"Yakınınızda bir araba var"` |
| `dog` | `"Bir köpek yaklaşıyor"` |
| `bicycle` | `"Yakınınızda bir bisiklet var"` |
| `truck` | `"Yakınınızda bir kamyon var"` |
| `bus` | `"Yakınınızda bir otobüs var"` |
| `cat` | `"Yakınınızda bir kedi var"` |
| diğer | `"Yakınınızda bir [nesne] var"` |

TTS oturumu başladığında: `"Tarama başladı"`
TTS oturumu durduğunda: `"Tarama durduruldu"`

---

## Fotoğraf Çekme

| Parametre | Değer |
|---|---|
| `base64` | `true` |
| `quality` | `0.4` |
| `skipProcessing` | `true` |
| `shutterSound` | `false` |

Kamera: Arka kamera (`facing: 'back'`), sessiz çekim.

---

## Erişilebilirlik

- `accessibilityRole="button"` tüm butonlarda
- `accessibilityLabel` tüm interaktif elemanlarda
- `accessibilityLiveRegion="polite"` status text'te (ekran okuyucuya otomatik okunur)
- Minimum font size: 22px (standart 18sp limitinin üstünde)
- Minimum tap target: 64×64dp

---

## Ortam Değişkenleri

| Değişken | Açıklama |
|---|---|
| `EXPO_PUBLIC_GEMINI_API_KEY` | Google Gemini API anahtarı |

`.env` dosyasında saklanır, `.gitignore`'a eklidir.

---

## Proje Dosya Yapısı

```
mobile/
├── App.tsx                          # Root — StatusBar + CameraScreen
├── src/
│   ├── components/
│   │   └── CameraScreen.tsx         # Ana ekran, tüm UI ve döngü koordinasyonu
│   ├── detection/
│   │   └── detectionService.ts      # Gemini API çağrısı ve response parse
│   ├── tts/
│   │   └── ttsService.ts            # expo-speech wrapper, cooldown
│   └── utils/
│       └── announcementUtils.ts     # DetectedObject tipi, duyuru üretimi, önceliklendirme
├── app.json                         # Expo config, izinler, plugin'ler
└── .env                             # API anahtarları (git'e gitmez)
```
