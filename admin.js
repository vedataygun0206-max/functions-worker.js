// ========================================
// DIGITAL GÜNDEM - D1 YÖNETİM PANELİ
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    const form =
        document.getElementById("haberForm");

    const resimInput =
        document.getElementById("haberResim");

    const taslakBtn =
        document.querySelector(
            'button[type="button"]'
        );

    let secilenResim = "";


    // ==============================
    // FOTOĞRAF SEÇ
    // ==============================

    if (resimInput) {

        resimInput.addEventListener(
            "change",
            async function () {

                const dosya =
                    this.files[0];

                if (!dosya) {

                    secilenResim = "";

                    return;

                }


                // Sadece resim dosyası
                if (
                    !dosya.type.startsWith(
                        "image/"
                    )
                ) {

                    alert(
                        "⚠️ Lütfen geçerli bir fotoğraf seçin."
                    );

                    this.value = "";

                    secilenResim = "";

                    return;

                }


                try {

                    secilenResim =
                        await resmiKucult(
                            dosya
                        );


                    console.log(
                        "Fotoğraf hazırlandı.",
                        Math.round(
                            secilenResim.length /
                            1024
                        ) + " KB"
                    );


                } catch (error) {

                    console.error(
                        "Fotoğraf işleme hatası:",
                        error
                    );

                    alert(
                        "❌ Fotoğraf hazırlanamadı.\n\n" +
                        error.message
                    );

                    this.value = "";

                    secilenResim = "";

                }

            }
        );

    }


    // ==============================
    // FOTOĞRAF KÜÇÜLTME
    // ==============================

    function resmiKucult(dosya) {

        return new Promise(
            (resolve, reject) => {

                const reader =
                    new FileReader();


                reader.onload =
                    function (e) {

                        const img =
                            new Image();


                        img.onload =
                            function () {

                                // Maksimum genişlik
                                const MAX_GENISLIK =
                                    1200;

                                // Maksimum yükseklik
                                const MAX_YUKSEKLIK =
                                    1200;


                                let genislik =
                                    img.width;

                                let yukseklik =
                                    img.height;


                                // Oranı koruyarak küçült
                                if (
                                    genislik >
                                    MAX_GENISLIK ||
                                    yukseklik >
                                    MAX_YUKSEKLIK
                                ) {

                                    const oran =
                                        Math.min(
                                            MAX_GENISLIK /
                                                genislik,

                                            MAX_YUKSEKLIK /
                                                yukseklik
                                        );


                                    genislik =
                                        Math.round(
                                            genislik *
                                            oran
                                        );


                                    yukseklik =
                                        Math.round(
                                            yukseklik *
                                            oran
                                        );

                                }


                                const canvas =
                                    document.createElement(
                                        "canvas"
                                    );


                                canvas.width =
                                    genislik;

                                canvas.height =
                                    yukseklik;


                                const ctx =
                                    canvas.getContext(
                                        "2d"
                                    );


                                // Beyaz arka plan
                                // özellikle PNG şeffaflığı için
                                ctx.fillStyle =
                                    "#ffffff";

                                ctx.fillRect(
                                    0,
                                    0,
                                    genislik,
                                    yukseklik
                                );


                                ctx.drawImage(
                                    img,
                                    0,
                                    0,
                                    genislik,
                                    yukseklik
                                );


                                // JPEG olarak sıkıştır
                                let kalite =
                                    0.75;


                                let sonuc =
                                    canvas.toDataURL(
                                        "image/jpeg",
                                        kalite
                                    );


                                /*
                                 * Güvenlik:
                                 * Base64 verisi hâlâ çok büyükse
                                 * kaliteyi biraz daha düşür.
                                 */

                                const MAX_BASE64 =
                                    1800000;


                                while (
                                    sonuc.length >
                                    MAX_BASE64 &&
                                    kalite > 0.45
                                ) {

                                    kalite -= 0.05;


                                    sonuc =
                                        canvas.toDataURL(
                                            "image/jpeg",
                                            kalite
                                        );

                                }


                                /*
                                 * Hâlâ çok büyükse
                                 * görüntüyü biraz daha küçült.
                                 */

                                if (
                                    sonuc.length >
                                    MAX_BASE64
                                ) {

                                    const yeniGenislik =
                                        Math.round(
                                            genislik *
                                            0.8
                                        );


                                    const yeniYukseklik =
                                        Math.round(
                                            yukseklik *
                                            0.8
                                        );


                                    canvas.width =
                                        yeniGenislik;

                                    canvas.height =
                                        yeniYukseklik;


                                    ctx.fillStyle =
                                        "#ffffff";

                                    ctx.fillRect(
                                        0,
                                        0,
                                        yeniGenislik,
                                        yeniYukseklik
                                    );


                                    ctx.drawImage(
                                        img,
                                        0,
                                        0,
                                        yeniGenislik,
                                        yeniYukseklik
                                    );


                                    sonuc =
                                        canvas.toDataURL(
                                            "image/jpeg",
                                            0.65
                                        );

                                }


                                resolve(
                                    sonuc
                                );

                            };


                        img.onerror =
                            function () {

                                reject(
                                    new Error(
                                        "Fotoğraf okunamadı."
                                    )
                                );

                            };


                        img.src =
                            e.target.result;

                    };


                reader.onerror =
                    function () {

                        reject(
                            new Error(
                                "Fotoğraf dosyası okunamadı."
                            )
                        );

                    };


                reader.readAsDataURL(
                    dosya
                );

            }
        );

    }


    // ==============================
    // HABER YAYINLA
    // ==============================

    if (form) {

        form.addEventListener(
            "submit",
            async function (e) {

                e.preventDefault();

                await kaydet(
                    "yayinda"
                );

            }
        );

    }


    // ==============================
    // TASLAK
    // ==============================

    if (taslakBtn) {

        taslakBtn.addEventListener(
            "click",
            async function () {

                await kaydet(
                    "taslak"
                );

            }
        );

    }


    // ==============================
    // D1'E KAYDET
    // ==============================

    async function kaydet(
        durum
    ) {

        /*
         * Fotoğraf seçildiyse
         * önce fotoğrafın hazırlanmasını bekliyoruz.
         */

        const haber = {

            baslik:
                document
                    .getElementById(
                        "baslik"
                    )
                    .value
                    .trim(),


            kategori:
                document
                    .getElementById(
                        "kategori"
                    )
                    .value,


            ozet:
                document
                    .getElementById(
                        "ozet"
                    )
                    .value
                    .trim(),


            icerik:
                document
                    .getElementById(
                        "detay"
                    )
                    .value
                    .trim(),


            resim:
                secilenResim,


            manset:
                document
                    .getElementById(
                        "manset"
                    )
                    .checked,


            durum:
                durum,


            tarih:
                new Date()
                    .toLocaleDateString(
                        "tr-TR"
                    )

        };


        // Başlık kontrolü

        if (!haber.baslik) {

            alert(
                "⚠️ Lütfen haber başlığı girin."
            );

            return;

        }


        // Fotoğraf boyut kontrolü

        if (
            haber.resim &&
            haber.resim.length >
            1800000
        ) {

            alert(
                "⚠️ Fotoğraf hâlâ çok büyük.\n\n" +
                "Lütfen daha küçük bir fotoğraf seçin."
            );

            return;

        }


        try {

            const cevap =
                await fetch(
                    "/api/haber",
                    {

                        method:
                            "POST",

                        credentials:
                            "include",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify(
                                haber
                            )

                    }
                );


            /*
             * API JSON döndürmezse
             * doğrudan anlaşılır hata göster.
             */

            const metin =
                await cevap.text();


            let sonuc;


            try {

                sonuc =
                    JSON.parse(
                        metin
                    );

            } catch {

                throw new Error(
                    "Sunucu JSON yerine farklı bir cevap döndürdü. HTTP " +
                    cevap.status
                );

            }


            console.log(
                "D1 Haber Sonucu:",
                sonuc
            );


            if (
                !cevap.ok ||
                !sonuc.success
            ) {

                throw new Error(
                    sonuc.error ||
                    "Haber kaydedilemedi."
                );

            }


            if (
                durum === "yayinda"
            ) {

                alert(
                    "📰 Haber başarıyla yayınlandı!\n\n" +
                    "Haber ID: " +
                    sonuc.id
                );

            } else {

                alert(
                    "💾 Taslak D1'e kaydedildi.\n\n" +
                    "Haber ID: " +
                    sonuc.id
                );

            }


            // Formu temizle

            form.reset();

            secilenResim = "";


        } catch (error) {

            console.error(
                "Haber kayıt hatası:",
                error
            );


            alert(
                "❌ Haber kaydedilemedi.\n\n" +
                error.message
            );

        }

    }

});


