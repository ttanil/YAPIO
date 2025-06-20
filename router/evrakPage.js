const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const multer  = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const router = express.Router();
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const authenticateUser = require('../middleware/authenticateUser');

// Cloudflare R2 Ayarları (env olmadan, açık anahtarlarla)
const CF_R2_ACCESS_KEY   = "26272cf5a77ffec381949db19c6a9964";
const CF_R2_SECRET_KEY   = "211b08b35f224a33a7a1f011cd40f7719f675e6c39a138aedb2429bd299c993c";
const CF_R2_ACCOUNT_ID   = "eb7b69f469c33ce6338e878ac08bcdd6";
const CF_R2_ENDPOINT     = "https://eb7b69f469c33ce6338e878ac08bcdd6.r2.cloudflarestorage.com";
const CF_R2_PUBLIC_URL   = "https://cdn.yapio.net";
const CF_R2_BUCKET       = "yapio";

// S3 Client'ı oluştur
function getS3Client() {
    return new S3Client({
        region: "auto",
        endpoint: CF_R2_ENDPOINT,
        credentials: {
            accessKeyId: CF_R2_ACCESS_KEY,
            secretAccessKey: CF_R2_SECRET_KEY
        }
    });
}

const BUCKET_NAME = CF_R2_BUCKET;
const PUBLIC_BASE_URL = CF_R2_PUBLIC_URL;
const upload = multer({ 
    storage: multer.memoryStorage(),
    //limits: { fileSize: 20 * 1024 * 1024 } // 20mb
});

