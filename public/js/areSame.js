import { readData } from './localDb.js';

export function areSameFn(tutar, not){

    let sameArray = [];

    const dbArray = [
        "Arsa Bedeli",
        "Şantiye Kurulumu",
        "Yerden Çıkartmak",
        "Kira Bedeli",
        "Arsa Diğer",
        "Mimari Proje",
        "Statik Proje",
        "Haritacı",
        "Tesisat Proje",
        "Elektrik Proje",
        "Asansör Proje",
        "Doğalgaz Proje",
        "Akustik Proje",
        "Şantiye Şefi",
        "Fenni Mesul Jeoloji",
        "Fenni Mesul Haritacı",
        "Kat İrtifa Kurma",
        "Enerji Kimliği",
        "Proje Diğer",
        "Belediye",
        "Noter Ödemeleri",
        "Yapı Denetim",
        "Kadastro",
        "Zemin Etüdü",
        "Şantiye Elektrik",
        "Kentsel Dönüşüm",
        "SSK",
        "Tapu",
        "Emlakçı",
        "Reklam ve Tanıtım",
        "Avukat",
        "Vergiler",
        "Kurumlar Diğer",
        "İş Makinaları",
        "Beton",
        "Demir",
        "Su Yalıtımı Temel",
        "Duvar Örme",
        "Çatı",
        "Üretim Kaba Diğer",
        "Su Tesisatı",
        "Elektrik Tesisatı",
        "Mermer",
        "Pencereler",
        "Sıva",
        "Mantolama",
        "Kapılar",
        "Islak Zemin Yalıtımları",
        "Seramikler",
        "Parkeler",
        "Vitrifiyeler",
        "Bataryalar",
        "Stropiyer Alçıpan",
        "Mutfak",
        "Ankastre",
        "İklimlendirme",
        "Korkuluk ve Perforje",
        "Söve",
        "Aydınlatma",
        "Kompozit Kaplama",
        "Peyzaj",
        "Üretim İnce Diğer",
        "Kalıp İşçiliği",
        "Demir İşçiliği",
        "Duvar Örme İşçiliği",
        "Sıva İşçiliği",
        "Şap İşçiliği",
        "Çatı İşçiliği",
        "Mantolama İşçiliği",
        "Yalıtım İşçiliği",
        "Su Tesisatı İşçiliği",
        "Elektrik İşçiliği",
        "Doğalgaz İşçiliği",
        "Asansör İşçiliği",
        "Dekor Alçıpan İşçiliği",
        "Perforje İşçiliği",
        "İşçilik Diğer"
    ]

    dbArray.forEach(item => {
        const dataDb = readData(item);
        if(dataDb !=null){
            dataDb.forEach(element => {
                let kayit = {
                    "dbText" : null,
                    "tutar" : null,
                    "not" : null,
                    "tarih" : null
                };
                if(element.tutar === tutar){
                    kayit.dbText = item;
                    kayit.tutar = element.tutar;
                    kayit.tarih = element.tarih;
                    if(element.not === not){
                        kayit.not = element.not;
                    }
                }
                const enAzBiriDoluMu = Object.values(kayit).some(v => v !== null);
                if(enAzBiriDoluMu){
                    sameArray.push(kayit);
                }
            });
        }
    });
    

    return sameArray;

}