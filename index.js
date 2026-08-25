export default {
  async fetch(request, env) {

    const url = new URL(request.url);

    // =========================================================
    // YARDIMCI FONKSİYONLAR
    // =========================================================

    const ADMIN_COOKIE = "dg_admin_auth";

    function cookieOku(request, isim) {
      const cookie = request.headers.get("Cookie") || "";
      const parcalar = cookie.split(";");

      for (const parca of parcalar) {
        const [anahtar, ...deger] = parca.trim().split("=");

        if (anahtar === isim) {
          try {
            return decodeURIComponent(deger.join("="));
          } catch {
            return deger.join("=");
          }
        }
      }

      return null;
    }

    function temizleHTML(metin = "") {
      return String(metin)
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/<[^>]*>/g, "")
        .trim();
    }

    function rssAlan(item, alan) {
      const regex = new RegExp(
        `<${alan}[^>]*>([\\s\\S]*?)<\\/${alan}>`,
        "i"
      );

      const eslesme = item.match(regex);

      return eslesme
        ? temizleHTML(eslesme[1])
        : "";
    }

    async function aaRSSGetir(rssUrl, kategori) {

      const cevap = await fetch(rssUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 Digital-Gundem/1.0"
        }
      });

      if (!cevap.ok) {
        throw new Error(
          `RSS kaynağı cevap vermedi. HTTP ${cevap.status}`
        );
      }

      const xml = await cevap.text();

      const items =
        xml.match(/<item[\s\S]*?<\/item>/gi) || [];

      const haberler = [];

      for (const item of items.slice(0, 20)) {

        const baslik =
          rssAlan(item, "title");

        const link =
          rssAlan(item, "link");

        const tarih =
          rssAlan(item, "pubDate");

        const ozet =
          rssAlan(item, "description");

        if (baslik && link) {

          haberler.push({
            baslik,
            ozet,
            url: link,
            kaynak: "Anadolu Ajansı",
            kategori,
            tarih
          });

        }
      }

      return haberler;
    }
    // =========================================================
// VIDEO HABERLER API - TAM CRUD
// =========================================================