// Public URL'den R2 key çıkar (silme için)
function getR2KeyFromUrl(url) {
    try {
        const u = new URL(url);
        return u.pathname.replace(/^\//, ""); // ilk / karakterini kaldır
    } catch {
        return ""; // Bozuk url gelirse güvenli tarafta kal
    }
}

// --- Giriş View ---
router.get('/', authenticateUser, async (req, res) => {
    const projectName = req.query.projectName;
    const userId = res.locals.user._id || res.locals.user.id;

    if (res.locals.userRole === "misafir") {
        return res.redirect('/login');
    }

    try {
        const user = await Users.findById(userId);
        if (!user || !user.userInputs)
            return res.status(404).send("Kullanıcı ve projeleri bulunamadı!");

        let selectedProject = null;
        if (projectName) {
            selectedProject = user.userInputs.find(prj => prj.projectName === projectName);
            if (!selectedProject)
                return res.status(404).send("Proje bulunamadı!");
        }

        res.render('sites/evrak', {
            project: selectedProject,
            user: res.locals.user,
            role: res.locals.userRole
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Sunucu hatası.");
    }
});

// ---- Ana API ---
router.post('/', upload.single('file'), async (req, res) => {
    const process = req.body.process;

    //console.log("Gelen BODY:", req.body);
    //console.log("Gelen FILE:", req.file);

    if(process === "save"){
        try {
            const { userId, projectName, kalemKayit } = req.body;
            const alanAdi = kalemKayit.alanAdi; // DÜZGÜN OLARAK AL

            const filter = {
            _id: userId,
            "userInputs.projectName": projectName
            };

            const alanYolu = `userInputs.$[input].${alanAdi}`;
            const update = {
            $push: {
                [alanYolu]: kalemKayit
            }
            };
            const options = {
            arrayFilters: [
                { "input.projectName": projectName }
            ]
            };

            const result = await Users.updateOne(filter, update, options);

            if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: "Kullanıcı veya proje bulunamadı." });
            } else if (result.modifiedCount === 0) {
            return res.status(400).json({ success: false, message: "Kayıt eklenemedi." });
            } else {
            return res.json({ success: true, message: "Kayıt başarıyla eklendi." });
            }

        } catch (err) {
            console.error(err);
            return res.status(500).json({ success: false, message: "Bir hata oluştu.", error: err.message });
        }

        //res.json({ success: true, odeme });

    } else if(process === "read"){
        const { userId, projectName, kalemId, alanAdi } = req.body;

        try {
            const user = await Users.findOne({
                _id: userId,
                "userInputs.projectName": projectName
            });

            if (!user) return res.status(404).json([]);

            // İlgili proje bulunmalı
            const proje = user.userInputs.find(ui => ui.projectName === projectName);
            if (!proje || !Array.isArray(proje[alanAdi])) return res.json([]);

            // Sadece gerekli kalemId için filtreleme:
            const dizi = proje[alanAdi];
            if (!Array.isArray(dizi)) return res.json([]);
            const filtrelenmis = dizi.filter(k => k.kalemId === kalemId);

            return res.json(filtrelenmis); // <-- burada sonuç dönmeli

        } catch (err) {
            console.error(err);
            return res.status(500).json([]);
        }

        //res.json(userInput.imarDurumu[imarDurumuIndex].odemeDetaylari || []);

    } else if(process === "delete"){
        const { process, userId, projectName, odemeId, alanAdi } = req.body;
        if (process !== "delete") return res.status(400).json({ error: "Process bilinmiyor" });

        // 1. Kullanıcı ve Proje bul
        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        const userInput = user.userInputs.find(ui => ui.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: "Proje bulunamadı" });

        // 2. Dinamik alan üzerinden (örn: imarDurumu, islakMekanlar, ...) silme işlemi
        const dizi = userInput[alanAdi];
        if (!Array.isArray(dizi)) return res.status(404).json({ error: `Beklenen dizin ${alanAdi} bulunamadı.` });

        // Not: Eğer dizi içindeki alt dizi ise (ör: dizi[0].odemeDetaylari gibi) onu da dinamikleştirmek istersen, yapıyı paylaşırsan yardımcı olurum!
        // Şimdilik ana dizi olarak siliyoruz:
        const index = dizi.findIndex(o => o && o._id && o._id.toString() === odemeId);
        if (index === -1) return res.status(404).json({ error: "Kayıt/Ödeme bulunamadı" });

        dizi.splice(index, 1);
        await user.save();

        return res.json({ success: true });


    } else if(process === "saveEvrak"){
        try {
            const { userId, projectName, aciklama, alanAdi, kalemId } = req.body;
            const file = req.file;

            if (!file) return res.status(400).json({ error: 'Dosya yok.' });

            // S3/R2 upload (Cloudflare R2)
            const ext = path.extname(file.originalname);
            const r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;
            const s3 = getS3Client();
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Filename,
                Body: file.buffer,
                ContentType: file.mimetype
            }));

            const fileUrl = `${PUBLIC_BASE_URL}/${r2Filename}`;

            // Kullanıcı ve proje bul
            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı' });

            const dokumanKaydi = {
                path: fileUrl,
                fileName: file.originalname,
                uploadedAt: new Date(),
                aciklama: aciklama || "",
            };

            let eklendi = false;

            // DİNAMİK KALEM: alanAdi ve kalemId varsa (ör: islakMekanlar[x])
            if (alanAdi && kalemId) {
            if (!Array.isArray(userInput[alanAdi])) userInput[alanAdi] = [];
            // _id ve/veya kalemId ile bul:
            const kalem = userInput[alanAdi].find(x =>
                (x._id && x._id.toString() === kalemId) ||
                (x.kalemId && x.kalemId === kalemId)
            );
            if (!kalem) return res.status(404).json({ error: "Kalem bulunamadı" });
            if (!Array.isArray(kalem.dokumanlar)) kalem.dokumanlar = [];
                kalem.dokumanlar.push(dokumanKaydi);
                eklendi = true;
            }
            // DİREKT ANA ALAN (ör: userInput.alanAdi.dokumanlar)
            else if (alanAdi) {
            if (!Array.isArray(userInput[alanAdi])) userInput[alanAdi] = [];
            // Eğer ana property bir array değilse skip ediyoruz.
            // Sadece ana diziye (ör: userInput[alanAdi].dokumanlar) ekle
            if (!Array.isArray(userInput[alanAdi].dokumanlar)) userInput[alanAdi].dokumanlar = [];
                userInput[alanAdi].dokumanlar.push(dokumanKaydi);
                eklendi = true;
            }

            if (!eklendi)
            return res.status(400).json({ error: "Nereye ekleneceği anlaşılamadı (Alan veya kalemId eksik mi?)" });

            user.markModified('userInputs');
            await user.save();

            return res.json({ success: true, fileUrl });
        } catch (err) {
            console.error("saveEvrak HATA:", err);
            return res.status(500).json({ error: err.message || 'Kayıt sırasında hata oluştu' });
        }

    } else if(process === "readEvrak") {
        try {
            const { userId, projectName, alanAdi, kalemId } = req.body;
            if (!userId || !projectName || !alanAdi)
            return res.status(400).json([]);

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json([]);

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json([]);

            let evraklar = [];

            // Eğer kalemId gönderilmişse, ilgili iş kaleminin evraklarını bul
            if (kalemId) {
            const alanDizisi = userInput[alanAdi];
            if (!Array.isArray(alanDizisi)) return res.json([]);
            // Kalemi id veya kalemId ile bulmaya çalışıyoruz
            const kalem = alanDizisi.find(x =>
                (x._id && x._id.toString() === kalemId) ||
                (x.kalemId && x.kalemId === kalemId)
            );
            if (kalem && Array.isArray(kalem.dokumanlar)) {
                evraklar = kalem.dokumanlar;
            }
            }
            // Sadece alanAdi ile çağrıldıysa — örneğin imarDurumu gibi bir alan
            else {
            // Eğer bu alan bir array ve içinde dokumanlar varsa (ör: imarDurumu bir dizi)
            if (Array.isArray(userInput[alanAdi]) && userInput[alanAdi][0] && Array.isArray(userInput[alanAdi][0].dokumanlar)) {
                evraklar = userInput[alanAdi][0].dokumanlar;
            }
            // Eğer alan doğrudan dokumanlar içeriyorsa (çok nadiren)
            else if (userInput[alanAdi] && Array.isArray(userInput[alanAdi].dokumanlar)) {
                evraklar = userInput[alanAdi].dokumanlar;
            }
            }

            return res.json(evraklar || []);
        } catch (err) {
            console.error("readEvrak HATA:", err);
            res.status(500).json([]);
        }

    } else if(process === "deleteEvrak") {
        try {
            const { userId, projectName, evrakId, alanAdi, kalemId } = req.body;

            if (!userId || !projectName || !evrakId || !alanAdi)
            return res.status(400).json({ error: "Eksik parametre." });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı yok." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje yok." });

            let silindi = false;

            // Eğer kalemId varsa, ilgili dizi içinde satırı bul ve dokumanlar listesinden sil
            if (kalemId) {
            const alanDizisi = userInput[alanAdi];
            if (Array.isArray(alanDizisi)) {
                const kalem = alanDizisi.find(x =>
                    (x._id && x._id.toString() === kalemId) ||
                    (x.kalemId && x.kalemId === kalemId)
                );
                if (kalem && Array.isArray(kalem.dokumanlar)) {
                    const ilkUzunluk = kalem.dokumanlar.length;
                    kalem.dokumanlar = kalem.dokumanlar.filter(ev => ev._id?.toString() !== evrakId);
                    if (kalem.dokumanlar.length < ilkUzunluk) silindi = true;
                }
            }
            }
            // Sadece alanAdi ile (örneğin ana property'de ise)
            else {
            // Bir array içeriği ve dokumanlar ile mi tutuyorsun?
            if (Array.isArray(userInput[alanAdi])) {
                // Örneğin: imarDurumu[0].dokumanlar
                const diziElemani = userInput[alanAdi][0];
                if (diziElemani && Array.isArray(diziElemani.dokumanlar)) {
                    const ilkUzunluk = diziElemani.dokumanlar.length;
                    diziElemani.dokumanlar = diziElemani.dokumanlar.filter(ev => ev._id?.toString() !== evrakId);
                    if (diziElemani.dokumanlar.length < ilkUzunluk) silindi = true;
                }
            }
            else if (userInput[alanAdi] && Array.isArray(userInput[alanAdi].dokumanlar)) {
                // Direkt ana property'nin dokumanlar'ı ise
                const ilkUzunluk = userInput[alanAdi].dokumanlar.length;
                userInput[alanAdi].dokumanlar = userInput[alanAdi].dokumanlar.filter(ev => ev._id?.toString() !== evrakId);
                if (userInput[alanAdi].dokumanlar.length < ilkUzunluk) silindi = true;
            }
            }

            if (!silindi)
            return res.status(404).json({ error: "Evrak bulunamadı veya silinemedi." });

            user.markModified('userInputs');
            await user.save();

            return res.json({ success: true });

        } catch (err) {
            console.error("deleteEvrak HATA:", err);
            return res.status(500).json({ error: err.message || "Silme sırasında hata oluştu." });
        }
    }
});

module.exports = router;