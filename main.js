var express = require('express')();
var server  = require('http').Server(express);
var fetch = require('node-fetch');
var moment = require('moment');

const fs = require('fs');
const formurlencoded = require('form-urlencoded').default;

var provincesSelected = [31,32];
var provinces = [];
var objSubRegions = {};
var provinceCode;
var subRegions = [];

const provinceUri = "https://antrian.bpjsketenagakerjaan.go.id/getListProvinsi.php";
const subRegionUri = "https://antrian.bpjsketenagakerjaan.go.id/getListCabang.php";
const kuotaUri = "https://antrian.bpjsketenagakerjaan.go.id/getSisaKuota.php";
const provincesPath = "provinces.json";

async function fetchUri(url, params = null){
    let data = {};
    let response;
    try {
        response = !params ? await fetch(url) : await fetch(url, params);        
        data = await response.json();
      } catch (error) {
        console.log(error);
      }
      return data;
}

async function runApp(){        
    // HARI INI
    let dt = new Date();
    let day = dt.getDate();
    let monthIndex = dt.getMonth()+1;
    let year = dt.getFullYear();
    if(day<10){
        day = '0'+day;
    }
    if(monthIndex<10){
        monthIndex = '0'+monthIndex;
    }
    let tglSekarang = day+'-'+monthIndex+'-'+year;

    // HARI ESOK
    let besok = new Date();
    besok.setDate(besok.getDate() + 1);
    let dayBesok = besok.getDate();
    let monthBesok = besok.getMonth()+1;
    let yearBesok = besok.getFullYear();
    if(dayBesok<10){
        dayBesok = '0'+dayBesok;
    }
    if(monthBesok<10){
        monthBesok = '0'+monthBesok;
    }
    let tglBesok = dayBesok+'-'+monthBesok+'-'+yearBesok;

    // HARI TERAKHIR RANGE
    let akhir = new Date();
    akhir.setDate(akhir.getDate() + 7);
    let dayAkhir = akhir.getDate();
    let monthAkhir = akhir.getMonth()+1;
    let yearAkhir = akhir.getFullYear();
    if(dayAkhir<10){
        dayAkhir = '0'+dayAkhir;
    }
    if(monthAkhir<10){
        monthAkhir = '0'+monthAkhir;
    }
    let tglAkhir = dayAkhir+'-'+monthAkhir+'-'+yearAkhir;
    let lengthOfProviceSelected = provincesSelected.length;
    
    for(let s = 0; s < lengthOfProviceSelected; s++){
        let provinceCode = provincesSelected[s];
        let provinceName = provinces.find(c => c.kode == provinceCode.toString())["nama"];
        let currentSubRegions = objSubRegions[provinceCode.toString()];
        let lengthOfSubRegions = currentSubRegions.length;

        for(let j = 0; j < lengthOfSubRegions; j++){      
            try{   
                res = await fetchUri(kuotaUri, { 
                    method: 'POST', 
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    }, 
                    body: formurlencoded({
                        "kode_kantor": currentSubRegions[j]["kodeKantor"],
                        "tgl": tglBesok,
                        "tgl_akhir": tglAkhir
                    })
                });    

                let kuotas = res.data;
                let status = "";
                let detail = "";
                let isAvailable = false;

                //changeCabangCount++; // SET VALUE COUNTER PILIH CABANG
                var hariSekarang = dt.getDay()+1; // AMBIL ARRAY HARI 0 => MINGGU, 6 => SABTU. DIMULAI DARI HARI BESOK
                var hariFull = 0; // BUAT COUNTER JUMLAH HARI YANG FULL
                var totalKuotaTerisi = 0; // BUAT COUNTER JUMLAH ANTRIANNYA YANG FULL
                var arrTglDisabled = []; // HARI LIBUR 2018
                arrTglDisabled.push('05-02-2019', '07-03-2019', '03-04-2019', '19-04-2019', '01-05-2019', '19-05-2019', '30-05-2019', '01-06-2019', '03-06-2019', '04-06-2019', '05-06-2019', '06-06-2019', '07-06-2019', '11-08-2019', '17-08-2019', '01-09-2019', '09-11-2019', '24-12-2019', '25-12-2019','01-01-2020'); // HARI LIBUR 2019

                for(var i = 0; i < kuotas.length; i++){

                    // JIKA WEEKEND
                    if (hariSekarang == 0 || hariSekarang == 6){

                        // console.log(i+" = "+hariSekarang);

                        hariFull++; // HITUNG HARI YANG FULL
                        if (hariSekarang == 6){ var hariSekarang = 0; }
                        else { hariSekarang++; } // HITUNG HARI DALAM ARRAY JS DAY
                        
                    // JIKA WEEKDAYS
                    } else {

                        // console.log(i+" = "+hariSekarang);

                        if(kuotas[i].totalKuota<=0){
                            arrTglDisabled.push(kuotas[i].tglBooking); // TAMBAH ARRAY DISABLED DATE
                            hariFull++; // HITUNG HARI YANG FULL
                            // console.log(resultKuota.data[i].tglBooking);
                        }

                        hariSekarang++; // HITUNG HARI DALAM ARRAY JS DAY
                    }

                    totalKuotaTerisi += Number(kuotas[i].totalKuotaTerisi);
                }

                
                if (hariFull < 7){
                    let clocks = [];
                    isAvailable = true;
                    
                    status = "masih ada yang kosong";
                    for(var x = 0; x<kuotas.length;x++){
                        let kuota = kuotas[x];
                        
                        if(arrTglDisabled.indexOf(kuota["tglBooking"]) !== -1)
                            continue;

                        if(kuota.kuota1>0){
                            clocks.push('08.00-09.00');
                        }
                        if(kuota.kuota2>0){
                            clocks.push('09.00-10.00');
                        }
                        if(kuota.kuota3>0){
                            clocks.push('10.00-11.00');
                        }
                        if(kuota.kuota4>0){
                            clocks.push('11.00-12.00');
                        }
                        if(kuota.kuota5>0){
                            clocks.push('12.00-13.00');
                        }
                        if(kuota.kuota6>0){
                            clocks.push('13.00-14.00');
                        }
                        if(kuota.kuota7>0){
                            clocks.push('14.00-14.30');
                        }
                        
                        let d = moment(kuota["tglBooking"], "DD-MM-YYYY");
                        let intOfDay = d.days();
                        

                        if(intOfDay !== 0 && intOfDay !== 6){
                            detail = detail+`Sisa: ${kuota["totalKuota"]} \n ${kuota["tglBooking"]}: ${clocks.join(',')}\n `;
                        }
                        clocks = [];
                    }                
                
                } else {
                    status = "penuh";
                }
                
                if(isAvailable)
                    console.log(" Provinsi: %s \n Kantor: %s \n Alamat: %s \n Status: %s \n %s \n\n", provinceName, (currentSubRegions[j]["namaKantor"]) ? currentSubRegions[j]["namaKantor"] : "" , currentSubRegions[j]["alamat"], status, detail);
                else
                    console.log(" Provinsi: %s \n Kantor: %s \n Status: %s \n \n ", provinceName, currentSubRegions[j]["namaKantor"], status);
            
            } catch(e) {
                console.log(e);
            }
        }

    }

    //setTimeout(runApp, 30000);
}

async function app() {    
    let rawdata = fs.readFileSync(provincesPath);  
    let responses = JSON.parse(rawdata);  

    //let responses = await fetchUri(provinceUri);  //jika mau ngambil data online
    provinces = responses.data;

    let lengthOfProviceSelected = provincesSelected.length;
    for(let s = 0; s < lengthOfProviceSelected; s++){
        let provinceCode = provincesSelected[s]; 
        
        let res = await fetchUri(subRegionUri, { 
            method: 'POST', 
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }, 
            body: formurlencoded({"kode_provinsi": provinceCode})
        });

        subRegions = res.data;
        objSubRegions[provinceCode.toString()] = res.data;        
    }
    
    runApp();
}

server.listen(5001, function () {
    app();
});
