export function showWarningMessage(message, text, reload) { 
    if(text === "evet"){
        return new Promise((resolve) => {  
            // Aynı overlay veya container varsa sil
            document.querySelector("#overlay")?.remove();
            document.querySelector(".alert-container")?.remove();

            const body = document.querySelector("body");  
            const baslik = message.split('\n')[0];
            if(baslik === "Benzer Kayıt Bulundu!"){
                message = message
                .split('\n')
                .map(line => `<p>${line}</p>`)
                .join('');
            }
            
            // Overlay
            const overlay = document.createElement("div");  
            overlay.id = "overlay";  
            Object.assign(overlay.style, {  
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: "1055",
            });  
            body.appendChild(overlay);  
    
            // Uyarı mesajı konteyneri oluştur  
            const alertContainer = document.createElement("div");  
            alertContainer.className = "alert-container";  
            alertContainer.innerHTML = `  
                <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"
                     style="z-index:1056; max-width:400px; width:90vw; text-align:center;">
                    <h5 class="text-warning"><strong>Uyarı</strong></h5>  
                    ${message}
                    <div class="d-flex justify-content-center gap-2">  
                        <button class="btn btn-warning btn-sm mt-2" id="confirmAlert">Evet</button>  
                        <button class="btn btn-secondary btn-sm mt-2" id="cancelAlert">Hayır</button>  
                    </div>  
                </div>  
            `;  
            body.appendChild(alertContainer);  
    
            document.getElementById("confirmAlert").addEventListener("click", () => {  
                alertContainer.remove(); overlay.remove();
                if (reload) location.reload(true);
                resolve(true);
            });  
            document.getElementById("cancelAlert").addEventListener("click", () => {  
                alertContainer.remove(); overlay.remove();
                resolve(false);
            });
        });

    } else if(text === "tamam") {
        // Sadece gösterir, await ile kullanılmaz
        document.querySelector("#overlay")?.remove();
        document.querySelector(".alert-container")?.remove();

        const body = document.querySelector("body");  
        const overlay = document.createElement("div");  
        overlay.id = "overlay";  
        Object.assign(overlay.style, {
            position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: "1055",
        });
        body.appendChild(overlay);

        const alertContainer = document.createElement("div");
        alertContainer.className = "alert-container";
        alertContainer.innerHTML = `
            <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"
                style="z-index: 1056; max-width: 400px; text-align: center;">
                <h5 class="text-warning"><strong>Uyarı</strong></h5>
                <p>${message}</p>
                <button class="btn btn-warning btn-sm mt-2" id="closeAlert">Tamam</button>
            </div>
        `;
        body.appendChild(alertContainer);

        document.getElementById("closeAlert").addEventListener("click", () => {
            alertContainer.remove(); overlay.remove();
            if (reload) location.reload(true);
        });

    } else if(text === "tamam2"){
        // Tamam butonu için Promise döner, await ile kullanılabilir
        return new Promise((resolve) => {
            document.querySelector("#overlay")?.remove();
            document.querySelector(".alert-container")?.remove();

            const body = document.querySelector("body");  
            const overlay = document.createElement("div");
            overlay.id = "overlay";
            Object.assign(overlay.style, {
                position: "fixed", top: "0", left: "0", width: "100%", height: "100%",
                backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: "1055",
            });
            body.appendChild(overlay);

            const alertContainer = document.createElement("div");
            alertContainer.className = "alert-container";
            alertContainer.innerHTML = `
                <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"
                    style="z-index: 1056; max-width: 400px; text-align: center;">
                    <h5 class="text-warning"><strong>Uyarı</strong></h5>
                    <p>${message}</p>
                    <button class="btn btn-warning btn-sm mt-2" id="closeAlert">Tamam</button>
                </div>
            `;
            body.appendChild(alertContainer);

            document.getElementById("closeAlert").addEventListener("click", () => {
                alertContainer.remove(); overlay.remove();
                if (reload) location.reload(true);
                resolve(true);
            });
        });
    }
}
/*
export function showWarningMessage(message, text, reload) { 
    if(text === "evet"){
        return new Promise((resolve) => {  
            // Body seçiliyor  
            const body = document.querySelector("body");  
    
            // Daha önce bir overlay varsa temizle  
            if (document.querySelector("#overlay")) {  
                document.querySelector("#overlay").remove();  
            }  

            const baslik = message.split('\n')[0];
            if(baslik === "Benzer Kayıt Bulundu!"){
                message = message
                .split('\n')
                .map(line => `<p>${line}</p>`)
                .join('');
            }
            
    
            // Overlay oluştur  
            const overlay = document.createElement("div");  
            overlay.id = "overlay";  
            Object.assign(overlay.style, {  
                position: "fixed",  
                top: "0",  
                left: "0",  
                width: "100%",  
                height: "100%",  
                backgroundColor: "rgba(0, 0, 0, 0.5)",  
                zIndex: "1055",  
            });  
            body.appendChild(overlay);  
    
            // Uyarı mesajı konteyneri oluştur  
            const alertContainer = document.createElement("div");  
            alertContainer.className = "alert-container";  
            alertContainer.innerHTML = `  
                <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"  
                     style="z-index:1056; max-width:400px; width:90vw; text-align:center;">
                    <h5 class="text-warning"><strong>Uyarı</strong></h5>  
                    ${message}
                    <div class="d-flex justify-content-center gap-2">  
                        <button class="btn btn-warning btn-sm mt-2" id="confirmAlert">Evet</button>  
                        <button class="btn btn-secondary btn-sm mt-2" id="cancelAlert">Hayır</button>  
                    </div>  
                </div>  
            `;  
            body.appendChild(alertContainer);  
    
            // "Evet" butonuna olay işleyici ekle  
            document.getElementById("confirmAlert").addEventListener("click", () => {  
                alertContainer.remove(); // Mesajı kaldır  
                overlay.remove(); // Overlay'i kaldır  
    
                if (reload) {  
                    location.reload(true); // Yeniden yükleme yapılacaksa sayfayı yükle  
                }  
    
                resolve(true); // Kullanıcı "Evet" dedi, işlemi onayla  
            });  
    
            // "Hayır" butonuna olay işleyici ekle  
            document.getElementById("cancelAlert").addEventListener("click", () => {  
                alertContainer.remove(); // Mesajı kaldır  
                overlay.remove(); // Overlay'i kaldır  
    
                resolve(false); // Kullanıcı "Hayır" dedi, işlemi iptal et  
            });  
        });
    } else if(text === "tamam"){
        if (document.querySelector("#overlay")) {  
            document.querySelector("#overlay").remove();  
        }  
        if (document.querySelector(".alert-container")) {  
            document.querySelector(".alert-container").remove();  
        }  
    
        const body = document.querySelector("body");  
    
        // Overlay
        const overlay = document.createElement("div");  
        overlay.id = "overlay";  
        Object.assign(overlay.style, {  
            position: "fixed",  
            top: "0",  
            left: "0",  
            width: "100%",  
            height: "100%",  
            backgroundColor: "rgba(0, 0, 0, 0.5)",  
            zIndex: "1055",  
        });  
        body.appendChild(overlay);  
    
        // Uyarı mesajı konteyneri  
        const alertContainer = document.createElement("div");  
        alertContainer.className = "alert-container";  
        alertContainer.innerHTML = `  
            <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"  
                 style="z-index: 1056; max-width: 400px; text-align: center;">  
                <h5 class="text-warning"><strong>Uyarı</strong></h5>  
                <p>${message}</p>  
                <button class="btn btn-warning btn-sm mt-2" id="closeAlert">Tamam</button>  
            </div>  
        `;  
        body.appendChild(alertContainer);  
    
        // Kapatma butonu
        document.getElementById("closeAlert").addEventListener("click", () => {  
            alertContainer.remove(); // Kapatırken uyarıyı kaldır  
            overlay.remove(); // Overlay'i kaldır  
            if (reload) {  
                location.reload(true); // Sayfayı yenile  
            }  
        });
    } else if(text === "tamam2"){
        return new Promise((resolve) => {
            if (document.querySelector("#overlay")) {  
                document.querySelector("#overlay").remove();  
            }  
            if (document.querySelector(".alert-container")) {  
                document.querySelector(".alert-container").remove();  
            }  
        
            const body = document.querySelector("body");  
        
            // Overlay
            const overlay = document.createElement("div");  
            overlay.id = "overlay";  
            Object.assign(overlay.style, {  
                position: "fixed",  
                top: "0",  
                left: "0",  
                width: "100%",  
                height: "100%",  
                backgroundColor: "rgba(0, 0, 0, 0.5)",  
                zIndex: "1055",  
            });  
            body.appendChild(overlay);  
        
            // Uyarı mesajı konteyneri  
            const alertContainer = document.createElement("div");  
            alertContainer.className = "alert-container";  
            alertContainer.innerHTML = `  
                <div class="position-fixed top-50 start-50 translate-middle p-4 border border-warning rounded bg-light shadow-lg"  
                    style="z-index: 1056; max-width: 400px; text-align: center;">  
                    <h5 class="text-warning"><strong>Uyarı</strong></h5>  
                    <p>${message}</p>  
                    <button class="btn btn-warning btn-sm mt-2" id="closeAlert">Tamam</button>  
                </div>  
            `;  
            body.appendChild(alertContainer);  
        
            // Kapatma butonu
            document.getElementById("closeAlert").addEventListener("click", () => {  
                alertContainer.remove();  
                overlay.remove();  
                if (reload) {  
                    location.reload(true);  
                }
                resolve(true);
            });
        });
    }
      
}
    */