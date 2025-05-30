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

        res.render('sites/bina', {
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
    const { userId, projectName, building = null, floorsData = null } = req.body;

    //console.log("building ",building, " ",projectName);
    
    if(projectName && !building && !floorsData){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Aynı isimde proje var mı kontrolü (userInputs dizisinde)
            const projectExist = user.userInputs.some(
                input => input.projectName === projectName
            );

            if (projectExist) {
                return res.status(400).json({ success: false, message: "Aynı isimde bir proje zaten var."});
            }

            // PROJEYİ RAW OBJECT OLARAK OLUŞTUR
            user.userInputs.push({
                projectName: projectName, 
                building: [],
                floorsData: []
            });

            await user.save();
            return res.json({ success: true, message: "Kayıt başarılı!" });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Kayıt hatası: " });
        }
    } else if(projectName && building && !floorsData){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Var olan proje var mı kontrolü
            const projectIndex = user.userInputs.findIndex(prj => prj.projectName === projectName);

            if (projectIndex !== -1) {
                // Proje mevcutsa, building'i tamamen yenisiyle değiştir
                user.userInputs[projectIndex].building = building;
                user.userInputs[projectIndex].metreMaliyet = { metreMaliyeti: 0 };
            } else {
                // Proje yoksa yeni proje oluşturup ekle
                return res.json({
                    success: true,
                    message: "Kayıt başarılı!",
                    projectName: projectName,
                    building: updatedProject ? updatedProject.building : []
                });
            }

            await user.save();
            return res.json({ success: true, message: "Kayıt başarılı!", userInputs: building });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Kayıt hatası: " });
        }
    } else if(projectName && !building && floorsData){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Projeyi ara
            const projectIndex = user.userInputs.findIndex(prj => prj.projectName === projectName);

            if (projectIndex !== -1) {
                // Proje varsa floorsData'yı güncelle
                user.userInputs[projectIndex].floorsData = floorsData;
            } else {
                // Proje yoksa yeni proje oluştur
                user.userInputs.push({
                    projectName: projectName,
                    building: [],           // boş bırakabilirsin
                    floorsData: floorsData  // gelen floorsData ile ekle
                });
            }

            await user.save();

            // Son halini alıp dönebilirsin
            const updatedProject = user.userInputs.find(prj => prj.projectName === projectName);
            // Sadece floorsData dönebilirsin ya da tüm projeyi dönmek isteyebilirsin:
            return res.json({
                success: true,
                message: "Kayıt başarılı!",
                floorsData: updatedProject.floorsData,
                project: updatedProject
            });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Kayıt hatası: " });
        }
    }
});

module.exports = router;