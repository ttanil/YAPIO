const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || "insaathesap";

function authenticateUser(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        res.locals.user = { id: null, email: null, role: "misafir" }; // id eklendi!
        res.locals.userRole = "misafir";
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (!err && decoded && ["user", "admin"].includes(decoded.role)) {
            req.user = decoded;
            res.locals.user = {  // id ve email ile birlikte role
                id: decoded.user.id,
                email: decoded.user.email,
                role: decoded.role
            };
            res.locals.userRole = decoded.role;
        } else {
            res.locals.user = { id: null, email: null, role: "misafir" };
            res.locals.userRole = "misafir";
        }
        next();
    });
}


/*
function authenticateUser(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        // Token yoksa
        res.locals.user = {
                user : null,
                role: "misafir"
            };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (!err && decoded && ["user", "admin"].includes(decoded.role)) {
            req.user = decoded;
            res.locals.user = {
                ...decoded.user,
                role: decoded.role
            };
            res.locals.userRole = decoded.role;
        } else {
            res.locals.user = {
                user : null,
                role: "misafir"
            };
        }
        next();
    });
};
*/


module.exports = authenticateUser;


/*
function authenticateUser(req, res, next) {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/?error=unauthorized');
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(403).json({ message: 'Token süresi doldu! Lütfen tekrar giriş yapın.' });
            }
            return res.status(403).json({ message: 'Geçersiz token. Lütfen tekrar giriş yapın.' });
        }
        const currentTime = Math.floor(Date.now() / 1000);
        if (decoded.exp && decoded.exp < currentTime) {
            return res.status(403).json({ message: 'Token süresi doldu! Lütfen tekrar giriş yapın.' });
        }
        if (decoded.role && !["user", "admin"].includes(decoded.role)) {
            return res.status(403).json({ message: 'Bu işlem için geçerli yetkiniz bulunmamaktadır.' });
        }
        req.user = decoded;
        res.locals.user = decoded.user;
        req.session.user = decoded.user;
        next();
    });
*/