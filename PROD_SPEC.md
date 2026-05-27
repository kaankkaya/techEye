# TechEye — PROD_SPEC.md

Mobil uygulamanın tasarım sistemi, ekran yapısı, bileşen davranışları ve iş mantığı bu dosyada tanımlanır. React Native kodu yazılırken bu dosya birincil referanstır.

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

Tüm renkler `src/theme/colors.ts` içinde token olarak tanımlanır ve `ThemeProvider` / `useTheme()` hook'u aracılığıyla tüketilir. Hardcoded renk kullanılmaz.

| Token | Değer | Kullanım |
|---|---|---|
| `background` | `#0F0A08` | Tüm ekranların arka planı |
| `surface` | `#1A1108` | Kart, panel yüzeyleri |
| `accent` | `#F97316` | Primary CTA — Tara butonu |
| `accentPress` | `#EA580C` | Hover / basılı durum |
| `accentSoft` | `rgba(249, 115, 22, 0.13)` | Tag fill, dev buton arka planı |
| `danger` | `#DC2626` | Hata durumları |
| `secondOrange` | `#d18756` | Taranıyor durumundaki buton rengi |
| `border` | `#2A211A` | Hairline çizgiler, ayırıcılar |
| `overlay` | `rgba(15, 10, 8, 0.75)` | Kamera üzerindeki kontrol paneli (scrim) |
| `text` | `#FFFFFF` | Birincil metin |
| `textSecondary` | `rgba(255, 255, 255, 0.6)` | İkincil / yardımcı metin |

**Tema altyapısı:**
- `src/theme/colors.ts` — token tanımları
- `src/theme/ThemeContext.tsx` — `ThemeProvider` + `useTheme()` hook
- `App.tsx` root'unda `ThemeProvider` ile sarılır

### Tipografi

**Font: Inter** — `@expo-google-fonts/inter` paketi ile yüklenir. Tüm metin `AppText` komponenti üzerinden render edilir (`src/components/AppText.tsx`). Fontu değiştirmek için yalnızca `AppText.tsx` içindeki `FONT` map güncellenir — başka dosyaya dokunulmaz.

| `weight` prop | Font Family | Kullanım |
|---|---|---|
| `regular` (default) | `Inter_400Regular` | Açıklama, yardımcı metin |
| `bold` | `Inter_700Bold` | Başlık, buton, status text |

`AppText` prop'ları: `size` (fontSize), `weight` (`regular` \| `bold`), tüm standart `TextProps`.  
`includeFontPadding: false` her zaman aktif.

Minimum body font size: **18sp**. Font yükleme tamamlanana kadar `SplashScreen` tutulur.

### Buton Spesifikasyonu

| Özellik | Değer |
|---|---|
| Genişlik | 160dp |
| Yükseklik | 64dp |
| Border radius | 16dp |
| Min tap target | 64×64dp |

Butonlar `accessibilityRole="button"` ve `accessibilityLabel` içerir.

Tüm butonlar `HapticButton` komponenti ile sarılır (`src/components/HapticButton.tsx`). Haptic feedback tek merkezden yönetilir; varsayılan yoğunluk `medium`, DEV toggle butonu `selection` kullanır.

---

## Ekranlar

### 0. Ses Seçim Ekranı (`VoicePickerScreen`)

**Tetikleyici:** Her uygulama açılışında, `CameraScreen`'den önce gösterilir.

**Amaç:** Kullanıcının cihazında yüklü Türkçe TTS seslerinden birini seçmesine izin verir. Seçim `AsyncStorage`'a kaydedilir; bir sonraki açılışta aynı ses ön seçili gelir.

**Elemanlar:**

