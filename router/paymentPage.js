const express = require('express');  
const router = express.Router();  
const path = require('path');  
const Users = require(path.join(__dirname, '..', 'models', 'users'));  
const crypto = require('crypto');  
require('dotenv').config();  

const authenticateUser = require('../middleware/authenticateUser');  

// Ziraat'in taksit yetkili tüm BIN'leri (6 ve 8 haneli)  
const ziraatInstallmentBins = [  
    '65877600', '65877601', '65877602', '65877700',  
    '525329', '542941', '53376451', '53647928'  
];  
// BIN kontrol fonksiyonu  
function isZiraatInstallmentBin(cardNumber = '') {  
    const bin6 = cardNumber.substring(0, 6);  
    const bin8 = cardNumber.substring(0, 8);  
    return ziraatInstallmentBins.includes(bin6) || ziraatInstallmentBins.includes(bin8);  
}  

// Storekey ve clientId IDEALDE  process.env'den alınmalıdır!  
const PAYTEN_STORE_KEY = process.env.PAYTEN_STORE_KEY || 'PLGytr930485!';  
const PAYTEN_CLIENT_ID = process.env.PAYTEN_CLIENT_ID || '191797468';  
const PAYTEN_FORM_ACTION = 'https://sanalpos2.ziraatbank.com.tr/fim/est3Dgate';  
const SITE_URL = 'https://www.yapio.net';  

// Hash fonksiyonu  
function createPaytenHash(paramObj, storeKey) {  
    const paramOrder = [  
        'amount', 'callbackUrl', 'clientid', 'currency', 'failUrl',  
        'hashAlgorithm', 'Instalment', 'lang', 'oid', 'okUrl',  
        'rnd', 'storetype', 'TranType'  
    ];  
    const arr = paramOrder.map(key => paramObj[key] || '');  
    arr.push(storeKey);  
    const toHash = arr.map(x => String(x).replace(/\\/g, '\\\\').replace(/\|/g, '\\|')).join('|');  
    const sha = crypto.createHash('sha512').update(toHash, 'utf8').digest();  
    return Buffer.from(sha).toString('base64');  
}  

function validatePaytenHash(postedData, storeKey) {  
    const bankHash = postedData.HASH || postedData.hash;  
    if (!bankHash) return false;  
    const exclude = ['hash', 'encoding', 'countdown'];  
    const keys = Object.keys(postedData)  
        .filter(key => !exclude.includes(key.toLowerCase()));  
    const sortedKeys = keys.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));  

    function escapeVal(x) {  
        return String(x || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');  
    }  
    const values = sortedKeys.map(k => escapeVal(postedData[k]));  
    values.push(storeKey);  

    const plain = values.join('|');  
    const digest = crypto.createHash('sha512').update(plain, 'utf8').digest();  
    const myHash = Buffer.from(digest).toString('base64');  

    return (myHash === bankHash);  
}  

// (Opsiyonel) Kart BIN’i ile taksitli işlemi destekleyip desteklemediğini gösteren endpoint  
router.post('/check-bin', (req, res) => {  
    const { cardNumber } = req.body;  
    const isInstallment = isZiraatInstallmentBin(cardNumber);  
    res.json({ isInstallment });  
});  

// GET /payment  
router.get('/', authenticateUser, async (req, res) => {  
    const { projectName } = req.query;  
    const userId = res.locals.user._id || res.locals.user.id;  
    if (res.locals.userRole === "misafir") {  
        return res.redirect('/login');  
    }  
    try {  
        const user = await Users.findById(userId);  
        if (!user || !user.userInputs) {  
            return res.status(404).send("Kullanıcı ve projeleri bulunamadı!");  
        }  
        const projectNumber = user.userInputs.length;  
        const userType = user.userType;  
        let selectedProject = null;  
        if (projectName) {  
            selectedProject = user.userInputs.find(prj => prj.projectName === projectName);  
            if (!selectedProject) {  
                return res.status(404).send("Proje bulunamadı!");  
            }  
        }  
        res.render('sites/payment', {  
            project: selectedProject,  
            user: res.locals.user,  
            role: res.locals.userRole,  
            projectNumber: projectNumber,  
            userType: userType  
        });  
    } catch (err) {  
        console.error(err);  
        return res.status(500).send("Sunucu hatası.");  
    }  
});  

