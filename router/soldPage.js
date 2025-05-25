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

        res.render('sites/sold', {
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

            return res.json({
                success: true,
                message: "Kayıt bulundu!",
                activeType: project[activeType]
            });
        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Veri hatası" });
        }
    } else if(projectName && activeType && process === "save"){
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
    }
});

module.exports = router;