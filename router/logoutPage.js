const express = require('express');
const router = express.Router();



router.post('/', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: false, // canlıda true olmalı
        sameSite: 'lax',
        path: '/'
    });
    return res.json({ message: 'Başarıyla çıkış yaptınız.' });
});

module.exports = router;