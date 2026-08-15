export default {
  async fetch(request, env) {

    const url = new URL(request.url);
// =========================================================
// 🔧 SİSTEM GENEL SAĞLIK TESTİ
// GET /api/sistem-test
// =========================================================

if (
  url.pathname === "/api/sistem-test" &&
  request.method === "GET"
) {

  const testler = [];

  function testSonucu(ad, durum, detay = "") {
    testler.push({
      test: ad,
      durum: durum ? "OK" : "HATA",
      detay
    });
  }

  // -------------------------------------------------------
  // WORKER
  // -------------------------------------------------------

  testSonucu(
    "Worker",
    true,
    "Worker çalışıyor."
  );


  // -------------------------------------------------------
  // D1 BAĞLANTISI
  // -------------------------------------------------------

  try {

    await env.DB
      .prepare("SELECT 1")
      .first();

    testSonucu(
      "D1 Veritabanı",
      true,
      "D1 bağlantısı çalışıyor."
    );

  } catch (error) {

    testSonucu(
      "D1 Veritabanı",
      false,
      error.message
    );

  }


  // -------------------------------------------------------
  // TABLO TESTLERİ
  // -------------------------------------------------------

  const tablolar = [
    "haberler",
    "video_haberler",
    "firmalar",
    "ziyaretler"
  ];


  for (const tablo of tablolar) {

    try {

      const sonuc =
        await env.DB
          .prepare(
            `SELECT COUNT(*) AS toplam FROM ${tablo}`
          )
          .first();

      testSonucu(
        `Tablo: ${tablo}`,
        true,
        `Tablo çalışıyor. Kayıt: ${sonuc?.toplam || 0}`
      );

    } catch (error) {

      testSonucu(
        `Tablo: ${tablo}`,
        false,
        error.message
      );

    }

  }


  // -------------------------------------------------------
  // ADMIN ŞİFRESİ
  // -------------------------------------------------------

  testSonucu(
    "Admin şifresi",
    !!env.ADMIN_PASSWORD,
    env.ADMIN_PASSWORD
      ? "ADMIN_PASSWORD tanımlı."
      : "ADMIN_PASSWORD bulunamadı."
  );


  // -------------------------------------------------------
  // SONUÇ
  // -------------------------------------------------------

  const hataSayisi =
    testler.filter(
      x => x.durum === "HATA"
    ).length;


  return Response.json({

    success:
      hataSayisi === 0,

    sistem:
      hataSayisi === 0
        ? "SAĞLIKLI"
        : "HATA VAR",

    toplam_test:
      testler.length,

    hata:
      hataSayisi,

    testler

  });

}
    // =========================================================
    // API TEST
    // =========================================================

    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {
      return new Response(
        JSON.stringify({
          success: true,
          service: "digital-gundem",
          api: "aktif"
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json; charset=UTF-8"
          }
        }
      );
    }

export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =========================================================
    // GOOGLE ROBOTS.TXT
    // =========================================================

    if (
      url.pathname === "/robots.txt" &&
      request.method === "GET"
    ) {

      return new Response(
`User-agent: *
Allow: /

Disallow: /admin-giris
Disallow: /api/

Sitemap: https://www.digitalgundem.com.tr/sitemap.xml
`,
        {
          headers: {
            "Content-Type":
              "text/plain; charset=UTF-8",

            "Cache-Control":
              "public, max-age=3600"
          }
        }
      );
    }


    // =========================================================
    // GOOGLE DİNAMİK SITEMAP
    // =========================================================

    if (
      url.pathname === "/sitemap.xml" &&
      request.method === "GET"
    ) {

      try {

        const urls = [];


        // ANA SAYFA

        urls.push(`
  <url>
    <loc>https://www.digitalgundem.com.tr/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);


        // SABİT SAYFALAR

        const sabitSayfalar = [

          {
            url: "/pages/sondakika.html",
            changefreq: "hourly",
            priority: "0.9"
          },

          {
            url: "/pages/turkiye.html",
            changefreq: "daily",
            priority: "0.8"
          },

          {
            url: "/pages/rehber.html",
            changefreq: "weekly",
            priority: "0.6"
          },

          {
            url: "/pages/firmalar.html",
            changefreq: "weekly",
            priority: "0.6"
          },

          {
            url: "/pages/yazarlar.html",
            changefreq: "weekly",
            priority: "0.6"
          },

          {
            url: "/pages/video.html",
            changefreq: "daily",
            priority: "0.7"
          },

          {
            url: "/pages/iletisim.html",
            changefreq: "monthly",
            priority: "0.4"
          }

        ];


        for (const sayfa of sabitSayfalar) {

          urls.push(`
  <url>
    <loc>https://www.digitalgundem.com.tr${sayfa.url}</loc>
    <changefreq>${sayfa.changefreq}</changefreq>
    <priority>${sayfa.priority}</priority>
  </url>`);

        }


        // D1 HABERLERİ

        const haberler =
          await env.DB
            .prepare(`
              SELECT
                id,
                tarih
              FROM haberler
              WHERE durum = 'yayinda'
              ORDER BY id DESC
              LIMIT 5000
            `)
            .all();


        for (const haber of haberler.results) {

          const haberUrl =
            `https://www.digitalgundem.com.tr/pages/haber.html?id=${encodeURIComponent(haber.id)}`;


          urls.push(`
  <url>
    <loc>${haberUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);

        }


        // XML

        const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("")}
</urlset>`;


        return new Response(
          sitemap,
          {
            headers: {

              "Content-Type":
                "application/xml; charset=UTF-8",

              "Cache-Control":
                "public, max-age=1800"

            }
          }
        );


      } catch (error) {

        console.error(
          "Sitemap hatası:",
          error
        );


        return new Response(
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://www.digitalgundem.com.tr/</loc>
  </url>
</urlset>`,
          {
            status: 200,

            headers: {
              "Content-Type":
                "application/xml; charset=UTF-8"
            }
          }
        );

      }

    }


    // =========================================================
    // ZİYARETÇİ KAYDI
    // =========================================================

    const sayfaIsteği =
      request.method === "GET" &&
      !url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/admin-giris") &&
      !url.pathname.startsWith("/pages/admin") &&
      (
        url.pathname === "/" ||
        url.pathname.endsWith(".html")
      );


    if (sayfaIsteği) {

      try {

        const tarih =
          new Intl.DateTimeFormat("tr-TR", {
            timeZone: "Europe/Istanbul"
          }).format(new Date());


        const ip =
          request.headers.get(
            "CF-Connecting-IP"
          ) || "";


        const userAgent =
          request.headers.get(
            "User-Agent"
          ) || "";


        if (ip) {

          const mevcut =
            await env.DB
              .prepare(`
                SELECT id
                FROM ziyaretler
                WHERE tarih = ?
                AND ip = ?
                LIMIT 1
              `)
              .bind(
                tarih,
                ip
              )
              .first();


          if (!mevcut) {

            await env.DB
              .prepare(`
                INSERT INTO ziyaretler
                (
                  tarih,
                  ip,
                  user_agent
                )
                VALUES (?, ?, ?)
              `)
              .bind(
                tarih,
                ip,
                userAgent
              )
              .run();

          }

        }


      } catch (error) {

        console.error(
          "Ziyaretçi kayıt hatası:",
          error
        );

      }

    }


    // =========================================================
    // ZİYARET İSTATİSTİK
    // =========================================================

    if (
      url.pathname === "/api/ziyaret-istatistik" &&
      request.method === "GET"
    ) {

      try {

        const bugun =
          new Intl.DateTimeFormat("tr-TR", {
            timeZone: "Europe/Istanbul"
          }).format(new Date());


        const toplam =
          await env.DB
            .prepare(`
              SELECT COUNT(DISTINCT ip) AS toplam
              FROM ziyaretler
              WHERE ip IS NOT NULL
              AND ip != ''
            `)
            .first();


        const bugunku =
          await env.DB
            .prepare(`
              SELECT COUNT(DISTINCT ip) AS toplam
              FROM ziyaretler
              WHERE tarih = ?
              AND ip IS NOT NULL
              AND ip != ''
            `)
            .bind(
              bugun
            )
            .first();


        return Response.json({

          success: true,

          bugunku_ziyaretci:
            bugunku?.toplam || 0,

          toplam_ziyaretci:
            toplam?.toplam || 0

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {
          status: 500
        });

      }

    }


    // =========================================================
    // AA RSS TEST
    // =========================================================

    if (
      url.pathname === "/api/aa-test" &&
      request.method === "GET"
    ) {

      try {

        const rssUrl =
          "https://www.aa.com.tr/tr/ayrimcilikhatti/rss/news?cat=ayrimcilik";


        const cevap =
          await fetch(
            rssUrl,
            {
              headers: {
                "User-Agent":
                  "Digital-Gundem/1.0"
              }
            }
          );


        const xml =
          await cevap.text();


        return new Response(
          JSON.stringify({

            success:
              cevap.ok,

            status:
              cevap.status,

            kaynak:
              rssUrl,

            uzunluk:
              xml.length,

            baslangic:
              xml.substring(0, 500)

          }),
          {
            headers: {
              "Content-Type":
                "application/json; charset=UTF-8"
            }
          }
        );


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {
          status: 500
        });

      }

    }


    // =========================================================
    // AA RSS TEST
    // /api/rss-test
    // =========================================================

    if (
      url.pathname === "/api/rss-test" &&
      request.method === "GET"
    ) {

      try {

        const rssUrl =
          "https://www.aa.com.tr/tr/rss/default?cat=gundem";


        const cevap =
          await fetch(
            rssUrl,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0"
              }
            }
          );


        const xml =
          await cevap.text();


        return Response.json({

          success:
            cevap.ok,

          status:
            cevap.status,

          uzunluk:
            xml.length,

          baslangic:
            xml.substring(0, 500)

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {
          status: 500
        });

      }

    }


    // =========================================================
    // TÜRKİYE GÜNDEM API
    // /api/gundem
    // =========================================================

    if (
      url.pathname === "/api/gundem" &&
      request.method === "GET"
    ) {

      try {

        const rssUrl =
          "https://www.aa.com.tr/tr/rss/default?cat=gundem";


        const cevap =
          await fetch(
            rssUrl,
            {
              headers: {
                "User-Agent":
                  "Mozilla/5.0 Digital-Gundem/1.0"
              }
            }
          );


        if (!cevap.ok) {

          return Response.json({

            success: false,

            error:
              "AA RSS cevap vermedi.",

            status:
              cevap.status

          }, {
            status: 502
          });

        }


        const xml =
          await cevap.text();


        const items =
          xml.match(
            /<item[\s\S]*?<\/item>/gi
          ) || [];


        const haberler = [];


        for (const item of items) {

          const baslik =
            (
              item.match(
                /<title[^>]*>([\s\S]*?)<\/title>/i
              ) || [, ""]
            )[1]
              .replace(
                /<!\[CDATA\[|\]\]>/g,
                ""
              )
              .trim();


          const link =
            (
              item.match(
                /<link[^>]*>([\s\S]*?)<\/link>/i
              ) || [, ""]
            )[1]
              .trim();


          const tarih =
            (
              item.match(
                /<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i
              ) || [, ""]
            )[1]
              .trim();


          const aciklama =
            (
              item.match(
                /<description[^>]*>([\s\S]*?)<\/description>/i
              ) || [, ""]
            )[1]
              .replace(
                /<!\[CDATA\[|\]\]>/g,
                ""
              )
              .trim();


          if (
            baslik &&
            link
          ) {

            haberler.push({

              baslik,

              url:
                link,

              kaynak:
                "Anadolu Ajansı",

              tarih,

              ozet:
                aciklama

            });

          }

        }


        const sonHaberler =
          haberler.slice(0, 5);


        return Response.json({

          success:
            true,

          kaynak:
            "Anadolu Ajansı RSS",

          toplam:
            sonHaberler.length,

          haberler:
            sonHaberler

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {
          status: 500
        });

      }

    }
        // =========================================================
    // ADMIN SECRET TEST
    // =========================================================

    if (
      url.pathname === "/api/admin-test" &&
      request.method === "GET"
    ) {

      return Response.json({

        success: true,

        admin_password_var:
          !!env.ADMIN_PASSWORD

      });

    }


    // =========================================================
    // YÖNETİM PANELİ GÜVENLİĞİ
    // =========================================================

    const ADMIN_COOKIE =
      "dg_admin_auth";


    function cookieOku(
      request,
      isim
    ) {

      const cookie =
        request.headers.get("Cookie") || "";


      const parcalar =
        cookie.split(";");


      for (
        const parca of parcalar
      ) {

        const [
          anahtar,
          ...deger
        ] =
          parca
            .trim()
            .split("=");


        if (
          anahtar === isim
        ) {

          return decodeURIComponent(
            deger.join("=")
          );

        }

      }


      return null;

    }

// =========================================================
// ADMIN PANELİ KORUMASI
// /pages/admin.html
// =========================================================

if (
  url.pathname === "/pages/admin.html" &&
  request.method === "GET"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.redirect(
      new URL(
        "/admin-giris",
        request.url
      ),
      302
    );

  }

}
    // =========================================================
    // YÖNETİM GİRİŞ SAYFASI
    // =========================================================

    if (
      url.pathname === "/admin-giris" &&
      request.method === "GET"
    ) {

      return new Response(`

<!DOCTYPE html>
<html lang="tr">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>
Digital Gündem | Yönetim Girişi
</title>

<style>

body{
    margin:0;
    background:#111827;
    font-family:Arial,sans-serif;
    display:flex;
    align-items:center;
    justify-content:center;
    min-height:100vh;
}

.kutu{
    width:90%;
    max-width:400px;
    background:white;
    padding:30px;
    border-radius:15px;
    box-shadow:0 10px 40px rgba(0,0,0,.3);
}

h1{
    margin-top:0;
    color:#d60000;
}

input{
    width:100%;
    padding:13px;
    box-sizing:border-box;
    border:1px solid #ddd;
    border-radius:8px;
    margin:10px 0;
    font-size:16px;
}

button{
    width:100%;
    padding:13px;
    background:#d60000;
    color:white;
    border:0;
    border-radius:8px;
    font-weight:bold;
    font-size:16px;
    cursor:pointer;
}

.hata{
    color:#b00000;
    margin-bottom:10px;
}

</style>

</head>

<body>

<div class="kutu">

<h1>
🔐 Digital Gündem
</h1>

<p>
Yönetim paneline giriş
</p>

<form
method="POST"
action="/admin-giris"
>

<input
type="password"
name="password"
placeholder="Yönetim şifresi"
autocomplete="current-password"
required
>

<button type="submit">
Giriş Yap
</button>

</form>

</div>

</body>

</html>

`, {

        headers: {
          "Content-Type":
            "text/html; charset=UTF-8"
        }

      });

    }


    // =========================================================
    // YÖNETİM GİRİŞ KONTROLÜ
    // =========================================================

    if (
      url.pathname === "/admin-giris" &&
      request.method === "POST"
    ) {

      try {

        const form =
          await request.formData();


        const password =
          String(
            form.get("password") || ""
          );


        if (
          !env.ADMIN_PASSWORD ||
          password !== env.ADMIN_PASSWORD
        ) {

          return new Response(`

<!DOCTYPE html>
<html lang="tr">

<head>

<meta charset="UTF-8">

<meta name="viewport"
content="width=device-width,initial-scale=1">

<title>
Hatalı Şifre
</title>

<style>

body{
    font-family:Arial;
    background:#111827;
    color:white;
    text-align:center;
    padding-top:100px;
}

a{
    color:white;
    background:#d60000;
    padding:12px 20px;
    border-radius:7px;
    text-decoration:none;
}

</style>

</head>

<body>

<h2>
❌ Şifre hatalı
</h2>

<p>
Yönetim şifresi doğru değil.
</p>

<a href="/admin-giris">
Tekrar Dene
</a>

</body>

</html>

`, {

            status:401,

            headers:{
              "Content-Type":
                "text/html; charset=UTF-8"
            }

          });

        }


        return new Response(
          null,
          {

            status:302,

            headers:{

              "Location":
                "/pages/admin.html",

              "Set-Cookie":
                `${ADMIN_COOKIE}=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`

            }

          }
        );


      } catch (error) {

        return new Response(
          "Giriş işlemi sırasında hata oluştu.",
          {
            status:500
          }
        );

      }

    }


    // =========================================================
    // ADMIN API GÜVENLİĞİ
    // GET AÇIK
    // POST / PUT / DELETE SADECE ADMIN
    // =========================================================

    if (
      url.pathname.startsWith("/api/") &&
      [
        "POST",
        "PUT",
        "DELETE"
      ].includes(request.method)
    ) {

      const auth =
        cookieOku(
          request,
          ADMIN_COOKIE
        );


      if (
        auth !== "ok"
      ) {

        return Response.json({

          success:false,

          error:
            "Yetkisiz erişim. Yönetici girişi gerekli."

        }, {

          status:401

        });

      }

    }


    // =========================================================
    // ÖZEL REKLAMLAR
    // TÜM AKTİ    // =========================================================
    // TÜM YAYINDAKİ HABERLER
    // GET /api/haberler
    // =========================================================

    if (
      url.pathname === "/api/haberler" &&
      request.method === "GET"
    ) {

      try {

        const result =
          await env.DB
            .prepare(`
              SELECT *
              FROM haberler
              WHERE durum = 'yayinda'
              ORDER BY id DESC
            `)
            .all();


        return Response.json({

          success: true,

          toplam:
            result.results.length,

          haberler:
            result.results

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }

    }


    // =========================================================
    // TEK HABER
    // GET /api/haber?id=4
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "GET"
    ) {

      try {

        const id =
          url.searchParams.get("id");


        if (!id) {

          return Response.json({

            success: false,

            error:
              "Haber ID belirtilmedi."

          }, {

            status: 400

          });

        }


        const haber =
          await env.DB
            .prepare(`
              SELECT *
              FROM haberler
              WHERE id = ?
              AND durum = 'yayinda'
              LIMIT 1
            `)
            .bind(id)
            .first();


        if (!haber) {

          return Response.json({

            success: false,

            error:
              "Haber bulunamadı."

          }, {

            status: 404

          });

        }


        // =====================================================
        // OKUNMA SAYISINI +1 ARTIR
        // =====================================================

        await env.DB
          .prepare(`
            UPDATE haberler
            SET okunma =
              COALESCE(okunma, 0) + 1
            WHERE id = ?
          `)
          .bind(id)
          .run();


        haber.okunma =
          (haber.okunma || 0) + 1;


        return Response.json({

          success: true,

          haber

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }

    }


    // =========================================================
    // HABER EKLE
    // POST /api/haber
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        const baslik =
          String(
            data.baslik || ""
          ).trim();


        const ozet =
          String(
            data.ozet || ""
          ).trim();


        const icerik =
          String(
            data.icerik || ""
          ).trim();


        const kategori =
          String(
            data.kategori ||
            "Gündem"
          ).trim();


        const resim =
          String(
            data.resim || ""
          ).trim();


        const tarih =
          String(
            data.tarih ||
            new Date()
              .toLocaleDateString(
                "tr-TR"
              )
          ).trim();


        const durum =
          String(
            data.durum ||
            "yayinda"
          ).trim();


        const manset =
          data.manset
            ? 1
            : 0;


        if (!baslik) {

          return Response.json({

            success: false,

            error:
              "Haber başlığı boş olamaz."

          }, {

            status: 400

          });

        }


        const result =
          await env.DB
            .prepare(`
              INSERT INTO haberler
              (
                baslik,
                ozet,
                icerik,
                kategori,
                resim,
                tarih,
                durum,
                manset,
                okunma
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              baslik,
              ozet,
              icerik,
              kategori,
              resim,
              tarih,
              durum,
              manset,
              0
            )
            .run();


        return Response.json({

          success: true,

          message:
            "Haber başarıyla kaydedildi.",

          id:
            result.meta.last_row_id

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }

    }


    // =========================================================
    // HABER DÜZENLE
    // PUT /api/haber?id=4
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "PUT"
    ) {

      try {

        const id =
          url.searchParams.get("id");


        if (!id) {

          return Response.json({

            success: false,

            error:
              "Haber ID belirtilmedi."

          }, {

            status: 400

          });

        }


        const data =
          await request.json();


        const baslik =
          String(
            data.baslik || ""
          ).trim();


        const ozet =
          String(
            data.ozet || ""
          ).trim();


        const icerik =
          String(
            data.icerik || ""
          ).trim();


        const kategori =
          String(
            data.kategori ||
            "Gündem"
          ).trim();


        const resim =
          String(
            data.resim || ""
          ).trim();


        const tarih =
          String(
            data.tarih || ""
          ).trim();


        const durum =
          String(
            data.durum ||
            "yayinda"
          ).trim();


        const manset =
          data.manset
            ? 1
            : 0;


        if (!baslik) {

          return Response.json({

            success: false,

            error:
              "Haber başlığı boş olamaz."

          }, {

            status: 400

          });

        }


        const result =
          await env.DB
            .prepare(`
              UPDATE haberler
              SET
                baslik = ?,
                ozet = ?,
                icerik = ?,
                kategori = ?,
                resim = ?,
                tarih = ?,
                durum = ?,
                manset = ?
              WHERE id = ?
            `)
            .bind(
              baslik,
              ozet,
              icerik,
              kategori,
              resim,
              tarih,
              durum,
              manset,
              id
            )
            .run();


        if (
          result.meta.changes === 0
        ) {

          return Response.json({

            success: false,

            error:
              "Haber bulunamadı veya değişiklik yapılmadı."

          }, {

            status: 404

          });

        }


        return Response.json({

          success: true,

          message:
            "Haber başarıyla güncellendi.",

          id,

          changes:
            result.meta.changes

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }

    }


    // =========================================================
    // HABER SİL
    // DELETE /api/haber?id=4
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "DELETE"
    ) {

      try {

        const id =
          url.searchParams.get("id");


        if (!id) {

          return Response.json({

            success: false,

            error:
              "Haber ID belirtilmedi."

          }, {

            status: 400

          });

        }


        const result =
          await env.DB
            .prepare(`
              DELETE FROM haberler
              WHERE id = ?
            `)
            .bind(id)
            .run();


        if (
          result.meta.changes === 0
        ) {

          return Response.json({

            success: false,

            error:
              "Silinecek haber bulunamadı."

          }, {

            status: 404

          });

        }


        return Response.json({

          success: true,

          message:
            "Haber başarıyla silindi.",

          id

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }

    }


    // =========================================================
    // HABER İSTATİSTİKLERİ
    // SADECE YÖNETİCİ
    // GET /api/haber-istatistik
    // =========================================================

    if (
      url.pathname === "/api/haber-istatistik" &&
      request.method === "GET"
    ) {

      const auth =
        cookieOku(
          request,
          ADMIN_COOKIE
        );


      if (
        auth !== "ok"
      ) {

        return Response.json({

          success: false,

          error:
            "Yetkisiz erişim."

        }, {

          status: 401

        });

      }


      try {

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                baslik,
                kategori,
                tarih,
                okunma,
                durum,
                manset
              FROM haberler
              ORDER BY
                okunma DESC,
                id DESC
            `)
            .all();


        const toplam =
          result.results.reduce(
            (
              toplam,
              haber
            ) =>
              toplam +
              (
                Number(
                  haber.okunma
                ) || 0
              ),
            0
          );


        return Response.json({

          success: true,

          toplam_okunma:
            toplam,

          toplam_haber:
            result.results.length,

          haberler:
            result.results

        });


      } catch (error) {

        return Response.json({

          success: false,

          error:
            error.message

        }, {

          status: 500

        });

      }
    }
// =========================================================
// FİRMA SİSTEMİ
// =========================================================

// ---------------------------------------------------------
// TÜM YAYINDAKİ FİRMALAR
// GET /api/firmalar
// ---------------------------------------------------------

if (
  url.pathname === "/api/firmalar" &&
  request.method === "GET"
) {

  try {

    const result =
      await env.DB
        .prepare(`
          SELECT *
          FROM firmalar
          WHERE durum = 'yayinda'
          ORDER BY id DESC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      firmalar:
        result.results

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// TEK FİRMA
// GET /api/firma?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Firma ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const firma =
      await env.DB
        .prepare(`
          SELECT *
          FROM firmalar
          WHERE id = ?
          AND durum = 'yayinda'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!firma) {

      return Response.json({

        success: false,

        error:
          "Firma bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      firma

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// FİRMA EKLE
// POST /api/firma
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();


    const firma_adi =
      String(
        data.firma_adi || ""
      ).trim();


    const kategori =
      String(
        data.kategori || "Diğer"
      ).trim();


    const il =
      String(
        data.il || ""
      ).trim();


    const ilce =
      String(
        data.ilce || ""
      ).trim();


    const mahalle =
      String(
        data.mahalle || ""
      ).trim();


    const adres =
      String(
        data.adres || ""
      ).trim();


    const telefon =
      String(
        data.telefon || ""
      ).trim();


    const whatsapp =
      String(
        data.whatsapp || ""
      ).trim();


    const email =
      String(
        data.email || ""
      ).trim();


    const website =
      String(
        data.website || ""
      ).trim();


    const aciklama =
      String(
        data.aciklama || ""
      ).trim();


    const logo =
      String(
        data.logo || ""
      ).trim();


    const durum =
      String(
        data.durum || "yayinda"
      ).trim();


    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString(
          "tr-TR"
        )
      ).trim();


    if (!firma_adi) {

      return Response.json({

        success: false,

        error:
          "Firma adı boş olamaz."

      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          INSERT INTO firmalar
          (
            firma_adi,
            kategori,
            il,
            ilce,
            mahalle,
            adres,
            telefon,
            whatsapp,
            email,
            website,
            aciklama,
            logo,
            durum,
            tarih
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          firma_adi,
          kategori,
          il,
          ilce,
          mahalle,
          adres,
          telefon,
          whatsapp,
          email,
          website,
          aciklama,
          logo,
          durum,
          tarih
        )
        .run();


    return Response.json({

      success: true,

      message:
        "Firma başarıyla kaydedildi.",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// FİRMA DÜZENLE
// PUT /api/firma?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");


    if (!id) {

      return Response.json({

        success: false,

        error:
          "Firma ID belirtilmedi."

      }, {
        status: 400
      });

    }


    const data =
      await request.json();


    const firma_adi =
      String(
        data.firma_adi || ""
      ).trim();


    const kategori =
      String(
        data.kategori || "Diğer"
      ).trim();


    const il =
      String(
        data.il || ""
      ).trim();


    const ilce =
      String(
        data.ilce || ""
      ).trim();


    const mahalle =
      String(
        data.mahalle || ""
      ).trim();


    const adres =
      String(
        data.adres || ""
      ).trim();


    const telefon =
      String(
        data.telefon || ""
      ).trim();


    const whatsapp =
      String(
        data.whatsapp || ""
      ).trim();


    const email =
      String(
        data.email || ""
      ).trim();


    const website =
      String(
        data.website || ""
      ).trim();


    const aciklama =
      String(
        data.aciklama || ""
      ).trim();


    const logo =
      String(
        data.logo || ""
      ).trim();


    const durum =
      String(
        data.durum || "yayinda"
      ).trim();


    const tarih =
      String(
        data.tarih || ""
      ).trim();


    if (!firma_adi) {

      return Response.json({

        success: false,

        error:
          "Firma adı boş olamaz."

      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          UPDATE firmalar
          SET
            firma_adi = ?,
            kategori = ?,
            il = ?,
            ilce = ?,
            mahalle = ?,
            adres = ?,
            telefon = ?,
            whatsapp = ?,
            email = ?,
            website = ?,
            aciklama = ?,
            logo = ?,
            durum = ?,
            tarih = ?
          WHERE id = ?
        `)
        .bind(
          firma_adi,
          kategori,
          il,
          ilce,
          mahalle,
          adres,
          telefon,
          whatsapp,
          email,
          website,
          aciklama,
          logo,
          durum,
          tarih,
          id
        )
        .run();


    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Firma bulunamadı veya değişiklik yapılmadı."

      }, {
        status: 404
      });

    }


    return Response.json({

      success: true,

      message:
        "Firma başarıyla güncellendi.",

      id,

      changes:
        result.meta.changes

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// FİRMA SİL
// DELETE /api/firma?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "DELETE"
) {

  try {

    const id =
      url.searchParams.get("id");


    if (!id) {

      return Response.json({

        success: false,

        error:
          "Firma ID belirtilmedi."

      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          DELETE FROM firmalar
          WHERE id = ?
        `)
        .bind(id)
        .run();


    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Silinecek firma bulunamadı."

      }, {
        status: 404
      });

    }


    return Response.json({

      success: true,

      message:
        "Firma başarıyla silindi.",

      id

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }
  
  }
   // =========================================================
// 🎥 VİDEO HABERLER API
// =========================================================

// ---------------------------------------------------------
// TÜM YAYINDAKİ VİDEOLAR
// GET /api/videolar
// ---------------------------------------------------------

if (
  url.pathname === "/api/videolar" &&
  request.method === "GET"
) {

  try {

    const result = await env.DB
      .prepare(`
        SELECT *
        FROM video_haberler
        WHERE durum = 'yayinda'
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      videolar: result.results
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// TEK VİDEO
// GET /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const video =
      await env.DB
        .prepare(`
          SELECT *
          FROM video_haberler
          WHERE id = ?
          AND durum = 'yayinda'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!video) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }

    await env.DB
      .prepare(`
        UPDATE video_haberler
        SET izlenme =
          COALESCE(izlenme, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    video.izlenme =
      (Number(video.izlenme) || 0) + 1;

    return Response.json({
      success: true,
      video
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO EKLE
// POST /api/video
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const baslik =
      String(
        data.baslik || ""
      ).trim();

    const ozet =
      String(
        data.ozet ||
        data.aciklama ||
        ""
      ).trim();

    const video_url =
      String(
        data.video_url ||
        data.videoUrl ||
        ""
      ).trim();

    const kapak_resmi =
      String(
        data.kapak_resmi ||
        data.resim ||
        ""
      ).trim();

    const kategori =
      String(
        data.kategori ||
        "Gündem"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString(
          "tr-TR"
        )
      ).trim();

    const durum =
      String(
        data.durum ||
        "yayinda"
      ).trim();

    const manset =
      data.manset ? 1 : 0;


    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }


    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          INSERT INTO video_haberler
          (
            baslik,
            ozet,
            video_url,
            kapak_resmi,
            kategori,
            tarih,
            durum,
            manset,
            izlenme
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          0
        )
        .run();


    return Response.json({

      success: true,

      message:
        "Video haber başarıyla kaydedildi.",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO DÜZENLE
// PUT /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const baslik =
      String(
        data.baslik || ""
      ).trim();

    const ozet =
      String(
        data.ozet ||
        data.aciklama ||
        ""
      ).trim();

    const video_url =
      String(
        data.video_url ||
        data.videoUrl ||
        ""
      ).trim();

    const kapak_resmi =
      String(
        data.kapak_resmi ||
        data.resim ||
        ""
      ).trim();

    const kategori =
      String(
        data.kategori ||
        "Gündem"
      ).trim();

    const tarih =
      String(
        data.tarih || ""
      ).trim();

    const durum =
      String(
        data.durum ||
        "yayinda"
      ).trim();

    const manset =
      data.manset ? 1 : 0;


    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }


    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          UPDATE video_haberler
          SET
            baslik = ?,
            ozet = ?,
            video_url = ?,
            kapak_resmi = ?,
            kategori = ?,
            tarih = ?,
            durum = ?,
            manset = ?
          WHERE id = ?
        `)
        .bind(
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          id
        )
        .run();


    if (
      result.meta.changes === 0
    ) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }


    return Response.json({

      success: true,

      message:
        "Video başarıyla güncellendi.",

      id

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO SİL
// DELETE /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "DELETE"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }


    const result =
      await env.DB
        .prepare(`
          DELETE FROM video_haberler
          WHERE id = ?
        `)
        .bind(id)
        .run();


    if (
      result.meta.changes === 0
    ) {

      return Response.json({
        success: false,
        error: "Silinecek video bulunamadı."
      }, {
        status: 404
      });

    }


    return Response.json({

      success: true,

      message:
        "Video başarıyla silindi.",

      id

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO İSTATİSTİKLERİ
// GET /api/video-istatistik
// ---------------------------------------------------------

if (
  url.pathname === "/api/video-istatistik" &&
  request.method === "GET"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({
      success: false,
      error: "Yetkisiz erişim."
    }, {
      status: 401
    });

  }


  try {

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            baslik,
            kategori,
            tarih,
            durum,
            manset,
            izlenme
          FROM video_haberler
          ORDER BY
            izlenme DESC,
            id DESC
        `)
        .all();


    const toplam =
      result.results.reduce(
        (sum, video) =>
          sum +
          (Number(video.izlenme) || 0),
        0
      );


    return Response.json({

      success: true,

      toplam_izlenme:
        toplam,

      toplam_video:
        result.results.length,

      videolar:
        result.results

    });

  } catch (error) {

    return Response.json({

      success: false,

      error:
        error.message

    }, {
      status: 500
    });

  }

} 

// ---------------------------------------------------------
// TEK VİDEO
// GET /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "GET"
) {

  try {

    const id = url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const video = await env.DB
      .prepare(`
        SELECT *
        FROM video_haberler
        WHERE id = ?
        AND durum = 'yayinda'
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!video) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }

    // İzlenme +1
    await env.DB
      .prepare(`
        UPDATE video_haberler
        SET izlenme = COALESCE(izlenme, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    video.izlenme =
      (Number(video.izlenme) || 0) + 1;

    return Response.json({
      success: true,
      video
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO EKLE
// POST /api/video
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "POST"
) {

  try {

    const data = await request.json();

    const baslik =
      String(data.baslik || "").trim();

    const aciklama =
      String(data.aciklama || "").trim();

    const video_url =
      String(
        data.video_url ||
        data.videoUrl ||
        ""
      ).trim();

    const resim =
      String(data.resim || "").trim();

    const kategori =
      String(
        data.kategori ||
        "Video Haber"
      ).trim();

    const durum =
      String(
        data.durum ||
        "yayinda"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString("tr-TR")
      ).trim();

    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }

    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }

    const result = await env.DB
      .prepare(`
        INSERT INTO video_haberler
        (
          baslik,
          aciklama,
          video_url,
          resim,
          kategori,
          tarih,
          durum,
          izlenme
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        baslik,
        aciklama,
        video_url,
        resim,
        kategori,
        tarih,
        durum,
        0
      )
      .run();

    return Response.json({
      success: true,
      message: "Video haber başarıyla kaydedildi.",
      id: result.meta.last_row_id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO DÜZENLE
// PUT /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "PUT"
) {

  try {

    const id = url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const data = await request.json();

    const baslik =
      String(data.baslik || "").trim();

    const aciklama =
      String(data.aciklama || "").trim();

    const video_url =
      String(
        data.video_url ||
        data.videoUrl ||
        ""
      ).trim();

    const resim =
      String(data.resim || "").trim();

    const kategori =
      String(
        data.kategori ||
        "Video Haber"
      ).trim();

    const durum =
      String(
        data.durum ||
        "yayinda"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        ""
      ).trim();

    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }

    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }

    const result = await env.DB
      .prepare(`
        UPDATE video_haberler
        SET
          baslik = ?,
          aciklama = ?,
          video_url = ?,
          resim = ?,
          kategori = ?,
          tarih = ?,
          durum = ?
        WHERE id = ?
      `)
      .bind(
        baslik,
        aciklama,
        video_url,
        resim,
        kategori,
        tarih,
        durum,
        id
      )
      .run();

    if (result.meta.changes === 0) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }

    return Response.json({
      success: true,
      message: "Video başarıyla güncellendi.",
      id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO SİL
// DELETE /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "DELETE"
) 
{
// =========================================================
// 🎥 VİDEO HABERLER API
// =========================================================

// ---------------------------------------------------------
// TÜM YAYINDAKİ VİDEOLAR
// GET /api/videolar
// ---------------------------------------------------------

if (
  url.pathname === "/api/videolar" &&
  request.method === "GET"
) {

  try {

    const result = await env.DB
      .prepare(`
        SELECT *
        FROM video_haberler
        WHERE durum = 'yayinda'
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      videolar: result.results
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// TEK VİDEO
// GET /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const video =
      await env.DB
        .prepare(`
          SELECT *
          FROM video_haberler
          WHERE id = ?
          AND durum = 'yayinda'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!video) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }

    await env.DB
      .prepare(`
        UPDATE video_haberler
        SET izlenme = COALESCE(izlenme, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    video.izlenme =
      (Number(video.izlenme) || 0) + 1;

    return Response.json({
      success: true,
      video
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO EKLE
// POST /api/video
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const baslik =
      String(data.baslik || "").trim();

    const ozet =
      String(data.ozet || "").trim();

    const video_url =
      String(data.video_url || "").trim();

    const kapak_resmi =
      String(data.kapak_resmi || "").trim();

    const kategori =
      String(
        data.kategori || "Video Haber"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString("tr-TR")
      ).trim();

    const durum =
      String(
        data.durum || "yayinda"
      ).trim();

    const manset =
      data.manset ? 1 : 0;

    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }

    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          INSERT INTO video_haberler
          (
            baslik,
            ozet,
            video_url,
            kapak_resmi,
            kategori,
            tarih,
            durum,
            manset,
            izlenme
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          0
        )
        .run();

    return Response.json({
      success: true,
      message: "Video haber başarıyla kaydedildi.",
      id: result.meta.last_row_id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO DÜZENLE
// PUT /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const baslik =
      String(data.baslik || "").trim();

    const ozet =
      String(data.ozet || "").trim();

    const video_url =
      String(data.video_url || "").trim();

    const kapak_resmi =
      String(data.kapak_resmi || "").trim();

    const kategori =
      String(
        data.kategori || "Video Haber"
      ).trim();

    const tarih =
      String(data.tarih || "").trim();

    const durum =
      String(
        data.durum || "yayinda"
      ).trim();

    const manset =
      data.manset ? 1 : 0;

    if (!baslik) {

      return Response.json({
        success: false,
        error: "Video başlığı boş olamaz."
      }, {
        status: 400
      });

    }

    if (!video_url) {

      return Response.json({
        success: false,
        error: "Video bağlantısı boş olamaz."
      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE video_haberler
          SET
            baslik = ?,
            ozet = ?,
            video_url = ?,
            kapak_resmi = ?,
            kategori = ?,
            tarih = ?,
            durum = ?,
            manset = ?
          WHERE id = ?
        `)
        .bind(
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          id
        )
        .run();

    if (result.meta.changes === 0) {

      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, {
        status: 404
      });

    }

    return Response.json({
      success: true,
      message: "Video başarıyla güncellendi.",
      id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO SİL
// DELETE /api/video?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/video" &&
  request.method === "DELETE"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          DELETE FROM video_haberler
          WHERE id = ?
        `)
        .bind(id)
        .run();

    if (result.meta.changes === 0) {

      return Response.json({
        success: false,
        error: "Silinecek video bulunamadı."
      }, {
        status: 404
      });

    }

    return Response.json({
      success: true,
      message: "Video başarıyla silindi.",
      id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO İSTATİSTİKLERİ
// GET /api/video-istatistik
// ---------------------------------------------------------

if (
  url.pathname === "/api/video-istatistik" &&
  request.method === "GET"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({
      success: false,
      error: "Yetkisiz erişim."
    }, {
      status: 401
    });

  }

  try {

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            baslik,
            kategori,
            tarih,
            durum,
            manset,
            izlenme
          FROM video_haberler
          ORDER BY
            izlenme DESC,
            id DESC
        `)
        .all();

    const toplam =
      result.results.reduce(
        (sum, video) =>
          sum +
          (Number(video.izlenme) || 0),
        0
      );

    return Response.json({

      success: true,

      toplam_izlenme:
        toplam,

      toplam_video:
        result.results.length,

      videolar:
        result.results

    });

  } catch (error) {

    return Response.json({

      success: false,

      error: error.message

    }, {
      status: 500
    });

  }

}
  try {

    const id = url.searchParams.get("id");

    if (!id) {

      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, {
        status: 400
      });

    }

    const result = await env.DB
      .prepare(`
        DELETE FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (result.meta.changes === 0) {

      return Response.json({
        success: false,
        error: "Silinecek video bulunamadı."
      }, {
        status: 404
      });

    }

    return Response.json({
      success: true,
      message: "Video başarıyla silindi.",
      id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });

  }

}


// ---------------------------------------------------------
// VİDEO İSTATİSTİKLERİ
// GET /api/video-istatistik
// ---------------------------------------------------------

if (
  url.pathname === "/api/video-istatistik" &&
  request.method === "GET"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({
      success: false,
      error: "Yetkisiz erişim."
    }, {
      status: 401
    });

  }

  try {

    const result = await env.DB
      .prepare(`
        SELECT
          id,
          baslik,
          kategori,
          tarih,
          durum,
          izlenme
        FROM video_haberler
        ORDER BY
          izlenme DESC,
          id DESC
      `)
      .all();

    const toplam =
      result.results.reduce(
        (sum, video) =>
          sum +
          (Number(video.izlenme) || 0),
        0
      );

    return Response.json({

      success: true,

      toplam_izlenme:
        toplam,

      toplam_video:
        result.results.length,

      videolar:
        result.results

    });

  } catch (error) {

    return Response.json({

      success: false,

      error: error.message

    }, {
      status: 500
    });

  }

}      
    }    // =========================================================
    // ESKİ HABER ADRESLERİ
    // =========================================================
    //
    // Eski:
    // /haber.html?id=4
    //
    // Yeni:
    // /pages/haber.html?id=4
    //
    // Böylece eski bağlantılar da çalışmaya devam eder.
    // =========================================================

    if (
      url.pathname === "/haber.html" ||
      url.pathname === "/pages/haber.html"
    ) {

      const yeniUrl =
        new URL(request.url);


      yeniUrl.pathname =
        "/pages/haber.html";


      return env.ASSETS.fetch(
        new Request(
          yeniUrl.toString(),
          request
        )
      );

    }

// =========================================================
// ADMIN ÇIKIŞ
// =========================================================

if (
  url.pathname === "/admin-cikis" &&
  request.method === "GET"
) {

  return new Response(
    null,
    {
      status: 302,

      headers: {
        "Location": "/admin-giris",

        "Set-Cookie":
          "dg_admin_auth=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0"
      }
    }
  );

}


// =========================================================
// WEB SİTESİ
// =========================================================
//
// API olmayan tüm normal istekleri
// Cloudflare Pages dosyalarına gönderir.
//
// index.html
// pages/
// style.css
// admin.js
// resimler
// vb.
// =========================================================

return env.ASSETS.fetch(
  request
);

  }

};
    
