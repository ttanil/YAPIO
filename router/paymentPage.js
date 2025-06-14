const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const Users = require(path.join(__dirname, '..', 'models', 'users'));
const crypto = require('crypto');
require('dotenv').config();

const authenticateUser = require('../middleware/authenticateUser');

// Payten storeKey .env dosyandan gelsin!
const PAYTEN_STORE_KEY = process.env.PAYTEN_STORE_KEY || 'PLGytr930485!';
const PAYTEN_CLIENT_ID = process.env.PAYTEN_CLIENT_ID || '191797468';
const PAYTEN_FORM_ACTION = process.env.PAYTEN_FORM_ACTION || 'https://sanalpos2.ziraatbank.com.tr/fim/est3Dgate';
const SITE_URL = 'https://www.yapio.net';

// Helper: Hash üret
function createPaytenHash(paramObj, storeKey) {
    const paramOrder = [
        'amount', 'clientid', 'currency', 'failUrl', 'hashAlgorithm',
        'Instalment', 'lang', 'okUrl', 'oid', 'rnd', 'storetype', 'TranType'
    ];
    const arr = paramOrder.map(key => paramObj[key] || '');
    arr.push(storeKey);
    const toHash = arr.join('|');
    const sha = crypto.createHash('sha512').update(toHash, 'utf8').digest();
    return Buffer.from(sha).toString('base64');
}

// Helper: Parametrelerden hash’i tekrar üret, karşılaştır
function validatePaytenHash(postedData, storeKey) {
  const bankHash = postedData.HASH || postedData.hash;
  if (!bankHash) return false;

  // 1- "hash" ve "encoding" hariç, tüm parametrelerin KÜÇÜK harfli keylerini al
  const exclude = ['hash', 'encoding'];
  const keys = Object.keys(postedData)
    .filter(key => !exclude.includes(key.toLowerCase()));

  // 2- Alfabetik sırala
  const sortedKeys = keys.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));

  // 3- Değerlerde \ ve | karakterlerini düzgün kaçışla yaz
  function escapeVal(x) {
    return String(x || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  }
  const values = sortedKeys.map(k => escapeVal(postedData[k]));

  // 4- storeKey ekle
  values.push(storeKey);

  // 5- Tek string
  const plain = values.join('|');
  // 6- SHA512+base64
  const digest = crypto.createHash('sha512').update(plain, 'utf8').digest();
  const myHash = Buffer.from(digest).toString('base64');

  // Karşılaştır
  return (myHash === bankHash);
}

// Gerekli middleware
router.use(express.urlencoded({ extended: true })); // Payten POST (form-data) için

// GET /payment  — Kullanıcı ödeme sayfası
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

// 1) Ödeme başlatıcı endpoint
router.post('/', authenticateUser, async (req, res) => {
    const { fullName, email, projectNumber, userType, projectLimit } = req.body || {};
    const userId = res.locals.user._id || res.locals.user.id;
    if (!userId || !fullName || !email || !projectNumber || !userType || !projectLimit)
        return res.status(400).json({ success: false, message: "Eksik bilgi." });

    // ... üyelik geçiş kuralları ...
    if ((projectLimit === 2 && userType === "premium2" && projectNumber === "2") ||
        (projectLimit === 4 && userType === "premium4" && projectNumber === "4"))
        return res.status(401).json({ success: false, message: 'Seçtiğiniz üyelik daha fazla proje oluşturmayı içermemektedir' });
    if (projectLimit === 2 && userType === "premium4" && parseInt(projectNumber) >= 2)
        return res.status(401).json({ success: false, message: 'Seçtiğiniz üyelik ile bazı projelerinizi kaybedeceksiniz!' });

    try {
        const amount = String(Number(req.body.amount || '91.96').toFixed(2));
        const oid = "order" + Date.now() + String(Math.floor(Math.random()*1000));
        const okUrl = SITE_URL + "/payment/payment-success";
        const failUrl = SITE_URL + "/payment/payment-fail";
        const callbackUrl = SITE_URL + "/payment/payment-callback";
        const currency = "949";
        const storetype = "3d_pay_hosting";
        const rnd = Math.random().toString(36).substring(2, 15);
        const lang = "tr";
        const hashAlgorithm = "ver3";
        const TranType = "Auth";
        const Instalment = "";

        // Kullanıcıya yeni ödeme kaydı ekle (gidip OrderTemp'e eklemeye gerek yok!)
        await Users.findByIdAndUpdate(userId, {
            $push: {
                pendingPayments: {
                    oid: oid,
                    amount: amount,
                    status: "pending",
                    paymentStartedAt: new Date(),
                    meta: { fullName, email, userType, projectNumber }
                }
            }
        });

        // Hash ve Payten formu üret
        const params = {
            amount, clientid: PAYTEN_CLIENT_ID, currency, failUrl, hashAlgorithm,
            Instalment, lang, okUrl, oid, rnd, storetype, TranType
        };
        const hash = createPaytenHash(params, PAYTEN_STORE_KEY);

        const html = `
        <html>
        <body onload="document.forms[0].submit()">
            <form method="post" action="${PAYTEN_FORM_ACTION}">
                <input type="hidden" name="clientid" value="${PAYTEN_CLIENT_ID}" />
                <input type="hidden" name="storetype" value="${storetype}" />
                <input type="hidden" name="amount" value="${amount}" />
                <input type="hidden" name="currency" value="${currency}" />
                <input type="hidden" name="oid" value="${oid}" />
                <input type="hidden" name="okUrl" value="${okUrl}" />
                <input type="hidden" name="failUrl" value="${failUrl}" />
                <input type="hidden" name="callbackUrl" value="${callbackUrl}" />
                <input type="hidden" name="rnd" value="${rnd}" />
                <input type="hidden" name="lang" value="${lang}" />
                <input type="hidden" name="hashAlgorithm" value="${hashAlgorithm}" />
                <input type="hidden" name="TranType" value="${TranType}" />
                <input type="hidden" name="Instalment" value="${Instalment}" />
                <input type="hidden" name="hash" value="${hash}" />
            </form>
            <p>Lütfen bekleyiniz. Banka ödeme sayfasına yönlendiriliyorsunuz...</p>
        </body>
        </html>
        `;
        //console.log("Giden Payten formu:\n", html);
        // özel olarak params dizisini de loglayın:
        //console.log("Hash için kullanılan parametreler:", params);
        res.json({ paymentFormHtml: html });
    } catch (err) {
        console.error("Hata:", err);
        return res.status(500).json({ success: false, message: "Sunucu hatası." });
    }
});

