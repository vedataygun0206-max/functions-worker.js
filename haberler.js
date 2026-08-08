// ===============================
// Digital Gündem - Haber Sistemi
// D1 API bağlantılı
// ===============================

const API_URL = "https://functions-worker-js.vedataygun0206.workers.dev/api/haberler";

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Digital Gündem hazır.");

    const haberListesi = document.getElementById("haberListesi");
    const manset = document.getElementById("mansetHaber");

    if (!haberListesi) return;

    try {

        // D1 VERİTABANINDAN HABERLERİ AL
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Haber API bağlantısı başarısız.");
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || "Haberler alınamadı.");
        }

        const haberler = data.haberler || [];

        console.log("D1'den gelen haberler:", haberler);

        // ===============================
        // HABER YOK
        // ===============================

        if (haberler.length === 0) {

            haberListesi.innerHTML = `
                <article class="news-card">
                    <img 
                        src="https://picsum.photos/600/350"
                        alt="Digital Gündem"
                    >

                    <span class="etiket">
                        Digital Gündem
                    </span>

                    <h3>
                        Henüz haber eklenmedi
                    </h3>

                    <p>
                        Yönetim panelinden ilk haberinizi ekleyebilirsiniz.
                    </p>
                </article>
            `;

            if (manset) {
                manset.innerHTML = "";
            }

            return;
        }

        // ===============================
        // MANŞET
        // ===============================

        if (manset) {

            // Manset olarak işaretlenen haberi bul
            let ilk = haberler.find(
                haber => Number(haber.manset) === 1
            );

            // Manset yoksa ilk haberi kullan
            if (!ilk) {
                ilk = haberler[0];
            }

            manset.innerHTML = `
                <div class="headline-main">

                    <img
                        src="${ilk.resim || 'https://picsum.photos/900/500'}"
                        alt="${escapeHTML(ilk.baslik)}"
                    >

                    <div class="headline-text">

                        <span class="etiket">
                            ${escapeHTML(ilk.kategori)}
                        </span>

                        <h2>
                            ${escapeHTML(ilk.baslik)}
                        </h2>

                        <p>
                            ${escapeHTML(ilk.ozet || "")}
                        </p>

                        <small>
                            ${escapeHTML(ilk.tarih || "")}
                        </small>

                        <br><br>

                        <a
                            href="haber.html?id=${ilk.id}"
                            class="btn"
                        >
                            Haberi Oku →
                        </a>

                    </div>

                </div>
            `;
        }

        // ===============================
        // HABERLER
        // ===============================

        haberListesi.innerHTML = "";

        haberler.forEach(haber => {

            haberListesi.innerHTML += `

                <article
                    class="news-card"
                    data-id="${haber.id}"
                >

                    <img
                        src="${haber.resim || 'https://picsum.photos/600/350'}"
                        alt="${escapeHTML(haber.baslik)}"
                        loading="lazy"
                    >

                    <span class="etiket">
                        ${escapeHTML(haber.kategori)}
                    </span>

                    <h3>
                        ${escapeHTML(haber.baslik)}
                    </h3>

                    <p>
                        ${escapeHTML(haber.ozet || "")}
                    </p>

                    <small>
                        ${escapeHTML(haber.tarih || "")}
                    </small>

                    <br><br>

                    <a href="haber.html?id=${haber.id}">
                        Devamını Oku →
                    </a>

                </article>
            `;
        });

        // ===============================
        // HABER KARTI
        // ===============================

        document
            .querySelectorAll(".news-card")
            .forEach(card => {

                card.addEventListener("click", event => {

                    // Linke basıldıysa ayrıca işlem yapma
                    if (event.target.closest("a")) {
                        return;
                    }

                    const id = card.dataset.id;

                    if (id) {
                        window.location.href =
                            `haber.html?id=${id}`;
                    }

                });

            });

    } catch (error) {

        console.error(
            "Haberler yüklenirken hata:",
            error
        );

        haberListesi.innerHTML = `
            <article class="news-card">

                <span class="etiket">
                    Digital Gündem
                </span>

                <h3>
                    Haberler yüklenemedi
                </h3>

                <p>
                    Haber servisine şu anda ulaşılamıyor.
                    Lütfen daha sonra tekrar deneyin.
                </p>

            </article>
        `;
    }

});


// ===============================
// HTML GÜVENLİK
// ===============================

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ===============================
// SAYFANIN BAŞINA DÖN
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

    topBtn.style.display =
        window.scrollY > 300
            ? "block"
            : "none";

});

topBtn.onclick = () => {

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

};
