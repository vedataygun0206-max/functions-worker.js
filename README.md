export async function onRequestGet() {
  const rssUrl = "https://www.trthaber.com/sondakika_articles.rss";

  try {
    const response = await fetch(rssUrl);
    const xml = await response.text();

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml; charset=UTF-8",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (e) {
    return new Response("RSS alınamadı.", {
      status: 500
    });
  }
}
