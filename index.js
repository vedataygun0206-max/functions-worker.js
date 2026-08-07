export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

    return new Response("Digital Gündem Worker çalışıyor.");
  }
};
