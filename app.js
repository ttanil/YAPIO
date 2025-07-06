const express = require('express');
const exphbs = require('express-handlebars');
const handlebars = require('handlebars');
const expressSession = require('express-session');
const dotenv = require('dotenv');
const path = require('path');
const dbs = require(path.join(__dirname,'dbs.js'));
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');

dotenv.config();
dbs();

const app = express();

const time = 1000*60*30;    // 30 dk oturum süresi
const SECRET_VALUE = process.env.SECRET_VALUE || 'insaathesap';

// Handlebars şablon ayarları
const hbs = exphbs.create({
  helpers: {
    ifEquals: function (arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    },
    json: function (context) {
      return JSON.stringify(context);
    }
  }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));

// GLOBAL middleware'ler
app.use(express.json());                   // Sadece JSON istekler için (dosya upload hariç!)
app.use(express.urlencoded({ extended: true }));  // Standart form istekler için (dosya upload hariç!)
app.use(cookieParser());
app.set('trust proxy', 1);
app.use(expressSession({
    secret: SECRET_VALUE,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        httpOnly: true,
        secure: true,
        maxAge: time,
        sameSite: 'lax'
        // domain: '.yapio.net' // (isteğe bağlı, sorun olursa kaldırıp dene)
    }
}));

app.use(express.static(path.join(__dirname, 'public')));

// CORS
app.use(cors({
    origin: 'http://127.0.0.1:5000',
    credentials: true
}));

// Dosya upload için sadece MULTER kullanıyoruz! (express-fileupload SİLİNDİ)
// Dosya yükleme gereken tüm routerlarda MULTER ile route seviyesinde upload.single('file') çağrılır!
// Ayrı bir 'fileUpload' middleware yok!

// ROUTER'lar
const indexPage = require(path.join(__dirname, 'router', 'indexPage.js'));
const loginPage = require(path.join(__dirname, 'router', 'loginPage.js'));
const registerPage = require(path.join(__dirname, 'router', 'registerPage.js'));
const logoutPage = require(path.join(__dirname, 'router', 'logoutPage.js'));
const binaPage = require(path.join(__dirname, 'router', 'binaPage.js'));
const drawPage = require(path.join(__dirname, 'router', 'drawPage.js'));
const quatationPage = require(path.join(__dirname, 'router', 'quatationPage.js'));
const analizPage = require(path.join(__dirname, 'router', 'analizPage.js'));
const soldPage = require(path.join(__dirname, 'router', 'soldPage.js'));
const paymentPage = require(path.join(__dirname, 'router', 'paymentPage.js'));
const evrakPage = require(path.join(__dirname, 'router', 'evrakPage.js')); // BU ROUTER'DA multer ile dosya yükleniyor
const malzemePage = require(path.join(__dirname, 'router', 'malzemePage.js'));
const approvedPage = require(path.join(__dirname, 'router', 'approvedPage.js'));

app.use('/', indexPage);
app.use('/login', loginPage);
app.use('/register', registerPage);
app.use('/logout', logoutPage);
app.use('/bina', binaPage);
app.use('/draw', drawPage);
app.use('/quatation', quatationPage);
app.use('/analiz', analizPage);
app.use('/sold', soldPage);
app.use('/payment', paymentPage);
app.use('/evrak', evrakPage); // → Yalnızca MULTER var, başka upload middleware yok!
app.use('/malzeme', malzemePage);
app.use('/approved', approvedPage);


// Sunucuyu başlat
app.listen(5000, () => {
    console.log("Server is running at http://127.0.0.1:5000");
});

/*
const express = require('express'); //sunucuya atılan istekleri yakalar request/response
const exphbs = require('express-handlebars'); //html sayfasını böl, parçala, yönet işlemleri için
const handlebars = require('handlebars');
const expressSession = require('express-session');  //tarayıcıdan erişilemeyen verileri saklar / authanticate, kullanıcı anlık veriler, token üretme vs
const fileUpload = require('express-fileupload');   //form yapılarından resim gibi verilerin gönderilmesi için
const dotenv = require('dotenv');   // common açılmayacak gizli bilgileri tutar, veri tabanı bağlantısı vs
const path = require('path');   // yazılan js dosyalarını import etmek için kullanılır
const dbs = require(path.join(__dirname,'dbs.js'));
const cookieParser = require('cookie-parser');  
const jwt = require('jsonwebtoken');
const cors = require('cors');
const crypto = require('crypto');


//console.log(crypto.randomBytes(64).toString('hex'));

//DB connection
dbs();

// Starting settings
dotenv.config();
const app = express();

const time = 1000*60*30;    // 30 dk. oturum(session) süresi için
const SECRET_VALUE = process.env.SECRET_VALUE || 'insaathesap';


// şablon motoru alanı
const hbs = exphbs.create({
  helpers: {
    ifEquals: function (arg1, arg2, options) {
      return (arg1 === arg2) ? options.fn(this) : options.inverse(this);
    },
    json: function (context) {
      return JSON.stringify(context);
    }
  }
});
app.engine('handlebars', hbs.engine);
app.set('view engine', 'handlebars');
app.set('views', path.join(__dirname, 'views'));


// middleware sunucuya atılan istekler json olsun vb işlemler için
app.use(express.json());  //sunucu ile istemci yani frontend ile backend arasındaki iletişim json olacak
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload());  //resim vb dosyalar için
app.use(cookieParser());    // Cookie'leri işlemek için 
app.use(expressSession({
    secret:SECRET_VALUE,
    resave:false,
    saveUninitialized:false,
    cookie:{path:'/', httpOnly:true, secure:'auto', maxAge:time} // çıkıldığında tekrar giriş ister
}));
app.use(express.static(path.join(__dirname,'public')));

// CORS ayarları  
app.use(cors({  
    origin: 'http://127.0.0.1:5000', // İzin verilen frontend adresi  
    credentials: true // Cookie'lerin gönderilmesine izin ver  
}));


// Router'lar  
const indexPage = require(path.join(__dirname, 'router', 'indexPage.js'));  
const loginPage = require(path.join(__dirname, 'router', 'loginPage.js'));  
const registerPage = require(path.join(__dirname, 'router', 'registerPage.js'));  
const logoutPage = require(path.join(__dirname, 'router', 'logoutPage.js'));  
const binaPage = require(path.join(__dirname, 'router', 'binaPage.js'));  
const drawPage = require(path.join(__dirname, 'router', 'drawPage.js'));  
const quatationPage = require(path.join(__dirname, 'router', 'quatationPage.js'));  
const analizPage = require(path.join(__dirname, 'router', 'analizPage.js'));  
const soldPage = require(path.join(__dirname, 'router', 'soldPage.js'));  
const paymentPage = require(path.join(__dirname, 'router', 'paymentPage.js'));
const evrakPage = require(path.join(__dirname, 'router', 'evrakPage.js')); 


// Genel rotalar (kullanıcı girişi yapılmışsa veya misafir erişimi)  
app.use('/', indexPage);  
app.use('/login', loginPage);  
app.use('/register', registerPage);  
app.use('/logout', logoutPage);  
app.use('/bina', binaPage);
app.use('/draw', drawPage);
app.use('/quatation', quatationPage);
app.use('/analiz', analizPage);
app.use('/sold', soldPage);
app.use('/payment', paymentPage);
app.use('/evrak', evrakPage);


// Sunucuyu başlat  
app.listen(5000, () => {  
    console.log("Server is running at http://127.0.0.1:5000");  
});
*/