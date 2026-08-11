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
    // Ana sayfa + önemli sayfalar + D1 haberleri
    // =========================================================

    if (
      url.pathname === "/sitemap.xml" &&
      request.method === "GET"
    ) {

      try {

        const urls = [];

        // -----------------------------------------------------
        // ANA SAYFA
        // -----------------------------------------------------

        urls.push(`
  <url>
    <loc>https://www.digitalgundem.com.tr/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);


        // -----------------------------------------------------
        // SABİT SAYFALAR
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // D1 HABERLERİNİ SITEMAP'E EKLE
        // -----------------------------------------------------

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


        // -----------------------------------------------------
        // XML OLUŞTUR
        // -----------------------------------------------------

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
    // ZİYARETÇİ İSTATİSTİKLERİ
    // =========================================================

    // =========================================================
    // ZİYARETÇİ KAYDI
    // =========================================================

    if (
      request.method === "GET" &&
      !url.pathname.startsWith("/api/") &&
      !url.pathname.startsWith("/admin-giris")
    ) {

      try {

        const tarih =
          new Date()
            .toLocaleDateString("tr-TR");

        const ip =
          request.headers.get(
            "CF-Connecting-IP"
          ) || "";

        const userAgent =
          request.headers.get(
            "User-Agent"
          ) || "";


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
          new Date()
            .toLocaleDateString("tr-TR");


        const toplam =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS toplam
              FROM ziyaretler
            `)
            .first();


        const bugunku =
          await env.DB
            .prepare(`
              SELECT COUNT(*) AS toplam
              FROM ziyaretler
              WHERE tarih = ?
            `)
            .bind(bugun)
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
          error: error.message
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
          error: error.message
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

          success:
            false,

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

        success:
          true,

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
        request.headers.get(
          "Cookie"
        ) || "";


      const parcalar =
        cookie.split(";");


      for (
        const parca
        of parcalar
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

          status:
            401,

          headers: {
            "Content-Type":
              "text/html; charset=UTF-8"
          }

        });

      }


      return new Response(
        null,
        {

          status:
            302,

          headers: {

            "Location":
              "/pages/admin.html",

            "Set-Cookie":
              `${ADMIN_COOKIE}=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`

          }

        }
      );

    }


    // =========================================================
    // ADMIN API KONTROLÜ
    // GET İŞLEMLERİ AÇIK
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

          success:
            false,

          error:
            "Yetkisiz erişim. Yönetici girişi gerekli."

        }, {
          status:
            401
        });

      }

    }


    // =========================================================
    // ÖZEL REKLAMLAR
    // =========================================================

    // TÜM AKTİF REKLAMLAR

    if (
      url.pathname === "/api/reklamlar" &&
      request.method === "GET"
    ) {

      try {

        const result =
          await env.DB
            .prepare(`
              SELECT *
              FROM reklamlar
              WHERE durum = 'aktif'
              ORDER BY id DESC
            `)
            .all();


        return Response.json({

          success:
            true,

          toplam:
            result.results.length,

          reklamlar:
            result.results

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // TEK REKLAM

    if (
      url.pathname === "/api/reklam" &&
      request.method === "GET"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Reklam ID belirtilmedi."

          }, {
            status:
              400
          });

        }


        const reklam =
          await env.DB
            .prepare(`
              SELECT *
              FROM reklamlar
              WHERE id = ?
              LIMIT 1
            `)
            .bind(id)
            .first();


        if (!reklam) {

          return Response.json({

            success:
              false,

            error:
              "Reklam bulunamadı."

          }, {
            status:
              404
          });

        }


        return Response.json({

          success:
            true,

          reklam

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // REKLAM EKLE

    if (
      url.pathname === "/api/reklam" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        const firma_adi =
          data.firma_adi || "";

        const resim =
          data.resim || "";

        const link =
          data.link || "";

        const konum =
          data.konum ||
          "anasayfa";

        const baslangic =
          data.baslangic || "";

        const bitis =
          data.bitis || "";

        const durum =
          data.durum ||
          "aktif";


        if (
          !firma_adi.trim()
        ) {

          return Response.json({

            success:
              false,

            error:
              "Firma / reklamveren adı boş olamaz."

          }, {
            status:
              400
          });

        }


        if (
          !baslangic ||
          !bitis
        ) {

          return Response.json({

            success:
              false,

            error:
              "Başlangıç ve bitiş tarihi gereklidir."

          }, {
            status:
              400
          });

        }


        const result =
          await env.DB
            .prepare(`
              INSERT INTO reklamlar
              (
                firma_adi,
                resim,
                link,
                konum,
                baslangic,
                bitis,
                durum
              )
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              firma_adi,
              resim,
              link,
              konum,
              baslangic,
              bitis,
              durum
            )
            .run();


        return Response.json({

          success:
            true,

          message:
            "Özel reklam başarıyla eklendi.",

          id:
            result.meta.last_row_id

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // REKLAM DÜZENLE

    if (
      url.pathname === "/api/reklam" &&
      request.method === "PUT"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Reklam ID belirtilmedi."

          }, {
            status:
              400
          });

        }


        const data =
          await request.json();


        const firma_adi =
          data.firma_adi || "";

        const resim =
          data.resim || "";

        const link =
          data.link || "";

        const konum =
          data.konum ||
          "anasayfa";

        const baslangic =
          data.baslangic || "";

        const bitis =
          data.bitis || "";

        const durum =
          data.durum ||
          "aktif";


        if (
          !firma_adi.trim()
        ) {

          return Response.json({

            success:
              false,

            error:
              "Firma / reklamveren adı boş olamaz."

          }, {
            status:
              400
          });

        }


        const result =
          await env.DB
            .prepare(`
              UPDATE reklamlar
              SET
                firma_adi = ?,
                resim = ?,
                link = ?,
                konum = ?,
                baslangic = ?,
                bitis = ?,
                durum = ?
              WHERE id = ?
            `)
            .bind(
              firma_adi,
              resim,
              link,
              konum,
              baslangic,
              bitis,
              durum,
              id
            )
            .run();


        return Response.json({

          success:
            true,

          message:
            "Özel reklam güncellendi.",

          id,

          changes:
            result.meta.changes

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // REKLAM SİL

    if (
      url.pathname === "/api/reklam" &&
      request.method === "DELETE"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Reklam ID belirtilmedi."

          }, {
            status:
              400
          });

        }


        const result =
          await env.DB
            .prepare(`
              DELETE FROM reklamlar
              WHERE id = ?
            `)
            .bind(id)
            .run();


        if (
          result.meta.changes === 0
        ) {

          return Response.json({

            success:
              false,

            error:
              "Silinecek reklam bulunamadı."

          }, {
            status:
              404
          });

        }


        return Response.json({

          success:
            true,

          message:
            "Özel reklam silindi.",

          id

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // D1 TEST
    // =========================================================

    if (
      url.pathname === "/api/test"
    ) {

      try {

        const result =
          await env.DB
            .prepare(
              "SELECT 1 AS test"
            )
            .first();


        return Response.json({

          success:
            true,

          database:
            "connected",

          result

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // TÜM YAYINDAKİ HABERLER
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

          success:
            true,

          toplam:
            result.results.length,

          haberler:
            result.results

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // TEK HABER
    // /api/haber?id=4
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "GET"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Haber ID belirtilmedi."

          }, {
            status:
              400
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

            success:
              false,

            error:
              "Haber bulunamadı."

          }, {
            status:
              404
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

          success:
            true,

          haber

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // HABER EKLE
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "POST"
    ) {

      try {

        const data =
          await request.json();


        const baslik =
          data.baslik || "";

        const ozet =
          data.ozet || "";

        const icerik =
          data.icerik || "";

        const kategori =
          data.kategori ||
          "Gündem";

        const resim =
          data.resim || "";

        const tarih =
          data.tarih ||
          new Date()
            .toLocaleDateString(
              "tr-TR"
            );

        const durum =
          data.durum ||
          "yayinda";

        const manset =
          data.manset
            ? 1
            : 0;


        if (
          !baslik.trim()
        ) {

          return Response.json({

            success:
              false,

            error:
              "Haber başlığı boş olamaz."

          }, {
            status:
              400
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
                manset
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(
              baslik,
              ozet,
              icerik,
              kategori,
              resim,
              tarih,
              durum,
              manset
            )
            .run();


        return Response.json({

          success:
            true,

          message:
            "Haber başarıyla kaydedildi.",

          id:
            result.meta.last_row_id

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // HABER DÜZENLE
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "PUT"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Haber ID belirtilmedi."

          }, {
            status:
              400
          });

        }


        const data =
          await request.json();


        const baslik =
          data.baslik || "";

        const ozet =
          data.ozet || "";

        const icerik =
          data.icerik || "";

        const kategori =
          data.kategori ||
          "Gündem";

        const resim =
          data.resim || "";

        const tarih =
          data.tarih || "";

        const durum =
          data.durum ||
          "yayinda";

        const manset =
          data.manset
            ? 1
            : 0;


        if (
          !baslik.trim()
        ) {

          return Response.json({

            success:
              false,

            error:
              "Haber başlığı boş olamaz."

          }, {
            status:
              400
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


        return Response.json({

          success:
            true,

          message:
            "Haber başarıyla güncellendi.",

          id,

          changes:
            result.meta.changes

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // HABER SİL
    // =========================================================

    if (
      url.pathname === "/api/haber" &&
      request.method === "DELETE"
    ) {

      try {

        const id =
          url.searchParams.get(
            "id"
          );


        if (!id) {

          return Response.json({

            success:
              false,

            error:
              "Haber ID belirtilmedi."

          }, {
            status:
              400
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

            success:
              false,

            error:
              "Silinecek haber bulunamadı."

          }, {
            status:
              404
            });

        }


        return Response.json({

          success:
            true,

          message:
            "Haber başarıyla silindi.",

          id

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // HABER İSTATİSTİKLERİ
    // SADECE YÖNETİCİ
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

          success:
            false,

          error:
            "Yetkisiz erişim."

        }, {
          status:
            401
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
                okunma
              FROM haberler
              ORDER BY okunma DESC, id DESC
            `)
            .all();


        const toplam =
          result.results.reduce(
            (
              toplam,
              haber
            ) =>
              toplam +
              (haber.okunma || 0),
            0
          );


        return Response.json({

          success:
            true,

          toplam_okunma:
            toplam,

          haberler:
            result.results

        });


      } catch (error) {

        return Response.json({

          success:
            false,

          error:
            error.message

        }, {
          status:
            500
        });

      }

    }


    // =========================================================
    // ESKİ HABER ADRESİ
    // /haber.html?id=4
    // /pages/haber.html?id=4
    // =========================================================

    if (
      url.pathname === "/haber.html" ||
      url.pathname === "/pages/haber.html"
    ) {

      const yeniUrl =
        new URL(
          request.url
        );


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
    // WEB SİTESİ
    // =========================================================

    return env.ASSETS.fetch(
      request
    );

  }
};