| Eleman | Açıklama |
|---|---|
| İkon | `FontAwesome6 eye-low-vision`, `accent` rengi |
| Başlık | `"Ses Seç"` — `Inter_700Bold` 28px |
| Alt başlık | `"TechEye'ın kullanacağı Türkçe sesi seçin. / Sesleri dinlemek için ▶ tuşuna basın."` |
| Ayarlar linki | `"Diğer seslere göz at"` — altı çizili, `textSecondary`, tıklanınca iOS Erişilebilirlik ayarlarını açar (`App-prefs:root=ACCESSIBILITY`) |
| Ses listesi | `FlatList` — Enhanced sesler üstte, her satırda isim + dil + Enhanced rozeti |
| ▶ butonu | Her ses satırında; tıklanınca `PREVIEW_TEXT` ile önizleme yapar, yüklenirken `ActivityIndicator` gösterir |
| Seçim göstergesi | Seçili satırda `FontAwesome6 circle-check` ikonu + `accentSoft` arka plan + `accent` kenarlık |
| "Atla" butonu | Kayıt yapmaz, mevcut sesle devam eder |
| "Seç ve Devam Et" butonu | Seçili sesi `AsyncStorage`'a kaydeder, `CameraScreen`'e geçer |

**Ses sıralama kuralı:** `VoiceQuality.Enhanced` → önce; aynı kalitede alfabetik.

**Boş durum:** Cihazda Türkçe ses yoksa `"Cihazda yüklü Türkçe ses bulunamadı…"` mesajı gösterilir.

**Persistence:** `@react-native-async-storage/async-storage` — anahtar: `@techeye/selected_voice`. Ses identifier'ı string olarak saklanır.

**App akışı:**
```
App açılır
    │
    ├─ VoicePickerScreen (her açılışta)
    │       ├─ "Seç ve Devam Et" → ses kaydedilir → CameraScreen
    │       └─ "Atla"            → ses değişmez   → CameraScreen
    │
    └─ CameraScreen
```

---

### 1. Kamera İzni Ekranı

**Tetikleyici:** `useCameraPermissions()` — izin henüz verilmemiş (`!permission.granted`).

**Elemanlar:**

| Eleman | Açıklama |
|---|---|
| İkon | `FontAwesome6 camera`, 48px, `accent` rengi |
| Başlık | `"Kamera Erişimi"` — `bold` 26px |
| Açıklama | `"TechEye çevrendeki nesneleri algılamak için kameraya ihtiyaç duyar."` — `regular` 18px, `textSecondary` |
| Buton | `"İzin Ver"` — `accent` arka plan, `requestPermission()` çağırır |

**Stil:** Tam ekran, dikey + yatay ortalanmış, `paddingHorizontal: 32`, elemanlar arası `gap: 16`.

---

### 2. Ana Kamera Ekranı (`CameraScreen`)

**Durum makinesi:**

```
idle
  │
  └─ [Tara'ya basıldı]
        │
        ├─ Modeller hazırlanıyor… (initModels)
        │     ├─ Başarılı → scanning
        │     └─ Hata → "Model yüklenemedi" (idle)
        │
      scanning ──────────────────────────────┐
        │   ↑                                │
        │   └── [setInterval 1000ms]         │
        │                                    │
        ├─ Nesne tespit edildi               │
        │     └─ status + TTS               │
        │                                    │
        ├─ Tespit yok                        │
        │     └─ (sessiz)                   │
        │                                    │
        └─ [Durdur'a basıldı] ──────────────┘
              └─ idle
```

**Elemanlar:**

| Eleman | Açıklama |
|---|---|
| `CameraView` | Arka kamera, tam ekran, `flex: 1` |
| Ayarlar Butonu | Sol üst köşe — `FontAwesome6 gear` ikonu; basıldığında `SettingsScreen` Modal açılır |
| DEV Butonu | Sağ üst köşe — bounding box overlay toggle |
| Status Text | Ekranın alt kısmında, mevcut durumu yansıtır |
| Tara/Durdur Butonu | Tarama başlatır / durdurur |

**Status Text durumları:**

| Durum | Gösterilen Metin |
|---|---|
| İlk açılış | `"Başlamak için Tara'ya basın"` |
| Model yükleme | `"Modeller hazırlanıyor…"` |
| Model yükleme hatası | `"Model yüklenemedi — .onnx dosyaları eksik"` |
| Tarama aktif | `"Taranıyor…"` |
| Nesne tespit edildi (mesafeli) | `"2.3 metre uzağınızda bir kişi var"` |
| Nesne tespit edildi (mesafesiz) | `"Önünüzde bir kişi var"` |
| Tarama durdu | `"Tarama durduruldu"` |
| ML hatası | `"Algılama hatası — yeniden deneniyor…"` |

**Buton durumları:**