// =========================
// HABER OKUNMA İSTATİSTİKLERİ
// =========================

async function haberIstatistikleriniGetir() {

    const tablo =
        document.getElementById(
            "istatistikTablo"
        );


    const toplam =
        document.getElementById(
            "toplamOkunma"
        );


    const durum =
        document.getElementById(
            "istatistikDurum"
        );


    if (
        !tablo ||
        !toplam
    ) {

        return;

    }


    try {

        const cevap =
            await fetch(
                "/api/haber-istatistik",
                {

                    method:
                        "GET",

                    credentials:
                        "include"

                }
            );


        const veri =
            await cevap.json();


        if (
            !cevap.ok ||
            !veri.success
        ) {

            if (durum) {

                durum.textContent =
                    "❌ İstatistikler alınamadı.";

            }

            return;

        }


        // TOPLAM OKUNMA

        toplam.textContent =
            veri.toplam_okunma || 0;


        // TABLOYU TEMİZLE

        tablo.innerHTML = "";


        // HABERLERİ TABLOYA EKLE

        veri.haberler.forEach(
            function (
                haber,
                index
            ) {

                const satir =
                    document.createElement(
                        "tr"
                    );


                satir.innerHTML = `

                    <td style="padding:12px;">
                        ${index + 1}
                    </td>

                    <td style="padding:12px;">
                        <strong>
                            ${haber.baslik}
                        </strong>
                    </td>

                    <td style="padding:12px;">
                        ${haber.kategori || "-"}
                    </td>

                    <td style="
                        padding:12px;
                        text-align:center;
                        font-weight:bold;
                    ">
                        👁️ ${haber.okunma || 0}
                    </td>

                `;


                tablo.appendChild(
                    satir
                );

            }
        );


        if (durum) {

            durum.textContent =
                "✅ İstatistikler güncel.";

        }


    } catch (error) {

        console.error(
            "İstatistik hatası:",
            error
        );


        if (durum) {

            durum.textContent =
                "❌ İstatistikler yüklenemedi.";

        }

    }

}


