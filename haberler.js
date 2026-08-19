// ========================================
// DIGITAL GÜNDEM - D1 HABER SİSTEMİ
// ========================================

window.addEventListener(
  "DOMContentLoaded",
  ()=>{

    haberleriGetir();

    videoHaberleriGetir();

    firmalariGetir();

    gundemGetir();

    reklamGetir();

    // Kur bilgileri ayrı yüklenir
    kurlariGetir();

  }
);

    const haberListesi = document.getElementById("haberListesi");
    const manset = document.getElementById("mansetHaber");
    const arama = document.getElementById("haberArama");

    let tumHaberler = [];

    // ========================================
    // D1'DEN HABERLERİ AL
    // ========================================

    async function haberleriGetir() {

        try {

            const cevap = await fetch("/api/haberler");

            const veri = await cevap.json();

            console.log("Digital Gündem API:", veri);

            if (!veri.success) {
                throw new Error(veri.error || "Haberler alınamadı.");
            }

            tumHaberler = veri.haberler || [];

            haberleriGoster(tumHaberler);

        } catch (error) {

            console.error("Haber API hatası:", error);

            if (haberListesi) {

                haberListesi.innerHTML = `
                    <article class="news-card">
                        <h3>Haberler yüklenemedi.</h3>
                        <p>${error.message}</p>
                    </article>
                `;

            }

        }

    }

    // ========================================
    // HABERLERİ GÖSTER
    // ========================================

    function haberleriGoster(haberler) {

        if (!haberListesi) return;

        // Haber yok
        if (haberler.length === 0) {

            haberListesi.innerHTML = `
                <article class="news-card">
                    <h3>Henüz haber bulunmuyor.</h3>
                    <p>Yönetim panelinden haber ekleyebilirsiniz.</p>
                </article>
            `;

            if (manset) {
                manset.innerHTML = "";
            }

            return;
        }

        // ========================================
        // MANŞET
        // ========================================

        const mansetHaber =
            haberler.find(haber => Number(haber.manset) === 1)
            || haberler[0];

        if (manset) {

            manset.innerHTML = `

                <div class="headline-main">

                    <img
                        src="${mansetHaber.resim || 'https://picsum.photos/900/500'}"
                        alt="${mansetHaber.baslik || 'Haber'}"
                    >

                    <div class="headline-text">

                        <span class="etiket">
                            ${mansetHaber.kategori || 'Gündem'}
                        </span>

                        <h2>
                            ${mansetHaber.baslik || ''}
                        </h2>

                        <p>
                            ${mansetHaber.ozet || ''}
                        </p>

                        <small>
                            ${mansetHaber.tarih || ''}
                        </small>

                        <br><br>

                        <a
                            href="/pages/haber.html?id=${mansetHaber.id}"
                            class="btn"
                        >
                            Haberi Oku →
                        </a>

                    </div>

                </div>

            `;
        }

        // ========================================
        // HABER KARTLARI
        // ========================================

        haberListesi.innerHTML = "";

        haberler.forEach(haber => {

            haberListesi.innerHTML += `

                <article class="news-card">

                    <img
                        src="${haber.resim || 'https://picsum.photos/600/350'}"
                        alt="${haber.baslik || 'Haber'}"
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

                    <a href="/pages/haber.html?id=${haber.id}">
                        Devamını Oku →
                    </a>

                </article>

            `;

        });

    }
// =====================================================
// TCMB KURLARI
// =====================================================

async function kurlariGetir(){

  const alan = $("kurAlani");

  try{

    const response = await fetch(
      "/api/kurlar",
      {
        cache:"no-store",
        headers:{
          Accept:"application/json"
        }
      }
    );

    const data = await response.json();

    if(!response.ok || !data.success){

      throw new Error(
        data?.error ||
        "Kur bilgileri alınamadı."
      );

    }

    const kurlar =
      Array.isArray(data.currencies)
      ? data.currencies
      : [];

    if(!kurlar.length){

      throw new Error(
        "Kur verisi bulunamadı."
      );

    }

    alan.innerHTML = `

      <div class="kur-listesi">

        ${
          kurlar.map(k => `

            <div class="kur-karti">

              <div class="kur-kodu">
                ${escapeHTML(k.code)}
              </div>

              <div class="kur-isim">
                ${escapeHTML(k.name)}
              </div>

              <div class="kur-deger">
                ${Number(k.satis).toLocaleString(
                  "tr-TR",
                  {
                    minimumFractionDigits:2,
                    maximumFractionDigits:4
                  }
                )}
                <span class="kur-etiket">
                  TL
                </span>
              </div>

            </div>

          `).join("")

        }

      </div>

    `;

  }catch(error){

    console.error(
      "Kur API:",
      error
    );

    alan.innerHTML = `

      <div class="kur-hata">
        ⚠️ Kur bilgileri şu anda alınamıyor.
      </div>

    `;

  }

}
    // ========================================
    // ARAMA
    // ========================================

    if (arama) {

        arama.addEventListener("input", () => {

            const kelime =
                arama.value
                    .toLocaleLowerCase("tr-TR")
                    .trim();

            if (!kelime) {

                haberleriGoster(tumHaberler);

                return;
            }

            const sonuc = tumHaberler.filter(haber => {

                return (

                    (haber.baslik || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(kelime)

                    ||

                    (haber.ozet || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(kelime)

                    ||

                    (haber.kategori || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(kelime)

                );

            });

            haberleriGoster(sonuc);

        });

    }

    // ========================================
    // BAŞLAT
    // ========================================

    haberleriGetir();

});
