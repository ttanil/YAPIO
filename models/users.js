const mongoose = require('mongoose');  

// Kullanıcı şeması tanımlama  

// Room şeması
const roomSchema = new mongoose.Schema({
    roomName: { type: String, required: false },
    isSold: { type: String, required: true },
    rowNumber: { type: String, required: true }
}, { _id: false });

// Floor şeması
const floorDataSchema = new mongoose.Schema({
    floorName: { type: String, required: true },
    rooms: [roomSchema]
}, { _id: false });

// Building şeması
const buildingSchema = new mongoose.Schema({
    Ad: { type: String, required: false },
    alanTipi: { type: String, required: true },
    brutAlan: { type: String, default: " " },
    genelBrutAlan: { type: String, required: true },
    kat: { type: String, required: true },
    netAlan: { type: String, default: " " },
    rowNumber: { type: String, required: true },
    tipi: { type: String, required: true }
}, { _id: false });

// Yer Sahibi ile Anlaşma şeması
const yerSahibiIleAnlasmaSchema = new mongoose.Schema({
    tarih: { type: String, required: true },
    rowNumber: { type: String, required: false },
    unit: { type: String, required: true },
    tutar: { type: String, required: true },
    not: { type: String, required: false }
}, { _id: false });

const getPaymentSchema = new mongoose.Schema({
    counter: { type: Number, required: false },
    not:   { type: String, required: false },
    tarih: { type: String, required: false },
    tutar: { type: String, required: false }
}, { _id: false });

const givePaymentSchema = new mongoose.Schema({
    counter: { type: Number, required: false },
    not:   { type: String, required: false },
    tarih: { type: String, required: false },
    tutar: { type: String, required: false }
}, { _id: false });

const paymentSchema = new mongoose.Schema({
    tarih: { type: String, required: true },
    rowNumber: { type: String, required: true },
    not: { type: String, default: " " },
    tutar : { type: String, required: true }
},{ _id: false });

const soldItemsSchema = new mongoose.Schema({
    date: { type: String, required: true },
    rowNumber: { type: String, required: true },
    itemPrice: { type: Number, required: true },
    buyerInfo: { type: String, required: true }
},{ _id: false });

const metreMaliyetSchema = new mongoose.Schema({
    metreMaliyeti: { type: Number, required: true }
},{ _id: false });

const selectedDoorSchema = new mongoose.Schema({
    selectedDoor: { type: String, default : "right" }
},{ _id: false });

const selectedWallSchema = new mongoose.Schema({
    selectedWall: { type: String, default : "none" }
},{ _id: false });

const defaultFields = {
    tarih: { type: String, required: true },
    not: { type: String, default: " " },
    tutar: { type: String, required: true },
    unit: { type: String, required: true }
};

// ---- Kullanıcıya gömülecek ödeme/sipariş şeması ----
const paymentOrderSchema = new mongoose.Schema({
  oid:       { type: String, required: true, unique: true }, // Sipariş numarası
  amount:    { type: String, required: true }, // Ödeme tutarı
  status:    { type: String, default: 'pending', enum: ['pending', 'success', 'fail'] },
  paymentStartedAt: { type: Date, default: Date.now },
  finalizedAt:      { type: Date },
  paytenRawData:    { type: mongoose.Schema.Types.Mixed }, // Payten'dan dönen herşeyi saklayabilirsin
  meta:             { type: mongoose.Schema.Types.Mixed }, // Ek bilgi (kullanıcı, kampanya, not, vs)
}, { _id: false }); // ek ObjectId gerekmez



const OdemeDetaySchema = new mongoose.Schema({
    tarih:    { type: String, required: true },
    tutar:    { type: Number, required: true },
    aciklama: { type: String }
    // unit:  { type: String, required: true } // Açmak istersen ekleyebilirsin
}, { _id: true }); // _id'yi otomatik ekler

const DokumanSchema = new mongoose.Schema({
    path:       { type: String, required: true },   // PDF yolu (sunucuda ya da bulutta)
    uploadedAt: { type: Date, default: Date.now },
    fileName:   { type: String },
    aciklama:   { type: String }
}, { _id: true }); // _id otomatik

// ANA ŞEMA
const imarDurumuSchema = new mongoose.Schema({
    odemeDetaylari: [OdemeDetaySchema],
    dokumanlar: [DokumanSchema]
}, { _id: false }); // imarDurumu için id yok, alt diziler için var!



// Islak Mekan Kalemi şeması
const islakMekanKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String },
  dokumanlar:  [DokumanSchema] // opsiyonel, evrak eklersen kullanılır
}, { _id: true });




const arsaBedeliSchema = new mongoose.Schema(defaultFields, { _id: false });
const yerdenCikartmakSchema = new mongoose.Schema(defaultFields, { _id: false });


// --- Ana userInputSchema ---
const userInputSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  building: [buildingSchema],
  floorsData: [floorDataSchema],
  yerSahibiIleAnlasma: [yerSahibiIleAnlasmaSchema],
  getPayment: [getPaymentSchema],
  givePayment: [givePaymentSchema],
  soldItems: [soldItemsSchema],
  selectedDoor: [selectedDoorSchema],
  selectedWall: [selectedWallSchema],

  imarDurumu:[imarDurumuSchema],

  islakMekanlar: [islakMekanKaydiSchema],


  arsaBedeli: [arsaBedeliSchema],

  yerdenCikartmak: [yerdenCikartmakSchema],
  
  metreMaliyet: [metreMaliyetSchema],
  payment : [paymentSchema]
},{ strict: false });

// Kullanıcı ana şeması
const userSchema = new mongoose.Schema({
    tipi: { type: String, enum: ["sahis", "sirket"], required: true }, // şahıs mı şirket mi
    name: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    TCno: { type: String, required: function() { return this.tipi === "sahis"; }, unique: false }, // sadece şahıs için zorunlu
    vergiNo: { type: String, required: function() { return this.tipi === "sirket"; }, unique: false }, // sadece şirket için zorunlu
    il: { type: String, required: function() { return this.tipi === "sahis"; } },  // şahıs için il
    ilce: { type: String, required: function() { return this.tipi === "sahis"; } }, // şahıs için ilçe
    sirketIl: { type: String, required: function() { return this.tipi === "sirket"; } }, // şirket için il
    sirketIlce: { type: String, required: function() { return this.tipi === "sirket"; } }, // şirket için ilçe
    createdAt: { type: Date, default: Date.now },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    userType: { type: String, enum: ['free', 'premium', 'premium2', 'premium4'], default: 'free' },
    userInputs: [userInputSchema],
    pendingPayments: [paymentOrderSchema] // Ödeme ilişkisi
});

const Users = mongoose.model('Users', userSchema);
module.exports = Users;