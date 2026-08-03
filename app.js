// =========================
// Digital Gündem app.js
// =========================

document.addEventListener("DOMContentLoaded", () => {

  console.log("Digital Gündem hazır.");

  // Haber kartları
  document.querySelectorAll(".news-card").forEach(card => {
    card.addEventListener("click", () => {
      alert("Bu haberin detay sayfası yakında aktif olacak.");
    });
  });

});

// Sayfa başına dön butonu
const topBtn = document.createElement("button");

topBtn.innerHTML = "⬆";

topBtn.style.position = "fixed";
topBtn.style.right = "20px";
topBtn.style.bottom = "20px";
topBtn.style.width = "50px";
topBtn.style.height = "50px";
topBtn.style.border = "none";
topBtn.style.borderRadius = "50%";
topBtn.style.background = "#d60000";
topBtn.style.color = "#fff";
topBtn.style.fontSize = "22px";
topBtn.style.cursor = "pointer";
topBtn.style.display = "none";

document.body.appendChild(topBtn);

window.addEventListener("scroll", () => {
  if (window.scrollY > 300) {
    topBtn.style.display = "block";
  } else {
    topBtn.style.display = "none";
  }
});

topBtn.onclick = () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};
