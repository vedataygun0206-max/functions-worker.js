// Digital Gündem Yönetim Paneli

document.addEventListener("DOMContentLoaded", () => {

const form=document.getElementById("haberForm");
const resimInput=document.getElementById("haberResim");

const taslakBtn=document.querySelector('button[type="button"]');

let secilenResim="";

resimInput.addEventListener("change",function(){

const dosya=this.files[0];

if(!dosya) return;

const reader=new FileReader();

reader.onload=function(e){

secilenResim=e.target.result;

};

reader.readAsDataURL(dosya);

});

// HABER YAYINLA

form.addEventListener("submit",function(e){

e.preventDefault();

kaydet("yayin");

});

// TASLAK

taslakBtn.addEventListener("click",function(){

kaydet("taslak");

});

function kaydet(durum){

const haber={

id:Date.now(),

baslik:document.getElementById("baslik").value,

kategori:document.getElementById("kategori").value,

ozet:document.getElementById("ozet").value,

detay:document.getElementById("detay").value,

resim:secilenResim,

manset:document.getElementById("manset").checked,

durum:durum,

tarih:new Date().toLocaleDateString("tr-TR")

};

let haberler=JSON.parse(localStorage.getItem("haberler"))||[];

haberler.unshift(haber);

localStorage.setItem("haberler",JSON.stringify(haberler));

alert(durum==="taslak" ? "💾 Taslak kaydedildi." : "📰 Haber yayınlandı.");

form.reset();

secilenResim="";

}

});
