const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const bcrypt = require('bcrypt');


const authenticateUser = require('../middleware/authenticateUser');

router.get('/', authenticateUser, (req, res) => {
    res.render('sites/index', {
        user: res.locals.user,          // null veya {id, email, role}
        role: res.locals.userRole,       // "user", "admin" veya "misafir"
    });
});

router.post('/', async (req, res) => { 
    const { userId, projectName, activeType = null, process = null } = req.body || {};
    
    if(userId && !projectName && !process){
        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            const userType = user.userType;
            
            let projects = null;
            if (user.userInputs && user.userInputs.length > 0) {
                projects = user.userInputs.map(input => ({
                    userNameInfo : user.name,
                    userPhoneInfo : user.phone,
                    userEmailInfo : user.email,
                    userTCnoInfo : user.TCno,
                    userIlInfo : user.il,
                    userIlceInfo : user.ilce,
                    userSirketIl : user.sirketIl,
                    userSirketIlce : user.sirketIlce,
                    userTipiInfo : user.tipi,
                    userVergiNo : user.vergiNo,
                    projectName: input.projectName,
                    building: input.building,
                    floorsData: input.floorsData
                }));
            } else{
                projects = {
                    userNameInfo : user.name,
                    userPhoneInfo : user.phone,
                    userEmailInfo : user.email,
                    userTCnoInfo : user.TCno,
                    userIlInfo : user.il,
                    userIlceInfo : user.ilce,
                    userSirketIl : user.sirketIl,
                    userSirketIlce : user.sirketIlce,
                    userTipiInfo : user.tipi,
                    userVergiNo : user.vergiNo
                }
            }
            return res.json({ success: true, projects, userType: userType });

        } catch (err) {
            console.error("Kayıt Hatası:", err);
            return res.status(500).json({ success: false, message: "Kayıt hatası: " });
        }
    } else if(userId && projectName && !process){
        try {
            const result = await Users.updateOne(
                { _id: userId },
                { $pull: { userInputs: { projectName } } }
            );

            if (result.modifiedCount > 0) {
                return res.json({ success: true, message: "Proje silindi!" });
            } else {
                return res.status(404).json({ success: false, message: "Proje bulunamadı!" });
            }
        } catch (err) {
            console.error("Silme hatası:", err);
            return res.status(500).json({ success: false, message: "Proje silme hatası" });
        }
    } else if(userId && projectName && process === "read"){
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
    } else if(userId && projectName && process === "saveUserInfos"){
        const dataToDb = req.body.userInfos;
        const passwordRecent = dataToDb.passwordRecent;

        try {
            const user = await Users.findById(userId);
            if (!user) {
                return res.status(401).json({ success: false, message: 'Geçersiz giriş!' });
            }

            // Önce eski şifre doğru mu bakalım:
            const isMatch = await bcrypt.compare(passwordRecent, user.password);
            if (!isMatch) {
                return res.status(401).json({ message: 'Geçersiz şifre!' });
            }

            // GÜNCELLENECEK ALANLAR (eski veriyle birleştirerek)
            let updateFields = {};

            // Temel ve koşullu validasyonlar:
            const tipi = dataToDb.userTipiInfo || user.tipi;
            if (!["sahis", "sirket"].includes(tipi)) {
                return res.json({ success: false, message: "Kullanıcı tipi geçersiz!" });
            }
            updateFields.tipi = tipi;

            // Ortak alanlar
            updateFields.name   = dataToDb.name?.trim()   || user.name;
            updateFields.phone  = dataToDb.phone?.trim()  || user.phone;
            updateFields.email  = dataToDb.email?.trim()  || user.email;

            // userType (free/premium) seçimi veya koruması
            updateFields.userType = dataToDb.userType || user.userType;

            // Şifre: yeni şifre girildiyse hashle, yoksa aynen bırak
            if (dataToDb.password && dataToDb.password.length >= 6 && dataToDb.password.length <= 12) {
                updateFields.password = await bcrypt.hash(dataToDb.password, 10);
            } else {
                updateFields.password = user.password;
            }

            // Şahıs bilgileri
            if (tipi === "sahis") {
                updateFields.TCno  = dataToDb.userTCnoInfo?.trim()  || user.TCno || "";
                updateFields.il    = dataToDb.userIlInfo?.trim()     || user.il   || "";
                updateFields.ilce  = dataToDb.userIlceInfo?.trim()   || user.ilce || "";
                updateFields.vergiNo    = "";       // Sıfırlanıyor
                updateFields.sirketIl   = "";
                updateFields.sirketIlce = "";
            }
            // Şirket bilgileri
            else if (tipi === "sirket") {
                updateFields.vergiNo    = dataToDb.userVergiNo?.trim()     || user.vergiNo || "";
                updateFields.sirketIl   = dataToDb.userSirketIl?.trim()    || user.sirketIl || "";
                updateFields.sirketIlce = dataToDb.userSirketIlce?.trim()  || user.sirketIlce || "";
                updateFields.TCno   = "";    // Sıfırlanıyor
                updateFields.il     = "";
                updateFields.ilce   = "";
            }

            // E-Rol kontrolü (admin/user) değiştirilebilir isteniyorsa
            if (dataToDb.role && ['user', 'admin'].includes(dataToDb.role)) {
                updateFields.role = dataToDb.role;
            } else {
                updateFields.role = user.role;
            }

            // createdAt ve userInputs gibi otomatik veya nested alanları elleme,
            // kullanıcıdan yeni giriş alınacaksa veya eklenmek isteniyorsa bunlara yönelik ek kod yazılır.
            // (userInputs ekleme/güncelleme gerekiyorsa ayrıca belirtirsin.)

            // Şimdi validasyonları (gelen verileri) tek tek kontrol et:
            if (!isValidName(updateFields.name)) {
                return res.json({ success: false, message: "Ad veya şirket adı geçersiz!" });
            }
            if (!isValidEmail(updateFields.email)) {
                return res.json({ success: false, message: "E-posta geçersiz!" });
            }
            if (!isValidPhone(updateFields.phone)) {
                return res.json({ success: false, message: "Telefon numarası geçersiz! 11 haneli rakam giriniz." });
            }
            // TC no/ vergi no validasyonları
            if (tipi === "sahis" && !isValidTC(updateFields.TCno)) {
                return res.json({ success: false, message: "TC Kimlik no geçersiz!" });
            }
            if (tipi === "sirket" && !isValidVergiNo(updateFields.vergiNo)) {
                return res.json({ success: false, message: "Vergi No geçersiz!" });
            }
            // İl ve ilçe validasyonları
            if (tipi === "sahis") {
                if (!isValidIlIlce(updateFields.il) || !isValidIlIlce(updateFields.ilce)) {
                    return res.json({ success: false, message: "İl veya ilçe bilgisi geçersiz!" });
                }
            }
            if (tipi === "sirket") {
                if (!isValidIlIlce(updateFields.sirketIl) || !isValidIlIlce(updateFields.sirketIlce)) {
                    return res.json({ success: false, message: "Şirket ili/ilçesi geçersiz!" });
                }
            }

            // E-mail/TC/vergino benzersizliği (değişiklik varsa başka kullanıcıda var mı kontrolü)
            if (updateFields.email !== user.email) {
                const emailUsed = await Users.findOne({ email: updateFields.email, _id: { $ne: userId } });
                if (emailUsed) {
                    return res.json({ success: false, message: "Bu e-posta adresi zaten kayıtlı!" });
                }
            }
            if (tipi === "sahis" && updateFields.TCno != user.TCno && updateFields.TCno) {
                const tcUsed = await Users.findOne({ TCno: updateFields.TCno, _id: { $ne: userId } });
                if (tcUsed) {
                    return res.json({ success: false, message: "Bu TC Kimlik No zaten kayıtlı!" });
                }
            }
            if (tipi === "sirket" && updateFields.vergiNo != user.vergiNo && updateFields.vergiNo) {
                const vnoUsed = await Users.findOne({ vergiNo: updateFields.vergiNo, _id: { $ne: userId } });
                if (vnoUsed) {
                    return res.json({ success: false, message: "Bu Vergi No zaten kayıtlı!" });
                }
            }

            // Artık güncelle:
            await Users.findByIdAndUpdate(userId, updateFields, { new: true });
            return res.json({ success: true, message: "Bilgiler güncellendi!" });

        } catch (err) {
            console.log(err);
            return res.json({ success: false, message: "Kayıt hatası: " + err.message });
        }
    }
});

function isValidName(name) {
    return typeof name === "string" && name.length >= 2 && name.length <= 50;
}
function isValidEmail(email) {
    return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,30}$/.test(email);
}

function isValidPhone(phone) {
    return /^\d{11}$/.test(phone);
}

function isValidTC(tcno) {
    return /^\d{11}$/.test(tcno);
}

function isValidVergiNo(vno) {
    return /^\d{10}$/.test(vno);
}

function isValidIlIlce(val) {
    return /^[a-zA-ZçÇşŞöÖıİüÜğĞ\s-]{2,30}$/.test(val);
}

module.exports = router;