const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const Users = require(path.join(__dirname, '..', 'models', 'users'));


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

router.post('/', async (req, res) => {
    const { userId, projectName, isSoldSituation = null, dataOwner = null, soldOwner = null } = req.body;

    //console.log("dataPost  ",dataPost); 
    
    if(projectName && !isSoldSituation && !dataOwner && !soldOwner){
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

            // building ve floorsData'yı dön
            return res.json({
                success: true,
                message: "Kayıt bulundu!",
                building: project.building || [],
                floorsData: project.floorsData || []
            });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && isSoldSituation && !dataOwner && !soldOwner){
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
    } else if(projectName && dataOwner && !isSoldSituation && !soldOwner){
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
    } else if(projectName && !dataOwner && !isSoldSituation && soldOwner){
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
    }
});

module.exports = router;