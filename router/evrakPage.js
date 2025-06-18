const express = require('express');  
const mongoose = require('mongoose');  
const path = require('path');  
const multer  = require('multer');  
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");  

const router = express.Router();  
const Users = require(path.join(__dirname, '..', 'models', 'users'));  
const authenticateUser = require('../middleware/authenticateUser');  

// ---- Cloudflare R2 AYARLARI (CANLI İÇİN ANAHTARLAR KODDA) ----  
const S3_OPTIONS = {  
    region: "auto",  
    endpoint: "https://eb7b69f469c33ce6338e878ac08bcdd6.r2.cloudflarestorage.com",  
    credentials: {  
        accessKeyId: "c0e8fdf9159831b36b651a2057859393",  
        secretAccessKey: "6149db1f74a193f49dd11e3f4a3ac8ff0250c8ef9ed6cadee5646f5db9d5b7f1"  
    }  
};  
const BUCKET_NAME = "yapio";  
const PUBLIC_BASE_URL = "https://pub-12f70a7bb4ea46e9b01afa008a5228d1.r2.dev";  

// Multer upload ayarı  
const upload = multer({ storage: multer.memoryStorage() });  

// R2 public url'den anahtar çıkar (silme için)  
function getR2KeyFromUrl(url) {  
    const urlPrefix = ".r2.dev/";  
    const urlIndex = url.indexOf(urlPrefix);  
    if (urlIndex !== -1) {  
        return url.substring(urlIndex + urlPrefix.length);  
    }  
    return "";  
}  

// --- Giriş view ---  
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

    if(process === "saveEvrak"){  
        try {  
            const { userId, projectName, aciklama, key } = req.body;  
            const file = req.file;  
            if (!file) return res.status(400).json({ error: 'Dosya yok' });  

            // Dosya R2'ya yükle  
            const ext = path.extname(file.originalname);  
            const r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;  
            const s3 = new S3Client(S3_OPTIONS);  
            const command = new PutObjectCommand({  
                Bucket: BUCKET_NAME,  
                Key: r2Filename,  
                Body: file.buffer,  
                ContentType: file.mimetype,  
                ACL: "public-read"  
            });  
            await s3.send(command);  

            const fileUrl = `${PUBLIC_BASE_URL}/${r2Filename}`;  

            // MongoDB'ye işle  
            const user = await Users.findById(userId);  
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı' });  

            const userInput = user.userInputs.find(p => p.projectName === projectName);  
            if (!userInput) return res.status(404).json({ error: 'Proje yok' });  

            // En güncel imarDurumu'nun ilkini kullanıyoruz  
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

            res.json({ success: true, fileUrl });  

        } catch (err) {  
            console.error(err);  
            res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });  
        }  

    } else if(process === "readEvrak") {  
        const { userId, projectName, imarDurumuIndex = 0 } = req.body;  
        const user = await Users.findById(userId);  
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı!" });  

        const userInput = user.userInputs.find(p => p.projectName === projectName);  
        if (!userInput) return res.status(404).json({ error: "Proje yok!" });  

        if (!userInput.imarDurumu || !userInput.imarDurumu[imarDurumuIndex]) {  
            return res.json([]); // Hiç evrak yoksa boş dizi gönder  
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
                // Dosya bulut key’ini bul  
                const dosya = imar.dokumanlar[i];  
                const dosyaKey = getR2KeyFromUrl(dosya.path);  

                // Cloudflare R2'dan sil  
                if (dosyaKey) {  
                    const s3 = new S3Client(S3_OPTIONS);  
                    try {  
                        await s3.send(new DeleteObjectCommand({  
                            Bucket: BUCKET_NAME,  
                            Key: dosyaKey  
                        }));  
                    } catch (err) {  
                        console.error("Buluttan dosya silinirken hata:", err);  
                        // Kullanıcının MongoDB kaydını yine de silmeye devam!  
                    }  
                }  

                // MongoDB’den sil  
                imar.dokumanlar.splice(i, 1);  
                user.markModified('userInputs');  
                await user.save();  
                return res.json({ success: true });  
            } else {  
                return res.status(404).json({ error: "Evrak bulunamadı!" });  
            }  
        } catch (err) {  
            console.error(err);  
            res.status(500).json({ error: 'Silme sırasında hata oluştu' });  
        }  

    } else {  
        // Diğer eski API'ler (odeme işlemleri) burada olabilir, yukarıdaki koddan devam ettirebilirsin  
        res.status(400).json({ error: "Geçersiz process parametresi!" });  
    }  
});  

module.exports = router; 

