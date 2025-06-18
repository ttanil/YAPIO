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
const CF_R2_PUBLIC_URL   = "https://www.yapio.net";
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
    const urlPrefix = ".r2.dev/";
    const urlIndex = url.indexOf(urlPrefix);
    if (urlIndex !== -1) {
        return url.substring(urlIndex + urlPrefix.length);
    }
    return "";
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
        const { userId, projectName, tarih, tutar, aciklama } = req.body;

        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        // Projeyi projectName ile bul
        const userInput = user.userInputs.find(ui => ui.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: "Proje bulunamadı" });

        const odeme = { tarih, tutar: Number(tutar), aciklama };

        // Eğer daha önce hiç imarDurumu girilmemişse, yeni oluştur ve ekle
        if (!userInput.imarDurumu || !userInput.imarDurumu.length) {
            userInput.imarDurumu = [{ odemeDetaylari: [odeme], dokumanlar: [] }];
        } else {
            userInput.imarDurumu[0].odemeDetaylari.push(odeme);
        }

        await user.save();
        res.json({ success: true, odeme });

    } else if(process === "read"){
        const { userId, projectName, imarDurumuIndex = 0 } = req.body;

        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: 'Kullanıcı yok' });

        const userInput = user.userInputs.find(p => p.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: 'Proje yok' });

        if (!userInput.imarDurumu || !userInput.imarDurumu[imarDurumuIndex])
            return res.status(404).json({ error: 'İmar durumu yok' });

        res.json(userInput.imarDurumu[imarDurumuIndex].odemeDetaylari || []);

    } else if(process === "delete"){
        const { process, userId, projectName, odemeId } = req.body;
        if(process !== "delete") return res.status(400).json({ error:"Process bilinmiyor" });

        // Adım 1: Kullanıcı ve Proje bul
        const user = await Users.findById(userId);
        if(!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

        const userInput = user.userInputs.find(ui => ui.projectName === projectName);
        if(!userInput) return res.status(404).json({ error: "Proje bulunamadı" });

        // Adım 2: İlgili imarDurumu'ndan sil
        // (varsayım: ilk imarDurumu'na ekleniyor ve siliniyor. Birden fazla varsa imarDurumuIndex ekle)
        const imarDurumu = userInput.imarDurumu[0]; 
        if(!imarDurumu) return res.status(404).json({ error: "İmar durumu bulunamadı" });

        const index = imarDurumu.odemeDetaylari.findIndex(o => o && o._id && o._id.toString() === odemeId);
        if(index === -1) return res.status(404).json({ error: "Ödeme bulunamadı" });

        imarDurumu.odemeDetaylari.splice(index, 1);
        await user.save();

        return res.json({ success: true });


    } else if(process === "saveEvrak"){
        try {
            const { userId, projectName, aciklama, key } = req.body;
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'Dosya yok' });

            // Dosyayı R2'ya yükle
            const ext = path.extname(file.originalname);
            const r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;
            const s3 = getS3Client();
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Filename,
                Body: file.buffer,
                ContentType: file.mimetype
                // ACL özelliği kullanılmaz Cloudflare R2'da!
            });
            await s3.send(command);

            const fileUrl = `${PUBLIC_BASE_URL}/${r2Filename}`;

            // MongoDB'ye işle
            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje yok' });

            const imar = userInput.imarDurumu[0];
            if (!imar) return res.status(404).json({ error: 'İmar yok!' });

            imar.dokumanlar.push({
                path: fileUrl,
                fileName: file.originalname,
                uploadedAt: new Date(),
                aciklama
            });

            user.markModified('userInputs');
            await user.save();

            res.json({ success:true, fileUrl });
        } catch (err) {
            console.error("saveEvrak HATA:", err);
            if (err.$metadata || err.message)
                res.status(500).json({ error: err.message || 'Kayıt sırasında hata oluştu' });
            else
                res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
        }
    } else if(process === "readEvrak") {
        const { userId, projectName, imarDurumuIndex = 0 } = req.body;
        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı!" });

        const userInput = user.userInputs.find(p => p.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: "Proje yok!" });

        if (!userInput.imarDurumu || !userInput.imarDurumu[imarDurumuIndex]) {
            return res.json([]);
        }
        const dokumanlar = userInput.imarDurumu[imarDurumuIndex].dokumanlar || [];
        res.json(dokumanlar);

    } else if(process === "deleteEvrak") {
        try {
            const { userId, projectName, imarDurumuIndex = 0, evrakId } = req.body;
            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı yok" });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje yok" });

            const imar = userInput.imarDurumu[imarDurumuIndex];
            if (!imar) return res.status(404).json({ error: "İmar yok!" });

            const i = imar.dokumanlar.findIndex(doc => String(doc._id) === String(evrakId));
            if(i > -1) {
                const dosya = imar.dokumanlar[i];
                const dosyaKey = getR2KeyFromUrl(dosya.path);

                if (dosyaKey) {
                    const s3 = getS3Client();
                    try {
                        await s3.send(new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: dosyaKey
                        }));
                    } catch (err) {
                        console.error("Buluttan dosya silinirken hata:", err);
                    }
                }

                imar.dokumanlar.splice(i, 1);
                user.markModified('userInputs');
                await user.save();
                return res.json({ success: true });
            } else {
                return res.status(404).json({ error: "Evrak bulunamadı!" });
            }
        } catch (err) {
            console.error("deleteEvrak HATA:", err);
            res.status(500).json({ error: 'Silme sırasında hata oluştu' });
        }
    } else {
        res.status(400).json({ error: "Geçersiz process parametresi!" });
    }
});

module.exports = router;