if (
  url.pathname === "/api/videolar" &&
  request.method === "GET"
) {
  try {
    const limit = Math.min(
      Number(url.searchParams.get("limit") || 50),
      100
    );

    const offset = Math.max(
      Number(url.searchParams.get("offset") || 0),
      0
    );

    const durum = url.searchParams.get("durum");

    let sql = `
      SELECT
        id,
        baslik,
        ozet,
        video_url,
        kapak_resmi,
        kategori,
        tarih,
        durum,
        manset,
        izlenme,
        created_at
      FROM video_haberler
    `;

    const params = [];

    if (durum) {
      sql += ` WHERE durum = ? `;
      params.push(durum);
    }

    sql += `
      ORDER BY datetime(tarih) DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const result = await env.DB
      .prepare(sql)
      .bind(...params)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      videolar: result.results
    });

  } catch (error) {
    console.error("VIDEO LISTE HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// GET /api/video?id=
if (
  url.pathname === "/api/video" &&
  request.method === "GET"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const video = await env.DB
      .prepare(`
        SELECT
          id,
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          izlenme,
          created_at
        FROM video_haberler
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!video) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      video
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// POST /api/video
if (
  url.pathname === "/api/video" &&
  request.method === "POST"
) {
  try {
    const body = await request.json();

    const baslik = String(body.baslik || "").trim();
    const video_url = String(body.video_url || "").trim();
    const ozet = String(body.ozet || "").trim();
    const kapak_resmi = String(body.kapak_resmi || "").trim();
    const kategori = String(body.kategori || "Gündem").trim();
    const durum = body.durum === "taslak"
      ? "taslak"
      : "yayinda";
    const manset = body.manset ? 1 : 0;
    const tarih = body.tarih || new Date().toISOString();

    if (!baslik || !video_url) {
      return Response.json({
        success: false,
        error: "Başlık ve video URL zorunludur."
      }, { status: 400 });
    }

    const result = await env.DB
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `)
      .bind(
        baslik,
        ozet,
        video_url,
        kapak_resmi,
        kategori,
        tarih,
        durum,
        manset
      )
      .run();

    return Response.json({
      success: true,
      message: "Video haber başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, { status: 201 });

  } catch (error) {
    console.error("VIDEO POST HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// PUT /api/video?id=
if (
  url.pathname === "/api/video" &&
  request.method === "PUT"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const body = await request.json();

    const baslik = String(body.baslik || "").trim();
    const video_url = String(body.video_url || "").trim();
    const ozet = String(body.ozet || "").trim();
    const kapak_resmi = String(body.kapak_resmi || "").trim();
    const kategori = String(body.kategori || "Gündem").trim();
    const durum = body.durum === "taslak"
      ? "taslak"
      : "yayinda";
    const manset = body.manset ? 1 : 0;
    const tarih = body.tarih || new Date().toISOString();

    if (!baslik || !video_url) {
      return Response.json({
        success: false,
        error: "Başlık ve video URL zorunludur."
      }, { status: 400 });
    }

    const mevcut = await env.DB
      .prepare(`
        SELECT id
        FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

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

    return Response.json({
      success: true,
      message: "Video haber güncellendi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// DELETE /api/video?id=
if (
  url.pathname === "/api/video" &&
  request.method === "DELETE"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        DELETE FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Video haber silindi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// POST /api/video-izlenme?id=
if (
  url.pathname === "/api/video-izlenme" &&
  request.method === "POST"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        UPDATE video_haberler
        SET izlenme = COALESCE(izlenme, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    const video = await env.DB
      .prepare(`
        SELECT id, izlenme
        FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .first();

    return Response.json({
      success: true,
      id,
      izlenme: video?.izlenme || 0
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}


// GET /api/video-istatistik
if (
  url.pathname === "/api/video-istatistik" &&
  request.method === "GET"
) {
  try {
    const toplam = await env.DB
      .prepare(`
        SELECT COUNT(*) AS toplam
        FROM video_haberler
      `)
      .first();

    const yayinlanan = await env.DB
      .prepare(`
        SELECT COUNT(*) AS toplam
        FROM video_haberler
        WHERE durum = 'yayinda'
      `)
      .first();

    const toplamIzlenme = await env.DB
      .prepare(`
        SELECT COALESCE(SUM(izlenme), 0) AS toplam
        FROM video_haberler
      `)
      .first();

    return Response.json({
      success: true,
      toplam_video: toplam?.toplam || 0,
      yayinlanan_video: yayinlanan?.toplam || 0,
      toplam_izlenme: toplamIzlenme?.toplam || 0
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // =========================================================
// REKLAMLAR API
// =========================================================

// ---------------------------------------------------------
// GET /api/reklamlar
// Reklam listesi
// ---------------------------------------------------------

if (
  url.pathname === "/api/reklamlar" &&
  request.method === "GET"
) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          id,
          firma_adi,
          resim,
          link,
          konum,
          baslangic,
          bitis,
          durum,
          olusturma_tarihi
        FROM reklamlar
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      reklamlar: result.results
    });

  } catch (error) {
    console.error("REKLAM LISTE HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // ---------------------------------------------------------
// GET /api/reklam?id=1
// Tek reklam
// ---------------------------------------------------------

if (
  url.pathname === "/api/reklam" &&
  request.method === "GET"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Reklam ID belirtilmedi."
      }, { status: 400 });
    }

    const reklam = await env.DB
      .prepare(`
        SELECT
          id,
          firma_adi,
          resim,
          link,
          konum,
          baslangic,
          bitis,
          durum,
          olusturma_tarihi
        FROM reklamlar
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!reklam) {
      return Response.json({
        success: false,
        error: "Reklam bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      reklam
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // ---------------------------------------------------------
// POST /api/reklam
// Yeni reklam
// ---------------------------------------------------------

if (
  url.pathname === "/api/reklam" &&
  request.method === "POST"
) {
  try {
    const body = await request.json();

    const firma_adi = String(body.firma_adi || "").trim();
    const resim = String(body.resim || "").trim();
    const link = String(body.link || "").trim();
    const konum = String(body.konum || "anasayfa").trim();
    const baslangic = String(body.baslangic || "").trim();
    const bitis = String(body.bitis || "").trim();
    const durum = String(body.durum || "aktif").trim();

    if (!firma_adi || !baslangic || !bitis) {
      return Response.json({
        success: false,
        error: "Firma adı, başlangıç ve bitiş tarihi zorunludur."
      }, { status: 400 });
    }

    const result = await env.DB
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
      success: true,
      message: "Reklam başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, { status: 201 });

  } catch (error) {
    console.error("REKLAM POST HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // ---------------------------------------------------------
// PUT /api/firma?id=2
// Firma güncelle
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "PUT"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Firma ID belirtilmedi."
      }, { status: 400 });
    }

    const body = await request.json();

    const firma_adi = String(body.firma_adi || "").trim();

    if (!firma_adi) {
      return Response.json({
        success: false,
        error: "Firma adı zorunludur."
      }, { status: 400 });
    }

    const mevcut = await env.DB
      .prepare(`
        SELECT id
        FROM firmalar
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Firma bulunamadı."
      }, { status: 404 });
    }

    const kategori = String(body.kategori || "Diğer").trim();
    const il = String(body.il || "").trim();
    const ilce = String(body.ilce || "").trim();
    const mahalle = String(body.mahalle || "").trim();
    const adres = String(body.adres || "").trim();
    const telefon = String(body.telefon || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const email = String(body.email || "").trim();
    const website = String(body.website || "").trim();
    const aciklama = String(body.aciklama || "").trim();
    const logo = String(body.logo || "").trim();
    const durum = String(body.durum || "yayinda").trim();
    const tarih = String(
      body.tarih ||
      new Date().toISOString().slice(0, 10)
    ).trim();

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

    return Response.json({
      success: true,
      message: "Firma güncellendi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
   // =========================================================
// FİRMALAR API
// =========================================================

// ---------------------------------------------------------
// GET /api/firmalar
// Firma listesi
// ---------------------------------------------------------

if (
  url.pathname === "/api/firmalar" &&
  request.method === "GET"
) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          id,
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
          created_at
        FROM firmalar
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      firmalar: result.results
    });

  } catch (error) {
    console.error("FİRMA LİSTE HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
   // =========================================================
// YAZARLAR API
// =========================================================

// ---------------------------------------------------------
// GET /api/yazarlar
// Yazar listesi
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazarlar" &&
  request.method === "GET"
) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          id,
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          durum,
          tarih
        FROM yazarlar
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      yazarlar: result.results
    });

  } catch (error) {
    console.error("YAZAR LİSTE HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
    // =========================================================
// YAZAR YAZILARI API
// =========================================================

// ---------------------------------------------------------
// GET /api/yazar-yazilari
// Yazar yazıları listesi
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazilari" &&
  request.method === "GET"
) {
  try {
    const result = await env.DB
      .prepare(`
        SELECT
          yy.id,
          yy.yazar_id,
          yy.baslik,
          yy.icerik,
          yy.il,
          yy.ilce,
          yy.resim,
          yy.durum,
          yy.red_nedeni,
          yy.editor_notu,
          yy.tarih,
          yy.yayin_tarihi,
          y.ad_soyad AS yazar_adi
        FROM yazar_yazilari yy
        LEFT JOIN yazarlar y
          ON y.id = yy.yazar_id
        ORDER BY yy.id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      yazilar: result.results
    });

  } catch (error) {
    console.error("YAZAR YAZILARI LİSTE HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // ---------------------------------------------------------
// GET /api/yazar?id=1
// Tek yazar
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "GET"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Yazar ID belirtilmedi."
      }, { status: 400 });
    }

    const yazar = await env.DB
      .prepare(`
        SELECT
          id,
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          durum,
          tarih
        FROM yazarlar
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!yazar) {
      return Response.json({
        success: false,
        error: "Yazar bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      yazar
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
// ---------------------------------------------------------
// POST /api/yazar
// Yeni yazar
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "POST"
) {
  try {
    const body = await request.json();

    const ad_soyad = String(body.ad_soyad || "").trim();

    if (!ad_soyad) {
      return Response.json({
        success: false,
        error: "Ad soyad zorunludur."
      }, { status: 400 });
    }

    const il = String(body.il || "").trim();
    const ilce = String(body.ilce || "").trim();
    const fotograf = String(body.fotograf || "").trim();
    const biyografi = String(body.biyografi || "").trim();
    const email = String(body.email || "").trim();
    const durum = String(body.durum || "beklemede").trim();
    const tarih = String(
      body.tarih ||
      new Date().toISOString().slice(0, 10)
    ).trim();

    const result = await env.DB
      .prepare(`
        INSERT INTO yazarlar
        (
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          durum,
          tarih
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        ad_soyad,
        il,
        ilce,
        fotograf,
        biyografi,
        email,
        durum,
        tarih
      )
      .run();

    return Response.json({
      success: true,
      message: "Yazar başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, { status: 201 });

  } catch (error) {
    console.error("YAZAR POST HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
  // ---------------------------------------------------------
// PUT /api/yazar?id=4
// Yazar güncelle
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "PUT"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Yazar ID belirtilmedi."
      }, { status: 400 });
    }

    const body = await request.json();

    const ad_soyad = String(body.ad_soyad || "").trim();

    if (!ad_soyad) {
      return Response.json({
        success: false,
        error: "Ad soyad zorunludur."
      }, { status: 400 });
    }

    const mevcut = await env.DB
      .prepare(`
        SELECT id
        FROM yazarlar
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Yazar bulunamadı."
      }, { status: 404 });
    }

    const il = String(body.il || "").trim();
    const ilce = String(body.ilce || "").trim();
    const fotograf = String(body.fotograf || "").trim();
    const biyografi = String(body.biyografi || "").trim();
    const email = String(body.email || "").trim();
    const durum = String(body.durum || "beklemede").trim();
    const tarih = String(
      body.tarih ||
      new Date().toISOString().slice(0, 10)
    ).trim();

    await env.DB
      .prepare(`
        UPDATE yazarlar
        SET
          ad_soyad = ?,
          il = ?,
          ilce = ?,
          fotograf = ?,
          biyografi = ?,
          email = ?,
          durum = ?,
          tarih = ?
        WHERE id = ?
      `)
      .bind(
        ad_soyad,
        il,
        ilce,
        fotograf,
        biyografi,
        email,
        durum,
        tarih,
        id
      )
      .run();

    return Response.json({
      success: true,
      message: "Yazar güncellendi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}  
    
// ---------------------------------------------------------
// GET /api/firma?id=1
// Tek firma
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "GET"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Firma ID belirtilmedi."
      }, { status: 400 });
    }

    const firma = await env.DB
      .prepare(`
        SELECT
          id,
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
          created_at
        FROM firmalar
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!firma) {
      return Response.json({
        success: false,
        error: "Firma bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      firma
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // ---------------------------------------------------------
// POST /api/firma
// Yeni firma
// ---------------------------------------------------------

if (
  url.pathname === "/api/firma" &&
  request.method === "POST"
) {
  try {
    const body = await request.json();

    const firma_adi = String(body.firma_adi || "").trim();

    if (!firma_adi) {
      return Response.json({
        success: false,
        error: "Firma adı zorunludur."
      }, { status: 400 });
    }

    const kategori = String(body.kategori || "Diğer").trim();
    const il = String(body.il || "").trim();
    const ilce = String(body.ilce || "").trim();
    const mahalle = String(body.mahalle || "").trim();
    const adres = String(body.adres || "").trim();
    const telefon = String(body.telefon || "").trim();
    const whatsapp = String(body.whatsapp || "").trim();
    const email = String(body.email || "").trim();
    const website = String(body.website || "").trim();
    const aciklama = String(body.aciklama || "").trim();
    const logo = String(body.logo || "").trim();
    const durum = String(body.durum || "yayinda").trim();
    const tarih = String(
      body.tarih ||
      new Date().toISOString().slice(0, 10)
    ).trim();

    const result = await env.DB
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
      message: "Firma başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, { status: 201 });

  } catch (error) {
    console.error("FİRMA POST HATASI:", error);

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
   // =========================================================
// GET /api/video?id=1
// Tek video
// =========================================================

if (
  url.pathname === "/api/video" &&
  request.method === "GET"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const video = await env.DB
      .prepare(`
        SELECT
          id,
          baslik,
          ozet,
          video_url,
          kapak_resmi,
          kategori,
          tarih,
          durum,
          manset,
          izlenme,
          created_at
        FROM video_haberler
        WHERE id = ?
        LIMIT 1
      `)
      .bind(id)
      .first();

    if (!video) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      video
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
  // =========================================================
// POST /api/video
// Yeni video haber
// =========================================================

if (
  url.pathname === "/api/video" &&
  request.method === "POST"
) {
  try {
    const body = await request.json();

    const baslik = String(body.baslik || "").trim();
    const video_url = String(body.video_url || "").trim();
    const ozet = String(body.ozet || "").trim();
    const kapak_resmi = String(body.kapak_resmi || "").trim();
    const kategori = String(body.kategori || "Gündem").trim();
    const durum = body.durum === "taslak" ? "taslak" : "yayinda";
    const manset = body.manset ? 1 : 0;
    const tarih = body.tarih || new Date().toISOString();

    if (!baslik || !video_url) {
      return Response.json({
        success: false,
        error: "Başlık ve video URL zorunludur."
      }, { status: 400 });
    }

    const result = await env.DB
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
      `)
      .bind(
        baslik,
        ozet,
        video_url,
        kapak_resmi,
        kategori,
        tarih,
        durum,
        manset
      )
      .run();

    return Response.json({
      success: true,
      message: "Video haber başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, { status: 201 });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}  
  // ---------------------------------------------------------
// PUT /api/reklam?id=7
// Reklam güncelle
// ---------------------------------------------------------

if (
  url.pathname === "/api/reklam" &&
  request.method === "PUT"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Reklam ID belirtilmedi."
      }, { status: 400 });
    }

    const body = await request.json();

    const firma_adi = String(body.firma_adi || "").trim();
    const resim = String(body.resim || "").trim();
    const link = String(body.link || "").trim();
    const konum = String(body.konum || "anasayfa").trim();
    const baslangic = String(body.baslangic || "").trim();
    const bitis = String(body.bitis || "").trim();
    const durum = String(body.durum || "aktif").trim();

    if (!firma_adi || !baslangic || !bitis) {
      return Response.json({
        success: false,
        error: "Firma adı, başlangıç ve bitiş tarihi zorunludur."
      }, { status: 400 });
    }

    const mevcut = await env.DB
      .prepare(`
        SELECT id
        FROM reklamlar
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Reklam bulunamadı."
      }, { status: 404 });
    }

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
      success: true,
      message: "Reklam güncellendi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}  
   // ---------------------------------------------------------
// DELETE /api/reklam?id=7
// Reklam sil
// ---------------------------------------------------------

if (
  url.pathname === "/api/reklam" &&
  request.method === "DELETE"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Reklam ID belirtilmedi."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        DELETE FROM reklamlar
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Reklam bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Reklam silindi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
    
// =========================================================
// PUT /api/video?id=3
// Video güncelle
// =========================================================

if (
  url.pathname === "/api/video" &&
  request.method === "PUT"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const body = await request.json();

    const baslik = String(body.baslik || "").trim();
    const video_url = String(body.video_url || "").trim();
    const ozet = String(body.ozet || "").trim();
    const kapak_resmi = String(body.kapak_resmi || "").trim();
    const kategori = String(body.kategori || "Gündem").trim();
    const durum = body.durum === "taslak" ? "taslak" : "yayinda";
    const manset = body.manset ? 1 : 0;
    const tarih = body.tarih || new Date().toISOString();

    if (!baslik || !video_url) {
      return Response.json({
        success: false,
        error: "Başlık ve video URL zorunludur."
      }, { status: 400 });
    }

    const mevcut = await env.DB
      .prepare(`
        SELECT id
        FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

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

    return Response.json({
      success: true,
      message: "Video haber güncellendi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
   // =========================================================
// POST /api/video-izlenme?id=3
// Video izlenme artır
// =========================================================

if (
  url.pathname === "/api/video-izlenme" &&
  request.method === "POST"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        UPDATE video_haberler
        SET izlenme = COALESCE(izlenme, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    const video = await env.DB
      .prepare(`
        SELECT id, izlenme
        FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .first();

    return Response.json({
      success: true,
      id,
      izlenme: video?.izlenme || 0
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
} 
    // =========================================================
// DELETE /api/video?id=3
// Video sil
// =========================================================

if (
  url.pathname === "/api/video" &&
  request.method === "DELETE"
) {
  try {
    const id = Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Video ID belirtilmedi."
      }, { status: 400 });
    }

    const result = await env.DB
      .prepare(`
        DELETE FROM video_haberler
        WHERE id = ?
      `)
      .bind(id)
      .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Video bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Video haber silindi.",
      id
    });

  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
    // =========================================================
// HABERLER API - TAM CRUD
// =========================================================

// ---------------------------------------------------------
// GET /api/haberler
// Haber listesi
// ---------------------------------------------------------
if (
  url.pathname === "/api/haberler" &&
  request.method === "GET"
) {
  try {

    const limit = Math.min(
      Number(url.searchParams.get("limit") || 50),
      100
    );

    const offset = Math.max(
      Number(url.searchParams.get("offset") || 0),
      0
    );

    const durum =
      url.searchParams.get("durum");

    let sql = `
      SELECT
        id,
        baslik,
        ozet,
        icerik,
        kategori,
        resim,
        tarih,
        durum,
        manset,
        okunma
      FROM haberler
    `;

    const params = [];

    if (durum) {
      sql += ` WHERE durum = ? `;
      params.push(durum);
    }

    sql += `
      ORDER BY datetime(tarih) DESC, id DESC
      LIMIT ? OFFSET ?
    `;

    params.push(limit, offset);

    const result =
      await env.DB
        .prepare(sql)
        .bind(...params)
        .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      haberler: result.results
    });

  } catch (error) {

    console.error(
      "HABERLER GET HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}


// ---------------------------------------------------------
// GET /api/haber?id=1
// Tek haber
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber" &&
  request.method === "GET"
) {
  try {

    const id =
      Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Haber ID belirtilmedi."
      }, {
        status: 400
      });
    }

    const haber =
      await env.DB
        .prepare(`
          SELECT
            id,
            baslik,
            ozet,
            icerik,
            kategori,
            resim,
            tarih,
            durum,
            manset,
            okunma
          FROM haberler
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!haber) {
      return Response.json({
        success: false,
        error: "Haber bulunamadı."
      }, {
        status: 404
      });
    }

    return Response.json({
      success: true,
      haber
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
// POST /api/haber
// Yeni haber
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber" &&
  request.method === "POST"
) {
  try {

    const body =
      await request.json();

    const baslik =
      String(body.baslik || "").trim();

    const kategori =
      String(body.kategori || "").trim();

    const ozet =
      String(body.ozet || "").trim();

    const icerik =
      String(body.icerik || "").trim();

    const resim =
      String(body.resim || "").trim();

    const durum =
      body.durum === "taslak"
        ? "taslak"
        : "yayinda";

    const manset =
      body.manset ? 1 : 0;

    const tarih =
      body.tarih ||
      new Date().toISOString();

    if (!baslik) {
      return Response.json({
        success: false,
        error: "Haber başlığı zorunludur."
      }, {
        status: 400
      });
    }

    if (!kategori) {
      return Response.json({
        success: false,
        error: "Kategori zorunludur."
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
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)
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
      success: true,
      message: "Haber başarıyla eklendi.",
      id: result.meta?.last_row_id || null
    }, {
      status: 201
    });

  } catch (error) {

    console.error(
      "HABER POST HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}


// ---------------------------------------------------------
// PUT /api/haber?id=1
// Haber güncelle
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber" &&
  request.method === "PUT"
) {
  try {

    const id =
      Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Haber ID belirtilmedi."
      }, {
        status: 400
      });
    }

    const mevcut =
      await env.DB
        .prepare(`
          SELECT id
          FROM haberler
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!mevcut) {
      return Response.json({
        success: false,
        error: "Haber bulunamadı."
      }, {
        status: 404
      });
    }

    const body =
      await request.json();

    const baslik =
      String(body.baslik || "").trim();

    const kategori =
      String(body.kategori || "").trim();

    const ozet =
      String(body.ozet || "").trim();

    const icerik =
      String(body.icerik || "").trim();

    const resim =
      String(body.resim || "").trim();

    const durum =
      body.durum === "taslak"
        ? "taslak"
        : "yayinda";

    const manset =
      body.manset ? 1 : 0;

    const tarih =
      body.tarih ||
      new Date().toISOString();

    if (!baslik || !kategori) {
      return Response.json({
        success: false,
        error: "Başlık ve kategori zorunludur."
      }, {
        status: 400
      });
    }

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
      success: true,
      message: "Haber güncellendi.",
      id
    });

  } catch (error) {

    console.error(
      "HABER PUT HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}


// ---------------------------------------------------------
// DELETE /api/haber?id=1
// Haber sil
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber" &&
  request.method === "DELETE"
) {
  try {

    const id =
      Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Haber ID belirtilmedi."
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

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Haber bulunamadı."
      }, {
        status: 404
      });
    }

    return Response.json({
      success: true,
      message: "Haber silindi.",
      id
    });

  } catch (error) {

    console.error(
      "HABER DELETE HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}


// ---------------------------------------------------------
// POST /api/haber-okunma?id=1
// Okunma sayısını artır
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber-okunma" &&
  request.method === "POST"
) {
  try {

    const id =
      Number(url.searchParams.get("id"));

    if (!id) {
      return Response.json({
        success: false,
        error: "Haber ID belirtilmedi."
      }, {
        status: 400
      });
    }

    const result =
      await env.DB
        .prepare(`
          UPDATE haberler
          SET okunma = COALESCE(okunma, 0) + 1
          WHERE id = ?
        `)
        .bind(id)
        .run();

    if (!result.meta?.changes) {
      return Response.json({
        success: false,
        error: "Haber bulunamadı."
      }, {
        status: 404
      });
    }

    const haber =
      await env.DB
        .prepare(`
          SELECT id, okunma
          FROM haberler
          WHERE id = ?
        `)
        .bind(id)
        .first();

    return Response.json({
      success: true,
      id,
      okunma: haber?.okunma || 0
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
// GET /api/haber-istatistik
// Haber istatistikleri
// ---------------------------------------------------------
if (
  url.pathname === "/api/haber-istatistik" &&
  request.method === "GET"
) {
  try {

    const toplam =
      await env.DB
        .prepare(`
          SELECT COUNT(*) AS toplam
          FROM haberler
        `)
        .first();

    const yayinlanan =
      await env.DB
        .prepare(`
          SELECT COUNT(*) AS toplam
          FROM haberler
          WHERE durum = 'yayinda'
        `)
        .first();

    const taslak =
      await env.DB
        .prepare(`
          SELECT COUNT(*) AS toplam
          FROM haberler
          WHERE durum = 'taslak'
        `)
        .first();

    const okunma =
      await env.DB
        .prepare(`
          SELECT COALESCE(
            SUM(okunma), 0
          ) AS toplam
          FROM haberler
        `)
        .first();

    const enCokOkunan =
      await env.DB
        .prepare(`
          SELECT
            id,
            baslik,
            okunma
          FROM haberler
          ORDER BY okunma DESC, id DESC
          LIMIT 10
        `)
        .all();

    return Response.json({
      success: true,

      toplam_haber:
        toplam?.toplam || 0,

      yayinlanan_haber:
        yayinlanan?.toplam || 0,

      taslak_haber:
        taslak?.toplam || 0,

      toplam_okunma:
        okunma?.toplam || 0,

      en_cok_okunan:
        enCokOkunan.results || []
    });

  } catch (error) {

    console.error(
      "HABER İSTATİSTİK HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
    }, {
      status: 500
    });
  }
}
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

      testSonucu(
        "Worker",
        true,
        "Worker çalışıyor."
      );

      // D1 TESTİ
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

      // TABLO TESTLERİ
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

      // ADMIN ŞİFRE TESTİ
      testSonucu(
        "Admin şifresi",
        !!env.ADMIN_PASSWORD,
        env.ADMIN_PASSWORD
          ? "ADMIN_PASSWORD tanımlı."
          : "ADMIN_PASSWORD bulunamadı."
      );

      const hataSayisi =
        testler.filter(
          x => x.durum === "HATA"
        ).length;

      return Response.json({
        success: hataSayisi === 0,
        sistem:
          hataSayisi === 0
            ? "SAĞLIKLI"
            : "HATA VAR",
        toplam_test: testler.length,
        hata: hataSayisi,
        testler
      });
    }

    // =========================================================
    // 🔎 GELİŞMİŞ ARAMA API
    // GET /api/arama?q=kastamonu
    // =========================================================

    if (
      url.pathname === "/api/arama" &&
      request.method === "GET"
    ) {

      try {

        const q =
          (url.searchParams.get("q") || "").trim();

        if (!q) {

          return Response.json({
            success: true,
            arama: "",
            toplam: 0,
            haberler: [],
            firmalar: [],
            videolar: []
          });

        }

        const arama = `%${q}%`;

        // HABERLER
        const haberSonuclari =
          await env.DB
            .prepare(`
              SELECT
                id,
                baslik,
                ozet,
                icerik,
                kategori,
                resim,
                tarih,
                okunma
              FROM haberler
              WHERE
                durum = 'yayinda'
                AND (
                  baslik LIKE ?
                  OR ozet LIKE ?
                  OR icerik LIKE ?
                  OR kategori LIKE ?
                )
              ORDER BY id DESC
              LIMIT 20
            `)
            .bind(
              arama,
              arama,
              arama,
              arama
            )
            .all();

        // FİRMALAR
        const firmaSonuclari =
          await env.DB
            .prepare(`
              SELECT
                id,
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
              FROM firmalar
              WHERE
                durum = 'yayinda'
                AND (
                  firma_adi LIKE ?
                  OR kategori LIKE ?
                  OR il LIKE ?
                  OR ilce LIKE ?
                  OR mahalle LIKE ?
                  OR adres LIKE ?
                  OR aciklama LIKE ?
                )
              ORDER BY id DESC
              LIMIT 20
            `)
            .bind(
              arama,
              arama,
              arama,
              arama,
              arama,
              arama,
              arama
            )
            .all();

        // VİDEOLAR
        const videoSonuclari =
          await env.DB
            .prepare(`
              SELECT
                id,
                baslik,
                ozet,
                video_url,
                kapak_resmi,
                kategori,
                tarih,
                izlenme
              FROM video_haberler
              WHERE
                durum = 'yayinda'
                AND (
                  baslik LIKE ?
                  OR ozet LIKE ?
                  OR kategori LIKE ?
                )
              ORDER BY id DESC
              LIMIT 20
            `)
            .bind(
              arama,
              arama,
              arama
            )
            .all();

        const haberler =
          haberSonuclari.results || [];

        const firmalar =
          firmaSonuclari.results || [];

        const videolar =
          videoSonuclari.results || [];

        return Response.json({

          success: true,

          arama: q,

          toplam:
            haberler.length +
            firmalar.length +
            videolar.length,

          haberler,
          firmalar,
          videolar

        }, {

          headers: {
            "Content-Type":
              "application/json; charset=UTF-8",
            "Cache-Control":
              "no-store"
          }

        });

      } catch (error) {

        console.error(
          "ARAMA API HATASI:",
          error
        );

        return Response.json({
          success: false,
          error: error.message
        }, {
          status: 500
        });

      }
    }

    // =========================================================
    // API HEALTH
    // GET /api/health
    // =========================================================

    if (
      url.pathname === "/api/health" &&
      request.method === "GET"
    ) {

      return Response.json({
        success: true,
        service: "digital-gundem",
        api: "aktif"
      });

    }

    // =========================================================
    // ROBOTS.TXT
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
    // DİNAMİK SITEMAP
    // =========================================================

    if (
      url.pathname === "/sitemap.xml" &&
      request.method === "GET"
    ) {

      try {

        const urls = [];

        urls.push(`
  <url>
    <loc>https://www.digitalgundem.com.tr/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

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

        for (
          const haber of
          haberler.results || []
        ) {

          const haberUrl =
            `https://www.digitalgundem.com.tr/pages/haber.html?id=${encodeURIComponent(haber.id)}`;

          urls.push(`
  <url>
    <loc>${haberUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);

        }

        const sitemap =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
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
          new Intl.DateTimeFormat(
            "tr-TR",
            {
              timeZone: "Europe/Istanbul"
            }
          ).format(new Date());

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
    // GET /api/ziyaret-istatistik
    // =========================================================

    if (
      url.pathname === "/api/ziyaret-istatistik" &&
      request.method === "GET"
    ) {

      try {

        const bugun =
          new Intl.DateTimeFormat(
            "tr-TR",
            {
              timeZone: "Europe/Istanbul"
            }
          ).format(new Date());

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
    // AA TEST
    // =========================================================

    if (
      url.pathname === "/api/aa-test" &&
      request.method === "GET"
    ) {

      try {

        const rssUrl =
          "https://www.aa.com.tr/tr/ayrimcilikhatti/rss/news?cat=ayrimcilik";

        const cevap =
          await fetch(rssUrl, {
            headers: {
              "User-Agent":
                "Digital-Gundem/1.0"
            }
          });

        const xml =
          await cevap.text();

        return Response.json({
          success: cevap.ok,
          status: cevap.status,
          kaynak: rssUrl,
          uzunluk: xml.length,
          baslangic:
            xml.substring(0, 500)
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
    // RSS TEST
    // =========================================================

    if (
      url.pathname === "/api/rss-test" &&
      request.method === "GET"
    ) {

      try {

        const rssUrl =
          "https://www.aa.com.tr/tr/rss/default?cat=gundem";

        const cevap =
          await fetch(rssUrl, {
            headers: {
              "User-Agent":
                "Mozilla/5.0"
            }
          });

        const xml =
          await cevap.text();

        return Response.json({
          success: cevap.ok,
          status: cevap.status,
          uzunluk: xml.length,
          baslangic:
            xml.substring(0, 500)
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
    // 🌍 DÜNYA GÜNDEM
    // GET /api/dunya
    // =========================================================

    if (
      url.pathname === "/api/dunya" &&
      request.method === "GET"
    ) {

      try {

        const haberler =
          await aaRSSGetir(
            "https://www.aa.com.tr/tr/rss/default?cat=dunya",
            "Dünya"
          );

        return Response.json({

          success: true,

          kategori: "Dünya",

          kaynak:
            "Anadolu Ajansı RSS",

          toplam:
            haberler.length,

          haberler

        }, {

          headers: {
            "Content-Type":
              "application/json; charset=UTF-8",
            "Cache-Control":
              "public, max-age=300"
          }

        });

      } catch (error) {

        console.error(
          "DÜNYA API HATASI:",
          error
        );

        return Response.json({

          success: false,

          error:
            error.message

        }, {
          status: 502
        });

      }
    }

    // =====================================================
// ALTIN FİYATLARI
// GET /api/altin
// =====================================================

if (
  url.pathname === "/api/altin" &&
  request.method === "GET"
) {

  try {

    const response = await fetch(
      "https://finans.truncgil.com/today.json",
      {
        headers: {
          "User-Agent": "DigitalGundem/1.0",
          "Accept": "application/json"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Altın API hatası: ${response.status}`
      );
    }

    const data = await response.json();

    const gram = data["gram-altin"];
    const ceyrek = data["ceyrek-altin"];

    return Response.json(
      {
        success: true,
        source: "Truncgil",
        updated_at: new Date().toISOString(),

        gold: {
          gram: gram || null,
          ceyrek: ceyrek || null
        }
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300"
        }
      }
    );

  } catch (error) {

    return Response.json(
      {
        success: false,
        error: "Altın bilgileri alınamadı.",
        detail: error.message
      },
      {
        status: 500
      }
    );

  }

}
    // =====================================================
// ALTIN FİYATLARI
// GET /api/altin-test
// =====================================================

if (
  url.pathname === "/api/altin-test" &&
  request.method === "GET"
) {

  try {

    const response = await fetch(
      "https://finans.truncgil.com/today.json",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Accept": "application/json,text/plain,*/*"
        }
      }
    );

    const text = await response.text();

    if (!response.ok) {

      throw new Error(
        `Altın kaynağı HTTP ${response.status}`
      );

    }

    let data;

    try {

      data = JSON.parse(text);

    } catch (e) {

      return Response.json(
        {
          success: false,
          error: "Altın kaynağı geçerli JSON döndürmedi.",
          preview: text.slice(0, 300)
        },
        {
          status: 502
        }
      );

    }

    const gram =
      data["gram-altin"] ||
      data["gram_altin"] ||
      null;

    const ceyrek =
      data["ceyrek-altin"] ||
      data["ceyrek_altin"] ||
      null;

    return Response.json({

      success: true,

      source: "Truncgil",

      updated_at:
        new Date().toISOString(),

      gold: {

        gram: gram,

        ceyrek: ceyrek

      }

    });

  } catch (error) {

    return Response.json(
      {
        success: false,
        error: "Altın bilgileri alınamadı.",
        detail: error.message
      },
      {
        status: 500
      }
    );

  }

}
// =====================================================
// DÖVİZ KURLARI - TCMB
// GET /api/kurlar
// =====================================================

if (
  url.pathname === "/api/kurlar" &&
  request.method === "GET"
) {

  try {

    const response = await fetch(
      "https://www.tcmb.gov.tr/kurlar/today.xml",
      {
        headers: {
          "User-Agent": "DigitalGundem/1.0"
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `TCMB HTTP ${response.status}`
      );
    }

    const xml = await response.text();

    const currencies = [
      {
        code: "USD",
        name: "ABD Doları"
      },
      {
        code: "EUR",
        name: "Euro"
      },
      {
        code: "GBP",
        name: "İngiliz Sterlini"
      },
      {
        code: "CHF",
        name: "İsviçre Frangı"
      },
      {
        code: "SAR",
        name: "Suudi Riyali"
      }
    ];

    const sonuc = [];

    for (const currency of currencies) {

      const regex = new RegExp(
        `<Currency[^>]*CurrencyCode="${currency.code}"[\\s\\S]*?<BanknoteBuying>(.*?)<\\/BanknoteBuying>[\\s\\S]*?<BanknoteSelling>(.*?)<\\/BanknoteSelling>[\\s\\S]*?<\\/Currency>`,
        "i"
      );

      const match = xml.match(regex);

      if (!match) {
        continue;
      }

      sonuc.push({
        code: currency.code,
        name: currency.name,
        alis: Number(
          match[1].replace(",", ".")
        ),
        satis: Number(
          match[2].replace(",", ".")
        )
      });

    }

    return Response.json(
      {
        success: true,
        source: "TCMB",
        updated_at: new Date().toISOString(),
        currencies: sonuc
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=300, s-maxage=300"
        }
      }
    );

  } catch (error) {

    return Response.json(
      {
        success: false,
        error: "Kur bilgileri alınamadı.",
        detail: error.message
      },
      {
        status: 500
      }
    );

  }

}
    // =========================================================
    // 🇹🇷 GÜNDEM
    // GET /api/gundem
    // =========================================================

    if (
      url.pathname === "/api/gundem" &&
      request.method === "GET"
    ) {

      try {

        const haberler =
          await aaRSSGetir(
            "https://www.aa.com.tr/tr/rss/default?cat=gundem",
            "Türkiye"
          );

        const sonHaberler =
          haberler.slice(0, 5);

        return Response.json({

          success: true,

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
          status: 502
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
    // ADMIN GİRİŞ SAYFASI
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

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

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
  box-sizing:border-box;
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

</style>

</head>

<body>

<div class="kutu">

<h1>🔐 Digital Gündem</h1>

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
`,
        {
          headers: {
            "Content-Type":
              "text/html; charset=UTF-8"
          }
        }
      );
    }

    // =========================================================
    // ADMIN GİRİŞ KONTROLÜ
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

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
>

<title>Hatalı Şifre</title>

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

<h2>❌ Şifre hatalı</h2>

<p>
Yönetim şifresi doğru değil.
</p>

<a href="/admin-giris">
Tekrar Dene
</a>

</body>

</html>
`,
            {
              status: 401,
              headers: {
                "Content-Type":
                  "text/html; charset=UTF-8"
              }
            }
          );
        }

        return new Response(null, {

          status: 302,

          headers: {

            "Location":
              "/pages/admin.html",

            "Set-Cookie":
              `${ADMIN_COOKIE}=ok; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=3600`

          }

        });

      } catch (error) {

        return new Response(
          "Giriş işlemi sırasında hata oluştu.",
          {
            status: 500
          }
        );

      }
    }

    // =========================================================
    // ADMIN PANELİ KORUMASI
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
    // ADMIN API GÜVENLİĞİ
    // =========================================================

    if (
      url.pathname.startsWith("/api/") &&
      ["POST", "PUT", "DELETE"].includes(
        request.method
      )
    ) {

      const auth =
        cookieOku(
          request,
          ADMIN_COOKIE
        );

      if (auth !== "ok") {

        return Response.json({

          success: false,

          error:
            "Yetkisiz erişim. Yönetici girişi gerekli."

        }, {
          status: 401
        });

      }
    }
// =========================================================
// ✍️ YAZARLAR SİSTEMİ
// =========================================================

// ---------------------------------------------------------
// YAYINLANMIŞ YAZARLARI GETİR
// GET /api/yazarlar
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazarlar" &&
  request.method === "GET"
) {

  try {

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          WHERE durum = 'aktif'
          ORDER BY il ASC, ad_soyad ASC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazarlar:
        result.results

    }, {
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }
    });

  } catch (error) {

    console.error(
      "YAZARLAR API HATASI:",
      error
    );

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
// TEK YAZAR
// GET /api/yazar?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const yazar =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          WHERE id = ?
          AND durum = 'aktif'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!yazar) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    const yazilar =
      await env.DB
        .prepare(`
          SELECT
            id,
            yazar_id,
            baslik,
            icerik,
            il,
            ilce,
            resim,
            durum,
            editor_notu,
            tarih,
            yayin_tarihi
          FROM yazar_yazilari
          WHERE yazar_id = ?
          AND durum = 'yayinda'
          ORDER BY id DESC
        `)
        .bind(id)
        .all();

    return Response.json({

      success: true,

      yazar,

      toplam_yazi:
        yazilar.results.length,

      yazilar:
        yazilar.results

    }, {
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }
    });

  } catch (error) {

    console.error(
      "TEK YAZAR API HATASI:",
      error
    );

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
// YAZAR YAZILARI
// GET /api/yazar-yazilari
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazilari" &&
  request.method === "GET"
) {

  try {

    const yazarId =
      url.searchParams.get("yazar_id");

    let result;

    if (yazarId) {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.id,
              yy.yazar_id,
              yy.baslik,
              yy.icerik,
              yy.il,
              yy.ilce,
              yy.resim,
              yy.durum,
              yy.tarih,
              yy.yayin_tarihi,
              y.ad_soyad,
              y.fotograf
            FROM yazar_yazilari yy
            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id
            WHERE yy.yazar_id = ?
            AND yy.durum = 'yayinda'
            AND y.durum = 'aktif'
            ORDER BY yy.id DESC
          `)
          .bind(yazarId)
          .all();

    } else {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.id,
              yy.yazar_id,
              yy.baslik,
              yy.icerik,
              yy.il,
              yy.ilce,
              yy.resim,
              yy.durum,
              yy.tarih,
              yy.yayin_tarihi,
              y.ad_soyad,
              y.fotograf
            FROM yazar_yazilari yy
            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id
            WHERE yy.durum = 'yayinda'
            AND y.durum = 'aktif'
            ORDER BY yy.id DESC
          `)
          .all();

    }

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazilar:
        result.results

    }, {
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }
    });

  } catch (error) {

    console.error(
      "YAZAR YAZILARI API HATASI:",
      error
    );

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
// TEK YAZAR YAZISI
// GET /api/yazar-yazisi?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const yazi =
      await env.DB
        .prepare(`
          SELECT
            yy.id,
            yy.yazar_id,
            yy.baslik,
            yy.icerik,
            yy.il,
            yy.ilce,
            yy.resim,
            yy.durum,
            yy.tarih,
            yy.yayin_tarihi,
            y.ad_soyad,
            y.fotograf,
            y.biyografi
          FROM yazar_yazilari yy
          INNER JOIN yazarlar y
            ON y.id = yy.yazar_id
          WHERE yy.id = ?
          AND yy.durum = 'yayinda'
          AND y.durum = 'aktif'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!yazi) {

      return Response.json({

        success: false,

        error:
          "Yayınlanmış yazar yazısı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      yazi

    }, {
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }
    });

  } catch (error) {

    console.error(
      "TEK YAZAR YAZISI API HATASI:",
      error
    );

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
// 🔐 EDİTÖR / ADMIN YAZAR API'LERİ
// =========================================================

// ---------------------------------------------------------
// TÜM YAZARLARI GETİR
// Admin paneli
// GET /api/admin/yazarlar
// ---------------------------------------------------------

if (
  url.pathname === "/api/admin/yazarlar" &&
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
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          ORDER BY id DESC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazarlar:
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
// YAZAR EKLE
// POST /api/yazar
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const ad_soyad =
      String(
        data.ad_soyad || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const fotograf =
      String(
        data.fotograf || ""
      ).trim();

    const biyografi =
      String(
        data.biyografi || ""
      ).trim();

    const email =
      String(
        data.email || ""
      ).trim();

    const durum =
      String(
        data.durum || "beklemede"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString(
          "tr-TR"
        )
      ).trim();

    if (!ad_soyad) {

      return Response.json({

        success: false,

        error:
          "Yazar adı soyadı boş olamaz."

      }, {
        status: 400
      });

    }

    if (!il) {

      return Response.json({

        success: false,

        error:
          "Yazar ili belirtilmelidir."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          INSERT INTO yazarlar
          (
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          durum,
          tarih
        )
        .run();

    return Response.json({

      success: true,

      message:
        "Yazar başarıyla kaydedildi.",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    console.error(
      "YAZAR EKLEME HATASI:",
      error
    );

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
// YAZAR GÜNCELLE
// PUT /api/yazar?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const ad_soyad =
      String(
        data.ad_soyad || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const fotograf =
      String(
        data.fotograf || ""
      ).trim();

    const biyografi =
      String(
        data.biyografi || ""
      ).trim();

    const email =
      String(
        data.email || ""
      ).trim();

    const durum =
      String(
        data.durum || "beklemede"
      ).trim();

    if (!ad_soyad || !il) {

      return Response.json({

        success: false,

        error:
          "Yazar adı ve ili zorunludur."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE yazarlar
          SET
            ad_soyad = ?,
            il = ?,
            ilce = ?,
            fotograf = ?,
            biyografi = ?,
            email = ?,
            durum = ?
          WHERE id = ?
        `)
        .bind(
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          durum,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar güncellendi.",

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
// YAZAR SİL
// DELETE /api/yazar?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar" &&
  request.method === "DELETE"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          DELETE FROM yazarlar
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
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar silindi.",

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
// 📝 YAZAR YAZISI EDİTÖR API'LERİ
// =========================================================

// ---------------------------------------------------------
// TÜM YAZILARI GETİR
// Admin paneli
// GET /api/admin/yazar-yazilari
// ---------------------------------------------------------

if (
  url.pathname === "/api/admin/yazar-yazilari" &&
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
            yy.id,
            yy.yazar_id,
            yy.baslik,
            yy.icerik,
            yy.il,
            yy.ilce,
            yy.resim,
            yy.durum,
            yy.red_nedeni,
            yy.editor_notu,
            yy.tarih,
            yy.yayin_tarihi,
            y.ad_soyad,
            y.fotograf
          FROM yazar_yazilari yy
          LEFT JOIN yazarlar y
            ON y.id = yy.yazar_id
          ORDER BY yy.id DESC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazilar:
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
// YAZAR YAZISI EKLE
// POST /api/yazar-yazisi
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const yazar_id =
      Number(
        data.yazar_id
      );

    const baslik =
      String(
        data.baslik || ""
      ).trim();

    const icerik =
      String(
        data.icerik || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const resim =
      String(
        data.resim || ""
      ).trim();

    const durum =
      String(
        data.durum || "beklemede"
      ).trim();

    const tarih =
      String(
        data.tarih ||
        new Date().toLocaleDateString(
          "tr-TR"
        )
      ).trim();

    if (!yazar_id) {

      return Response.json({

        success: false,

        error:
          "Yazar belirtilmedi."

      }, {
        status: 400
      });

    }

    if (!baslik) {

      return Response.json({

        success: false,

        error:
          "Yazı başlığı boş olamaz."

      }, {
        status: 400
      });

    }

    const yazar =
      await env.DB
        .prepare(`
          SELECT id
          FROM yazarlar
          WHERE id = ?
          LIMIT 1
        `)
        .bind(yazar_id)
        .first();

    if (!yazar) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    const result =
      await env.DB
        .prepare(`
          INSERT INTO yazar_yazilari
          (
            yazar_id,
            baslik,
            icerik,
            il,
            ilce,
            resim,
            durum,
            tarih
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(
          yazar_id,
          baslik,
          icerik,
          il,
          ilce,
          resim,
          durum,
          tarih
        )
        .run();

    return Response.json({

      success: true,

      message:
        "Yazar yazısı editör incelemesine gönderildi.",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    console.error(
      "YAZAR YAZISI EKLEME HATASI:",
      error
    );

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
// YAZAR YAZISI GÜNCELLE
// PUT /api/yazar-yazisi?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

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

    const icerik =
      String(
        data.icerik || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const resim =
      String(
        data.resim || ""
      ).trim();

    const editor_notu =
      String(
        data.editor_notu || ""
      ).trim();

    const red_nedeni =
      String(
        data.red_nedeni || ""
      ).trim();

    if (!baslik) {

      return Response.json({

        success: false,

        error:
          "Yazı başlığı boş olamaz."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE yazar_yazilari
          SET
            baslik = ?,
            icerik = ?,
            il = ?,
            ilce = ?,
            resim = ?,
            editor_notu = ?,
            red_nedeni = ?
          WHERE id = ?
        `)
        .bind(
          baslik,
          icerik,
          il,
          ilce,
          resim,
          editor_notu,
          red_nedeni,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazar yazısı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar yazısı güncellendi.",

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
// YAZAR YAZISINI YAYINLA
// PUT /api/yazar-yazisi-yayinla?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi-yayinla" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const mevcut =
      await env.DB
        .prepare(`
          SELECT id
          FROM yazar_yazilari
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!mevcut) {

      return Response.json({

        success: false,

        error:
          "Yazar yazısı bulunamadı."

      }, {
        status: 404
      });

    }

    const yayinTarihi =
      new Date().toLocaleDateString(
        "tr-TR"
      );

    const result =
      await env.DB
        .prepare(`
          UPDATE yazar_yazilari
          SET
            durum = 'yayinda',
            yayin_tarihi = ?,
            red_nedeni = NULL
          WHERE id = ?
        `)
        .bind(
          yayinTarihi,
          id
        )
        .run();

    return Response.json({

      success: true,

      message:
        "Yazar yazısı yayınlandı.",

      id

    });

  } catch (error) {

    console.error(
      "YAZI YAYINLAMA HATASI:",
      error
    );

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
// YAZAR YAZISINI REDDET
// PUT /api/yazar-yazisi-reddet?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi-reddet" &&
  request.method === "PUT"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const red_nedeni =
      String(
        data.red_nedeni || ""
      ).trim();

    const editor_notu =
      String(
        data.editor_notu || ""
      ).trim();

    const result =
      await env.DB
        .prepare(`
          UPDATE yazar_yazilari
          SET
            durum = 'red',
            red_nedeni = ?,
            editor_notu = ?
          WHERE id = ?
        `)
        .bind(
          red_nedeni,
          editor_notu,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazar yazısı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar yazısı reddedildi.",

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
// YAZAR YAZISI SİL
// DELETE /api/yazar-yazisi?id=1
// ---------------------------------------------------------

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "DELETE"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          DELETE FROM yazar_yazilari
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
          "Yazar yazısı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar yazısı silindi.",

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
// ✍️ YAZARLAR API
// GET    /api/yazarlar
// POST   /api/yazar
// PUT    /api/yazar?id=1
// DELETE /api/yazar?id=1
// =========================================================

if (
  url.pathname === "/api/yazarlar" &&
  request.method === "GET"
) {

  try {

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          WHERE durum = 'aktif'
          ORDER BY il ASC, ad_soyad ASC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazarlar:
        result.results

    }, {
      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=60"
      }
    });

  } catch (error) {

    console.error(
      "YAZARLAR API HATASI:",
      error
    );

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
// YENİ YAZAR BAŞVURUSU
// POST /api/yazar
// =========================================================

if (
  url.pathname === "/api/yazar" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const ad_soyad =
      String(
        data.ad_soyad || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const fotograf =
      String(
        data.fotograf || ""
      ).trim();

    const biyografi =
      String(
        data.biyografi || ""
      ).trim();

    const email =
      String(
        data.email || ""
      ).trim();

    if (!ad_soyad) {

      return Response.json({
        success: false,
        error:
          "Ad soyad boş olamaz."
      }, {
        status: 400
      });

    }

    if (!il) {

      return Response.json({
        success: false,
        error:
          "İl belirtilmelidir."
      }, {
        status: 400
      });

    }

    /*
      Aynı e-posta ile tekrar başvuru
      yapılmasını engelle.
    */

    if (email) {

      const mevcut =
        await env.DB
          .prepare(`
            SELECT id
            FROM yazarlar
            WHERE email = ?
            LIMIT 1
          `)
          .bind(email)
          .first();

      if (mevcut) {

        return Response.json({
          success: false,
          error:
            "Bu e-posta adresiyle daha önce yazar başvurusu yapılmış."
        }, {
          status: 409
        });

      }

    }

    const tarih =
      new Intl.DateTimeFormat(
        "tr-TR",
        {
          timeZone:
            "Europe/Istanbul"
        }
      ).format(
        new Date()
      );

    const result =
      await env.DB
        .prepare(`
          INSERT INTO yazarlar
          (
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          )
          VALUES (?, ?, ?, ?, ?, ?, 'beklemede', ?)
        `)
        .bind(
          ad_soyad,
          il,
          ilce,
          fotograf,
          biyografi,
          email,
          tarih
        )
        .run();

    return Response.json({

      success: true,

      message:
        "Yazar başvurunuz alındı. Editör incelemesinden sonra sonuçlandırılacaktır.",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    console.error(
      "YAZAR BAŞVURU HATASI:",
      error
    );

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
// BEKLEYEN / TÜM YAZARLAR
// SADECE EDİTÖR
// GET /api/yazar-basvurular
// =========================================================

if (
  url.pathname === "/api/yazar-basvurular" &&
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
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          ORDER BY id DESC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results.length,

      yazarlar:
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
// YAZAR ONAYLA / REDDET
// PUT /api/yazar?id=1
// SADECE EDİTÖR
// =========================================================

if (
  url.pathname === "/api/yazar" &&
  request.method === "PUT"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({

      success: false,

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const durum =
      String(
        data.durum || ""
      ).trim();

    if (
      ![
        "aktif",
        "reddedildi",
        "beklemede"
      ].includes(durum)
    ) {

      return Response.json({

        success: false,

        error:
          "Geçersiz yazar durumu."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE yazarlar
          SET durum = ?
          WHERE id = ?
        `)
        .bind(
          durum,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        durum === "aktif"
          ? "Yazar aktif edildi."
          : durum === "reddedildi"
          ? "Yazar başvurusu reddedildi."
          : "Yazar tekrar beklemeye alındı.",

      id,

      durum

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
// YAZAR SİL
// DELETE /api/yazar?id=1
// SADECE EDİTÖR
// =========================================================

if (
  url.pathname === "/api/yazar" &&
  request.method === "DELETE"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({

      success: false,

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          DELETE FROM yazarlar
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
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar silindi.",

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
    // HABERLER API
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
// GET /api/haber?id=1
// =========================================================

if (
  url.pathname === "/api/haber" &&
  request.method === "GET"
) {
  try {
    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({
        success: false,
        error: "Haber ID belirtilmedi."
      }, {
        status: 400
      });
    }

    const haber = await env.DB
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
        error: "Haber bulunamadı."
      }, {
        status: 404
      });
    }

    // Okunma sayısını artır
    await env.DB
      .prepare(`
        UPDATE haberler
        SET okunma = COALESCE(okunma, 0) + 1
        WHERE id = ?
      `)
      .bind(id)
      .run();

    haber.okunma =
      (Number(haber.okunma) || 0) + 1;

    return Response.json({
      success: true,
      haber: haber
    }, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store"
      }
    });

  } catch (error) {

    console.error(
      "TEK HABER API HATASI:",
      error
    );

    return Response.json({
      success: false,
      error: error.message
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
            data.kategori || "Gündem"
          ).trim();

        const resim =
          String(
            data.resim || ""
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
            data.durum || "yayinda"
          ).trim();

        const manset =
          data.manset ? 1 : 0;

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
    // HABER GÜNCELLE
    // PUT /api/haber?id=1
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
            data.kategori || "Gündem"
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
            data.durum || "yayinda"
          ).trim();

        const manset =
          data.manset ? 1 : 0;

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
              "Haber bulunamadı."

          }, {
            status: 404
          });

        }

        return Response.json({

          success: true,

          message:
            "Haber güncellendi.",

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
    // HABER SİL
    // DELETE /api/haber?id=1
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
            "Haber silindi.",

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
    // HABER İSTATİSTİK
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

      if (auth !== "ok") {

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
            (sum, h) =>
              sum +
              (Number(h.okunma) || 0),
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
    // FİRMALAR
    // =========================================================

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

    // =========================================================
    // TEK FİRMA
    // =========================================================

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

    // =========================================================
    // FİRMA EKLE
    // =========================================================

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

    // =========================================================
    // FİRMA GÜNCELLE
    // =========================================================

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
              "Firma bulunamadı."

          }, {
            status: 404
          });

        }

        return Response.json({

          success: true,

          message:
            "Firma güncellendi.",

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
    // FİRMA SİL
    // =========================================================

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
            "Firma silindi.",

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
    // VİDEOLAR
    // =========================================================

    if (
      url.pathname === "/api/videolar" &&
      request.method === "GET"
    ) {

      try {

        const result =
          await env.DB
            .prepare(`
              SELECT
                id,
                baslik,
                ozet,
                video_url,
                kapak_resmi,
                kategori,
                tarih,
                durum,
                manset,
                izlenme
              FROM video_haberler
              WHERE durum = 'yayinda'
              ORDER BY id DESC
            `)
            .all();

        return Response.json({

          success: true,

          toplam:
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

    // =========================================================
    // TEK VİDEO
    // =========================================================

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

            error:
              "Video ID belirtilmedi."

          }, {
            status: 400
          });

        }

        const video =
          await env.DB
            .prepare(`
              SELECT
                id,
                baslik,
                ozet,
                video_url,
                kapak_resmi,
                kategori,
                tarih,
                durum,
                manset,
                izlenme
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

            error:
              "Video bulunamadı."

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

          error:
            error.message

        }, {
          status: 500
        });

      }
    }

    // =========================================================
    // VİDEO EKLE
    // =========================================================

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
            "Video Haber"
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

            error:
              "Video başlığı boş olamaz."

          }, {
            status: 400
          });

        }

        if (!video_url) {

          return Response.json({

            success: false,

            error:
              "Video bağlantısı boş olamaz."

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

    // =========================================================
    // VİDEO GÜNCELLE
    // =========================================================

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

            error:
              "Video ID belirtilmedi."

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
            "Video Haber"
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

            error:
              "Video başlığı boş olamaz."

          }, {
            status: 400
          });

        }

        if (!video_url) {

          return Response.json({

            success: false,

            error:
              "Video bağlantısı boş olamaz."

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

            error:
              "Video bulunamadı."

          }, {
            status: 404
          });

        }

        return Response.json({

          success: true,

          message:
            "Video güncellendi.",

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
    // VİDEO SİL
    // =========================================================

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

            error:
              "Video ID belirtilmedi."

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

            error:
              "Silinecek video bulunamadı."

          }, {
            status: 404
          });

        }

        return Response.json({

          success: true,

          message:
            "Video silindi.",

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
    // VİDEO İSTATİSTİK
    // =========================================================

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
            (sum, v) =>
              sum +
              (Number(v.izlenme) || 0),
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
// =========================================================
// ✍️ YAZARLAR SİSTEMİ
// 81 İL · 81 SES · TÜRKİYE'NİN DİJİTAL GÜNDEMİ
// =========================================================


// =========================================================
// GET /api/yazarlar
// Aktif yazarları getir
// =========================================================

if (
  url.pathname === "/api/yazarlar" &&
  request.method === "GET"
) {

  try {

    const result =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          WHERE durum = 'aktif'
          ORDER BY il ASC, ad_soyad ASC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results?.length || 0,

      yazarlar:
        result.results || []

    }, {

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }

    });

  } catch (error) {

    console.error(
      "YAZARLAR API HATASI:",
      error
    );

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
// GET /api/yazar
// Tek yazar
// =========================================================

if (
  url.pathname === "/api/yazar" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const yazar =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          WHERE id = ?
          AND durum = 'aktif'
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!yazar) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      yazar

    }, {

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }

    });

  } catch (error) {

    console.error(
      "TEK YAZAR API HATASI:",
      error
    );

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
// GET /api/yazar-yazilari
// Yayındaki yazar yazıları
//
// Kullanım:
// /api/yazar-yazilari
// /api/yazar-yazilari?yazar_id=1
// =========================================================

if (
  url.pathname === "/api/yazar-yazilari" &&
  request.method === "GET"
) {

  try {

    const yazar_id =
      url.searchParams.get("yazar_id");

    let result;

    if (yazar_id) {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.id,
              yy.yazar_id,
              yy.baslik,
              yy.icerik,
              yy.il,
              yy.ilce,
              yy.resim,
              yy.durum,
              yy.red_nedeni,
              yy.editor_notu,
              yy.tarih,
              yy.yayin_tarihi,
              y.ad_soyad,
              y.fotograf,
              y.biyografi
            FROM yazar_yazilari yy
            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id
            WHERE
              yy.durum = 'yayinda'
              AND y.durum = 'aktif'
              AND yy.yazar_id = ?
            ORDER BY
              yy.id DESC
          `)
          .bind(yazar_id)
          .all();

    } else {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.id,
              yy.yazar_id,
              yy.baslik,
              yy.icerik,
              yy.il,
              yy.ilce,
              yy.resim,
              yy.durum,
              yy.red_nedeni,
              yy.editor_notu,
              yy.tarih,
              yy.yayin_tarihi,
              y.ad_soyad,
              y.fotograf,
              y.biyografi
            FROM yazar_yazilari yy
            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id
            WHERE
              yy.durum = 'yayinda'
              AND y.durum = 'aktif'
            ORDER BY
              yy.id DESC
          `)
          .all();

    }

    return Response.json({

      success: true,

      toplam:
        result.results?.length || 0,

      yazilar:
        result.results || []

    }, {

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }

    });

  } catch (error) {

    console.error(
      "YAZAR YAZILARI API HATASI:",
      error
    );

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
// GET /api/yazar-yazisi
// Tek yayınlanmış yazı
// =========================================================

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "GET"
) {

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const yazi =
      await env.DB
        .prepare(`
          SELECT
            yy.id,
            yy.yazar_id,
            yy.baslik,
            yy.icerik,
            yy.il,
            yy.ilce,
            yy.resim,
            yy.durum,
            yy.tarih,
            yy.yayin_tarihi,

            y.ad_soyad,
            y.fotograf,
            y.biyografi,
            y.il AS yazar_il,
            y.ilce AS yazar_ilce

          FROM yazar_yazilari yy

          INNER JOIN yazarlar y
            ON y.id = yy.yazar_id

          WHERE
            yy.id = ?
            AND yy.durum = 'yayinda'
            AND y.durum = 'aktif'

          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!yazi) {

      return Response.json({

        success: false,

        error:
          "Yayınlanmış yazı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      yazi

    }, {

      headers: {
        "Content-Type":
          "application/json; charset=UTF-8",
        "Cache-Control":
          "public, max-age=300"
      }

    });

  } catch (error) {

    console.error(
      "TEK YAZAR YAZISI API HATASI:",
      error
    );

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
// POST /api/yazar-yazisi
// Yazar yazı gönderir
//
// ÖNEMLİ:
// Yazı otomatik yayınlanmaz.
// Her zaman "beklemede" olarak kaydedilir.
// =========================================================

if (
  url.pathname === "/api/yazar-yazisi" &&
  request.method === "POST"
) {

  try {

    const data =
      await request.json();

    const yazar_id =
      Number(data.yazar_id || 0);

    const baslik =
      String(
        data.baslik || ""
      ).trim();

    const icerik =
      String(
        data.icerik || ""
      ).trim();

    const il =
      String(
        data.il || ""
      ).trim();

    const ilce =
      String(
        data.ilce || ""
      ).trim();

    const resim =
      String(
        data.resim || ""
      ).trim();

    if (!yazar_id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    if (!baslik) {

      return Response.json({

        success: false,

        error:
          "Yazı başlığı boş olamaz."

      }, {
        status: 400
      });

    }

    if (!icerik) {

      return Response.json({

        success: false,

        error:
          "Yazı içeriği boş olamaz."

      }, {
        status: 400
      });

    }

    // YAZAR KONTROLÜ

    const yazar =
      await env.DB
        .prepare(`
          SELECT
            id,
            ad_soyad,
            il,
            ilce,
            durum
          FROM yazarlar
          WHERE id = ?
          LIMIT 1
        `)
        .bind(yazar_id)
        .first();

    if (!yazar) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    if (yazar.durum !== "aktif") {

      return Response.json({

        success: false,

        error:
          "Bu yazar şu anda aktif değil."

      }, {
        status: 403
      });

    }

    const tarih =
      new Intl.DateTimeFormat(
        "tr-TR",
        {
          timeZone:
            "Europe/Istanbul"
        }
      ).format(
        new Date()
      );

    const result =
      await env.DB
        .prepare(`
          INSERT INTO yazar_yazilari
          (
            yazar_id,
            baslik,
            icerik,
            il,
            ilce,
            resim,
            durum,
            red_nedeni,
            editor_notu,
            tarih,
            yayin_tarihi
          )
          VALUES
          (?, ?, ?, ?, ?, ?, 'beklemede', '', '', ?, NULL)
        `)
        .bind(
          yazar_id,
          baslik,
          icerik,
          il || yazar.il,
          ilce || yazar.ilce,
          resim,
          tarih
        )
        .run();

    return Response.json({

      success: true,

      message:
        "Yazınız editör incelemesine gönderildi.",

      durum:
        "beklemede",

      id:
        result.meta.last_row_id

    });

  } catch (error) {

    console.error(
      "YAZI GÖNDERME HATASI:",
      error
    );

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
// GET /api/admin/yazarlar
// Editör paneli için TÜM yazarlar
// =========================================================

if (
  url.pathname === "/api/admin/yazarlar" &&
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
            ad_soyad,
            il,
            ilce,
            fotograf,
            biyografi,
            email,
            durum,
            tarih
          FROM yazarlar
          ORDER BY id DESC
        `)
        .all();

    return Response.json({

      success: true,

      toplam:
        result.results?.length || 0,

      yazarlar:
        result.results || []

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
// GET /api/admin/yazar-yazilari
// Editör paneli için BEKLEYEN + YAYINLANAN + REDDEDİLEN
// =========================================================

if (
  url.pathname === "/api/admin/yazar-yazilari" &&
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

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const durum =
      url.searchParams.get("durum");

    let result;

    if (
      durum === "beklemede" ||
      durum === "yayinda" ||
      durum === "reddedildi"
    ) {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.*,

              y.ad_soyad,
              y.fotograf AS yazar_fotograf,
              y.il AS yazar_il,
              y.ilce AS yazar_ilce

            FROM yazar_yazilari yy

            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id

            WHERE yy.durum = ?

            ORDER BY yy.id DESC
          `)
          .bind(durum)
          .all();

    } else {

      result =
        await env.DB
          .prepare(`
            SELECT
              yy.*,

              y.ad_soyad,
              y.fotograf AS yazar_fotograf,
              y.il AS yazar_il,
              y.ilce AS yazar_ilce

            FROM yazar_yazilari yy

            INNER JOIN yazarlar y
              ON y.id = yy.yazar_id

            ORDER BY yy.id DESC
          `)
          .all();

    }

    return Response.json({

      success: true,

      toplam:
        result.results?.length || 0,

      yazilar:
        result.results || []

    });

  } catch (error) {

    console.error(
      "ADMIN YAZAR YAZILARI HATASI:",
      error
    );

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
// GET /api/admin/yazar-yazisi
// Editör bir yazının tamamını görür
// =========================================================

if (
  url.pathname === "/api/admin/yazar-yazisi" &&
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

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const yazi =
      await env.DB
        .prepare(`
          SELECT
            yy.*,

            y.ad_soyad,
            y.fotograf AS yazar_fotograf,
            y.il AS yazar_il,
            y.ilce AS yazar_ilce,
            y.biyografi AS yazar_biyografi

          FROM yazar_yazilari yy

          INNER JOIN yazarlar y
            ON y.id = yy.yazar_id

          WHERE yy.id = ?

          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!yazi) {

      return Response.json({

        success: false,

        error:
          "Yazı bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      yazi

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
// PUT /api/admin/yazar-yazisi
//
// EDITÖR İŞLEMİ:
//
// durum = yayinda
// durum = reddedildi
// durum = beklemede
//
// Yayınlanınca yayın_tarihi otomatik yazılır.
// =========================================================

if (
  url.pathname === "/api/admin/yazar-yazisi" &&
  request.method === "PUT"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({

      success: false,

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazı ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const yeniDurum =
      String(
        data.durum || ""
      ).trim();

    const editor_notu =
      String(
        data.editor_notu || ""
      ).trim();

    const red_nedeni =
      String(
        data.red_nedeni || ""
      ).trim();

    const izinVerilenDurumlar = [
      "beklemede",
      "yayinda",
      "reddedildi"
    ];

    if (
      !izinVerilenDurumlar.includes(
        yeniDurum
      )
    ) {

      return Response.json({

        success: false,

        error:
          "Geçersiz durum. beklemede, yayinda veya reddedildi olabilir."

      }, {
        status: 400
      });

    }

    const mevcut =
      await env.DB
        .prepare(`
          SELECT
            id,
            durum
          FROM yazar_yazilari
          WHERE id = ?
          LIMIT 1
        `)
        .bind(id)
        .first();

    if (!mevcut) {

      return Response.json({

        success: false,

        error:
          "Yazı bulunamadı."

      }, {
        status: 404
      });

    }

    let yayin_tarihi = null;

    if (
      yeniDurum === "yayinda"
    ) {

      yayin_tarihi =
        new Intl.DateTimeFormat(
          "tr-TR",
          {
            timeZone:
              "Europe/Istanbul",
            dateStyle:
              "short",
            timeStyle:
              "short"
          }
        ).format(
          new Date()
        );

    }

    if (
      yeniDurum === "reddedildi"
    ) {

      if (!red_nedeni) {

        return Response.json({

          success: false,

          error:
            "Reddedilen yazı için red nedeni belirtilmelidir."

        }, {
          status: 400
        });

      }

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE yazar_yazilari
          SET
            durum = ?,
            red_nedeni = ?,
            editor_notu = ?,
            yayin_tarihi = ?
          WHERE id = ?
        `)
        .bind(
          yeniDurum,
          red_nedeni,
          editor_notu,
          yayin_tarihi,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazı güncellenemedi."

      }, {
        status: 404
      });

    }

    let mesaj =
      "Yazı beklemeye alındı.";

    if (
      yeniDurum === "yayinda"
    ) {

      mesaj =
        "Yazı başarıyla yayınlandı.";

    }

    if (
      yeniDurum === "reddedildi"
    ) {

      mesaj =
        "Yazı reddedildi.";

    }

    return Response.json({

      success: true,

      message:
        mesaj,

      id,

      durum:
        yeniDurum,

      yayin_tarihi

    });

  } catch (error) {

    console.error(
      "EDITÖR YAZI İŞLEMİ HATASI:",
      error
    );

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
// PUT /api/admin/yazar
// Editör yazarın durumunu değiştirir
//
// aktif
// beklemede
// pasif
// =========================================================

if (
  url.pathname === "/api/admin/yazar" &&
  request.method === "PUT"
) {

  const auth =
    cookieOku(
      request,
      ADMIN_COOKIE
    );

  if (auth !== "ok") {

    return Response.json({

      success: false,

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const id =
      url.searchParams.get("id");

    if (!id) {

      return Response.json({

        success: false,

        error:
          "Yazar ID belirtilmedi."

      }, {
        status: 400
      });

    }

    const data =
      await request.json();

    const durum =
      String(
        data.durum || ""
      ).trim();

    const izinVerilen = [
      "aktif",
      "beklemede",
      "pasif"
    ];

    if (
      !izinVerilen.includes(
        durum
      )
    ) {

      return Response.json({

        success: false,

        error:
          "Geçersiz yazar durumu."

      }, {
        status: 400
      });

    }

    const result =
      await env.DB
        .prepare(`
          UPDATE yazarlar
          SET durum = ?
          WHERE id = ?
        `)
        .bind(
          durum,
          id
        )
        .run();

    if (
      result.meta.changes === 0
    ) {

      return Response.json({

        success: false,

        error:
          "Yazar bulunamadı."

      }, {
        status: 404
      });

    }

    return Response.json({

      success: true,

      message:
        "Yazar durumu güncellendi.",

      id,

      durum

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
// GET /api/yazar-istatistik
// Editör paneli için özet
// =========================================================

if (
  url.pathname === "/api/yazar-istatistik" &&
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

      error:
        "Yetkisiz erişim."

    }, {
      status: 401
    });

  }

  try {

    const yazarlar =
      await env.DB
        .prepare(`
          SELECT
            COUNT(*) AS toplam,
            SUM(
              CASE
                WHEN durum = 'aktif'
                THEN 1
                ELSE 0
              END
            ) AS aktif,
            SUM(
              CASE
                WHEN durum = 'beklemede'
                THEN 1
                ELSE 0
              END
            ) AS beklemede
          FROM yazarlar
        `)
        .first();

    const yazilar =
      await env.DB
        .prepare(`
          SELECT
            COUNT(*) AS toplam,
            SUM(
              CASE
                WHEN durum = 'beklemede'
                THEN 1
                ELSE 0
              END
            ) AS beklemede,
            SUM(
              CASE
                WHEN durum = 'yayinda'
                THEN 1
                ELSE 0
              END
            ) AS yayinda,
            SUM(
              CASE
                WHEN durum = 'reddedildi'
                THEN 1
                ELSE 0
              END
            ) AS reddedildi
          FROM yazar_yazilari
        `)
        .first();

    return Response.json({

      success: true,

      yazarlar: {

        toplam:
          Number(
            yazarlar?.toplam
          ) || 0,

        aktif:
          Number(
            yazarlar?.aktif
          ) || 0,

        beklemede:
          Number(
            yazarlar?.beklemede
          ) || 0

      },

      yazilar: {

        toplam:
          Number(
            yazilar?.toplam
          ) || 0,

        beklemede:
          Number(
            yazilar?.beklemede
          ) || 0,

        yayinda:
          Number(
            yazilar?.yayinda
          ) || 0,

        reddedildi:
          Number(
            yazilar?.reddedildi
          ) || 0

      }

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
    // ESKİ HABER ADRESLERİ
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

      return new Response(null, {

        status: 302,

        headers: {

          "Location":
            "/admin-giris",

          "Set-Cookie":
            `${ADMIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`

        }

      });

    }

    // =========================================================
    // STATİK DOSYALAR
    // CLOUDFLARE ASSETS
    // =========================================================

    return env.ASSETS.fetch(request);

  }
};
