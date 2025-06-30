const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
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

        res.render('sites/drawCanvas', {
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
    const { userId, projectName, isSoldSituation = null, dataOwner = null, soldOwner = null, process= null } = req.body;
    
    if(projectName && !isSoldSituation && !dataOwner && !soldOwner && !process){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // İlgili projeyi bul (userInputs içinde)
            const project = user.userInputs.find(prj => prj.projectName === projectName);

            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            let selectedDoor;
            if (!project.selectedDoor || project.selectedDoor.length === 0) {
                project.selectedDoor = [{ selectedDoor: "right" }];
                await user.save();
                selectedDoor = [{ selectedDoor: "right" }];
            } else {
                selectedDoor = project.selectedDoor;
            }
            let selectedWall;
            if (!project.selectedWall || project.selectedWall.length === 0) {
                project.selectedWall = [{ selectedWall: "none" }];
                await user.save();
                selectedWall = [{ selectedWall: "none" }];
            } else {
                selectedWall = project.selectedWall;
            }

            // building, floorsData ve selectedDoor dön
            return res.json({
                success: true,
                message: "Kayıt bulundu!",
                building: project.building || [],
                floorsData: project.floorsData || [],
                selectedDoor,
                selectedWall
            });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && isSoldSituation && !dataOwner && !soldOwner && !process){
        const floorName = isSoldSituation.floorName;
        const rowNumber = isSoldSituation.rowNumber;
        const isSold = isSoldSituation.isSold;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // İlgili projeyi bul (userInputs içinde)
            const project = user.userInputs.find(prj => prj.projectName === projectName);

            // İlgili floor bul
            const floor = project.floorsData.find(f => f.floorName === floorName);
            // O katta ilgili oda (room) bul (rowNumber ile)
            const room = floor.rooms.find(r => r.rowNumber === rowNumber);

            if (!project || !floor || !room) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            room.isSold = isSold;
            await user.save();
            return res.status(200).json({ success: true, message: "Durum güncellendi.", project });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && dataOwner && !isSoldSituation && !soldOwner && !process){
        const dataOwnerText = req.body.dataOwnerText;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            if(dataOwnerText === "add"){
                // yerSahibiIleAnlasma alanını kontrol et, yoksa başlat
                if (!project.yerSahibiIleAnlasma) {
                    project.yerSahibiIleAnlasma = [];
                }

                // rowNumber'a göre arama
                const existingAgreement = project.yerSahibiIleAnlasma.find(
                    agr => agr.rowNumber === dataOwner.rowNumber
                );

                if (existingAgreement) {
                    existingAgreement.tarih = dataOwner.tarih;
                    existingAgreement.unit = dataOwner.unit;
                    existingAgreement.tutar = dataOwner.tutar;
                    existingAgreement.not = dataOwner.not;
                } else {
                    // AGREEMENT EKLE
                    project.yerSahibiIleAnlasma.push(dataOwner);
                }
            }else if(dataOwnerText === "delete"){
                if (!project.yerSahibiIleAnlasma) {
                    project.yerSahibiIleAnlasma = [];
                }
                // Burada rowNumber'a göre siliyoruz:
                project.yerSahibiIleAnlasma = project.yerSahibiIleAnlasma.filter(
                    agr => agr.rowNumber !== dataOwner.rowNumber
                );
            }
            
            await user.save();
            return res.status(200).json({ success: true, message: "Durum güncellendi.", project });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && !dataOwner && !isSoldSituation && soldOwner && !process){
        const soldOwnerText = req.body.soldOwnerText;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            if(soldOwnerText === "add"){
                // soldItems alanını kontrol et, yoksa başlat
                if (!project.soldItems) {
                    project.soldItems = [];
                }

                // rowNumber'a göre arama
                const existingAgreement = project.soldItems.find(
                    agr => agr.rowNumber === soldOwner.rowNumber
                );

                if (existingAgreement) {
                    existingAgreement.date = soldOwner.date;
                    existingAgreement.itemPrice = soldOwner.itemPrice;
                    existingAgreement.buyerInfo = soldOwner.buyerInfo;
                } else {
                    // AGREEMENT EKLE
                    project.soldItems.push(soldOwner);
                }
            }else if(soldOwnerText === "delete"){
                if (!project.soldItems) {
                    project.soldItems = [];
                }
                // Burada rowNumber'a göre siliyoruz:
                project.soldItems = project.soldItems.filter(
                    agr => agr.rowNumber !== soldOwner.rowNumber
                );

                // Sadece rowNumber OLANLARI çıkart, diğerlerini bırak
                project.payment = project.payment.filter(p => p.rowNumber !== String(soldOwner.rowNumber));
            }
            
            await user.save();
            return res.status(200).json({ success: true, message: "Durum güncellendi.", project });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && !isSoldSituation && !dataOwner && !soldOwner && process === "saveName"){
        const { saves } = req.body; // saves.areaDb ve saves.value gelmeli

        if(saves.areaDb === "mimarName"){
            try {
                const user = await Users.findById(userId);
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
                }

                // Doğru project
                const project = user.userInputs.find(prj => prj.projectName === projectName);
                if (!project) {
                    return res.status(404).json({ success: false, message: "Proje bulunamadı." });
                }

                // Eğer mimarName array’i yoksa ekle
                if (!Array.isArray(project.mimarName)) {
                    project.mimarName = [];
                }

                // Eğer içinde kayıt varsa ilk elemanı güncelle; yoksa ekle
                if (project.mimarName.length > 0) {
                    project.mimarName[0].name = saves.text;
                } else {
                    project.mimarName.push({ name: saves.text });
                }

                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Mimar adı güncellendi.",
                    mimarName: project.mimarName
                });

            } catch (err) {
                console.error("Kayıt Hatası:", err);
                return res.status(500).json({ success: false, message: "Veri hatası" });
            }
        } else{
            try {
                const user = await Users.findById(userId);
                if (!user) {
                    return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
                }

                // Doğru project
                const project = user.userInputs.find(prj => prj.projectName === projectName);
                if (!project) {
                    return res.status(404).json({ success: false, message: "Proje bulunamadı." });
                }

                // Eğer mimarName array’i yoksa ekle
                if (!Array.isArray(project.mimarName)) {
                    project.sefName = [];
                }

                // Eğer içinde kayıt varsa ilk elemanı güncelle; yoksa ekle
                if (project.sefName.length > 0) {
                    project.sefName[0].name = saves.text;
                } else {
                    project.sefName.push({ name: saves.text });
                }

                await user.save();

                return res.status(200).json({
                    success: true,
                    message: "Şef adı güncellendi.",
                    sefName: project.sefName
                });

            } catch (err) {
                console.error("Kayıt Hatası:", err);
                return res.status(500).json({ success: false, message: "Veri hatası" });
            }
        }
    } else if (projectName && userId && process === "savePhoto") {
        const { floorName, rowNumber } = req.body;
        const file = req.file;
        if (!file) return res.status(400).json({ error: 'Dosya yok.' });

        // 1. Kullanıcı ve projeyi bul (her defasında güncel haliyle)
        const user = await Users.findById(userId);
        if (!user)
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });

        const userInputIndex = user.userInputs.findIndex(p => p.projectName === projectName);
        if (userInputIndex === -1)
            return res.status(404).json({ success: false, message: "Proje bulunamadı." });

        const floors = user.userInputs[userInputIndex].floorsData;
        const floorIndex = floors.findIndex(f => f.floorName === floorName);
        if (floorIndex === -1)
            return res.status(404).json({ success: false, message: "Kat bulunamadı." });

        const rooms = floors[floorIndex].rooms;
        const roomIndex = rooms.findIndex(r => r.rowNumber === rowNumber);
        if (roomIndex === -1)
            return res.status(404).json({ success: false, message: "Oda bulunamadı." });

        // 2. S3 client’ı başlat
        const s3 = getS3Client();

        // 3. Eski fotoğrafları Cloudflare'dan sil
        // Sadece photo path'i olanları siliyoruz
        const oldPhotos = Array.isArray(rooms[roomIndex].photo) ? rooms[roomIndex].photo : [];
        for (const oldPhoto of oldPhotos) {
            if (oldPhoto.path) {
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: getKeyFromUrl(oldPhoto.path)
                    }));
                } catch (e) {
                    console.error("Cloudflare'dan foto silinemedi:", e);
                }
            }
        }

        // 4. Yeni dosyayı Cloud’a yükle
        const ext = path.extname(file.originalname);
        const r2Filename = `evraklar/${userId}_${Date.now()}${ext}`;
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: r2Filename,
            Body: file.buffer,
            ContentType: file.mimetype
        }));

        // 5. Yeni fotoğraf URL'si
        const fileUrl = `${PUBLIC_BASE_URL}/${r2Filename}`;

        // 6. Doğrudan MongoDB update ile ilgili alanı değiştir
        const photoUpdatePath = `userInputs.${userInputIndex}.floorsData.${floorIndex}.rooms.${roomIndex}.photo`;

        await Users.updateOne(
            { _id: userId },
            { $set: { [photoUpdatePath]: [{ path: fileUrl }] } }
        );

        return res.status(200).json({
            success: true,
            message: "Fotoğraf güncellendi.",
            photo: [{ path: fileUrl }]
        });
    } else if (projectName && userId && process === "readPhoto") {
        const { floorName, rowNumber } = req.body;

        // 1. Kullanıcı ve proje kontrolü
        const user = await Users.findById(userId);
        if (!user) {
            return res.status(401).json({ success: false, message: "Kullanıcı bulunamadı." });
        }

        const userInput = user.userInputs.find(p => p.projectName === projectName);
        if (!userInput) {
            return res.status(404).json({ success: false, message: "Proje bulunamadı." });
        }

        // 2. Kat kontrolü
        const floor = userInput.floorsData.find(f => f.floorName === floorName);
        if (!floor) {
            return res.status(404).json({ success: false, message: "Kat bulunamadı." });
        }

        // 3. Oda bul
        const room = floor.rooms.find(r => r.rowNumber === rowNumber);
        if (!room) {
            return res.status(404).json({ success: false, message: "Oda bulunamadı." });
        }

        // 4. Fotoğraf var mı?
        if (!Array.isArray(room.photo) || room.photo.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "Fotoğraf bulunamadı.",
                userType:user.userType
            });
        }

        // 5. Fotoğrafı döndür
        return res.status(200).json({
            success: true,
            userType:user.userType,
            photo: room.photo   // Tek foto ise room.photo[0] da dönebilirsin
        });
    }

    // Yardımcı fonksiyon
    function getKeyFromUrl(url) {
        // http://cdn.site/evraklar/userid_123.png => evraklar/userid_123.png
        return url.split('/').slice(-2).join('/');
    }
});

module.exports = router;