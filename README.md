# EduRoom - İnteraktif Kod Eğitim Platformu

Web tabanlı VS Code entegrasyonlu, gerçek zamanlı kod eğitimi platformu.

## Özellikler

- 🎯 Öğretmen ve öğrenci rolleri
- 💻 Monaco Editor (VS Code) entegrasyonu
- 🚀 Gerçek zamanlı kod paylaşımı
- 🌐 Çoklu dil desteği (Python, Go, SQL)
- 📊 Öğrenci takip sistemi
- ❓ Soru-cevap sistemi
- ▶️ Kod çalıştırma özelliği

## Kurulum

1. Bağımlılıkları yükleyin:
```bash
npm run install-all
```

2. Backend için `.env` dosyasını oluşturun (zaten mevcut)

3. Uygulamayı başlatın:
```bash
npm run dev
```

## Kullanım

1. Ana sayfadan öğretmen olarak yeni oda oluşturun
2. Oda ID'sini öğrencilerle paylaşın
3. Öğrenciler isim ve oda ID'si ile derse katılabilir
4. Öğretmen kod yazarken öğrenciler gerçek zamanlı takip edebilir
5. Öğretmen soru ekleyebilir, öğrenciler cevaplayabilir

## Teknolojiler

- **Frontend**: React, Vite, Tailwind CSS, Monaco Editor
- **Backend**: Node.js, Express, Socket.io
- **Kod Çalıştırma**: Child Process (Python, Go, SQLite)

## Portlar

- Frontend: http://localhost:5173
- Backend: http://localhost:3001