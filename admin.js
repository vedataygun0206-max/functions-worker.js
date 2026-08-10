// ========================================
// DIGITAL GÜNDEM - D1 YÖNETİM PANELİ
// ========================================

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("haberForm");
    const resimInput = document.getElementById("haberResim");
    const taslakBtn = document.querySelector('button[type="button"]');

    let secilenResim = "";

    // ==============================
    // FOTOĞRAF SEÇ
    // ==============================

    if (resimInput) {

        resimInput.addEventListener("change", function () {

            const dosya = this.files[0];

            if (!dosya) {
                secilenResim = "";
                return;
            }

            const reader = new FileReader();

            reader.onload = function (e) {
                secilenResim = e.target.result;
            };

            reader.readAsDataURL(dosya);

        });

    }

    // ==============================
    // HABER YAYINLA
    // ==============================

    if (form) {

        form.addEventListener("submit", async function (e) {

            e.preventDefault();

            await kaydet("yayinda");

        });

    }

    // ==============================
    // TASLAK
    // ==============================

    if (taslakBtn) {

        taslakBtn.addEventListener("click", async function () {

            await kaydet("taslak");

        });

    }

    // ==============================
    // D1'E KAYDET
    // ==============================

    async function kaydet(durum) {

        const haber = {

            baslik:
                document.getElementById("baslik").value.trim(),

            kategori:
                document.getElementById("kategori").value,

            ozet:
                document.getElementById("ozet").value.trim(),

            icerik:
                document.getElementById("detay").value.trim(),

            resim:
                secilenResim,

            manset:
                document.getElementById("manset").checked,

            durum:
                durum,

            tarih:
                new Date().toLocaleDateString("tr-TR")

        };

        // Başlık kontrolü

        if (!haber.baslik) {

            alert("⚠️ Lütfen haber başlığı girin.");

            return;

        }

        try {

            const cevap = await fetch("/api/haber", {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(haber)

            });

            const sonuc = await cevap.json();

            console.log("D1 Haber Sonucu:", sonuc);

            if (!sonuc.success) {

                throw new Error(
                    sonuc.error || "Haber kaydedilemedi."
                );

            }

            if (durum === "yayinda") {

                alert(
                    "📰 Haber başarıyla yayınlandı!\n\n" +
                    "Haber ID: " + sonuc.id
                );

            } else {

                alert(
                    "💾 Taslak D1'e kaydedildi.\n\n" +
                    "Haber ID: " + sonuc.id
                );

            }

            form.reset();

            secilenResim = "";

        } catch (error) {

            console.error("Haber kayıt hatası:", error);

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
        document.getElementById("istatistikTablo");

    const toplam =
        document.getElementById("toplamOkunma");

    const durum =
        document.getElementById("istatistikDurum");

    // Bu elemanlar yoksa hiçbir şey yapma
    if (!tablo || !toplam) {
        return;
    }

    try {

        const cevap = await fetch(
            "/api/haber-istatistik",
            {
                method: "GET",
                credentials: "include"
            }
        );

        const veri = await cevap.json();

        if (!cevap.ok || !veri.success) {

            durum.textContent =
                "❌ İstatistikler alınamadı.";

            return;
        }

        // TOPLAM OKUNMA
        toplam.textContent =
            veri.toplam_okunma || 0;

        // TABLOYU TEMİZLE
        tablo.innerHTML = "";

        // HABERLERİ TABLOYA EKLE
        veri.haberler.forEach(
            function(haber, index) {

                const satir =
                    document.createElement("tr");

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

                tablo.appendChild(satir);

            }
        );

        durum.textContent =
            "✅ İstatistikler güncel.";

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