| `isScanning` | Renk (token) | Etiket | `accessibilityLabel` |
|---|---|---|---|
| `false` | `accent` (#F97316) | `"Tara"` | `"Taramayı başlat"` |
| `true` | `danger` (#DC2626) | `"Durdur"` | `"Taramayı durdur"` |

**Overlay:** `position: absolute`, ekranın altına sabitlenmiş, `paddingBottom: 48`, `paddingHorizontal: 24`.

---

### 3. Ayarlar Ekranı (`SettingsScreen`)

**Tetikleyici:** `CameraScreen`'in sol üst köşesindeki `gear` ikonuna basılınca açılır.

**Sunum:** `Modal` — `animationType="slide"`, `presentationStyle="pageSheet"` (iOS native bottom sheet).

**Elemanlar:**

| Eleman | Açıklama |
|---|---|
| Header | `"Ayarlar"` başlık (ortalı) + sağda `FontAwesome6 xmark` kapat butonu |
| "GENEL" bölümü | `FontAwesome6 sliders` + `"GENEL"` etiketi |
| Birim satırı | `FontAwesome6 ruler` ikonu — sol: "Birim" etiketi; sağ: seçili birim adı + chevron. Tıklanınca picker açılır |
| Birim picker | Saydam arka plan üstünde küçük kart modal — "Birim Seç" başlığı + "Metre" / "Adım" seçenekleri + seçili olan yanında `check` ikonu. Dışına tıklanınca kapanır |
| Titreşim satırı | `FontAwesome6 hand-pointer` ikonu — "Titreşim" başlığı + "Yakın nesne uyarısı" alt metni + `Switch` toggle. Değişiklik anında kaydedilir |
| "SES" bölümü | `FontAwesome6 microphone` + `"SES"` etiketi |
| Ses listesi | `VoicePickerScreen` ile aynı satır yapısı: isim, Enhanced rozeti, ▶ önizleme |
| Seçim davranışı | Tüm ayarlar değiştiğinde **anında** kaydedilir, ayrı onay butonu yoktur |
| Kapat | Header'daki `xmark` veya modal dışına basınca kapanır |

**Birim davranışı:**

| Seçenek | Duyuru formatı |
|---|---|
| Metre (varsayılan) | `"2.3 metre uzağınızda bir kişi var"` |
| Adım | `"3 adım uzağınızda bir kişi var"` |

- Ortalama adım uzunluğu: **75 cm** (`STEP_CM = 75`)
- Dönüşüm: `adım = round((mesafe_m × 100) / 75)`
- Mesafe bilinmiyorsa birim gösterilmez → `"Önünüzde bir kişi var"` / `"Yakınınızda bir kişi var"`
- Seçilen birim `AsyncStorage`'a kaydedilir — anahtar: `@techeye/distance_unit`
- `initUnit()` uygulama açılışında `App.tsx`'te çağrılır (`initTTS()` ile birlikte)

**Not:** `VoicePickerScreen` (açılış akışı) ile `SettingsScreen` (ayarlar) ayrı bileşenlerdir; ikisi de aynı `ttsService` / `unitService` / `proximityHaptics` metotlarını kullanır.

---

## Detection Logic

### Tarama Döngüsü

```
[Tara basıldı]
      │
  initModels() — YOLO + Depth paralel yüklenir (bir kez)
      │
  setInterval(runDetection, 1000ms)
      │
  takePictureAsync({ quality: 0.4, shutterSound: false })
      │  URI döner (base64 değil)
      │
  detectObjects(uri, width, height)
      │
  mlPipeline: Promise.all([
    runYolo(uri),      → YoloDetection[] (bbox + label)
    runDepth(uri)      → DepthMap (Float32Array)
  ])
      │
  Her detection için:
    ├─ estimateDistanceMeters(label, bboxHeight) → metre
    └─ getRegionDepth(depthMap, bbox)            → relatif derinlik
      │
  isCloseEnough() ile filtrele (≤ 5m veya bbox eşiği)
      │
  prioritizeDetections() ile sırala
      │
  buildAnnouncement() → speak() [tr-TR]
```

**Sabitler:**

| Sabit | Değer | Açıklama |
|---|---|---|
| `DETECTION_INTERVAL_MS` | `1000` | Her detection arası süre (ms) |
| `COOLDOWN_MS` | `4000` | Aynı label için TTS cooldown süresi |
| `PROXIMITY_THRESHOLD` | `0.15` | Bounding box alan eşiği (metrik mesafe yoksa) |
| `CONF_THRESHOLD` | `0.45` | YOLO minimum güven skoru |
| `IOU_THRESHOLD` | `0.45` | NMS IoU eşiği |

### Takip Edilen Nesne Sınıfları

| COCO ID | Label |
|---|---|
| 0 | `person` |
| 1 | `bicycle` |
| 2 | `car` |
| 5 | `bus` |
| 7 | `truck` |
| 15 | `cat` |
| 16 | `dog` |

### Öncelik Sırası

```
person > car > dog > bicycle > truck > bus > cat
```

Aynı öncelikte birden fazla nesne varsa en yakın (düşük `distanceMeters`) önce gelir.

### Proximity Kuralı

`isCloseEnough()`:
- `distanceMeters` hesaplandıysa: `<= 5m` → yakın
- Hesaplanamadıysa: `boundingBox.width × height >= 0.15`

---

## ML Pipeline (Lokal — Sunucusuz)

### Genel Mimari

```
takePictureAsync → URI
        │
        ├─── YOLO11n (320×320)          ─┐
        │    └→ bounding box + label      │  Promise.all (paralel)
        │                                 │
        └─── DepthAnything V2 ViT-S      ─┘
             (518×518)
             └→ depth map (Float32Array)
                     │
          bounding box ∩ depth map
                     │
          mesafe tahmini (metre)
                     │
          "2.3 metre uzağınızda bir kişi var" → TTS [tr-TR]
```

### Model Dosyaları

| Dosya | Format | Gerçek Boyut | Görev |
|---|---|---|---|
| `MLModels/yolo11n.onnx` | ONNX | 10MB | Nesne tespiti + bounding box |
| `MLModels/depth_anything_v2_vits.onnx` | ONNX | 95MB (tek dosya) | Piksel bazlı derinlik haritası |

**Dönüştürme notu:** `.pt`/`.pth` → `.onnx` Python ile bir kez yapılır. Depth modeli ilk exportta `onnx + onnx.data` ikili format üretir; `onnx.save_model(..., save_as_external_data=False)` ile tek dosyaya birleştirilir.

### YOLO11n

| Alan | Değer |
|---|---|
| Input shape | `[1, 3, 320, 320]` CHW float32, 0–1 normalize |
| Output shape | `[1, 84, 2100]` |
| Output format | `[cx, cy, w, h, class0..class79]` normalize |
| Confidence eşiği | `≥ 0.45` |
| IoU eşiği (NMS) | `0.45` |
| Execution provider | CoreML (iOS) → CPU fallback |
| Anchor sayısı | 2100 (320px: 40²+20²+10²) |

### DepthAnything V2 ViT-S

| Alan | Değer |
|---|---|
| Input shape | `[1, 3, 518, 518]` CHW float32, 0–1 normalize |
| Output shape | `[1, 518, 518]` |
| Yorum | Yüksek değer = uzak nesne (depth, disparity değil) |
| Kullanım | Bounding box bölgesinin **medyan** derinlik değeri |
| Execution provider | CoreML (iOS) → CPU fallback |

### Mesafe Tahmini (Pinhole Kamera Modeli)

```
mesafe_m = (gerçek_yükseklik_m × odak_uzaklığı_px) / bbox_yükseklik_px
odak_uzaklığı ≈ 229 px  (320px genişlik, ~70° FOV iPhone geniş kamera)
```

| Nesne | Gerçek yükseklik |
|---|---|
| person | 1.70m |
| car | 1.50m |
| dog | 0.50m |
| bicycle | 1.00m |
| truck | 2.50m |
| bus | 3.00m |
| cat | 0.30m |

Geçerli aralık: **0.3m – 20m**. Dışındaki değerler `-1` olarak işaretlenir, duyuruda mesafe belirtilmez.

DepthAnything çıktısı mutlak mesafe için değil; aynı karede birden fazla nesne olduğunda **hangisinin daha yakın olduğunu** karşılaştırmak için kullanılır.

### Image Preprocessing

```
URI → expo-image-manipulator → resize (target × target) → JPEG base64
    → atob → Uint8Array → jpeg.decode → RGBA pixel data
    → Float32Array CHW [R tüm pikseller, G tüm pikseller, B tüm pikseller]
    → normalize: değer / 255.0
```

---

## TTS Davranışı

- Dil: `tr-TR`
- Hız: `0.9`
- Pitch: `1.0`
- Cooldown: Her `objectClass` için bağımsız `4000ms`
- Cooldown dolmadıysa aynı label için duyuru yapılmaz

**Ses seçimi:**
- `initTTS()` uygulama açılışında (`App.tsx`) çağrılır; `AsyncStorage`'dan kayıtlı ses identifier'ını yükler
- `VoicePickerScreen`'de seçilen ses `saveVoice(identifier)` ile kaydedilir ve `activeVoiceId` güncellenir
- Kayıtlı ses varsa `Speech.speak()` çağrılarına `voice: activeVoiceId` eklenir; yoksa platform default'u kullanılır
- `getTurkishVoices()` → `Speech.getAvailableVoicesAsync()` çıktısından `tr` dil kodlu sesler filtrelenir

**Duyuru formatı:**

Birim `metre` seçiliyken:

| Label | Mesafe biliniyorsa | Mesafe bilinmiyorsa |
|---|---|---|
| `person` | `"2.3 metre uzağınızda bir kişi var"` | `"Önünüzde bir kişi var"` |
| `car` | `"1.8 metre uzağınızda bir araba var"` | `"Yakınınızda bir araba var"` |
| `dog` | `"0.9 metre uzağınızda bir köpek var"` | `"Yakınınızda bir köpek var"` |
| diğerleri | `"X.X metre uzağınızda bir [nesne] var"` | `"Yakınınızda bir [nesne] var"` |

Birim `adım` seçiliyken:

| Mesafe biliniyorsa | Mesafe bilinmiyorsa |
|---|---|
| `"3 adım uzağınızda bir kişi var"` | `"Önünüzde bir kişi var"` |

`formatDistance(meters)` → `unitService.ts`'teki aktif birime göre string döner ya da `null` (mesafe < 0). `buildAnnouncement()` → `announcementUtils.ts`.

Oturum başlangıcı: `"Tarama başladı"` — Bitiş: `"Tarama durduruldu"`

---

## Yakınlık Haptic Feedback

Her detection döngüsünde tespit edilen tüm nesneler `evaluateProximityHaptics(objects)` fonksiyonuna iletilir. Fonksiyon, aşağıdaki kurallara göre titreşim tetikler.

### Kurallar

Bbox yüksekliği birincil sinyal olarak kullanılır. `distanceMeters`, nesne frame'i doldurduğunda güvenilmez çünkü 320px girişte minimum ölçülebilir mesafe kişi için ~1.22m, araba için ~1.07m'dir. Bbox oranı bu durumda daha doğru bir yakınlık göstergesidir.

| Kural | Birincil koşul (bbox) | Fallback (mesafe) | Titreşim | Yoğunluk |
|---|---|---|---|---|
| Danger | `person` / `car` bbox yüksekliği ≥ **%70** | `distanceMeters ≤ 1.5m` | 3 × darbe | `Heavy` |
| Warning | `car` bbox yüksekliği **%35–%70** | `1.5m < distanceMeters ≤ 3m` | 2 × darbe | `Medium` |

**Fiziksel karşılık:**
- Danger bbox %70 → kişi < ~1.7m, araba < ~1.1m mesafede
- Warning bbox %35–%70 → araba ~1.5–3m aralığında

- Her iki kural için bağımsız **3 saniyelik cooldown** uygulanır.
- **Danger, Warning'e göre önceliklidir** — aynı döngüde ikisi birden tetiklenmez.
- Titreşimler arası gecikme: **130 ms**.
- Kullanıcı Ayarlar ekranından titreşimi tamamen kapatabilir (Switch toggle).

### Persistence

| Anahtar | Değer | Varsayılan |
|---|---|---|
| `@techeye/haptic_enabled` | `"true"` / `"false"` | `"true"` (açık) |

`initHaptics()` uygulama açılışında `App.tsx`'te çağrılır.

### Dosya

`src/utils/proximityHaptics.ts` — kural motoru, AsyncStorage persist, `evaluateProximityHaptics()`.

---

## Fotoğraf Çekme

| Parametre | Değer |
|---|---|
| `base64` | `false` (URI kullanılır) |
| `quality` | `0.4` |
| `skipProcessing` | `true` |
| `shutterSound` | `false` |

`photo.uri` (yerel dosya yolu) `detectObjects`'e iletilir. Base64 dönüşümü `imagePreprocessor.ts` içinde model input'u için yapılır.

---

## Erişilebilirlik

- `accessibilityRole="button"` tüm butonlarda
- `accessibilityLabel` tüm interaktif elemanlarda
- `accessibilityLiveRegion="polite"` status text'te
- Minimum font size: 22px
- Minimum tap target: 64×64dp

---

## Kurulu Paketler

| Paket | Amaç |
|---|---|
| `expo-camera` | Kamera erişimi, sessiz fotoğraf çekimi |
| `expo-speech` | TTS (tr-TR) |
| `expo-image-manipulator` | Frame resize |
| `expo-asset` | ONNX model dosyası yükleme |
| `expo-splash-screen` | Font yüklenene kadar splash tutma |
| `@expo-google-fonts/inter` | Inter font ailesi |
| `onnxruntime-react-native` | YOLO + Depth ONNX model çalıştırma |
| `jpeg-js` | JPEG base64 → RGBA piksel decode |
| `@react-native-async-storage/async-storage` | Seçilen TTS ses identifier'ını kalıcı olarak saklar |
| `expo-haptics` | Buton haptic feedback — `HapticButton` komponenti üzerinden merkezi yönetim |

---

## Ortam Değişkenleri

Lokal ML pipeline ile API anahtarı gerekmez. `.env` dosyası şu an boştur.

---

## Proje Dosya Yapısı

```
techeye/
├── CLAUDE.md
├── AGENTS.md
├── PROD_SPEC.md
└── mobile/
    ├── metro.config.js                  # .onnx asset extension
    ├── App.tsx                          # Root — Inter font yükleme + SplashScreen + ekran yönlendirme
    ├── MLModels/
    │   ├── yolo11n.pt                   # Kaynak (dönüştürme için)
    │   ├── yolo11n.onnx                 # ← React Native kullanır (10MB)
    │   ├── depth_anything_v2_vits.pth   # Kaynak (dönüştürme için)
    │   └── depth_anything_v2_vits.onnx  # ← React Native kullanır (95MB, tek dosya)
    ├── src/
    │   ├── components/
    │   │   ├── AppText.tsx              # Text wrapper — merkezi font yönetimi (FONT map)
    │   │   ├── HapticButton.tsx         # TouchableOpacity wrapper — merkezi haptic feedback
    │   │   ├── VoicePickerScreen.tsx    # Açılış ses seçim ekranı (AsyncStorage persist)
    │   │   ├── SettingsScreen.tsx       # Ayarlar Modal — ses seçimi (anında kaydeder)
    │   │   └── CameraScreen.tsx         # Kamera izni ekranı + ana tarama ekranı
    │   ├── detection/
    │   │   ├── imagePreprocessor.ts     # URI → CHW Float32Array (jpeg-js)
    │   │   ├── yoloInference.ts         # YOLO11n ONNX session + NMS
    │   │   ├── depthInference.ts        # DepthAnything V2 ONNX session
    │   │   ├── mlPipeline.ts            # Promise.all paralel çalıştırma
    │   │   └── detectionService.ts      # mlPipeline wrapper
    │   ├── tts/
    │   │   └── ttsService.ts            # expo-speech, tr-TR, cooldown
    │   └── utils/
    │       ├── announcementUtils.ts     # DetectedObject tipi, buildAnnouncement (unitService kullanır)
    │       ├── distanceUtils.ts         # Pinhole mesafe + depth medyan
    │       ├── unitService.ts           # Birim (metre/adım) — AsyncStorage persist, formatDistance()
    │       └── proximityHaptics.ts      # Yakınlık haptic kuralları — danger/warning, cooldown, on/off
    ├── app.json                         # Expo config, kamera izinleri
    └── .env                             # Boş (API anahtarı yok)
```