haberIstatistikleriniGetir();


// =========================
// ZİYARETÇİ İSTATİSTİKLERİ
// =========================

async function ziyaretIstatistikleriniGetir() {

    try {

        const cevap =
            await fetch(
                "/api/ziyaret-istatistik"
            );


        const veri =
            await cevap.json();


        if (
            !veri.success
        ) {

            return;

        }


        const bugun =
            document.getElementById(
                "bugunkuZiyaretci"
            );


        const toplam =
            document.getElementById(
                "toplamZiyaretci"
            );


        if (bugun) {

            bugun.textContent =
                veri.bugunku_ziyaretci ||
                0;

        }


        if (toplam) {

            toplam.textContent =
                veri.toplam_ziyaretci ||
                0;

        }


    } catch (error) {

        console.error(
            "Ziyaret istatistikleri:",
            error
        );

    }

}


// =========================
// EN ÇOK OKUNAN 5 HABER
// =========================

async function enCokOkunanHaberleriGetir() {

    const alan =
        document.getElementById(
            "enCokOkunanHaberler"
        );


    if (!alan) {

        return;

    }


    try {

        const cevap =
            await fetch(
                "/api/haberler"
            );


        const veri =
            await cevap.json();


        if (
            !veri.success ||
            !veri.haberler
        ) {

            alan.innerHTML =
                "Haberler alınamadı.";

            return;

        }


        const haberler =
            veri.haberler
                .sort(
                    (
                        a,
                        b
                    ) =>
                        (
                            b.okunma || 0
                        ) -
                        (
                            a.okunma || 0
                        )
                )
                .slice(
                    0,
                    5
                );


        if (
            !haberler.length
        ) {

            alan.innerHTML =
                "Henüz haber bulunmuyor.";

            return;

        }


        alan.innerHTML =
            haberler
                .map(
                    (
                        haber,
                        index
                    ) => `

                        <div style="
                            padding:12px;
                            border-bottom:1px solid #ddd;
                        ">

                            <strong>
                                ${index + 1}.
                                ${haber.baslik}
                            </strong>

                            <span style="
                                float:right;
                                font-weight:bold;
                            ">
                                👁️
                                ${haber.okunma || 0}
                            </span>

                            <div style="
                                font-size:13px;
                                color:#777;
                                margin-top:4px;
                            ">
                                ${haber.kategori || "Gündem"}
                            </div>

                        </div>

                    `
                )
                .join("");


    } catch (error) {

        console.error(
            "En çok okunan haberler:",
            error
        );


        alan.innerHTML =
            "İstatistikler alınamadı.";

    }

}


// =========================
// BAŞLAT
// =========================

ziyaretIstatistikleriniGetir();

enCokOkunanHaberleriGetir();
