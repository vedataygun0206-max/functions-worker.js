export default {
  async fetch(request, env) {
    const url = new URL(request.url);
// =========================
// ÖZEL REKLAMLAR
// =========================

// TÜM AKTİF REKLAMLAR
if (url.pathname === "/api/reklamlar" && request.method === "GET") {
  try {

    const result = await env.DB
      .prepare(`
        SELECT *
        FROM reklamlar
        WHERE durum = 'aktif'
        AND datetime('now') >= datetime(baslangic)
        AND datetime('now') <= datetime(bitis)
        ORDER BY id DESC
      `)
      .all();

    return Response.json({
      success: true,
      toplam: result.results.length,
      reklamlar: result.results
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });

  }
}


// TEK REKLAM
if (url.pathname === "/api/reklam" && request.method === "GET") {
  try {

    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({
        success: false,
        error: "Reklam ID belirtilmedi."
      }, { status: 400 });
    }

    const reklam = await env.DB
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


// REKLAM EKLE
if (url.pathname === "/api/reklam" && request.method === "POST") {
  try {

    const data = await request.json();

    const firma_adi = data.firma_adi || "";
    const resim = data.resim || "";
    const link = data.link || "";
    const konum = data.konum || "anasayfa";
    const baslangic = data.baslangic || "";
    const bitis = data.bitis || "";
    const durum = data.durum || "aktif";

    if (!firma_adi.trim()) {
      return Response.json({
        success: false,
        error: "Firma / reklamveren adı boş olamaz."
      }, { status: 400 });
    }

    if (!baslangic || !bitis) {
      return Response.json({
        success: false,
        error: "Başlangıç ve bitiş tarihi gereklidir."
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
      message: "Özel reklam başarıyla eklendi.",
      id: result.meta.last_row_id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });

  }
}


// REKLAM DÜZENLE
if (url.pathname === "/api/reklam" && request.method === "PUT") {
  try {

    const id = url.searchParams.get("id");

    if (!id) {
      return Response.json({
        success: false,
        error: "Reklam ID belirtilmedi."
      }, { status: 400 });
    }

    const data = await request.json();

    const firma_adi = data.firma_adi || "";
    const resim = data.resim || "";
    const link = data.link || "";
    const konum = data.konum || "anasayfa";
    const baslangic = data.baslangic || "";
    const bitis = data.bitis || "";
    const durum = data.durum || "aktif";

    if (!firma_adi.trim()) {
      return Response.json({
        success: false,
        error: "Firma / reklamveren adı boş olamaz."
      }, { status: 400 });
    }

    const result = await env.DB
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
      message: "Özel reklam güncellendi.",
      id: id,
      changes: result.meta.changes
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });

  }
}


// REKLAM SİL
if (url.pathname === "/api/reklam" && request.method === "DELETE") {
  try {

    const id = url.searchParams.get("id");

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

    if (result.meta.changes === 0) {
      return Response.json({
        success: false,
        error: "Silinecek reklam bulunamadı."
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: "Özel reklam silindi.",
      id: id
    });

  } catch (error) {

    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });

  }
}
    // =========================
    // D1 TEST
    // =========================
    if (url.pathname === "/api/test") {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS test")
          .first();

        return Response.json({
          success: true,
          database: "connected",
          result
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }


    // =========================
    // TÜM YAYINDAKİ HABERLER
    // =========================
    if (
      url.pathname === "/api/haberler" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.DB
          .prepare(`
            SELECT *
            FROM haberler
            WHERE durum = 'yayinda'
            ORDER BY id DESC
          `)
          .all();

        return Response.json({
          success: true,
          toplam: result.results.length,
          haberler: result.results
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }


    // =========================
    // TEK HABER
    // /api/haber?id=4
    // =========================
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
          }, { status: 400 });
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
          }, { status: 404 });
        }

        return Response.json({
          success: true,
          haber
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }


    // =========================
    // HABER EKLE
    // =========================
    if (
      url.pathname === "/api/haber" &&
      request.method === "POST"
    ) {
      try {
        const data = await request.json();

        const baslik = data.baslik || "";
        const ozet = data.ozet || "";
        const icerik = data.icerik || "";
        const kategori = data.kategori || "Gündem";
        const resim = data.resim || "";
        const tarih =
          data.tarih ||
          new Date().toLocaleDateString("tr-TR");
        const durum = data.durum || "yayinda";
        const manset = data.manset ? 1 : 0;

        if (!baslik.trim()) {
          return Response.json({
            success: false,
            error: "Haber başlığı boş olamaz."
          }, { status: 400 });
        }

        const result = await env.DB
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
          success: true,
          message: "Haber başarıyla kaydedildi.",
          id: result.meta.last_row_id
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }


    // =========================
    // HABER DÜZENLE
    // =========================
    if (
      url.pathname === "/api/haber" &&
      request.method === "PUT"
    ) {
      try {
        const id = url.searchParams.get("id");

        if (!id) {
          return Response.json({
            success: false,
            error: "Haber ID belirtilmedi."
          }, { status: 400 });
        }

        const data = await request.json();

        const baslik = data.baslik || "";
        const ozet = data.ozet || "";
        const icerik = data.icerik || "";
        const kategori = data.kategori || "Gündem";
        const resim = data.resim || "";
        const tarih = data.tarih || "";
        const durum = data.durum || "yayinda";
        const manset = data.manset ? 1 : 0;

        if (!baslik.trim()) {
          return Response.json({
            success: false,
            error: "Haber başlığı boş olamaz."
          }, { status: 400 });
        }

        const result = await env.DB
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
          message: "Haber başarıyla güncellendi.",
          id: id,
          changes: result.meta.changes
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }


    // =========================
    // HABER SİL
    // =========================
    if (
      url.pathname === "/api/haber" &&
      request.method === "DELETE"
    ) {
      try {
        const id = url.searchParams.get("id");

        if (!id) {
          return Response.json({
            success: false,
            error: "Haber ID belirtilmedi."
          }, { status: 400 });
        }

        const result = await env.DB
          .prepare(`
            DELETE FROM haberler
            WHERE id = ?
          `)
          .bind(id)
          .run();

        if (result.meta.changes === 0) {
          return Response.json({
            success: false,
            error: "Silinecek haber bulunamadı."
          }, { status: 404 });
        }

        return Response.json({
          success: true,
          message: "Haber başarıyla silindi.",
          id: id
        });

      } catch (error) {
        return Response.json({
          success: false,
          error: error.message
        }, { status: 500 });
      }
    }

// =========================
// ESKİ HABER ADRESİ
// /pages/haber.html?id=4
// =========================
if (
  url.pathname === "/haber.html" ||
  url.pathname === "/pages/haber.html"
) {
  const yeniUrl = new URL(request.url);
  yeniUrl.pathname = "/pages/haber.html";

  return env.ASSETS.fetch(
    new Request(yeniUrl.toString(), request)
  );
}
    
    // =========================
    // WEB SİTESİ
    // =========================
    return env.ASSETS.fetch(request);
  }
};
