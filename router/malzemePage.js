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

        res.render('sites/malzeme', {
            project: selectedProject,
            user: res.locals.user,
            role: res.locals.userRole
        });
    } catch (err) {
        console.error(err);
        return res.status(500).send("Sunucu hatası.");
    }
});

router.post('/', async (req, res) => {
    const process = req.body.process;

    if(process === "initialize"){
        try {
            const { userId, projectName, data } = req.body;

            // 1. Kullanıcıyı ve ilgili projeyi bul
            const user = await Users.findById(userId);
            if (!user)
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje)
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });

            // 2. Materials alanının mevcut olup olmadığını kontrol et
            if (!Array.isArray(proje.materials)) {
                proje.materials = []; // Eğer materials alanı yoksa, boş bir dizi oluştur
            }

            // 3. Data kontrolü ve eksik alanların oluşturulması
            for (const [key, units] of Object.entries(data)) {
                // Önce materials içinde bu malzemenin olup olmadığını kontrol et
                const existingMaterial = proje.materials.find(material => material.name === key);
                if (!existingMaterial) {
                    // Eğer material mevcut değilse, yeni material oluştur
                    const newMaterial = {
                        name: key,
                        units: units,
                        savedResults: [] // Boş savedResults dizisi
                    };
                    proje.materials.push(newMaterial); // Yeni malzemeyi materials dizisine ekle
                }
            }

            // 4. Değişiklikleri kaydet
            user.markModified('userInputs');
            await user.save();

            return res.json({ success: true, message: "Malzemeler başarıyla güncellendi." });

        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Bir hata oluştu.",
                error: err.message
            });
        }

    } else if(process === "read"){
        try {
            const { userId, projectName } = req.body;
            const user = await Users.findOne({
            _id: userId,
            "userInputs.projectName": projectName
        });

        if (!user) return res.status(404).json([]);

        const proje = user.userInputs.find(ui => ui.projectName === projectName);
        if (!proje) return res.json([]);

        const materials = proje.materials || []; // Eğer materials yoksa boş bir dizi döner

        return res.json({ success: true, materials });


        } catch (err) {
            console.error(err);
            return res.status(500).json({
                success: false,
                message: "Bir hata oluştu.",
                error: err.message
            });
        }

    } else if(process === "save"){
        try {
            const { userId, projectName, saves } = req.body;

            // 1. Kullanıcıyı ve ilgili projeyi bul
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
            }

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            // 2. Projedeki materials'ı kontrol et
            const { materialValue, birim, birimFiyat, miktar, toplamTutar } = saves;

            // Malzemeyi bul
            const material = proje.materials.find(m => m.name === materialValue);
            if (!material) {
                return res.status(404).json({ success: false, message: "Malzeme bulunamadı." });
            }

            // 3. Eşleşen malzeme varsa, savedResults alanına verileri ekle
            const newMaterialResult = {
                birim,
                birimFiyat,
                miktar,
                toplamTutar,
                from:"malzeme"
            };

            // Eğer savedResults alanı yoksa başlat
            if (!material.savedResults) {
                material.savedResults = [];
            }

            material.savedResults.push(newMaterialResult);

            await user.save(); 

            return res.status(200).json({ success: true, message: "Veriler kaydedildi." });
        } catch (error) {
            console.error("Hata: ", error);
            return res.status(500).json({ success: false, message: "Bir hata oluştu." });
        }
    } else if(process === "delete"){
        try {
            const { userId, projectName, data } = req.body;
            const materialId = data._id; // Silinecek malzemenin ID'si
            const evrakId = data.evrakId; // Sileceğimiz evrak ID'si

            // 1. Kullanıcıyı ve ilgili projeyi bul
            const user = await Users.findById(userId);  
            if (!user) {
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
            }

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            let isDeletedMaterial = false; // Malzeme silindi mi kontrolü için
            let isDeletedEvrak = false; // Evrak silindi mi kontrolü için

            // 2. Malzeme silme işlemi
            for (const material of proje.materials) {
                // Silinenecek kaynağa ait sonuçları kontrol et
                const initialLength = material.savedResults.length;

                // materialId ile eşleşmeyen sonuçları filtrele
                material.savedResults = material.savedResults.filter(result => {
                    // result._id ve materialId'nin undefined olup olmadığını kontrol et
                    return result._id && materialId && !result._id.equals(materialId);
                });

                // Eğer length değişmişse, silme işlemi başarılı oldu demektir
                if (initialLength !== material.savedResults.length) {
                    isDeletedMaterial = true; // Malzeme silindi
                }
            }

            // 3. Proje şemasındaki her alanın arraylerini kontrol et
            const schemaFields = [
                "islakMekanlar", "mutfak", "pimapen", "zeminUygulamalari",
                "icCephe", "kapilar", "korkuluklar", "disCephe", "mantolama",
                "tavan", "elektrikTesisat", "sihhiTesisat", "dogalgaz",
                "asansorKurulumu", "iklimlendirme", "peyzaaj", "santiyeKurma",
                "temelKazma", "groBeton", "radyalTemel", "perdeBetonu",
                "temelIzolasyon", "dolgu", "subasman", "zeminBetonu",
                "katBetonlari", "kapamaBetonu", "catiUygulama", "duvarOrme",
                "sap", "aplikasyon", "imarDurumuKaydi", "kanalKotu",
                "ruhsatHarci", "kadastrKaydi", "tapuKaydi", "vergiKaydi",
                "sskTutar", "avukat", "emlakci", "reklam",
                "zeminEtuduHarci", "muteahhitlikSozlesmesi", "vekaletSozlesmesi",
                "yapiDenetimHarci", "fenniJeoloji", "fenniHaritaci",
                "zeminEtuduRaporu", "zeminIyilestirme", "mimariProje",
                "statikProje", "tesisatProje", "hesProje",
                "akustikProje", "kalipIsciligi", "demirIsciligi",
                "duvarOrmeIsciligi", "sivaIsciligi", "sapIsciligi",
                "catiIsciligi", "mantolamaIsciligi", "yalitimIsciligi",
                "suTesisatiIsciligi", "elektrikIsciligi", "dogalgazIsciligi",
                "asansorIsciligi", "dekorAlcipanIsciligi", "perforjeIsciligi"
            ];

            // 4. Arrayleri gezerek evrakId ile eşleşenleri silme işlemini gerçekleştir
            for (const field of schemaFields) {
                if (Array.isArray(proje[field])) {
                    const initialLength = proje[field].length;

                    // Her bir field altındaki kayıtlarda evrakId ile eşleşenleri sil
                    proje[field] = proje[field].filter(item => {
                        // item.evrakId'nin undefined olup olmadığını kontrol et
                        return item.evrakId && evrakId && !item.evrakId.equals(evrakId);
                    });

                    // Eğer length değişmişse, silme işlemi başarılı oldu
                    if (initialLength !== proje[field].length) {
                        isDeletedEvrak = true; // Evrak silindi
                    }
                }
            }

            // 5. Kaydetme ve geri dönüş
            if (isDeletedMaterial || isDeletedEvrak) {
                await user.save();
                return res.status(200).json({
                    success: true,
                    message: "Kayıt başarıyla silindi.",
                    materials: proje.materials
                });
            } else {
                return res.status(404).json({ success: false, message: "Silinecek kayıt bulunamadı." });
            }

        } catch (error) {
            console.error("Hata: ", error);
            return res.status(500).json({ success: false, message: "Bir hata oluştu." });
        }

    } else if(process === "saveNewMaterial"){
        try {
            const { userId, projectName, newData } = req.body;
            //console.log(newData);
            const user = await Users.findById(userId);  
            if (!user) {
                return res.status(404).json({ success: false, message: "Kullanıcı bulunamadı." });
            }

            const proje = user.userInputs.find(p => p.projectName === projectName);
            if (!proje) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            // Aynı materyal önceden var mı kontrolü:
            const alreadyExists = proje.materials.some(
                m => m.name === newData.newMaterialNameDb
            );


            if (alreadyExists) {
            return res.status(400).json({ error: "Bu isimle bir materyal zaten var." });
            }

            // Yoksa ekle:
            proje.materials.push({
                name:newData.newMaterialNameDb,
                nameText: newData.materialName,        // Orjinal (ör: 'Ğöç')
                units: newData.unitsInput,
                savedResults: []
            });

            await user.save();

            return res.json({ success: true, message: "Materyal eklendi.", materials: proje.materials });

        } catch (error) {
            console.error("Hata: ", error);
            return res.status(500).json({ success: false, message: "Bir hata oluştu." });
        }
    }


});

module.exports = router;