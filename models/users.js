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
    alanAdi:    { type: String, required: true },
    kalemId:    { type: String, required: true },
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
  aciklama:    { type: String }
}, { _id: true });
// Mutfak Kalemi şeması
const mutfakKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// Pimapen Kalemi şeması
const pimapenKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// Zemin uygulamaları şeması
const zeminUygulamalariKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// İç Cephe şeması
const icCepheKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// Kapılar şeması
const kapilarKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// Korkuluklar şeması
const korkuluklarKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
// disCephe şeması
const disCepheKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const mantolamaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const tavanKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const elektrikTesisatKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const sihhiTesisatKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const dogalgazKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const asansorKurulumuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const iklimlendirmeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const peyzajKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });


const santiyeKurmaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const temelKazmaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const groBetonKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const radyalTemelKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const perdeBetonuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const temelIzolasyonKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const dolguKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const subasmanKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const zeminBetonuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const katBetonlariKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const kapamaBetonuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const catiUygulamaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const duvarOrmeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const sapKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  miktar:      { type: Number, required: true },
  birim:       { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });


const aplikasyonKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const imarDurumuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const kanalKotuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const ruhsatHarciKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const kadastroKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const tapuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const vergiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const sskKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const avukatKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const emlakciKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const reklamKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const zeminEtuduHarciKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const muteahhitlikSozlesmesiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const vekaletSozlesmesiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const yapiDenetimHarciKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const fenniJeolojiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const fenniHaritaciKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const zeminEtuduRaporuKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const zeminIyilestirmeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const mimariProjeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const statikProjeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const tesisatProjeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const hesProjeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const akustikProjeKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const kalipIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const demirIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const duvarOrmeIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const sivaIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const sapIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const catiIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const mantolamaIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const yalitimIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const suTesisatiIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const elektrikIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const dogalgazIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const asansorIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const dekorAlcipanIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const perforjeIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const digerIsciligiKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });


const arsaBedeliKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const yerdenCikartmakArsaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const kiraBedeliArsaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });
const arsaDigerArsaKaydiSchema = new mongoose.Schema({
  kalemId:     { type: String, required: true },
  tarih:       { type: String, required: true },
  toplamTutar: { type: Number, required: true },
  aciklama:    { type: String }
}, { _id: true });

const anaParaKaydiSchema = new mongoose.Schema({
  tip:         { type: String, required: true },
  tutar:       { type: Number, required: true },
  tarih:       { type: Date,   default: Date.now }
}, { _id: true });
const altParaKaydiSchema = new mongoose.Schema({
  tip:         { type: String, required: true },
  tutar:       { type: Number, required: true },
  tarih:       { type: String, required: true },
  aciklama:    { type: String, required: true }
}, { _id: true });