// 2) Success (Kullanıcıya sadece başarı/fail göster)
router.post('/payment-success', async (req, res) => {
    try {
        const data = req.body;
        logHashDebug(data, PAYTEN_STORE_KEY);
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {
            console.warn('[Payten] Başarısız hash doğrulaması/success:', data);
            return res.status(400).send('Geçersiz istek.');
        }
        // İlgili kullanıcıyı, ödemeyi bul:
        const user = await Users.findOne({ 'pendingPayments.oid': data.oid });
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");
        const payment = user.pendingPayments.find(p => p.oid === data.oid);

        const isSuccess = data.Response === "Approved" && data.ProcReturnCode === "00";
        res.render(isSuccess ? 'payment-ok' : 'payment-fail', {
            orderId: data.oid,
            message: isSuccess
                ? "Ödeme başarıyla gerçekleşti. Üyeliğiniz birazdan aktifleşecek!"
                : "Ödeme alınamadı veya banka işlemde hata oluştu."
        });
    } catch (err) {
        console.error("Payten success handler:", err);
        return res.status(500).send("Sunucu hatası.");
    }
});

// 3) Fail (Kullanıcıya sadece başarısız ekranı gösterir)
router.post('/payment-fail', async (req, res) => {
    try {
        const data = req.body;
        logHashDebug(data, PAYTEN_STORE_KEY);
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {
            console.warn('[Payten] Başarısız hash doğrulaması/fail:', data);
            return res.status(400).send('Geçersiz istek.');
        }
        const user = await Users.findOne({ 'pendingPayments.oid': data.oid });
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");
        const payment = user.pendingPayments.find(p => p.oid === data.oid);

        res.render('payment-fail', {
            orderId: data.oid,
            message: `Ödeme başarısız: ${data.Response} ${data.ProcReturnCode || ""} ${data.ErrMsg || ""}`
        });
    } catch (err) {
        console.error("Payten fail handler:", err);
        return res.status(500).send("Sunucu hatası.");
    }
});

// 4) Callback—Kritik DB güncellemesi burada yapılır!
router.post('/payment-callback', async (req, res) => {
    try {
        const data = req.body;
        logHashDebug(data, PAYTEN_STORE_KEY);
        if (!validatePaytenHash(data, PAYTEN_STORE_KEY)) {
            console.warn('[Payten] Başarısız hash doğrulaması/callback:', data);
            return res.status(400).send('Geçersiz istek.');
        }
        const isSuccess = data.Response === "Approved" && data.ProcReturnCode === "00";
        const newStatus = isSuccess ? 'success' : 'fail';

        // Kullanıcının içinde ilgili ödemeyi bulup güncelle:
        const user = await Users.findOneAndUpdate(
            { 'pendingPayments.oid': data.oid },
            {
                $set: {
                    'pendingPayments.$.status': newStatus,
                    'pendingPayments.$.finalizedAt': new Date(),
                    'pendingPayments.$.paytenRawData': data,
                    ...(isSuccess && { userType: 'premium', userTypeDate: new Date() }) // Başarılı ise üyelik yükselt!
                }
            }
        );
        if (!user) return res.status(404).send("Order/bilgisi bulunamadı.");

        res.status(200).send(isSuccess ? "OK" : "Fail");
    } catch (err) {
        console.error("Payten callback handler:", err);
        return res.status(500).send("Sunucu hatası.");
    }
});
function logHashDebug(data, storeKey) {
  const bankHash = data.HASH || data.hash;
  // Hash datası oluştur (aynı fonksiyonun ile)
  const exclude = ['hash', 'encoding'];
  const keys = Object.keys(data)
    .filter(key => !exclude.includes(key.toLowerCase()));
  const sortedKeys = keys.sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  function escapeVal(x) {
    return String(x || '').replace(/\\/g, '\\\\').replace(/\|/g, '\\|');
  }
  const values = sortedKeys.map(k => escapeVal(data[k]));
  values.push(storeKey);
  const plain = values.join('|');
  const calculated = crypto.createHash('sha512').update(plain, 'utf8').digest();
  const myHash = Buffer.from(calculated).toString('base64');
  // Detaylı log:
  console.log('\nPAYTEN HASH DEBUG:');
  console.log('--- GELEN POST ---\n', JSON.stringify(data, null, 2));
  console.log('--- İŞLENEN HASH DATA ---\n', plain);
  console.log('--- BANKADAN GELEN HASH ---\n', bankHash);
  console.log('--- BİZİM HESAPLANAN HASH ---\n', myHash, '\n');
}

module.exports = router;