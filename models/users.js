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



const arsaBedeliSchema = new mongoose.Schema(defaultFields, { _id: false });
const santiyeKurulumuSchema = new mongoose.Schema(defaultFields, { _id: false });
const yerdenCikartmakSchema = new mongoose.Schema(defaultFields, { _id: false });
const kiraBedeliSchema = new mongoose.Schema(defaultFields, { _id: false });
const arsaDigerSchema = new mongoose.Schema(defaultFields, { _id: false });
const mimariProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const statikProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const haritaciSchema = new mongoose.Schema(defaultFields, { _id: false });
const tesisatProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const elektrikProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const asansorProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const dogalgazProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const akustikProjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const santiyeSefiSchema = new mongoose.Schema(defaultFields, { _id: false });
const fenniMesulJeolojiSchema = new mongoose.Schema(defaultFields, { _id: false });
const fenniMesulHaritaciSchema = new mongoose.Schema(defaultFields, { _id: false });
const katIrtifaKurmaSchema = new mongoose.Schema(defaultFields, { _id: false });
const enerjiKimligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const projeDigerSchema = new mongoose.Schema(defaultFields, { _id: false });
const belediyeSchema = new mongoose.Schema(defaultFields, { _id: false });
const noterOdemeleriSchema = new mongoose.Schema(defaultFields, { _id: false });
const yapiDenetimSchema = new mongoose.Schema(defaultFields, { _id: false });
const kadastroSchema = new mongoose.Schema(defaultFields, { _id: false });
const zeminEtuduSchema = new mongoose.Schema(defaultFields, { _id: false });
const santiyeElektrikSchema = new mongoose.Schema(defaultFields, { _id: false });
const kentselDonusumSchema = new mongoose.Schema(defaultFields, { _id: false });
const sskSchema = new mongoose.Schema(defaultFields, { _id: false });
const tapuSchema = new mongoose.Schema(defaultFields, { _id: false });
const emlakciSchema = new mongoose.Schema(defaultFields, { _id: false });
const reklamVeTanitimSchema = new mongoose.Schema(defaultFields, { _id: false });
const avukatSchema = new mongoose.Schema(defaultFields, { _id: false });
const vergilerSchema = new mongoose.Schema(defaultFields, { _id: false });
const kurumlarDigerSchema = new mongoose.Schema(defaultFields, { _id: false });
const isMakinalariSchema = new mongoose.Schema(defaultFields, { _id: false });
const betonSchema = new mongoose.Schema(defaultFields, { _id: false });
const demirSchema = new mongoose.Schema(defaultFields, { _id: false });
const suYalitimiTemelSchema = new mongoose.Schema(defaultFields, { _id: false });
const duvarOrmeSchema = new mongoose.Schema(defaultFields, { _id: false });
const catiSchema = new mongoose.Schema(defaultFields, { _id: false });
const uretimKabaDigerSchema = new mongoose.Schema(defaultFields, { _id: false });
const suTesisatiSchema = new mongoose.Schema(defaultFields, { _id: false });
const elektrikTesisatiSchema = new mongoose.Schema(defaultFields, { _id: false });
const mermerSchema = new mongoose.Schema(defaultFields, { _id: false });
const pencerelerSchema = new mongoose.Schema(defaultFields, { _id: false });
const sivaSchema = new mongoose.Schema(defaultFields, { _id: false });
const mantolamaSchema = new mongoose.Schema(defaultFields, { _id: false });
const kapilarSchema = new mongoose.Schema(defaultFields, { _id: false });
const islakZeminYalitmlariSchema = new mongoose.Schema(defaultFields, { _id: false });
const seramiklerSchema = new mongoose.Schema(defaultFields, { _id: false });
const parkelerSchema = new mongoose.Schema(defaultFields, { _id: false });
const vitrifiyelerSchema = new mongoose.Schema(defaultFields, { _id: false });
const bataryalarSchema = new mongoose.Schema(defaultFields, { _id: false });
const stropiyerAlcipanSchema = new mongoose.Schema(defaultFields, { _id: false });
const mutfakSchema = new mongoose.Schema(defaultFields, { _id: false });
const ankastreSchema = new mongoose.Schema(defaultFields, { _id: false });
const iklimlendirmeSchema = new mongoose.Schema(defaultFields, { _id: false });
const korkulukVePerforjeSchema = new mongoose.Schema(defaultFields, { _id: false });
const soveSchema = new mongoose.Schema(defaultFields, { _id: false });
const aydinlatmaSchema = new mongoose.Schema(defaultFields, { _id: false });
const kompozitKaplamaSchema = new mongoose.Schema(defaultFields, { _id: false });
const peyzajSchema = new mongoose.Schema(defaultFields, { _id: false });
const uretimInceDigerSchema = new mongoose.Schema(defaultFields, { _id: false });
const kalipIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const demirIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const duvarOrmeIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const sivaIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const sapIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const catiIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const mantolamaIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const yalitimIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const suTesisatiIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const elektrikIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const dogalgazIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const asansorIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const dekorAlcipanIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const perforjeIsciligiSchema = new mongoose.Schema(defaultFields, { _id: false });
const iscilikDigerSchema = new mongoose.Schema(defaultFields, { _id: false });

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


  arsaBedeli: [arsaBedeliSchema],
  santiyeKurulumu: [santiyeKurulumuSchema],
  yerdenCikartmak: [yerdenCikartmakSchema],
  kiraBedeli: [kiraBedeliSchema],
  arsaDiger: [arsaDigerSchema],
  mimariProje: [mimariProjeSchema],
  statikProje: [statikProjeSchema],
  haritaci: [haritaciSchema],
  tesisatProje: [tesisatProjeSchema],
  elektrikProje: [elektrikProjeSchema],
  asansorProje: [asansorProjeSchema],
  dogalgazProje: [dogalgazProjeSchema],
  akustikProje: [akustikProjeSchema],
  santiyeSefi: [santiyeSefiSchema],
  fenniMesulJeoloji: [fenniMesulJeolojiSchema],
  fenniMesulHaritaci: [fenniMesulHaritaciSchema],
  katIrtifaKurma: [katIrtifaKurmaSchema],
  enerjiKimligi: [enerjiKimligiSchema],
  projeDiger: [projeDigerSchema],
  belediye: [belediyeSchema],
  noterOdemeleri: [noterOdemeleriSchema],
  yapiDenetim: [yapiDenetimSchema],
  kadastro: [kadastroSchema],
  zeminEtudu: [zeminEtuduSchema],
  santiyeElektrik: [santiyeElektrikSchema],
  kentselDonusum: [kentselDonusumSchema],
  ssk: [sskSchema],
  tapu: [tapuSchema],
  emlakci: [emlakciSchema],
  reklamVeTanitim: [reklamVeTanitimSchema],
  avukat: [avukatSchema],
  vergiler: [vergilerSchema],
  kurumlarDiger: [kurumlarDigerSchema],
  isMakinalari: [isMakinalariSchema],
  beton: [betonSchema],
  demir: [demirSchema],
  suYalitimiTemel: [suYalitimiTemelSchema],
  duvarOrme: [duvarOrmeSchema],
  cati: [catiSchema],
  uretimKabaDiger: [uretimKabaDigerSchema],
  suTesisati: [suTesisatiSchema],
  elektrikTesisati: [elektrikTesisatiSchema],
  mermer: [mermerSchema],
  pencereler: [pencerelerSchema],
  siva: [sivaSchema],
  mantolama: [mantolamaSchema],
  kapilar: [kapilarSchema],
  islakZeminYalitmlari: [islakZeminYalitmlariSchema],
  seramikler: [seramiklerSchema],
  parkeler: [parkelerSchema],
  vitrifiyeler: [vitrifiyelerSchema],
  bataryalar: [bataryalarSchema],
  stropiyerAlcipan: [stropiyerAlcipanSchema],
  mutfak: [mutfakSchema],
  ankastre: [ankastreSchema],
  iklimlendirme: [iklimlendirmeSchema],
  korkulukVePerforje: [korkulukVePerforjeSchema],
  sove: [soveSchema],
  aydinlatma: [aydinlatmaSchema],
  kompozitKaplama: [kompozitKaplamaSchema],
  peyzaj: [peyzajSchema],
  uretimInceDiger: [uretimInceDigerSchema],
  kalipIsciligi: [kalipIsciligiSchema],
  demirIsciligi: [demirIsciligiSchema],
  duvarOrmeIsciligi: [duvarOrmeIsciligiSchema],
  sivaIsciligi: [sivaIsciligiSchema],
  sapIsciligi: [sapIsciligiSchema],
  catiIsciligi: [catiIsciligiSchema],
  mantolamaIsciligi: [mantolamaIsciligiSchema],
  yalitimIsciligi: [yalitimIsciligiSchema],
  suTesisatiIsciligi: [suTesisatiIsciligiSchema],
  elektrikIsciligi: [elektrikIsciligiSchema],
  dogalgazIsciligi: [dogalgazIsciligiSchema],
  asansorIsciligi: [asansorIsciligiSchema],
  dekorAlcipanIsciligi: [dekorAlcipanIsciligiSchema],
  perforjeIsciligi: [perforjeIsciligiSchema],
  iscilikDiger: [iscilikDigerSchema],
  metreMaliyet: [metreMaliyetSchema],
  payment : [paymentSchema]
});

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