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

        res.render('sites/approved', {
            project: selectedProject,
            user: res.locals.user,
            role: res.locals.userRole
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Sunucu hatası.");
    }
});

router.post('/', upload.single('file'), async (req, res) => {
    const process = req.body.process;

    if(process === "saveEvrak"){

        let r2Filename, s3, fileUrl;
        try {
            const { userId, projectName, aciklama, alanAdi, kalemId } = req.body;
            const file = req.file;

            if (!file)
            return res.status(400).json({ error: 'Dosya yok.' });

            // 1) Dosya bilgisini hazırla
            const ext = path.extname(file.originalname);
            r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;
            s3 = getS3Client();
            await s3.send(new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: r2Filename,
                Body: file.buffer,
                ContentType: file.mimetype
            }));
            fileUrl = `${PUBLIC_BASE_URL}/${r2Filename}`;
            const dokumanKaydi = {
                alanAdi,
                kalemId,
                path: fileUrl,
                fileName: file.originalname,
                uploadedAt: new Date(),
                aciklama: aciklama || "",
            };

            // 2) Kullanıcı ve projeyi bul
            const user = await Users.findById(userId);
            if (!user)
            throw new Error('Kullanıcı bulunamadı.');

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput)
            throw new Error('Proje bulunamadı.');

            // 3) Doküman dizisine ekle
            if (!Array.isArray(userInput.dokuman)) {
            userInput.dokuman = [];
            }
            userInput.dokuman.push(dokumanKaydi);
            user.markModified('userInputs');
            await user.save();

            return res.json({ success: true, fileUrl });


        } catch (err) {
            // Eğer dosya yüklendiyse ve hata burada olduysa dosyayı Cloudflare'dan sil!
            if (r2Filename && s3) {
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: r2Filename,
                    }));
                    //console.log('Başarısız kayıt: Cloudflare R2 dosyası silindi:', r2Filename);
                } catch (delErr) {
                    //console.error('Dosya Cloudflare R2’dan silinemedi:', delErr);
                }
            }
            //console.error("saveEvrak HATA:", err);
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

            if (!Array.isArray(userInput.dokuman))
                return res.json([]); // Hiç doküman yoksa boş array

            // Filtrele: alanAdi ve kalemId (kalemId verilmezse sadece alanAdi eşleşenler)
            let filtered = userInput.dokuman.filter(d =>
                String(d.alanAdi).trim().toLowerCase() === String(alanAdi).trim().toLowerCase() &&
                (
                    !kalemId ||
                    (d.kalemId && String(d.kalemId).trim().toLowerCase() === String(kalemId).trim().toLowerCase())
                )
            );

            return res.json(filtered);

        } catch (err) {
            console.error("readEvrak HATA:", err);
            return res.status(500).json([]);
        }

    } else if(process === "deleteEvrak") {
        try {
            const { userId, projectName, evrakId, alanAdi, kalemId } = req.body;

            if (!userId || !projectName || !evrakId || !alanAdi)
                return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            if (!Array.isArray(userInput.dokuman)) return res.json({ ok: true });

            // Silinecek index’i ve dosya bilgisini bul
            const index = userInput.dokuman.findIndex(ev => 
                String(ev._id) === String(evrakId) &&
                String(ev.alanAdi) === String(alanAdi) &&
                (!kalemId || String(ev.kalemId) === String(kalemId))
            );

            if (index === -1)
                return res.status(404).json({ error: 'Belge bulunamadı.' });

            // Dosya yolunu not al, silmeden önce
            const silinecekEvrak = userInput.dokuman[index];
            const filePath = silinecekEvrak?.path;
            
            // Diziden çıkar
            userInput.dokuman.splice(index, 1);
            user.markModified('userInputs');
            await user.save();

            // Dosya silme işlemi - Cloudflare’dan sil
            // Sadece path'ten dosya adını/parçasını çekiyoruz
            if (filePath) {
                try {
                    // filePath: "https://public-url/evraklar/xxx.pdf"
                    // KENDİ bucket key'ini alıyoruz (ör: "evraklar/xxx.pdf")
                    const key = filePath.split(`${PUBLIC_BASE_URL}/`)[1];
                    if (key) {
                        const s3 = getS3Client();
                        await s3.send(new DeleteObjectCommand({
                            Bucket: BUCKET_NAME,
                            Key: key
                        }));
                    }
                } catch(deleteErr) {
                    console.error("Cloudflare dosya silme hatası:", deleteErr.message);
                    // ama DB'den silme işlemi tamamlandı, kullanıcıyı engelleme
                }
            }

            return res.json({ ok: true });
            
        } catch (err) {
            console.error("deleteEvrak HATA:", err);
            return res.status(500).json({ error: err.message || 'Silme sırasında hata oluştu.' });
        }

    } else if(process === "saveCheckBox") {

        try {
            const { userId, projectName, boxDb } = req.body;

            if (!userId || !projectName || !boxDb )
                return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje)
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });

            if (!Array.isArray(proje.checkBox)) {
                proje.checkBox = [];
            }

            proje.checkBox.push({checkBoxId:boxDb});

            await user.save();

            return res.json({ ok: true });
            
        } catch (err) {
            console.error("deleteEvrak HATA:", err);
            return res.status(500).json({ error: err.message || 'Silme sırasında hata oluştu.' });
        }

    } else if(process === "deleteCheckBox") {
        try {
            const { userId, projectName, boxDb } = req.body;

            if (!userId || !projectName || !boxDb )
                return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje)
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });

            if (!Array.isArray(proje.checkBox)) {
                proje.checkBox = [];
            }

            const index = proje.checkBox.findIndex(box => box.checkBoxId === boxDb);
            if (index === -1) {
                return res.status(404).json({ error: 'Checkbox kaydı bulunamadı.' });
            }

            proje.checkBox.splice(index, 1);

            await user.save();

            return res.json({ ok: true });

        } catch (err) {
            console.error("deleteCheckBox HATA:", err);
            return res.status(500).json({ error: err.message || 'Silme sırasında hata oluştu.' });
        }

    } else if(process === "readCheckBox") {
        try {
            const { userId, projectName } = req.body;

            if (!userId || !projectName )
                return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje)
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });

            // checkBox alanını varsa döndür, yoksa boş dizi döndür
            const checkBoxArray = Array.isArray(proje.checkBox) ? proje.checkBox : [];

            return res.json({ checkBox: checkBoxArray });

        } catch (err) {
            console.error("readCheckBox HATA:", err);
            return res.status(500).json({ error: err.message || 'Okuma sırasında hata oluştu.' });
        }
    }

});


module.exports = router;