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

    // Eski token varsa temizle
    if (req.cookies.token) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
        });
    }

    //res.render('site/login', { source })
    res.render('sites/hata')
});


module.exports = router;