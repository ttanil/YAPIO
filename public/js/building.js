let bodrum = [];
let zemin = [];
let kat1 = [];
let kat2 = [];
let kat3 = [];
let kat4 = [];
let kat5 = [];
let kat6 = [];

let allFloors = [bodrum, zemin, kat1, kat2, kat3, kat4, kat5, kat6];

export function getBuildingInfos(data){
    bodrum.length = 0;  
    zemin.length = 0;  
    kat1.length = 0;
    kat2.length = 0;  
    kat3.length = 0;  
    kat4.length = 0;  
    kat5.length = 0;  
    kat6.length = 0;
    data.forEach(element => {
        if(element.kat === "Bodrum Kat"){
            bodrum.push(element);
        } else if(element.kat === "Zemin Kat"){
            zemin.push(element);
        } else if(element.kat === "1. Kat"){
            kat1.push(element);
        } else if(element.kat === "2. Kat"){
            kat2.push(element);
        } else if(element.kat === "3. Kat"){
            kat3.push(element);
        } else if(element.kat === "4. Kat"){
            kat4.push(element);
        } else if(element.kat === "5. Kat"){
            kat5.push(element);
        } else if(element.kat === "6. Kat"){
            kat6.push(element);
        }
    });
}

export function getApartmentsOnFloors(data){
    const bodrum = [];  
    const zemin = [];  
    const kat1 = [];  
    const kat2 = [];  
    const kat3 = [];  
    const kat4 = [];  
    const kat5 = [];  
    const kat6 = [];  

    data.forEach(element => {  
        if(element.kat === "Bodrum Kat"){  
            bodrum.push(element);  
        } else if(element.kat === "Zemin Kat"){  
            zemin.push(element);  
        } else if(element.kat === "1. Kat"){  
            kat1.push(element);  
        } else if(element.kat === "2. Kat"){  
            kat2.push(element);  
        } else if(element.kat === "3. Kat"){  
            kat3.push(element);  
        } else if(element.kat === "4. Kat"){  
            kat4.push(element);  
        } else if(element.kat === "5. Kat"){  
            kat5.push(element);  
        } else if(element.kat === "6. Kat"){  
            kat6.push(element);  
        }  
    });  

    // Bütün katları nesne olarak döndürüyoruz  
    return {  
        bodrum,  
        zemin,  
        kat1,  
        kat2,  
        kat3,  
        kat4,  
        kat5,  
        kat6  
    };  
}

export function getFloorNumber(){
    let floors = [];
    let maxFloor = 0;

    for (let i = 0; i < allFloors.length; i++) {  
        if(allFloors[i].length > 0){
            floors.push(allFloors[i][0].kat);
        } 
    }
    //console.log(`floors :`, floors);
    maxFloor = floors.length;
    return maxFloor;
}

export function getMaxAreaFloor(){
    let maxArea = 0;
    for (let i = 0; i < allFloors.length; i++) {
        let totalArea = 0;
        allFloors[i].forEach(element => {
            totalArea = totalArea+parseFloat(element.genelBrutAlan);
        });
        if(totalArea > maxArea){
            maxArea = totalArea;
        }
    }
    return maxArea;
}

export function isBodrum(data) {  
    for (let i = 0; i < data.length; i++) {
        if (data[i].kat === "Bodrum Kat") {  
            return true; // "Bodrum Kat" bulunursa true döner  
        }  
    }  
    return false;
}

export function isBodrumFloorDb(data) {  
    for (let i = 0; i < data.length; i++) {
        if (data[i].floorName === "Bodrum Kat Planı") {  
            return true; // "Bodrum Kat" bulunursa true döner  
        }  
    }  
    return false;
}

export function getRoomNumbers(data) {  
    let roomsDb =[];
    data.forEach(element => {
        const number = element.rooms.length;
        roomsDb.push(number);
    });
    return roomsDb;
}

