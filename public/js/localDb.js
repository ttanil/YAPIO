// LocalStorage'a veri kaydetme  
export function saveData(nameDb, data) {  
    // JSON'u LocalStorage'a string olarak kaydetme  
    localStorage.setItem(nameDb, JSON.stringify(data));
}  

// LocalStorage'dan veri okuma  
export function readData(nameDb) {  
    const data = localStorage.getItem(nameDb); // Veriyi LocalStorage'dan oku
    return JSON.parse(data);
}  

// LocalStorage'dan veri silme  
export function deleteData(nameDb) {  
    localStorage.removeItem(nameDb); // Belirli bir veriyi sil
}  

// LocalStorage'daki building JSON verisini güncelleme  
export function updateIsSold(nameDb, floorName, clickedRoom, situation) {  
    const currentData = localStorage.getItem(nameDb);  

    if (currentData) {  
        try {  
            const parsedData = JSON.parse(currentData);

            const selectedFloor = parsedData.find(floor => floor.floorName === floorName).rooms;  
            const foundRoom = selectedFloor.find(room => room.roomName === clickedRoom);

            // `isSold` değerini güncelle  
            foundRoom.isSold = situation; // Odanın durumunu true yap  

            // Güncellenen veriyi kaydet  
            localStorage.setItem(nameDb, JSON.stringify(parsedData));  

            return true;  
        } catch (e) {  
            console.error("Veri çözümleme sırasında bir hata oluştu:", e);  
            return false;  
        }  
    }
}

export function updateDbData(key, newData) { 
    const existing = JSON.parse(localStorage.getItem(key)) || [];  
    
    // Aynı rowNumber varsa güncelle, yoksa ekle  
    const index = existing.findIndex(item => item.rowNumber === newData.rowNumber);  

    if (index !== -1) {  
        existing[index] = newData;  
    } else {  
        existing.push(newData);  
    }  

    localStorage.setItem(key, JSON.stringify(existing));  
}

export function deleteDbDataByRowNumber(key, rowNumber) {  
    const existing = JSON.parse(localStorage.getItem(key)) || [];  
    const updated = existing.filter(item => item.rowNumber !== rowNumber);  
    
    localStorage.setItem(key, JSON.stringify(updated));  
}