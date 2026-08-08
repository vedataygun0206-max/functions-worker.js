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
    // ANA WORKER
    // =========================

    return new Response(
      "Digital Gündem Worker çalışıyor."
    );

  }
};
