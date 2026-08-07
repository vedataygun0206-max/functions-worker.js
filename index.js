export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/test") {
      const result = await env.DB
        .prepare("SELECT 1 AS test")
        .first();

      return Response.json({
        success: true,
        database: "D1 bağlantısı çalışıyor",
        result
      });
    }

    return new Response("Digital Gündem API çalışıyor.");
  }
};
