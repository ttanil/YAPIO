import { showWarningMessage } from './showMessage.js';

export function getModal(modalTitle, modalSubtitle, roomModalImage, modalDesc, sellButton, removeSellButton, 
                        ownerButton, floorName, clickedRoom, rowNumber, buttonGroup, roomInfoForm, okButton,
                        buyerInfo, itemPrice, fromControl, userId, projectName, buildingData, floorsDataDb, 
                        addPhotoButton, addPhotoInput, savePhotoButton) {  
    return new Promise(async (resolve, reject) => {

        let kat = null;
        let alan = null;
        let tip = null;
        let model = null;
        let img = null;       // "daire_3d_3";
        let isSold = "false";
        let apartment = "";
        let userType="premium";
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

        const data = await readPhoto({
            userId,
            projectName,
            floorName,
            rowNumber
        });
        if(data){
            userType = data.userType;
        }
        const photoUrl = data.photo && data.photo[0]?.path;
        if (photoUrl) {
            roomModalImage.innerHTML = `  
                <span style="display: flex; align-items: center; justify-content: center;"> 
                    <img src="${photoUrl}" alt="" style="width:300px; height:250px; ">
                </span>  
            `;
        } else{
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
            roomModalImage.innerHTML = `  
                <span style="display: flex; align-items: center; justify-content: center;"> 
                    <img src="/img/${img}.png" alt="" style="width:300px; height:250px; ">
                </span>  
            `;

        }

        
        
        modalTitle.textContent = kat + ", " + clickedRoom;
        modalSubtitle.innerHTML = `  
            <span style="color:blue; font-size:2.1rem; font-family:Quicksand, sans-serif; font-weight: 500; display: flex;
                align-items: center;
                justify-content: center;"> 
                ${apartment}
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
            
            showLoader();
            await processDeal({ type: "sold", isSoldSituation: updatedFloorData })
                .finally(() => hideLoader());

            // Owner agreement sil
            const dataOwner = { rowNumber: rowNumber };
            showLoader();
            await processDeal({ type: "owner", dataOwner, dataOwnerText: "delete" })
                .finally(() => hideLoader());

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
            showLoader();
            await processDeal({ type: "owner", dataOwner, dataOwnerText: "add" })
                .finally(() => hideLoader());

            const updatedFloorData = {
                floorName : floorName,
                rowNumber : rowNumber,
                isSold : "owner"
            };
            
            showLoader();
            await processDeal({ type: "sold", isSoldSituation: updatedFloorData })
                .finally(() => hideLoader());

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
                const rawPrice = itemPrice.value.replace(/\./g, ''); // Noktasız hali
                const price = parseInt(rawPrice, 10);
                const soldOwner = {
                    itemPrice: price,  
                    buyerInfo: buyerInfo.value,  
                    date: getDate(),  
                    rowNumber: rowNumber  
                };
                showLoader();
                await processDeal({ type: "soldItem", soldOwner, soldOwnerText: "add" })
                    .finally(() => hideLoader());

                const updatedFloorData = {
                    floorName: floorName,
                    rowNumber: rowNumber,
                    isSold: "true"
                };
                showLoader();
                await processDeal({ type: "sold", isSoldSituation: updatedFloorData })
                    .finally(() => hideLoader());

                roomModal.hide();  
                resolve(true);  
            }
        };
        okButton.addEventListener("click", okButton.okHandler);

        addPhotoButton.addEventListener("click", () => {
            if(userType !== "free"){
                addPhotoInput.click(); // gizli input'u tetikler
            } else{
                window.location.href = `/payment?projectName=${encodeURIComponent(projectName)}&from=${encodeURIComponent("draw")}`;
            }
            
        });
        addPhotoInput.addEventListener("change", async (event) => {
            const file = event.target.files[0];
            if (!file) return;

            // 1. MIME tipi ve uzantı kontrolü
            const validTypes = ['image/jpeg', 'image/png'];
            const extension = file.name.split('.').pop().toLowerCase();
            if (!validTypes.includes(file.type) || !["jpg", "jpeg", "png"].includes(extension)) {
                showWarningMessage("Sadece JPG ve PNG formatında fotoğraf yükleyebilirsiniz.", "tamam", false);
                addPhotoInput.value = ""; // Seçimi sıfırla
                return;
            }

            // 2. Dosya boyutu kontrolü
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                showWarningMessage("Dosya boyutu 5 MB'dan büyük olamaz.", "tamam", false);
                addPhotoInput.value = "";
                return;
            }

            // 3. Temel zararlı/bozuk dosya önlemi: Dosya gerçekten görüntü olarak açılabiliyor mu?
            const reader = new FileReader();
            reader.onload = (e) => {
                // Ekstra güvenlik için içeriğe header bazlı minimum bir kontrol ekleyelim
                // (Bu tarama saldırgan dosyaları %100 tespit etmez; temel bir önlemdir)
                let safe = true;
                if (
                // PNG dosya sihirli baytı: 89 50 4E 47
                extension === "png" && !e.target.result.startsWith("data:image/png")
                ) safe = false;
                if (
                (extension === "jpg" || extension === "jpeg") &&
                !e.target.result.startsWith("data:image/jpeg")
                ) safe = false;

                if (!safe) {
                    showWarningMessage("Seçtiğiniz dosya bozuk veya desteklenmeyen bir resim.", "tamam", false);
                    addPhotoInput.value = "";
                    return;
                }

                // Buraya kadar gelen dosya, temel kontrollerden geçti: Önizleme
                roomModalImage.innerHTML = `
                    <span style="display: flex; align-items: center; justify-content: center;">
                        <img src="${e.target.result}" alt="Oda Fotoğrafı" style="width:300px; height:250px;">
                    </span>
                `;
            };
            reader.readAsDataURL(file);

            savePhotoButton.style.display = "flex";
            // Buton click sürekli aynı event eklenmesin
            savePhotoButton.replaceWith(savePhotoButton.cloneNode(true));
            // Yeniden seçiyoruz çünkü yukarıdaki ile eski eventler silinir
            const newSavePhotoButton = document.getElementById("savePhotoButton");
            newSavePhotoButton.style.display = "flex";

            newSavePhotoButton.addEventListener("click", async () => {
                newSavePhotoButton.style.display = "none";
                await savePhoto({ userId, projectName, file, rowNumber });
            });

            // NOT: Gerçek zararlı yazılım analizi sadece sunucu tarafında, gelişmiş antivirüs vb. taraması ile mümkündür!
        });

        // Bootstrap modal'ı aç  
        roomModal.show();
        addModalInputFormatterForItemPrice();

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
        let result;
        try {
            const response = await fetch('/draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            result = await response.json();

            if (!response.ok || !result.success) {
                showWarningMessage(result.message || "İşlem başarısız.", "tamam", true);
                return false;
            } else {
                // Gerekirse callback ile güncel veri
                //return result;
            }
        } catch (error) {
            showWarningMessage("Bağlantı hatası, lütfen daha sonra tekrar deneyin!", "tamam", true);
            console.log('Hata:', error);
            return false;
        }
    }

    async function savePhoto(data) {
        const { userId, projectName, file, rowNumber } = data;
        const formData = new FormData();
        formData.append("userId", userId);
        formData.append("projectName", projectName);
        formData.append("rowNumber", rowNumber);
        formData.append("floorName", floorName);
        formData.append("process", "savePhoto");
        formData.append("file", file); // File objesini doğrudan ekliyoruz

        showLoader();
        try {
            const response = await fetch('/draw', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                showWarningMessage(result.message || "İşlem başarısız.", "tamam", true);
                return false;
            } else {
                // Başarılı ise gerekirse işlem
                //result.path varsa, görseli güncelleyebilirsin
            }
        } catch (error) {
            showWarningMessage("Bağlantı hatası, lütfen daha sonra tekrar deneyin!", "tamam", true);
            console.log('Hata:', error);
            return false;
        }
        hideLoader();
    }


    async function readPhoto({ userId, projectName, floorName, rowNumber }) {
        showLoader();
        try {
            const response = await fetch('/draw', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    projectName,
                    floorName,
                    rowNumber,
                    process: "readPhoto",
                }),
            });

            const data = await response.json();
            console.log("dataDb:", data);
            hideLoader();

            if (!response.ok || !data.success) {
                return data;
            }

            const photoUrl = data.photo[0]?.path;
            if (!photoUrl) {
                showWarningMessage("Fotoğraf kaydı boş.", "Tamam", false);
            }

            return data;

        } catch (err) {
            console.error("readPhoto API hatası:", err);
            showWarningMessage("Beklenmeyen bir hata oluştu.", "Tamam", false);
            return null;
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

    function addModalInputFormatterForItemPrice() {
        const input = document.getElementById('itemPrice');
        if (!input) return;
        input.addEventListener('input', function (e) {
            let pos = input.selectionStart;
            let oldLength = input.value.length;
            let value = input.value.replace(/\D/g, '');
            value = value.replace(/^0+/, '') || '0';
            let formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
            input.value = formatted;
            let diff = input.value.length - oldLength;
            input.setSelectionRange(pos + diff, pos + diff);
        });
    }
}