export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    // OPTIONS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    // JSON cevap yardımcısı
    function json(data, status = 200) {
      return new Response(JSON.stringify(data), {
        status,
        headers: {
          "Content-Type": "application/json; charset=UTF-8",
          ...corsHeaders
        }
      });
    }

    // Ana Worker testi
    if (url.pathname === "/api/test") {
      try {
        const result = await env.DB
          .prepare("SELECT 1 AS test")
          .first();

        return json({
          success: true,
          database: "connected",
          result
        });
      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // HABERLERİ LİSTELE
    if (
      url.pathname === "/api/haberler" &&
      request.method === "GET"
    ) {
      try {
        const result = await env.DB
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
              manset
            FROM haberler
            ORDER BY id DESC
          `)
          .all();

        return json({
          success: true,
          toplam: result.results.length,
          haberler: result.results
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // TEK HABER GETİR
    if (
      url.pathname === "/api/haberler" &&
      request.method === "GET" &&
      url.searchParams.get("id")
    ) {
      try {
        const id = Number(url.searchParams.get("id"));

        const haber = await env.DB
          .prepare(`
            SELECT *
            FROM haberler
            WHERE id = ?
          `)
          .bind(id)
          .first();

        if (!haber) {
          return json({
            success: false,
            error: "Haber bulunamadı."
          }, 404);
        }

        return json({
          success: true,
          haber
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // YENİ HABER EKLE
    if (
      url.pathname === "/api/haberler" &&
      request.method === "POST"
    ) {
      try {
        const data = await request.json();

        if (!data.baslik || !data.kategori) {
          return json({
            success: false,
            error: "Başlık ve kategori zorunludur."
          }, 400);
        }

        const tarih =
          data.tarih ||
          new Date().toLocaleString("tr-TR");

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
            data.baslik,
            data.ozet || "",
            data.icerik || "",
            data.kategori,
            data.resim || "",
            tarih,
            data.durum || "yayinda",
            data.manset ? 1 : 0
          )
          .run();

        return json({
          success: true,
          message: "Haber başarıyla eklendi.",
          id: result.meta.last_row_id
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // HABER SİL
    if (
      url.pathname === "/api/haberler" &&
      request.method === "DELETE"
    ) {
      try {
        const data = await request.json();

        if (!data.id) {
          return json({
            success: false,
            error: "Haber ID gerekli."
          }, 400);
        }

        await env.DB
          .prepare(`
            DELETE FROM haberler
            WHERE id = ?
          `)
          .bind(Number(data.id))
          .run();

        return json({
          success: true,
          message: "Haber silindi."
        });

      } catch (error) {
        return json({
          success: false,
          error: error.message
        }, 500);
      }
    }

    // WORKER ANA SAYFA
    return new Response(
      "Digital Gündem Worker çalışıyor.",
      {
        headers: corsHeaders
      }
    );
  }
};