const savedMaterialRecordsKaydiSchema = new mongoose.Schema({
  birim:       { type: String, required: true },
  birimFiyat:  { type: Number, required: true },
  miktar:      { type: String, required: true },
  from:        { type: String, default: "evrak" },
  toplamTutar: { type: Number, required: true },
  tarih:       { type: Date,   default: Date.now },
  evrakId:     { type: String, default: "" }
}, { _id: true });
const savedMaterialKaydiSchema = new mongoose.Schema({
  name: { type: String, required: true },
  nameText: {type: String, default: ""},
  units: { type: [String], required: true },
  savedResults: [savedMaterialRecordsKaydiSchema]
},{ strict: false }, { _id: true });


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

  dokuman : [DokumanSchema],

  islakMekanlar: [islakMekanKaydiSchema],
  mutfak: [mutfakKaydiSchema],
  pimapen: [pimapenKaydiSchema],
  zeminUygulamalari:[zeminUygulamalariKaydiSchema],
  icCephe:[icCepheKaydiSchema],
  kapilar:[kapilarKaydiSchema],
  korkuluklar:[korkuluklarKaydiSchema],
  disCephe:[disCepheKaydiSchema],
  mantolama:[mantolamaKaydiSchema],
  tavan:[tavanKaydiSchema],
  elektrikTesisat:[elektrikTesisatKaydiSchema],
  sihhiTesisat:[sihhiTesisatKaydiSchema],
  dogalgaz:[dogalgazKaydiSchema],
  asansorKurulumu:[asansorKurulumuKaydiSchema],
  iklimlendirme:[iklimlendirmeKaydiSchema],
  peyzaj:[peyzajKaydiSchema],
  santiyeKurma:[santiyeKurmaKaydiSchema],
  temelKazma:[temelKazmaKaydiSchema],
  groBeton:[groBetonKaydiSchema],
  radyalTemel:[radyalTemelKaydiSchema],
  perdeBetonu:[perdeBetonuKaydiSchema],
  temelIzolasyon:[temelIzolasyonKaydiSchema],
  dolgu:[dolguKaydiSchema],
  subasman:[subasmanKaydiSchema],
  zeminBetonu:[zeminBetonuKaydiSchema],
  katBetonlari:[katBetonlariKaydiSchema],
  kapamaBetonu:[kapamaBetonuKaydiSchema],
  catiUygulama:[catiUygulamaKaydiSchema],
  duvarOrme:[duvarOrmeKaydiSchema],
  sap:[sapKaydiSchema],

  aplikasyon:[aplikasyonKaydiSchema],
  imarDurumuKaydi:[imarDurumuKaydiSchema],
  kanalKotu:[kanalKotuKaydiSchema],
  ruhsatHarci:[ruhsatHarciKaydiSchema],
  kadastroTutar:[kadastroKaydiSchema],
  tapuTutar:[tapuKaydiSchema],
  vergiTutar:[vergiKaydiSchema],
  sskTutar:[sskKaydiSchema],
  avukat:[avukatKaydiSchema],
  emlakci: [emlakciKaydiSchema],
  reklam:[reklamKaydiSchema],
  zeminEtuduHarci:[zeminEtuduHarciKaydiSchema],
  muteahhitlikSozlesmesi:[muteahhitlikSozlesmesiKaydiSchema],
  vekaletSozlesmesi:[vekaletSozlesmesiKaydiSchema],
  yapiDenetimHarci:[yapiDenetimHarciKaydiSchema],
  fenniJeoloji:[fenniJeolojiKaydiSchema],
  fenniHaritaci:[fenniHaritaciKaydiSchema],
  zeminEtuduRaporu:[zeminEtuduRaporuKaydiSchema],
  zeminIyilestirme:[zeminIyilestirmeKaydiSchema],
  mimariProje:[mimariProjeKaydiSchema],
  statikProje:[statikProjeKaydiSchema],
  tesisatProje:[tesisatProjeKaydiSchema],
  hesProje:[hesProjeKaydiSchema],
  akustikProje:[akustikProjeKaydiSchema],
  kalipIsciligi:[kalipIsciligiKaydiSchema],
  demirIsciligi:[demirIsciligiKaydiSchema],
  duvarOrmeIsciligi:[duvarOrmeIsciligiKaydiSchema],
  sivaIsciligi:[sivaIsciligiKaydiSchema],
  sapIsciligi:[sapIsciligiKaydiSchema],
  catiIsciligi:[catiIsciligiKaydiSchema],
  mantolamaIsciligi:[mantolamaIsciligiKaydiSchema],
  yalitimIsciligi:[yalitimIsciligiKaydiSchema],
  suTesisatiIsciligi:[suTesisatiIsciligiKaydiSchema],
  elektrikIsciligi:[elektrikIsciligiKaydiSchema],
  dogalgazIsciligi:[dogalgazIsciligiKaydiSchema],
  asansorIsciligi:[asansorIsciligiKaydiSchema],
  dekorAlcipanIsciligi:[dekorAlcipanIsciligiKaydiSchema],
  perforjeIsciligi:[perforjeIsciligiKaydiSchema],
  digerIsciligi:[digerIsciligiKaydiSchema],

  materials:[savedMaterialKaydiSchema],


  arsaBedeliArsa:[arsaBedeliKaydiSchema],
  yerdenCikartmakArsa:[yerdenCikartmakArsaKaydiSchema],
  kiraBedeliArsa:[kiraBedeliArsaKaydiSchema],
  arsaDigerArsa:[arsaDigerArsaKaydiSchema],

  anaPara:[anaParaKaydiSchema],
  altPara:[altParaKaydiSchema],

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