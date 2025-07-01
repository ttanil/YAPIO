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
    const { userId, projectName, building = null, floorsData = null, process = null } = req.body;

    //console.log("building ",req.body);
    
    if(projectName && !building && !floorsData && !process){
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
    } else if(projectName && building && !floorsData &&!process){
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
    } else if(projectName && !building && floorsData &&!process){
        const selectedDoor = req.body;
        const selectedWall = req.body;
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Projeyi ara
            const projectIndex = user.userInputs.findIndex(prj => prj.projectName === projectName);

            if (projectIndex !== -1) {
                // Proje varsa floorsData VE selectedDoor güncelle
                user.userInputs[projectIndex].floorsData = floorsData;
                user.userInputs[projectIndex].selectedDoor = selectedDoor;
                user.userInputs[projectIndex].selectedWall = selectedWall;
            } else {
                // Proje yoksa yeni proje oluştur
                user.userInputs.push({
                    projectName: projectName,
                    building: [],
                    floorsData: floorsData,
                    selectedDoor: selectedDoor,
                    selectedWall:selectedWall
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
    } else if(projectName && !building && !floorsData && process === "saveColor"){
        const data  = req.body;
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

            // Eğer colorSelected array’i yoksa ekle
            if (!Array.isArray(project.colorSelected)) {
                project.colorSelected = [];
            }

            // Eğer içinde kayıt varsa ilk elemanı güncelle; yoksa ekle
            if (project.colorSelected.length > 0) {
                project.colorSelected[0].color = data.color;
            } else {
                project.colorSelected.push({ color: data.color });
            }

            await user.save();

            return res.status(200).json({
                success: true,
                message: "Renk seçimi güncellendi.",
                colorSelected: project.colorSelected
            });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    }
});

module.exports = router;