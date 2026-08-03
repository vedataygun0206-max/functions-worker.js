// Digital Gündem Yönetim Paneli

document.addEventListener("DOMContentLoaded", () => {

  const form = document.getElementById("haberForm");

  form.addEventListener("submit", function(e){

    e.preventDefault();

    const haber = {
      baslik: document.getElementById("baslik").value,
      kategori: document.getElementById("kategori").value,
      resim: document.getElementById("resim").value,
      ozet: document.getElementById("ozet").value,
      tarih: new Date().toLocaleDateString("tr-TR")
    };

    let haberler = JSON.parse(localStorage.getItem("haberler")) || [];

    haberler.unshift(haber);

    localStorage.setItem("haberler", JSON.stringify(haberler));

    alert("✅ Haber başarıyla kaydedildi.");

    form.reset();

  });

});