export function populateTable(tableData){
    const containerProjectName = document.querySelector(".container-project-name");
    containerProjectName.classList.add("d-none");
    
    const tableRows = document.getElementById("table-rows");  
    tableRows.innerHTML = ""; // Önce tablonun içeriği sıfırlanır  

    // Tabloyu görünür yapar  
    const containerTable = document.querySelector(".container-table");  
    containerTable.classList.remove("d-none");  

    // Her bir veriyi tabloya ekliyoruz  
    tableData.forEach((rowData, index) => {  
        const newRowHTML = `  
            <tr>  
                <td>${index + 1}</td>  
                <td>  
                    <select class="form-select">  
                        <option ${rowData.kat === "Zemin Kat" ? "selected" : ""}>Zemin Kat</option>  
                        <option ${rowData.kat === "Bodrum Kat" ? "selected" : ""}>Bodrum Kat</option>  
                        <option ${rowData.kat === "1. Kat" ? "selected" : ""}>1. Kat</option>  
                        <option ${rowData.kat === "2. Kat" ? "selected" : ""}>2. Kat</option>  
                        <option ${rowData.kat === "3. Kat" ? "selected" : ""}>3. Kat</option>  
                        <option ${rowData.kat === "4. Kat" ? "selected" : ""}>4. Kat</option>  
                        <option ${rowData.kat === "5. Kat" ? "selected" : ""}>5. Kat</option>  
                        <option ${rowData.kat === "6. Kat" ? "selected" : ""}>6. Kat</option>  
                    </select>  
                </td>
                <td>  
                    <select class="form-select">  
                        <option ${rowData.tipi === "Dükkan" ? "selected" : ""}>Dükkan</option>  
                        <option ${rowData.tipi === "Ofis" ? "selected" : ""}>Ofis</option>  
                        <option ${rowData.tipi === "1+1" ? "selected" : ""}>1+1</option>  
                        <option ${rowData.tipi === "2+0" ? "selected" : ""}>2+0</option>  
                        <option ${rowData.tipi === "2+1" ? "selected" : ""}>2+1</option>  
                        <option ${rowData.tipi === "3+1" ? "selected" : ""}>3+1</option>  
                        <option ${rowData.tipi === "3+1 dublex" ? "selected" : ""}>3+1 dublex</option>  
                        <option ${rowData.tipi === "4+1" ? "selected" : ""}>4+1</option>  
                        <option ${rowData.tipi === "4+1 dublex" ? "selected" : ""}>4+1 dublex</option>  
                        <option ${rowData.tipi === "5+1 dublex" ? "selected" : ""}>5+1 dublex</option>  
                    </select>  
                </td>
                <td><input type="text" class="form-control" placeholder="Kapı No" value="${rowData.Ad || ""}"></td>
                <td><input type="number" class="form-control genel-brut-alan" placeholder="m²" value="${rowData.genelBrutAlan || ""}" required></td>
                <td>  
                    <button id="delete-btn-${index + 1}" type="button" class="btn btn-danger btn-sm delete-row-btn">Sil</button>  
                </td>  
            </tr>  
        `;  

        // Yeni satırı tabloya ekleme  
        tableRows.insertAdjacentHTML("beforeend", newRowHTML);  
    });  
}  


export function setBuildingViewDb(data){
    let katsayisi = 0;
    const dataDb = readData("building");
    getBuildingInfos(dataDb);
    
    const totalFloors = getFloorNumber();
    const isbodrum = isBodrum(dataDb);
    containerBina.classList.remove("d-none");  

    if(isbodrum){
        katsayisi = totalFloors + 1;
        floorHeader.textContent = "Bodrum Kat Planı";  
        pageTitle.textContent = "Bodrum Kat Planı";  
    } else{
        katsayisi = totalFloors;
    }
    
    // Kat yüksekliği hesaplaması
    const buildingHeight = totalFloors * 100;  

    // Bina konteynerine stil atayarak yükseklik ve görsel düzeni ekle  
    buildingContainer.style.height = `${buildingHeight + 50}px`; // 50px çatı için ekleniyor  
    buildingContainer.classList.remove("d-none");  

    // Eski bina içeriğini temizle  
    buildingContainer.innerHTML = "";  

    // Çatı ekle (ilk önce, en üste olacak şekilde)  
    const roof = document.createElement("div");  
    roof.classList.add("roof");  
    buildingContainer.appendChild(roof);  

    // Katları oluşturma  
    for (let i = totalFloors - 1; i >= 0; i--) {  
        const floor = document.createElement("div");  
        floor.classList.add("floor");  

        // Kat numarasını belirleme  
        if(!isbodrum){
            if (i === 0) {  
                floor.innerText = `Zemin Kat`; // İlk kat zemin kat  
            } else {  
                floor.innerText = `${i}. Kat`; // Diğer katları sıralı numaralandır  
            }
        } else{
            if (i === 0) {  
                floor.innerText = `Bodrum Kat`; // İlk kat zemin kat  
            } else if(i === 1){  
                floor.innerText = `Zemin Kat`; // Diğer katları sıralı numaralandır  
            } else{
                floor.innerText = `${i-1}. Kat`;
            }
        }

        // Katları binaya ekle  
        buildingContainer.appendChild(floor);  
    }  

    // Formu gizle ve diğer butonları göster  
    buildingForm.classList.add("d-none");  
    resetBtn.classList.remove("d-none");  
    nextBtn.classList.remove("d-none"); 
}