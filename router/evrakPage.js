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

    if(process === "save"){
        try {
            const { userId, projectName, kalemKayit } = req.body;
            const alanAdi = kalemKayit.alanAdi;
            const { birimFiyat } = req.body;
            if (!alanAdi)
                return res.status(400).json({ success: false, message: "Alan adı belirtilmemiş." });

            // 1. Kullanıcıyı ve ilgili projeyi bul
            const user = await Users.findById(userId);
            if (!user)
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje)
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });

            // 2. İlgili alan dinamik dizi mi? Şemada varsa çalışır
            if (!Array.isArray(proje[alanAdi])) {
                // Eğer bu alan şemada yoksa, mongoose kaydetmez!
                proje[alanAdi] = [];
            }

            // 3. Kayıt ekle (kalemId hariç diğer tüm alanlar da push edilir)
            // Alan adı ve içeriği tamamen dinamik!
            proje[alanAdi].push(kalemKayit);

            user.markModified('userInputs');
            await user.save();

            // 5. DB'den eklenen kalemin _id'sini almak için tekrar sorgulama
            const savedKalemKayit = await Users.findOne(
                { _id: userId, "userInputs.projectName": projectName }, // Kullanıcı ID ve proje adı ile sorgulama
                { "userInputs.$": 1 } // Sadece ilgili proje verisini al
            );

            const latestKalem = savedKalemKayit.userInputs[0][alanAdi].slice(-1)[0]; // Son eklenen kalemi al
            const latestKalemId = latestKalem._id.toString();

            const engelliIdler = [
                "nizamiye", "tasinim", "diger", "kazi_yapimi", "makine_kiralama", "yukleme",
                "tasima", "tesviye", "su_indirimi", "hafriyat_depolama", "elle_kazi",
                "kaba_kazi", "ince_kazi", "kontrolluk", "zemin_test", "gecici_yol", "guvenlik",
                "alan_hazirligi", "kalip", "gro_beton_serme", "sikistirma", "bakim", "numune",
                "temizlik", "malzeme_temini", "serme", "sikistirma", "nemlendirme", "seviye_kontrol",
                "atik_tasima", "drenaj", "pisSu", "temizSu", "isitma", "bahceDuvari", "bitkilendirme",
                "Arsa", "YapiRuhsati", "Noter", "Belediye", "Yapı Denetim", "Kadastro", "Zemin Etüdü",
                "Projeler", "Haritacı","İş Güvenliği", "Şantiye Elektrik","Tapu", "Vergi", "SSK", "Diğer", "İşçilik"
            ];

            if(!engelliIdler.includes(kalemKayit.kalemId)) {
                // 3. Kayıt kontrolü (önce kontrol et)
                const existingMaterial = proje.materials.find(material => material.name === kalemKayit.kalemId);
                if (existingMaterial) {
                    // Eğer kayıt varsa, yeni savedResults ekle
                    existingMaterial.savedResults.push({ 
                        birim: kalemKayit.birim, 
                        birimFiyat: birimFiyat, 
                        miktar: kalemKayit.miktar, 
                        toplamTutar: kalemKayit.toplamTutar,
                        from:"evrak",
                        evrakId:latestKalemId
                    });
                } else {
                    // Eğer kayıt yoksa, yeni bir dataToDb oluştur
                    const dataToDb = {
                        name: kalemKayit.kalemId,
                        units: kalemKayit.birim,
                        savedResults: [{ 
                            birim: kalemKayit.birim, 
                            birimFiyat: birimFiyat, 
                            miktar: kalemKayit.miktar,
                            from:"evrak",
                            toplamTutar: kalemKayit.toplamTutar 
                        }]
                    };
                    proje.materials.push(dataToDb); // Yeni kaydı ekle
                }
            }

            // 4. Değişikliği kaydet
            user.markModified('userInputs');
            await user.save();

            // 5. Kayıttan sonra geri kontrol/log (isteğe bağlı)
            const refreshed = await Users.findById(userId);
            const sonDurum = refreshed.userInputs.find(
                x => x.projectName === projectName
            )[alanAdi];

            return res.json({ success: true, message: "Kayıt başarıyla eklendi." });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Bir hata oluştu.",
                error: err.message
            });
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
        if (!proje) return res.json([]);

        let alanOlusturuldu = false;

        // Eğer ilgili alan yoksa, boş dizi olarak ekle ve kaydet
        if (typeof proje[alanAdi] === "undefined") {
            proje[alanAdi] = [];
            alanOlusturuldu = true;
        }

        const dizi = proje[alanAdi];

        if (!Array.isArray(dizi)) return res.json([]);

        const filtrelenmis = kalemId
            ? dizi.filter(k => k.kalemId === kalemId)
            : dizi;

        // Eğer yeni alan oluşturulduysa DB'ye kaydet (safe for future additions)
        if (alanOlusturuldu) {
            user.markModified('userInputs');
            await user.save();
        }

        return res.json(
            filtrelenmis.map(obj => {
                // eğer Mongoose dökümanı ise .toObject() ile düzleştir:
                const plain = obj.toObject ? obj.toObject() : obj;
                // _id ekle (hem string olsun hem yayıl)
                return { ...plain, _id: plain._id ? plain._id.toString() : undefined };
            })
        );

    } catch (err) {
        console.error(err);
        return res.status(500).json([]);
    }

        //res.json(userInput.imarDurumu[imarDurumuIndex].odemeDetaylari || []);

    } else if(process === "delete"){
        //console.log(req.body);
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

        const index = dizi.findIndex(o => o && o._id && o._id.toString() === odemeId);
        if (index === -1) return res.status(404).json({ error: "Kayıt/Ödeme bulunamadı" });

        dizi.splice(index, 1);

        // 3. Malzemeleri kontrol et ve eşleşen kayıtları sil
        let isDeletedMaterial = false;
        
        for (const material of userInput.materials) { 
            const initialLength = material.savedResults.length;

            material.savedResults = material.savedResults.filter(result => {
                return result.evrakId && odemeId && result.evrakId.toString() !== odemeId;
            });

            if (initialLength !== material.savedResults.length) {
                isDeletedMaterial = true;
            }
        }

        await user.save();

        return res.json({ success: true });

    } else if(process === "saveEvrak"){
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
    } else if(process === "saveAnaPara"){
        try {
            const { userId, projectName, tip, tutar } = req.body;

            if (!userId || !projectName || !tip || !tutar)
            return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            // ANA KISIM: Yeni anaPara kaydını push et
            userInput.anaPara.push({
                tip,
                tutar // bu Number olmalı, gerekirse Number(tutar) yap
            });

            // Tüm kullanıcıyı kaydet
            await user.save();

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'DB Ana para ekleme sırasında hata oluştu.' });
        }

    } else if (process === "readAnaPara") {
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
                return res.status(400).json({ error: "Kullanıcı veya proje eksik." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // Sadece tip ve tutar alanlarını eşle
            const anaParaList = (userInput.anaPara || []).map(entry => ({
                tip: entry.tip,
                tutar: entry.tutar
            }));

            return res.json({ success: true, anaPara: anaParaList });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Ana para okuma sırasında hata oluştu." });
        }
    } else if(process === "deleteAnaPara"){
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
            return res.status(400).json({ error: 'Eksik parametre!' });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı!' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı!' });

            // Ana kaydı ve tüm altParaları sil
            userInput.anaPara = [];         // anaPara bir dizi ise, tamamen boşalt
            userInput.altPara = [];         // altPara dizisini tamamen sıfırla

            await user.save();

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Ana kayıtları silerken hata oluştu.' });
        }
    } else if(process === "saveAltPara"){
        try {
            const { userId, projectName, tip, tutar, tarih, aciklama } = req.body;
            if (!userId || !projectName || !tip || !tutar || !tarih || !aciklama)
            return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            // Alt para ekle
            userInput.altPara.push({ tip, tutar, tarih, aciklama });

            // Son eklenen obje
            const yeniAltPara = userInput.altPara[userInput.altPara.length - 1];

            await user.save();

            // DİKKAT: _id artık Mongo tarafından atanmış!
            return res.json({
            success: true,
            altPara: {
                tip: yeniAltPara.tip,
                tutar: yeniAltPara.tutar,
                tarih: yeniAltPara.tarih,
                aciklama: yeniAltPara.aciklama,
                _id: yeniAltPara._id    // <-- KRİTİK!
            }
            });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'DB Alt para ekleme sırasında hata oluştu.' });
        }
    } else if(process === "readAltPara"){
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
                return res.status(400).json({ error: "Kullanıcı veya proje eksik." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // Sadece tip ve tutar alanlarını eşle
            const altParaList = (userInput.altPara || []).map(entry => ({
                tip: entry.tip,
                tutar: entry.tutar,
                tarih:entry.tarih,
                aciklama:entry.aciklama,
                _id: entry._id
            }));

            return res.json({ success: true, altPara: altParaList });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Ana para okuma sırasında hata oluştu." });
        }
    } else if (process === "deleteAltPara") {
        try {
            const { userId, projectName, altParaId } = req.body;
            if (!userId || !projectName || !altParaId) {
            return res.status(400).json({ error: "Eksik bilgi." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // ID eşleşmesiyle altPara silme
            const eskiUzunluk = (userInput.altPara || []).length;
            userInput.altPara = (userInput.altPara || []).filter(
            altpara => !(altpara._id && altpara._id.toString() === altParaId)
            );
            const yeniUzunluk = (userInput.altPara || []).length;

            if (eskiUzunluk === yeniUzunluk) {
            return res.status(404).json({ error: "Kayıt bulunamadı veya zaten silinmiş." });
            }

            await user.save();
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Silme sırasında hata oluştu." });
        }
    } else if(process === "readYerSahibi"){
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
                return res.status(400).json({ error: "Kullanıcı veya proje eksik." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // --- Tüm building verisini ilgili projeden al:
            const buildingData = Array.isArray(userInput.building) ? userInput.building : [];

            // Her anlaşma kaydının yanına, building datasından eşleşeni ekle:
            const yerSahibiIleAnlasmaList = (userInput.yerSahibiIleAnlasma || []).map(entry => {
                // Aynı rowNumber ile eşleşen building verisini (birden fazla ise ilkini al, istersen dizi dönebilirsin)
                const matchedBuilding = buildingData.find(b => String(b.rowNumber) === String(entry.rowNumber));
                // Eğer birden fazla eşleşen olabilir diyorsan (çoklu daire/alan için), şunu kullanabilirsin:
                // const matchedBuildings = buildingData.filter(b => String(b.rowNumber) === String(entry.rowNumber));

                return {
                    tarih: entry.tarih,
                    rowNumber: entry.rowNumber,
                    unit: entry.unit,
                    tutar: entry.tutar,
                    not: entry.not,
                    buildingDetail: matchedBuilding || null
                    // Eğer çoklu istersen: buildingDetails: matchedBuildings
                };
            });

            return res.json({ success: true, yerSahibiIleAnlasma: yerSahibiIleAnlasmaList });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Ana para okuma sırasında hata oluştu." });
        }
    } else if(process === "saveAnaParaKentsel"){
        try {
            const { userId, projectName, tip, tutar } = req.body;

            if (!userId || !projectName || !tip || !tutar)
            return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            // ANA KISIM: Yeni anaPara kaydını push et
            userInput.anaParaKentsel.push({
                tip,
                tutar // bu Number olmalı, gerekirse Number(tutar) yap
            });

            // Tüm kullanıcıyı kaydet
            await user.save();

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'DB Ana para ekleme sırasında hata oluştu.' });
        }

    } else if (process === "readAnaParaKentsel") {
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
                return res.status(400).json({ error: "Kullanıcı veya proje eksik." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // Sadece tip ve tutar alanlarını eşle
            const anaParaKentselList = (userInput.anaParaKentsel || []).map(entry => ({
                tip: entry.tip,
                tutar: entry.tutar
            }));

            return res.json({ success: true, anaParaKentsel: anaParaKentselList });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Ana para okuma sırasında hata oluştu." });
        }
    } else if(process === "deleteAnaParaKentsel"){
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
            return res.status(400).json({ error: 'Eksik parametre!' });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı!' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı!' });

            // Ana kaydı ve tüm altParaları sil
            userInput.anaParaKentsel = [];         // anaPara bir dizi ise, tamamen boşalt
            userInput.altParaKensel = [];         // altPara dizisini tamamen sıfırla

            await user.save();

            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'Ana kayıtları silerken hata oluştu.' });
        }
    } else if(process === "saveAltParaKentsel"){
        try {
            const { userId, projectName, tip, tutar, tarih, aciklama } = req.body;
            if (!userId || !projectName || !tip || !tutar || !tarih || !aciklama)
            return res.status(400).json({ error: 'Eksik parametre.' });

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: 'Proje bulunamadı.' });

            // Alt para ekle
            userInput.altParaKentsel.push({ tip, tutar, tarih, aciklama });

            // Son eklenen obje
            const yeniAltParaKentsel = userInput.altParaKentsel[userInput.altParaKentsel.length - 1];

            await user.save();

            // DİKKAT: _id artık Mongo tarafından atanmış!
            return res.json({
                success: true,
                altParaKentsel: {
                    tip: yeniAltParaKentsel.tip,
                    tutar: yeniAltParaKentsel.tutar,
                    tarih: yeniAltParaKentsel.tarih,
                    aciklama: yeniAltParaKentsel.aciklama,
                    _id: yeniAltParaKentsel._id    // <-- KRİTİK!
                }
            });
        } catch (err) {
            return res.status(500).json({ error: err.message || 'DB Alt para ekleme sırasında hata oluştu.' });
        }
    } else if(process === "readAltParaKentsel"){
        try {
            const { userId, projectName } = req.body;
            if (!userId || !projectName) {
                return res.status(400).json({ error: "Kullanıcı veya proje eksik." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // Sadece tip ve tutar alanlarını eşle
            const altParaKentselList = (userInput.altParaKentsel || []).map(entry => ({
                tip: entry.tip,
                tutar: entry.tutar,
                tarih:entry.tarih,
                aciklama:entry.aciklama,
                _id: entry._id
            }));

            return res.json({ success: true, altParaKentsel: altParaKentselList });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Ana para okuma sırasında hata oluştu." });
        }
    } else if (process === "deleteAltParaKentsel") {
        try {
            const { userId, projectName, altParaId } = req.body;
            if (!userId || !projectName || !altParaId) {
            return res.status(400).json({ error: "Eksik bilgi." });
            }

            const user = await Users.findById(userId);
            if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı." });

            const userInput = user.userInputs.find(p => p.projectName === projectName);
            if (!userInput) return res.status(404).json({ error: "Proje bulunamadı." });

            // ID eşleşmesiyle altPara silme
            const eskiUzunluk = (userInput.altParaKentsel || []).length;
            userInput.altParaKentsel = (userInput.altParaKentsel || []).filter(
            altparaKentsel => !(altparaKentsel._id && altparaKentsel._id.toString() === altParaId)
            );
            const yeniUzunluk = (userInput.altParaKentsel || []).length;

            if (eskiUzunluk === yeniUzunluk) {
            return res.status(404).json({ error: "Kayıt bulunamadı veya zaten silinmiş." });
            }

            await user.save();
            return res.json({ success: true });
        } catch (err) {
            return res.status(500).json({ error: err.message || "Silme sırasında hata oluştu." });
        }
    }
});

module.exports = router;