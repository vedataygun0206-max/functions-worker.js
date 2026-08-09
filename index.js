export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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
    // HABER SAYFASI
    // /haber.html?id=4
    // =========================
    if (
      url.pathname === "/haber.html" ||
      url.pathname === "/pages/haber.html"
    ) {
      const haberUrl = new URL(request.url);

      haberUrl.pathname = "/pages/haber.html";

      const haberRequest = new Request(
        haberUrl.toString(),
        {
          method: "GET",
          headers: request.headers
        }
      );

      return env.ASSETS.fetch(haberRequest);
    }


    // =========================
    // WEB SİTESİ
    // =========================
    return env.ASSETS.fetch(request);
  }
};
