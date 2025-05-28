import { showWarningMessage } from './showMessage.js';

export function getModal(modalTitle, modalSubtitle, roomModalImage, modalDesc, sellButton, removeSellButton, 
                        ownerButton, floorName, clickedRoom, rowNumber, buttonGroup, roomInfoForm, okButton,
                        buyerInfo, itemPrice, fromControl, userId, projectName, buildingData, floorsDataDb) {  
    return new Promise((resolve, reject) => {

        let kat = null;
        let alan = null;
        let tip = null;
        let model = null;
        let img = null;       // "daire_3d_3";
        let isSold = "false";
        let apartment = "";
        const katInfo = floorName.replace(/ Planı$/, "");
        if(buildingData){
            buildingData.forEach(element => {
                if(element.kat === katInfo && element.rowNumber === rowNumber){
                    kat =  element.kat;
                    alan = element.genelBrutAlan;
                    tip = element.alanTipi;
                    model = element.tipi;
                }
            });
        }

        floorsDataDb.forEach(element => {
            if(element.floorName === floorName){
                element.rooms.forEach(item => {
                    if(item.rowNumber === rowNumber){
                        isSold = item.isSold;
                    }
                });
            }
        });

        if(isSold === "true"){
            apartment = "SATILDI";
            sellButton.textContent = "Satışı Güncelle";
            sellButton.disabled = false;  
            sellButton.style.opacity = '1';
            ownerButton.disabled = true;  
            ownerButton.style.opacity = '0.3';
            removeSellButton.disabled = false;  
            removeSellButton.style.opacity = '1';
        } else if(isSold === "owner"){
            apartment = "YER SAHİBİ";
            sellButton.textContent = "Sat";
            sellButton.disabled = true;  
            sellButton.style.opacity = '0.3';
            ownerButton.disabled = true;  
            ownerButton.style.opacity = '0.3';
            removeSellButton.disabled = false;  
            removeSellButton.style.opacity = '1';
        } else if(isSold === "false"){
            apartment = "MÜSAİT";
            sellButton.textContent = "Sat";
            sellButton.disabled = false;  
            sellButton.style.opacity = '1';
            ownerButton.disabled = false;  
            ownerButton.style.opacity = '1';
            removeSellButton.disabled = true;  
            removeSellButton.style.opacity = '0.3';
        }

        if(model === "1+1"){
            img = "daire3d_1";
        } else if(model === "2+1" || model === "2+0"){
            img = "daire_3d_2";
        } else if(model === "3+1"){
            img = "daire_3d_3";
        } else if(model === "3+1 dublex" || model === "4+1 dublex" || model === "5+1 dublex"){
            img = "dublex";
        } else if(model === "4+1"){
            img = "daire3d_4";
        } else if(tip === "Dükkan"){
            img = "store_1";
        } else if(tip === "Depo"){
            img = "depo";
        } else if(tip === "Ofis"){
            img = "ofis";
        } 
        
        modalTitle.textContent = kat + ", " + clickedRoom;
        modalSubtitle.innerHTML = `  
            <span style="color:blue; font-size:2.1rem; font-family:Quicksand, sans-serif; font-weight: 500; display: flex;
                align-items: center;
                justify-content: center;"> 
                ${apartment}
            </span>  
        `;
        roomModalImage.innerHTML = `  
            <span style="display: flex; align-items: center; justify-content: center;"> 
                <img src="/img/${img}.png" alt="" style="width:300px; height:250px; ">
            </span>  
        `;
        if(tip === "Daire"){
            modalDesc.textContent = alan + " m², " + model + " " + tip;
        } else{
            modalDesc.textContent = alan + " m², " + tip;
        }
        

        const roomModal = new bootstrap.Modal(document.getElementById("roomModal"));  

        // "Satıldı" butonuna tıklama  
        sellButton.onclick = () => {
            roomInfoForm.style.display = "block";
            buttonGroup.style.display = "none";
        };  

        // "Kaldır" butonuna tıklama  
        removeSellButton.onclick = async () => {  
            const soldOwner = { 
                rowNumber: rowNumber  
            };  
            await processDeal({ type: "soldItem", soldOwner, soldOwnerText: "delete" });

            const updatedFloorData = {
                floorName: floorName,
                rowNumber: rowNumber,
                isSold: "false"
            };
            await processDeal({ type: "sold", isSoldSituation: updatedFloorData });

            // Owner agreement sil
            const dataOwner = { rowNumber: rowNumber };
            await processDeal({ type: "owner", dataOwner, dataOwnerText: "delete" });

            roomModal.hide(); // Modal'ı kapat  
            resolve(true); // Güncellenmiş veriyle "resolved"  
        };  

        // "Yer Sahibi" butonuna tıklama  
        ownerButton.onclick = async () => {
            const dataOwner = {
                tarih : getDate(),
                rowNumber : rowNumber,
                unit : "adet",
                tutar : "0",
                not : "Yer Sahibine Verildi"
            };
            await processDeal({ type: "owner", dataOwner, dataOwnerText: "add" });

            const updatedFloorData = {
                floorName : floorName,
                rowNumber : rowNumber,
                isSold : "owner"
            };
            await processDeal({ type: "sold", isSoldSituation: updatedFloorData });

            roomModal.hide(); // Modal'ı kapat  
            resolve(true); // Güncellenmiş veriyle "resolved"  
        };

        // --- okButton için sadece bir event handler var, her açılışta önce kaldırılıp sonra ekleniyor ---  
        if (okButton.okHandler) {  
            okButton.removeEventListener("click", okButton.okHandler);  
        }  
        okButton.okHandler = async function (e) {  
            e.preventDefault();  
            if (!buyerInfo.value || !itemPrice.value) {
                showWarningMessage("Eksik Giriş Yaptınız! Lütfen kontrol edip tekrar giriniz.", "tamam", false);
            } else {
                const soldOwner = {  
                    itemPrice: parseInt(itemPrice.value, 10),  
                    buyerInfo: buyerInfo.value,  
                    date: getDate(),  
                    rowNumber: rowNumber  
                };  
                await processDeal({ type: "soldItem", soldOwner, soldOwnerText: "add" });

                const updatedFloorData = {
                    floorName: floorName,
                    rowNumber: rowNumber,
                    isSold: "true"
                };
                await processDeal({ type: "sold", isSoldSituation: updatedFloorData });

                roomModal.hide();  
                resolve(true);  
            }
        };
        okButton.addEventListener("click", okButton.okHandler);

        // Bootstrap modal'ı aç  
        roomModal.show();  

        // Modal'ın kullanıcı tarafından kapatılma olayını dinle  
        const modalElement = document.getElementById("roomModal");  
        modalElement.addEventListener("hidden.bs.modal", () => {  
            // Form sıfırlama  
            document.getElementById("infoForm").reset();  

            // Alanları sıfırlama  
            document.getElementById("roomModalDesc").textContent = "Seçilen oda adı buraya gelecek.";  
            document.getElementById("roomModalSubtitle").innerHTML = "";  
            document.getElementById("roomModalImage").innerHTML = "";  

            // Formu gizle  
            document.getElementById("buttonGroup").style.display = "flex";  
            document.getElementById("roomInfoForm").style.display = "none"; 

            reject("Kullanıcı hiçbir işlem yapmadan modal'ı kapattı!");  
        });  

        function getDate(){
            const today = new Date();  
            const day = String(today.getDate()).padStart(2, '0');  
            const month = String(today.getMonth() + 1).padStart(2, '0'); // getMonth 0 tabanlı!  
            const year = today.getFullYear();  

            return `${day}.${month}.${year}`;
        }
    });

    async function processDeal({ type, isSoldSituation=null, dataOwner=null, dataOwnerText=null, soldOwner=null, soldOwnerText=null }) {
        // type: "sold" veya "owner"
        const payload = {
            userId: userId,           // kullanıcı id'si
            projectName: projectName, // proje adı
        };

        // Sold room için
        if(type === "sold" && isSoldSituation) {
            payload.isSoldSituation = isSoldSituation;
        }

        // Owner agreement için (add/delete)
        if(type === "owner" && dataOwner && dataOwnerText) {
            payload.dataOwner = dataOwner;
            payload.dataOwnerText = dataOwnerText; // "add" veya "delete"
        }

        // SoldItem için (add/delete)
        if(type === "soldItem" && soldOwner && soldOwnerText) {
            payload.soldOwner = soldOwner;
            payload.soldOwnerText = soldOwnerText; // "add" veya "delete"
        }
        showLoader();
        let result;
        try {
            const response = await fetch('/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            result = await response.json();

            if (!response.ok || !result.success) {
                showWarningMessage(result.message || "İşlem başarısız.", "tamam", true);
                return false;
            } else {
                // Gerekirse callback ile güncel veri
                return result;
            }
        } catch (error) {
            showWarningMessage("Bağlantı hatası, lütfen daha sonra tekrar deneyin!", "tamam", true);
            console.log('Hata:', error);
            return false;
        } finally {
            hideLoader();
        }
    }

    function showLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'flex'; // ya da block
    }

    function hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
    }
}