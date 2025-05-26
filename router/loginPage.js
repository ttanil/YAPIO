const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const router = express.Router();
const path = require('path');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const bcrypt = require('bcrypt');


// JWT Secret Key  
const JWT_SECRET = process.env.JWT_SECRET || 'insaathesap';


router.get('/', (req,res) =>{
    const source = req.query.source; // Query parametresini al
    //console.log("Bu istek şu kaynaktan geldi:", source);
    //console.log("tt", req)

    //res.render('site/login', { source })
    res.render('sites/login')
});

// Cookie parser middleware 
router.use(cookieParser());


router.post('/', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Kullanıcıyı e-mail ile bul
        const user = await Users.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Geçersiz giriş!' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Geçersiz giriş!' });
        }

        // Eski token varsa temizle
        if (req.cookies.token) {
            res.clearCookie('token', {
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
            });
        }

        // Kullanıcı rolüne göre JWT oluştur
        let permissions = 'read_only';
        if (user.role === 'admin') permissions = 'all_access';

        const token = jwt.sign({
            user: { id: user._id, email: user.email },
            role: user.role,
            permissions
        }, JWT_SECRET, { expiresIn: '30m' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: true,    // canlıda true ve HTTPS olmalı
            sameSite: 'lax',
        });
/*
        req.session.userInfo = {
            userInfos : user.userInputs
        };
*/
        return res.json({
            message: 'Giriş başarılı!',
            role: user.role,
            userId: user._id,
            token
        });

    } catch (err) {
        console.error("Login Hatası:", err);
        return res.status(500).send("Bir hata oluştu.");
    }
});

module.exports = router;

/*
router.post('/', async (req, res) => {
    const { email, password } = req.body;
    let token;


    // *** Not: Gerçek uygulamada şifre hash'li olmalı! ***
    let user;
    try {
        user = await Users.findOne({ email, password });
    } catch (err) {
        console.error("Veritabanı hatası:", err);
        return res.status(500).send("Bir hata oluştu.");
    }

    // Kullanıcıyı kontrol et  
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        return res.status(401).json({ message: 'Geçersiz giriş!' });
    }

    // Eski token'ı temizle
    if (req.cookies.token) {
        res.clearCookie('token', {
            httpOnly: true,  // canlıda true olmalı
            secure: false,
            sameSite: 'lax',
        });
    }

    // Token oluştur
    if (user.role === 'admin') {
        token = jwt.sign(
            {
                user: {
                    id: user._id,
                    email: user.email,
                },
                role: user.role,
                permissions: 'all_access'
            },
            JWT_SECRET,
            { expiresIn: '30m' }
        );
    } else if (user.role === 'user') {
        token = jwt.sign(
            {
                user: {
                    id: user._id,
                    email: user.email,
                },
                role: user.role,
                permissions: 'read_only'
            },
            JWT_SECRET,
            { expiresIn: '30m' }
        );
    } else {
        return res.status(403).json({ message: 'Geçerli bir rol bulunamadı!' });
    }

    // Token'ı cookie'ye yaz
    res.cookie('token', token, {
        httpOnly: true,   // canlıda true
        secure: false,    // canlıda true ve HTTPS kullanılmalı
        sameSite: 'lax',
        //maxAge: 30 * 60 * 1000 // 30 dakika   // çıkıldığında tekrar giriş için iptal edildi
    });

    return res.json({
        message: 'Giriş başarılı!',
        role: user.role,
        userId: user._id,
        token
    });
});
*/