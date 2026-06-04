# TechEye — AGENTS.md

Bu dosya, TechEye projesinde çalışan AI agent'ların çalışma prensiplerini, metodolojilerini ve kısıtlamalarını tanımlar.

---

## Agent Tanımı

TechEye'da "agent" kavramı, belirli bir görevi otonom olarak yürüten, karar veren ve sonuç üreten bir yapıyı ifade eder. Bu projede agent'lar şu bağlamlarda kullanılır:

- Kamera frame'i yakalama ve API'ye gönderme döngüsü
- API yanıtını işleyip TTS çıktısına dönüştürme
- Hata durumlarını yönetme ve sessizce kurtarma

---

## Çalışma Prensipleri

### 1. Tek Sorumluluk
Her agent yalnızca bir işi yapar:
- `detectionService` → frame'i API'ye gönderir, sonucu parse eder
- `ttsService` → metni sese çevirir, cooldown yönetir
- `announcementUtils` → detection sonucunu insan diline çevirir

### 2. Hata Toleransı
Agent'lar hiçbir zaman sessizce çökmez:
- API hatalarında `console.error` ile loglar
- Kullanıcıya ekranda anlaşılır hata mesajı gösterir
- Detection döngüsü hata alsa bile durumaz, bir sonraki iterasyona geçer

### 3. Durumsuzluk (Statelessness)
Agent'lar kendi aralarında durum paylaşmaz:
- Her detection çağrısı bağımsızdır
- Cooldown state'i yalnızca `ttsService` içinde tutulur
- Geçmiş frame'ler hatırlanmaz

### 4. Öncelik Sırası
Birden fazla nesne tespit edildiğinde agent şu sırayı uygular:
```
person > car > dog > bicycle > truck > bus > cat
```

### 5. Cooldown Mekanizması
Aynı nesne sınıfı için TTS aynı anda tekrar tetiklenmez:
- Varsayılan cooldown: **4 saniye**
- Cooldown süresi dolmadan gelen aynı label duyurusu yok sayılır

---

## Metodlar

### Detection Agent (`src/detection/detectionService.ts`)

**`detectObjects(base64Image, imageWidth, imageHeight)`**
- Frame'i Gemini Vision API'ye gönderir
- Yanıtı JSON array olarak parse eder
- `DetectedObject[]` tipinde sonuç döner
- Hata durumunda exception fırlatır (çağıran taraf yakalar)

### TTS Agent (`src/tts/ttsService.ts`)

**`speak(text, objectClass?)`**
- Verilen metni `expo-speech` ile seslendirir
- `objectClass` bazında cooldown uygular
- Cooldown dolmamışsa sessizce pas geçer

**`stopSpeaking()`**
- Devam eden TTS çıktısını keser

### Announcement Agent (`src/utils/announcementUtils.ts`)

**`buildAnnouncement(obj)`**
- `DetectedObject` → insan diline çevrilmiş cümle
- Örn: `"person"` → `"There is a person in front of you"`

**`isCloseEnough(obj)`**
- Bounding box alanı eşiği geçiyorsa `true`
- Bounding box yoksa varsayılan olarak `true` döner (Gemini bounding box vermez)

**`prioritizeDetections(objects)`**
- Tespit listesini öncelik sırasına göre sıralar

---

## Kısıtlamalar

- Agent'lar kullanıcı verisini saklamaz, sunucuya göndermez
- Frame'ler yalnızca API analizi için kullanılır, diske yazılmaz
- Detection döngüsü yalnızca "Start" basıldığında aktif olur
- Agent'lar birbirini doğrudan çağırmaz; koordinasyon `CameraScreen.tsx` üzerinden yapılır

---

## Gelecek Agent Fikirleri

- **Direction Agent** — Nesnenin kamerada solda mı sağda mı olduğunu tespit eder
- **Priority Agent** — Trafik yoğunluğuna göre dinamik öncelik sırası belirler
- **Context Agent** — Arka arkaya gelen frame'leri karşılaştırarak "yaklaşıyor / uzaklaşıyor" bilgisi üretir
