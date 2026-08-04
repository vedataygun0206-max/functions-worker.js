// Digital Gündem Yönetim Paneli

document.addEventListener("DOMContentLoaded", () => {

    const form = document.getElementById("haberForm");
    const resimInput = document.getElementById("haberResim");

    let secilenResim = "";

    // Galeriden fotoğraf seç
    resimInput.addEventListener("change", function () {

        const dosya = this.files[0];

        if (!dosya) return;

        const reader = new FileReader();

        reader.onload = function (e) {
            secilenResim = e.target.result;
        };

        reader.readAsDataURL(dosya);

    });

    // Haber kaydet
    form.addEventListener("submit", function (e) {

        e.preventDefault();

        const haber = {
            baslik: document.getElementById("baslik").value,
            kategori: document.getElementById("kategori").value,
            resim: secilenResim,
            ozet: document.getElementById("ozet").value,
            tarih: new Date().toLocaleDateString("tr-TR")
        };

        let haberler = JSON.parse(localStorage.getItem("haberler")) || [];

        haberler.unshift(haber);

        localStorage.setItem("haberler", JSON.stringify(haberler));

        alert("✅ Haber başarıyla kaydedildi.");

        form.reset();

        secilenResim = "";

    });

});
