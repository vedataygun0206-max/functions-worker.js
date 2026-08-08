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
    // HABERLER - GET
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
    // HABER EKLE - POST
    // =========================
    if (
      url.pathname === "/api/haberler" &&
      request.method === "POST"
    ) {

      try {

        const data = await request.json();

        const baslik = data.baslik || "";
        const ozet = data.ozet || "";
        const icerik = data.icerik || "";
        const kategori = data.kategori || "Gündem";
        const resim = data.resim || "";
        const tarih = data.tarih || new Date().toLocaleDateString("tr-TR");
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
          message: "Haber başarıyla eklendi.",
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
    // ANA WORKER
    // =========================

    return new Response(
      "Digital Gündem Worker çalışıyor."
    );

  }
};