/*
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const multer  = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");


const authenticateUser = require('../middleware/authenticateUser');

router.get('/', authenticateUser, async (req, res) => {
    const projectName = req.query.projectName;
    const userId = res.locals.user._id || res.locals.user.id;

    //console.log(projectName, " ", userId);

    if (res.locals.userRole === "misafir") {
        return res.redirect('/login');
    }

    try {
        const user = await Users.findById(userId);
        if (!user || !user.userInputs) {
            return res.status(404).send("Kullanıcı ve projeleri bulunamadı!");
        }

        let selectedProject = null;
        if (projectName) {
            selectedProject = user.userInputs.find(prj => prj.projectName === projectName);
            if (!selectedProject) {
                return res.status(404).send("Proje bulunamadı!");
            }
        }
/*
        return res.send(`
            <html>
            <head>
                <title>Sayfa Yapımda</title>
                <meta charset="utf-8">
            </head>
            <body style="font-family:sans-serif;background:#f1f5f9;color:#222;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;">
                <div>
                <h1>Sayfa yapım aşamasında</h1>
                <p>Kısa süre sonra burada olacağız.</p>
                </div>
            </body>
            </html>
        `);
*/
/*
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


const upload = multer({ storage: multer.memoryStorage() });

router.post('/', upload.single('file'), async (req, res) => {
    const process = req.body.process;

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
            //Form verilerini çek
            const { userId, projectName, aciklama, key } = req.body;
            const file = req.file;
            if (!file) return res.status(400).json({ error: 'Dosya yok' });

            // Benzersiz dosya adı
            const ext = path.extname(file.originalname);
            const r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;

            const s3 = new S3Client({
                region: "auto", // Cloudflare R2 için genelde 'auto' bırakılır
                endpoint: "https://eb7b69f469c33ce6338e878ac08bcdd6.r2.cloudflarestorage.com",
                credentials: {
                    accessKeyId: "c0e8fdf9159831b36b651a2057859393",
                    secretAccessKey: "6149db1f74a193f49dd11e3f4a3ac8ff0250c8ef9ed6cadee5646f5db9d5b7f1"
                }
            });

            const command = new PutObjectCommand({
                Bucket: "yapio",
                Key: r2Filename,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: "public-read"
            });
            const result = await s3.send(command);

            const fileUrl = `https://pub-12f70a7bb4ea46e9b01afa008a5228d1.r2.dev/${r2Filename}`;

            //MongoDB'ye kaydet; projenin ilgili imarDurumu/dokumanlar altına Ekle
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
            console.error(err);
            res.status(500).json({ error: 'Kayıt sırasında hata oluştu' });
        }

    } else if(process === "readEvrak") {
        const { userId, projectName, imarDurumuIndex = 0 } = req.body;
        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı!" });

        const userInput = user.userInputs.find(p => p.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: "Proje yok!" });

        if (!userInput.imarDurumu || !userInput.imarDurumu[imarDurumuIndex]) {
            return res.json([]); // Hiç evrak yoksa boş dizi gönder
        }
        const dokumanlar = userInput.imarDurumu[imarDurumuIndex].dokumanlar || [];
        res.json(dokumanlar);

    } else if(process === "deleteEvrak") {
        const { userId, projectName, imarDurumuIndex = 0, evrakId } = req.body;

        const user = await Users.findById(userId);
        if (!user) return res.status(404).json({ error: "Kullanıcı yok" });

        const userInput = user.userInputs.find(p => p.projectName === projectName);
        if (!userInput) return res.status(404).json({ error: "Proje yok" });

        const imar = userInput.imarDurumu[imarDurumuIndex];
        if (!imar) return res.status(404).json({ error: "İmar yok!" });

        const i = imar.dokumanlar.findIndex(doc => doc._id.toString() === evrakId);
        if(i > -1) {
            // --- BULUT DOSYA SİL ---

            // 1. Dosya path'inden key'i bul
            let dosyaKey = '';
            const dosya = imar.dokumanlar[i];
            if (dosya && dosya.path) {
                // https://pub-...r2.dev/evraklar/...
                const urlPrefix = '.r2.dev/';
                const urlIndex = dosya.path.indexOf(urlPrefix);
                if (urlIndex !== -1) {
                    dosyaKey = dosya.path.substring(urlIndex + urlPrefix.length);
                }
            }

            // 2. Cloudflare R2 bağlantısı (anahtarlarını .env’e taşı, canlıda buraya yazma!)
            const s3 = new S3Client({
                region: "auto",
                endpoint: "https://eb7b69f469c33ce6338e878ac08bcdd6.r2.cloudflarestorage.com",
                credentials: {
                    accessKeyId: "c0e8fdf9159831b36b651a2057859393",
                    secretAccessKey: "6149db1f74a193f49dd11e3f4a3ac8ff0250c8ef9ed6cadee5646f5db9d5b7f1"
                    // Canlıda şunu tercih et!
                    // accessKeyId: process.env.CF_ACCESS_KEY,
                    // secretAccessKey: process.env.CF_SECRET_KEY
                }
            });

            // 3. Buluttan sil (hata olursa sadece logla)
            if(dosyaKey){
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: "yapio",
                        Key: dosyaKey
                    }));
                } catch (err) {
                    console.error("Buluttan dosya silinirken hata:", err);
                    // Burada direkt hataya düşmek yerine, kullanıcının MongoDB kaydını yine de silersin.
                }
            }

            // 4. MongoDB kayıttan sil (her durumda)
            imar.dokumanlar.splice(i, 1);
            user.markModified('userInputs');
            await user.save();
            return res.json({ success: true });
        } else {
            return res.status(404).json({ error: "Evrak bulunamadı!" });
        }
    }
});

module.exports = router;
*/