const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const bcrypt = require('bcrypt');


const authenticateUser = require('../middleware/authenticateUser');

router.get('/', authenticateUser, (req, res) => {
    console.log("register");
    console.log("role:", res.locals.userRole);
    res.render('sites/register', {
        user: res.locals.user,          // null veya {id, email, role}
        role: res.locals.userRole       // "user", "admin" veya "misafir"
    });
});


function isValidEmail(email) {
    return /^[\w.-]+@[\w.-]+\.[a-zA-Z]{2,30}$/.test(email);
}
function isValidName(name) {
    return /^.{2,50}$/.test(name); // Şirket/şahıs ayrımını sonra düşünebilirsin
}
function isValidTC(tc) {
    return /^\d{11}$/.test(tc);
}
function isValidVergiNo(no) {
    return /^\d{10}$/.test(no);
}
function isValidIlIlce(val) {
    return /^[a-zA-ZşçöğüğıŞÇÖÜĞİ\s-]{2,30}$/.test(val);
}
function isValidPhone(num) {  
    return /^\d{11}$/.test(num);  
}  
function cleanText(str) {
    return typeof str === "string" ? str.trim() : "";
}


router.post('/', async (req, res) => {
    try {
        // Zararlı veya beklenmedik alanları filtre et
        const allowedKeys = [
            'userType', 'name', 'email', "phone", 'password', 'tcno', 'vergiNo',
            'sahisIl', 'sahisIlce', 'sirketIl', 'sirketIlce'
        ];
        let userData = {};
        allowedKeys.forEach(k => userData[k] = cleanText(req.body[k]));

        // Temel ve koşullu validasyon
        if (!userData.userType || !["sahis", "sirket"].includes(userData.userType))
            return res.json({ success: false, message: "Kullanıcı türü geçersiz!" });

        if (!isValidName(userData.name))
            return res.json({ success: false, message: "Ad/Şirket adı geçersiz!" });

        if (!isValidEmail(userData.email))
            return res.json({ success: false, message: "E-posta geçersiz!" });

        if (!isValidPhone(userData.phone))
            return res.json({ success: false, message: "Telefon numarası geçersiz! 11 haneli rakam giriniz." });

        if (!userData.password || userData.password.length < 1 || userData.password.length > 12) // örnek için
            return res.json({ success: false, message: "Şifre geçersiz!" });

        if (userData.userType === "sahis") {
            if (!isValidTC(userData.tcno))
                return res.json({ success: false, message: "TC No geçersiz!" });
            if (!isValidIlIlce(userData.sahisIl) || !isValidIlIlce(userData.sahisIlce))
                return res.json({ success: false, message: "İl/ilçe giriniz!" });
        } else if (userData.userType === "sirket") {
            if (!isValidVergiNo(userData.vergiNo))
                return res.json({ success: false, message: "Vergi No geçersiz!" });
            if (!isValidIlIlce(userData.sirketIl) || !isValidIlIlce(userData.sirketIlce))
                return res.json({ success: false, message: "Şirket ili/ilçesi giriniz!" });
        }

        if (userData.userType === "sahis") {
            // Şahıs için: email veya TCno varsa kayıt olamaz
            const isExisting = await Users.findOne({
                $or: [
                    { email: userData.email },
                    { TCno: userData.tcno }
                ]
            });
            if (isExisting) {
                // Hangisinin eşleştiğini göstermek istersen:
                if(isExisting.email === userData.email) {
                    return res.json({ success: false, message: "Bu e-posta adresi zaten kayıtlı!" });
                } else {
                    return res.json({ success: false, message: "Bu TC Kimlik No zaten kayıtlı!" });
                }
            }
        } else if (userData.userType === "sirket") {
            // Şirket için: email veya vergiNo varsa kayıt olamaz
            const isExisting = await Users.findOne({
                $or: [
                    { email: userData.email },
                    { vergiNo: userData.vergiNo }
                ]
            });
            if (isExisting) {
                if(isExisting.email === userData.email) {
                    return res.json({ success: false, message: "Bu e-posta adresi zaten kayıtlı!" });
                } else {
                    return res.json({ success: false, message: "Bu Vergi No zaten kayıtlı!" });
                }
            }
        }

        // Şifreyi hashle!
        const hashedPw = await bcrypt.hash(userData.password, 10);

        /*
        const isMatch = await bcrypt.compare(girilenSifre, user.password); // user.password: DB'deki hash

        if (isMatch) {
            // Şifre doğru, giriş başarılı
        } else {
            // Şifre yanlış, hata ver
        }
        */

        const newUser = new Users({
            tipi: userData.userType,
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            password: hashedPw,
            TCno: userData.userType === 'sahis' ? userData.tcno : "",
            il: userData.userType === 'sahis' ? userData.sahisIl : "",
            ilce: userData.userType === 'sahis' ? userData.sahisIlce : "",
            vergiNo: userData.userType === 'sirket' ? userData.vergiNo : "",
            sirketIl: userData.userType === 'sirket' ? userData.sirketIl : "",
            sirketIlce: userData.userType === 'sirket' ? userData.sirketIlce : ""
        });

        await newUser.save();

        return res.json({ success: true, message: "Kayıt başarılı!" });

    } catch (err) {
        console.log(err)
        return res.json({ success: false, message: "Kayıt hatası: " + err.message });
    }
});

module.exports = router;