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
// =========================
// ZİYARETÇİ İSTATİSTİKLERİ
// =========================

async function ziyaretIstatistikleriniGetir() {
  try {
    const cevap = await fetch("/api/ziyaret-istatistik");
    const veri = await cevap.json();

    if (!veri.success) return;

    const bugun =
      document.getElementById("bugunkuZiyaretci");

    const toplam =
      document.getElementById("toplamZiyaretci");

    if (bugun) {
      bugun.textContent =
        veri.bugunku_ziyaretci || 0;
    }

    if (toplam) {
      toplam.textContent =
        veri.toplam_ziyaretci || 0;
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

  if (!alan) return;

  try {

    const cevap =
      await fetch("/api/haberler");

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
          (a, b) =>
            (b.okunma || 0) -
            (a.okunma || 0)
        )
        .slice(0, 5);

    if (!haberler.length) {
      alan.innerHTML =
        "Henüz haber bulunmuyor.";
      return;
    }

    alan.innerHTML =
      haberler.map(
        (haber, index) => `
          <div style="
            padding:12px;
            border-bottom:1px solid #ddd;
          ">
            <strong>
              ${index + 1}. ${haber.baslik}
            </strong>

            <span style="
              float:right;
              font-weight:bold;
            ">
              👁️ ${haber.okunma || 0}
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