// 1) Ödeme başlatıcı  
router.post('/', authenticateUser, async (req, res) => {  
    const { projectNumber, userType, projectLimit, cardNumber = '', instalment } = req.body || {};  
    const userId = res.locals.user._id || res.locals.user.id;  

    if (!userId || !projectNumber || !userType || !projectLimit)  
        return res.status(400).json({ success: false, message: "Eksik bilgi." });  

    if ((projectLimit === 2 && userType === "premium2" && parseInt(projectNumber) > 2)   
        //|| (projectLimit === 4 && userType === "premium4" && projectNumber === "4")
    )  
        return res.status(401).json({ success: false, message: 'Seçtiğiniz üyelik daha fazla proje oluşturmayı içermemektedir' });  
    if (projectLimit === 2 && userType === "premium4" && parseInt(projectNumber) >= 2)  
        return res.status(401).json({ success: false, message: 'Seçtiğiniz üyelik ile bazı projelerinizi kaybedeceksiniz!' });  

    try {  
        let amount;  
        if (projectLimit === 2 || projectLimit === "2") {  
            amount = "2400.00";
            //amount = "1.00";
        } else if (projectLimit === 4 || projectLimit === "4") {  
            amount = "3800.00";  
        } else {  
            amount = String(Number(req.body.amount || '91.96').toFixed(2));  
        }  

        const oid = "order" + Date.now() + String(Math.floor(Math.random() * 1000));  
        const okUrl = SITE_URL + "/payment/payment-success";  
        const failUrl = SITE_URL + "/payment/payment-fail";  
        const callbackUrl = SITE_URL + "/payment/payment-callback";  
        const currency = "949";  
        const storetype = "3d_pay_hosting";  
        const rnd = Math.random().toString(36).substring(2, 15);  
        const lang = "tr";  
        const hashAlgorithm = "ver3";  
        const TranType = "Auth";  

        // TAKSİT kontrolü: Sadece izinli BIN'de taksit işliyor!  
        let Instalment = "";  
        if (  
            instalment &&   
            String(instalment).trim() !== "" &&  
            isZiraatInstallmentBin(cardNumber)  
        ) {  
            Instalment = String(Number(instalment)); // örn: "3", "6"  
        }  

        // Kullanıcıya yeni ödeme kaydı ekle  
        await Users.findByIdAndUpdate(userId, {  
            $push: {  
                pendingPayments: {  
                    oid: oid,  
                    amount: amount,  
                    instalment: Instalment,  
                    status: "pending",  
                    paymentStartedAt: new Date(),  
                    meta: { userType, projectNumber }  
                }  
            }  
        });  

        // --- FORM VE HASH TAMAMEN BANKANIN SIRASIYLA ---  
        const params = {  
            amount,  
            callbackUrl,  
            clientid: PAYTEN_CLIENT_ID,  
            currency,  
            failUrl,  
            hashAlgorithm,  
            Instalment,  
            lang,  
            oid,  
            okUrl,  
            rnd,  
            storetype,  
            TranType  
        };  
        const hash = createPaytenHash(params, PAYTEN_STORE_KEY);  

        const html = `  
        <html>  
        <body onload="document.forms[0].submit()">  
            <form method="post" action="${PAYTEN_FORM_ACTION}">  
                <input type="hidden" name="amount" value="${amount}" />  
                <input type="hidden" name="callbackUrl" value="${callbackUrl}" />  
                <input type="hidden" name="clientid" value="${PAYTEN_CLIENT_ID}" />  
                <input type="hidden" name="currency" value="${currency}" />  
                <input type="hidden" name="failUrl" value="${failUrl}" />  
                <input type="hidden" name="hashAlgorithm" value="${hashAlgorithm}" />  
                <input type="hidden" name="Instalment" value="${Instalment}" />  
                <input type="hidden" name="lang" value="${lang}" />  
                <input type="hidden" name="oid" value="${oid}" />  
                <input type="hidden" name="okUrl" value="${okUrl}" />  
                <input type="hidden" name="rnd" value="${rnd}" />  
                <input type="hidden" name="storetype" value="${storetype}" />  
                <input type="hidden" name="TranType" value="${TranType}" />  
                <input type="hidden" name="encoding" value="UTF-8" />  
                <input type="hidden" name="hash" value="${hash}" />  
            </form>  
            <p>Lütfen bekleyiniz. Banka ödeme sayfasına yönlendiriliyorsunuz...</p>  
        </body>  
        </html>  
        `;  
        res.json({ paymentFormHtml: html });  
    } catch (err) {  
        console.error("Hata:", err);  
        return res.status(500).json({ success: false, message: "Sunucu hatası." });  
    }  
});  

