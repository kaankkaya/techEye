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

| Token | Hex | Kullanım |
|---|---|---|
| `background` | `#0A0E1A` | Tüm ekranların arka planı |
| `overlay` | `rgba(10, 14, 26, 0.75)` | Kamera üzerindeki kontrol paneli |
| `primary` | `#1A8FE3` | Tara butonu, vurgu rengi |
| `danger` | `#E3401A` | Durdur butonu |
| `text` | `#FFFFFF` | Tüm metinler |

### Tipografi

**Font: Inter** — Uygulamalarda yaygın olarak kullanılan, okunabilirliği yüksek, Türkçe karakter desteği tam olan modern bir sans-serif font. `@expo-google-fonts/inter` paketi ile yüklenir.

| Kullanım | Font Family | Font Size | Font Weight | Line Height |
|---|---|---|---|---|
| Status text | `Inter_600SemiBold` | 22px | 600 | 30px |
| Buton etiketi | `Inter_700Bold` | 22px | 700 | — |
| İzin mesajı | `Inter_400Regular` | 20px | 400 | 28px |
| Küçük yardımcı metin | `Inter_400Regular` | 16px | 400 | — |

Minimum body font size: **18sp**. Font yükleme tamamlanana kadar `SplashScreen` tutulur. Yüklenemezse sistem fontu (`System`) fallback olarak kullanılır.

### Buton Spesifikasyonu

| Özellik | Değer |
|---|---|
| Genişlik | 160dp |
| Yükseklik | 64dp |
| Border radius | 32dp (tam yuvarlak) |
| Min tap target | 64×64dp |

Butonlar `accessibilityRole="button"` ve `accessibilityLabel` içerir.

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

| `isScanning` | Renk | Etiket | `accessibilityLabel` |
|---|---|---|---|
| `false` | `#1A8FE3` | `"Tara"` | `"Taramayı başlat"` |
| `true` | `#E3401A` | `"Durdur"` | `"Taramayı durdur"` |

**Overlay:** `position: absolute`, ekranın altına sabitlenmiş, `paddingBottom: 48`, `paddingHorizontal: 24`.

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

**Duyuru formatı (mesafeli):**

| Label | Mesafe biliniyorsa | Mesafe bilinmiyorsa |
|---|---|---|
| `person` | `"2.3 metre uzağınızda bir kişi var"` | `"Önünüzde bir kişi var"` |
| `car` | `"1.8 metre uzağınızda bir araba var"` | `"Yakınınızda bir araba var"` |
| `dog` | `"0.9 metre uzağınızda bir köpek var"` | `"Yakınınızda bir köpek var"` |
| `bicycle` | `"X.X metre uzağınızda bir bisiklet var"` | `"Yakınınızda bir bisiklet var"` |
| `truck` | `"X.X metre uzağınızda bir kamyon var"` | `"Yakınınızda bir kamyon var"` |
| `bus` | `"X.X metre uzağınızda bir otobüs var"` | `"Yakınınızda bir otobüs var"` |
| `cat` | `"X.X metre uzağınızda bir kedi var"` | `"Yakınınızda bir kedi var"` |

Oturum başlangıcı: `"Tarama başladı"` — Bitiş: `"Tarama durduruldu"`

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
    ├── App.tsx                          # Root — Inter font yükleme + SplashScreen
    ├── MLModels/
    │   ├── yolo11n.pt                   # Kaynak (dönüştürme için)
    │   ├── yolo11n.onnx                 # ← React Native kullanır (10MB)
    │   ├── depth_anything_v2_vits.pth   # Kaynak (dönüştürme için)
    │   └── depth_anything_v2_vits.onnx  # ← React Native kullanır (95MB, tek dosya)
    ├── src/
    │   ├── components/
    │   │   └── CameraScreen.tsx         # Ana ekran + tarama döngüsü
    │   ├── detection/
    │   │   ├── imagePreprocessor.ts     # URI → CHW Float32Array (jpeg-js)
    │   │   ├── yoloInference.ts         # YOLO11n ONNX session + NMS
    │   │   ├── depthInference.ts        # DepthAnything V2 ONNX session
    │   │   ├── mlPipeline.ts            # Promise.all paralel çalıştırma
    │   │   └── detectionService.ts      # mlPipeline wrapper
    │   ├── tts/
    │   │   └── ttsService.ts            # expo-speech, tr-TR, cooldown
    │   └── utils/
    │       ├── announcementUtils.ts     # DetectedObject tipi, mesafeli duyuru
    │       └── distanceUtils.ts         # Pinhole mesafe + depth medyan
    ├── app.json                         # Expo config, kamera izinleri
    └── .env                             # Boş (API anahtarı yok)
```
