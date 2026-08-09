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
    // HABERLER
    // =========================
    if (url.pathname === "/api/haberler") {
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
    // =========================
    if (url.pathname === "/api/haber") {
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
    // WEB SİTESİ
    // =========================
    return env.ASSETS.fetch(request);
  }
};
