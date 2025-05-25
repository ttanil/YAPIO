const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const Users = require(path.join(__dirname, '..', 'models', 'users'));


const authenticateUser = require('../middleware/authenticateUser');

router.get('/', authenticateUser, async (req, res) => {
    const projectName = req.query.projectName;
    const userId = res.locals.user._id || res.locals.user.id;

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

        res.render('sites/quatation', {
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
    const { userId, projectName, activeType = null, process = null } = req.body;
    
    if (projectName && activeType && process === "read") {
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            // Eğer istenen aktif tip yoksa oluştur (boş dizi olarak)
            if (!project[activeType]) {
                project[activeType] = [];
                await user.save(); // zorunlu değil, silinebilir
            }

            return res.json({
                success: true,
                message: "Kayıt bulundu!",
                activeType: project[activeType]
            });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if (projectName && activeType && process === "save") {
        const dataToDb = req.body.saves;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            project[activeType] = dataToDb;
            await user.save();

            return res.json({ success: true, message: "Veri kaydedildi." });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri kaydedilemedi." });
        }
    } else if (projectName && activeType && process === "building") {
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Projeyi bul
            const project = user.userInputs.find(prj => prj.projectName === projectName);

            if (project) {
                return res.json({
                    success: true,
                    message: "Başarılı!",
                    projectName,
                    building: project.building || []
                });
            }

            // Proje yoksa boş array dön
            return res.json({ success: true, message: "Kayıt başarılı!", building: [] });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Kayıt hatası: " });
        }
    } else if(projectName && activeType && process === "readPayment"){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            if (!project[activeType] || project[activeType].length == 0) {
                if(activeType === "getPayment"){
                    project[activeType] = [{counter : 0, tutar: "0", tarih: null, not: "alinacak_para"}];
                } else if(activeType === "givePayment"){
                    project[activeType] = [{counter : 0, tutar: "0", tarih: null, not: "verilecek_para"}];
                }
                await user.save();
            }

            return res.json({
                success: true,
                message: "Kayıt bulundu!",
                activeType: project[activeType]
            });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri kaydedilemedi." });
        }
    }else if(projectName && activeType && process === "savePayment"){
        const dataToDb = req.body.saves;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }
            project[activeType] = dataToDb;
            await user.save();
            
            return res.json({ success: true, message: "Veri kaydedildi." });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri kaydedilemedi." });
        }
    } else if(projectName && activeType && process === "alinacak_para"){
        const dataToDb = req.body.saves;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            if (Array.isArray(project[activeType]) && project[activeType][0]) {
                project[activeType][0].tutar = dataToDb[0].tutar;
                project[activeType][0].tarih = dataToDb[0].tarih;
                project[activeType][0].not   = dataToDb[0].not;
                await user.save();
                return res.json({ success: true, message: "Veri güncellendi." });
            }
        
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri kaydedilemedi." });
        }
    } else if(projectName && activeType && process === "verilecek_para"){
        const dataToDb = req.body.saves;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const project = user.userInputs.find(prj => prj.projectName === projectName);
            if (!project) {
                return res.status(404).json({ success: false, message: "Proje bulunamadı." });
            }

            if (Array.isArray(project[activeType]) && project[activeType][0]) {
                project[activeType][0].tutar = dataToDb[0].tutar;
                project[activeType][0].tarih = dataToDb[0].tarih;
                project[activeType][0].not   = dataToDb[0].not;
                await user.save();
                return res.json({ success: true, message: "Veri güncellendi." });
            }
        
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri kaydedilemedi." });
        }
    }else {
        return res.status(400).json({ success: false, message: "Eksik parametre." });
    }
});

module.exports = router;