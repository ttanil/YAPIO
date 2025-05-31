const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const bcrypt = require('bcrypt');


const authenticateUser = require('../middleware/authenticateUser');

router.get('/', authenticateUser, (req, res) => {
    res.render('sites/payment', {
        user: res.locals.user,          // null veya {id, email, role}
        role: res.locals.userRole,       // "user", "admin" veya "misafir"
    });
});

module.exports = router;