// 2) Success  
router.post('/payment-success', async (req, res) => {  
    try {  
        const data = req.body;  
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {  
            return res.status(400).send('Geçersiz istek.');  
        }  
        const user = await Users.findOne({ 'pendingPayments.oid': data.oid });  
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");  

        const isSuccess = data.Response === "Approved" && data.ProcReturnCode === "00";

        // Kısa mesaj ve yönlendirme
        res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="5;url=/" />
                <title>Ödeme Başarılı</title>
                <style>
                  body { font-family: sans-serif; text-align:center; margin-top:80px; }
                  .success { color: #198754; font-size:1.3em; }
                </style>
            </head>
            <body>
                <div class="success">
                  <h2>✅ Ödemeniz Başarıyla Alındı</h2>
                  <p>Üyeliğiniz birazdan aktifleşecek.<br>
                  5 saniye içinde ana sayfaya yönlendirileceksiniz...</p>
                  <p><a href="/">Ana sayfaya git</a></p>
                </div>
                <script>
                  setTimeout(function(){ window.location.href = "/"; }, 5000);
                </script>
            </body>
            </html>
        `);  
    } catch (err) {  
        console.error("Payten success handler:", err);  
        return res.status(500).send("Sunucu hatası.");  
    }  
});

// 3) Fail  
router.post('/payment-fail', async (req, res) => {  
    try {  
        const data = req.body;  
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {  
            return res.status(400).send('Geçersiz istek.');  
        }  
        const user = await Users.findOne({ 'pendingPayments.oid': data.oid });  
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");  

        res.send(`
            <!DOCTYPE html>
            <html lang="tr">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="8;url=/" />
                <title>Ödeme Başarısız</title>
                <style>
                  body { font-family: sans-serif; text-align:center; margin-top:80px; }
                  .fail { color:#b93228; font-size:1.1em; }
                </style>
            </head>
            <body>
                <div class="fail">
                  <h2>❌ Ödeme Başarısız Oldu</h2>
                  <p>İşlem tamamlanamadı. 8 saniye içinde ana sayfaya yönlendirileceksiniz.</p>
                  <p><a href="/">Ana sayfaya git</a></p>
                </div>
                <script>
                  setTimeout(function(){ window.location.href = "/"; }, 8000);
                </script>
            </body>
            </html>
        `);   
    } catch (err) {  
        console.error("Payten fail handler:", err);  
        return res.status(500).send("Sunucu hatası.");  
    }  
});

// 4) Callback  
router.post('/payment-callback', async (req, res) => {  
    try {
        const data = req.body;
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {
            return res.status(400).send('Geçersiz istek.');
        }

        const isSuccess = data.Response === "Approved" && data.ProcReturnCode === "00";
        const newStatus = isSuccess ? 'success' : 'fail';

        // Kullanıcıyı ve ödemeyi bul
        const user = await Users.findOne({ 'pendingPayments.oid': data.oid });
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");

        // İlgili ödeme kaydını bul
        const payment = user.pendingPayments.find(p => p.oid === data.oid);

        let newUserType = user.userType; // Varsayılan olarak mevcut userType
        if (isSuccess && payment) {
            // Öncelik: payment.meta.projectLimit'ten, yoksa amount'tan userType seç
            const limit = payment.meta?.projectLimit;
            if (limit === 2 || limit === "2") {
                newUserType = "premium2";
            } else if (limit === 4 || limit === "4") {
                newUserType = "premium4";
            } else {
                newUserType = "premium"; // default, eğer limit bilinmiyorsa
            }
        }

        // Veritabanı güncellemesi
        const updateFields = {
            'pendingPayments.$.status': newStatus,
            'pendingPayments.$.finalizedAt': new Date(),
            'pendingPayments.$.paytenRawData': data,
        };
        // Başarılı ise userType da güncellenir!
        if (isSuccess && (newUserType === "premium2" || newUserType === "premium4" || newUserType === "premium")) {
            updateFields['userType'] = newUserType;
        }

        const updatedUser = await Users.findOneAndUpdate(
            { 'pendingPayments.oid': data.oid },
            { $set: updateFields },
            { new: true }
        );
        if (!updatedUser) return res.status(404).send("Order/bilgisi bulunamadı.");

        res.status(200).send(isSuccess ? "OK" : "Fail");
    } catch (err) {
        console.error("Payten callback handler:", err);
        return res.status(500).send("Sunucu hatası.");
    }
});

module.exports = router;