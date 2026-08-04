// ===============================
// Digital Gündem - haberler.js
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    const haberListesi = document.getElementById("haberListesi");
    const manset = document.getElementById("mansetHaber");

    if (!haberListesi) return;

    // Yönetim panelinden eklenen haberleri al
    const haberler = JSON.parse(localStorage.getItem("haberler")) || [];

    // Haber yoksa
    if (haberler.length === 0) {
        haberListesi.innerHTML = `
        <div class="news-card">
            <img src="https://picsum.photos/600/350" alt="Haber">
            <span class="etiket">Digital Gündem</span>
            <h3>Henüz haber eklenmedi</h3>
            <p>Yönetim panelinden ilk haberinizi ekleyebilirsiniz.</p>
        </div>`;
        return;
    }

    // Manşet Haber
    if (manset) {

        const ilk = haberler[0];

        manset.innerHTML = `
        <div class="headline-main">

            <img src="${ilk.resim || 'https://picsum.photos/900/500'}" alt="${ilk.baslik}">

            <div class="headline-text">

                <span class="etiket">${ilk.kategori}</span>

                <h2>${ilk.baslik}</h2>

                <p>${ilk.ozet}</p>

                <small>${ilk.tarih}</small>

            </div>

        </div>`;
    }

    // Haberleri listele
    haberListesi.innerHTML = "";

    haberler.forEach(haber => {

        haberListesi.innerHTML += `
        <article class="news-card">

            <img src="${haber.resim || 'https://picsum.photos/600/350'}" alt="${haber.baslik}">

            <span class="etiket">${haber.kategori}</span>

            <h3>${haber.baslik}</h3>

            <p>${haber.ozet}</p>

            <small>${haber.tarih}</small>

            <a href="#" class="btn">Haberi Oku</a>

        </article>`;
    });

});
