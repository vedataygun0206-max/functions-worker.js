document.addEventListener("DOMContentLoaded", () => {

    let haberler = JSON.parse(localStorage.getItem("haberler")) || [];

    const liste = document.getElementById("haberListesi");

    if(liste){

        liste.innerHTML = "";

        haberler.forEach((haber,index)=>{

            liste.innerHTML += `
            <article class="news-card">

                <img src="${haber.resim || 'https://picsum.photos/600/350'}">

                <span class="etiket">${haber.kategori}</span>

                <h3>${haber.baslik}</h3>

                <p>${haber.ozet}</p>

                <small>${haber.tarih}</small>

                <br><br>

                <a href="#" onclick="haberDetay(${index})">Haberi Oku</a>

            </article>
            `;

        });

    }

});

function haberDetay(id){

    localStorage.setItem("aktifHaber",id);

    alert("Haber detay sayfasını bir sonraki adımda oluşturacağız.");

}

// Yukarı çık butonu

const topBtn=document.createElement("button");

topBtn.innerHTML="⬆";

topBtn.style.position="fixed";
topBtn.style.right="20px";
topBtn.style.bottom="20px";
topBtn.style.width="50px";
topBtn.style.height="50px";
topBtn.style.border="none";
topBtn.style.borderRadius="50%";
topBtn.style.background="#d60000";
topBtn.style.color="#fff";
topBtn.style.fontSize="22px";
topBtn.style.display="none";

document.body.appendChild(topBtn);

window.addEventListener("scroll",()=>{

topBtn.style.display=window.scrollY>300?"block":"none";

});

topBtn.onclick=()=>{

window.scrollTo({

top:0,

behavior:"smooth"

});

};
