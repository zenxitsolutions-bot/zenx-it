const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add("visible");
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));

document.querySelectorAll(".service-item").forEach(item => {
  item.addEventListener("mousemove", e => {
    const r = item.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    item.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(215,255,66,.06), transparent 260px)`;
  });
  item.addEventListener("mouseleave", () => item.style.background = "");
});

document.querySelector(".menu-btn").addEventListener("click", () => {
  document.querySelector(".nav-links").classList.toggle("mobile-open");
});

const style = document.createElement("style");
style.textContent = `
@media(max-width:900px){
  .nav-links.mobile-open{
    display:flex;position:absolute;top:70px;left:5vw;right:5vw;
    flex-direction:column;padding:22px;background:#11120f;
    border:1px solid #ffffff18;z-index:50;
  }
}`;
document.head.appendChild(style);
