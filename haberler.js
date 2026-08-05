// ===============================
// Digital Gündem - Haber Sistemi
// ===============================

document.addEventListener("DOMContentLoaded", () => {

    console.log("Digital Gündem hazır.");

    const haberListesi = document.getElementById("haberListesi");
    const manset = document.getElementById("mansetHaber");

    if (!haberListesi) return;

    const haberler = JSON.parse(localStorage.getItem("haberler")) || [];

    // Haber yoksa
    if (haberler.length === 0) {

        haberListesi.innerHTML = `
        <article class="news-card">
            <img src="https://picsum.photos/600/350" alt="">
            <span class="etiket">Digital Gündem</span>
            <h3>Henüz haber eklenmedi</h3>
            <p>Yönetim panelinden ilk haberinizi ekleyebilirsiniz.</p>
        </article>`;

        return;
    }

    // ===================
    // MANŞET
    // ===================

    if (manset) {

        const ilk = haberler[0];

        manset.innerHTML = `
        <div class="headline-main">

            <img src="${ilk.resim || 'https://picsum.photos/900/500'}" alt="${ilk.baslik}">

            <div class="headline-text">

                <span class="etiket">${ilk.kategori}</span>

                <h2>${ilk.baslik}</h2>

                <p>${ilk.ozet}</p>

                <small>${ilk.tarih}</small><br><br>

                <a href="haber.html?id=0" class="btn">
                    Haberi Oku →
                </a>

            </div>

        </div>`;
    }

    // ===================
    // HABERLER
    // ===================

    haberListesi.innerHTML = "";

    haberler.forEach((haber, index) => {

        haberListesi.innerHTML += `

        <article class="news-card">

            <img src="${haber.resim || 'https://picsum.photos/600/350'}" alt="${haber.baslik}">

            <span class="etiket">${haber.kategori}</span>

            <h3>${haber.baslik}</h3>

            <p>${haber.ozet}</p>

            <small>${haber.tarih}</small>

            <br><br>

            <a href="haber.html?id=${index}">
                Devamını Oku →
            </a>

        </article>

        `;

    });

    // Haber kartı tıklama
    document.querySelectorAll(".news-card").forEach(card => {

        card.addEventListener("click", () => {

            console.log("Haber açılıyor...");

        });

    });

});

// ===============================
// Sayfanın başına dön
// ===============================

const topBtn = document.createElement("button");

topBtn.innerHTML = "⬆";

topBtn.style.position = "fixed";
topBtn.style.right = "20px";
topBtn.style.bottom = "20px";
topBtn.style.width = "50px";
topBtn.style.height = "50px";
topBtn.style.border = "none";
topBtn.style.borderRadius = "50%";
topBtn.style.background = "#d60000";
topBtn.style.color = "#fff";
topBtn.style.fontSize = "22px";
topBtn.style.cursor = "pointer";
topBtn.style.display = "none";
topBtn.style.zIndex = "9999";

document.body.appendChild(topBtn);

window.addEventListener("scroll", () => {

    if (window.scrollY > 300) {

        topBtn.style.display = "block";

    } else {

        topBtn.style.display = "none";

    }

});

topBtn.onclick = () => {

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

};
