const SERVICES = [
  {
    no: "01",
    title: "Websites",
    desc: "Fast, modern websites designed around your brand, your customers and your goals.",
    tags: ["UI/UX", "Development", "E-commerce"],
  },
  {
    no: "02",
    title: "Digital Marketing",
    desc: "SEO, local visibility, social and paid campaigns built to bring the right people to you.",
    tags: ["SEO", "Local", "Ads"],
  },
  {
    no: "03",
    title: "Business Software",
    desc: "Custom web applications that remove repetitive work and make everyday operations simpler.",
    tags: ["Web Apps", "Automation", "Dashboards"],
  },
  {
    no: "04",
    title: "Small Business POS",
    desc: "Practical point-of-sale tools for sales, products, receipts and day-to-day business management.",
    tags: ["POS", "Inventory", "Reports"],
  },
];

function ServiceItem({ service }) {
  const handleMouseMove = (e) => {
    const item = e.currentTarget;
    const r = item.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    item.style.background = `radial-gradient(circle at ${x}px ${y}px, rgba(215,255,66,.06), transparent 260px)`;
  };

  const handleMouseLeave = (e) => {
    e.currentTarget.style.background = "";
  };

  return (
    <article
      className="service-item"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="service-no">{service.no}</div>
      <div>
        <h3>{service.title}</h3>
        <p>{service.desc}</p>
      </div>
      <div className="service-tags">
        {service.tags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <span className="service-arrow">↗</span>
    </article>
  );
}

export default function Services() {
  return (
    <section id="services" className="services section">
      <div className="section-head">
        <div className="section-kicker">02 / WHAT WE DO</div>
        <h2>
          Digital tools
          <br />
          <em>with a purpose.</em>
        </h2>
        <p>
          From your first website to the systems running behind your
          business, ZenX brings design, technology and growth together.
        </p>
      </div>

      <div className="service-list">
        {SERVICES.map((service) => (
          <ServiceItem key={service.no} service={service} />
        ))}
      </div>
    </section>
  );
}
