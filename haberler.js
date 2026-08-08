// ===============================
// DIGITAL GÜNDEM - HABERLER
// D1 API bağlantısı
// ===============================

document.addEventListener("DOMContentLoaded", async () => {

    console.log("Digital Gündem haber sistemi başlatıldı.");

    const haberListesi = document.getElementById("haberListesi");
    const manset = document.getElementById("mansetHaber");

    if (!haberListesi) {
        console.log("haberListesi bulunamadı.");
        return;
    }

    try {

        // ===============================
        // D1 API'DEN HABERLERİ AL
        // ===============================

        const response = await fetch(
            "https://functions-worker-js.vedataygun0206.workers.dev/api/haberler"
        );

        const data = await response.json();

        console.log("API sonucu:", data);

        if (!data.success) {
            throw new Error(
                data.error || "Haberler alınamadı."
            );
        }

        const haberler = data.haberler || [];

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
                        Yönetim panelinden ilk haberinizi
                        ekleyebilirsiniz.
                    </p>

                </article>
            `;

            return;
        }

        // ===============================
        // MANŞET
        // ===============================

        if (manset) {

            const ilk = haberler.find(
                haber => Number(haber.manset) === 1
            ) || haberler[0];

            const index = haberler.findIndex(
                haber => haber.id === ilk.id
            );

            manset.innerHTML = `
                <div class="headline-main">

                    <img
                        src="${ilk.resim || 'https://picsum.photos/900/500'}"
                        alt="${ilk.baslik || ''}"
                    >

                    <div class="headline-text">

                        <span class="etiket">
                            ${ilk.kategori || 'Gündem'}
                        </span>

                        <h2>
                            ${ilk.baslik || ''}
                        </h2>

                        <p>
                            ${ilk.ozet || ''}
                        </p>

                        <small>
                            ${ilk.tarih || ''}
                        </small>

                        <br><br>

                        <a
                            href="haber.html?id=${index}"
                            class="btn"
                        >
                            Haberi Oku →
                        </a>

                    </div>

                </div>
            `;
        }

        // ===============================
        // HABER LİSTESİ
        // ===============================

        haberListesi.innerHTML = "";

        haberler.forEach((haber, index) => {

            haberListesi.innerHTML += `

                <article class="news-card">

                    <img
                        src="${haber.resim || 'https://picsum.photos/600/350'}"
                        alt="${haber.baslik || ''}"
                    >

                    <span class="etiket">
                        ${haber.kategori || 'Gündem'}
                    </span>

                    <h3>
                        ${haber.baslik || ''}
                    </h3>

                    <p>
                        ${haber.ozet || ''}
                    </p>

                    <small>
                        ${haber.tarih || ''}
                    </small>

                    <br><br>

                    <a href="haber.html?id=${index}">
                        Devamını Oku →
                    </a>

                </article>

            `;

        });

        console.log(
            `${haberler.length} haber başarıyla yüklendi.`
        );

    } catch (error) {

        console.error(
            "Haberler yüklenirken hata:",
            error
        );

        haberListesi.innerHTML = `
            <article class="news-card">

                <h3>
                    Haberler yüklenemedi
                </h3>

                <p>
                    Sunucu bağlantısında bir sorun oluştu.
                </p>

            </article>
        `;

    }

});


// ===============================
// YUKARI ÇIK BUTONU
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
