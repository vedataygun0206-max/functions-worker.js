const alan=document.querySelector(".news-grid");

if(alan){

alan.innerHTML="";

haberler.forEach(h=>{

alan.innerHTML+=`

<div class="news-card">

<img src="${h.resim}">

<h3>${h.baslik}</h3>

<p>${h.ozet}</p>

<a href="#">Devamını Oku</a>

</div>

`;

});

}
