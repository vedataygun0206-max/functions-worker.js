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
    // HABERLER API
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
    // ANA SAYFA
    // =========================

    return new Response(
      `<!DOCTYPE html>
      <html lang="tr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Digital Gündem</title>
      </head>

      <body>

        <h1>Digital Gündem</h1>

        <p>Türkiye'nin Dijital Rehberi</p>

        <p>Worker ve D1 bağlantısı aktif.</p>

        <p>
          <a href="/api/haberler">
            Haber API'sini görüntüle
          </a>
        </p>

      </body>
      </html>`,
      {
        headers: {
          "content-type": "text/html; charset=UTF-8"
        }
      }
    );

  }
};
