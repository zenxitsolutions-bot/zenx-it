const SERVICES = [
  {
    title: "Web & Software Development",
    desc: "Fast, modern websites and custom web applications designed around your brand, customers, and goals.",
    icon: "</>",
  },
  {
    title: "Mobile App Development",
    desc: "Client and staff experiences that feel native — from patient portals to day-to-day operations.",
    icon: "▣",
  },
  {
    title: "AI & Automation",
    desc: "Workflows, handoffs, and smart assistants that take repetitive work off your team's plate.",
    icon: "◎",
  },
  {
    title: "UI/UX Design",
    desc: "Clear interfaces and memorable brand systems so people understand you in seconds.",
    icon: "✦",
  },
  {
    title: "Digital Marketing",
    desc: "SEO, local visibility, social, and paid campaigns built to bring the right people to you.",
    icon: "◈",
  },
  {
    title: "Cloud & IT Solutions",
    desc: "Reliable hosting, integrations, and business software that keep the operation running.",
    icon: "☁",
  },
];

export default function Services() {
  return (
    <section id="services" className="services section">
      <div className="section-center">
        <p className="eyebrow">WHAT WE DO</p>
        <h2>
          Complete Digital Solutions for <em>Your Business</em>
        </h2>
      </div>

      <div className="service-grid">
        {SERVICES.map((service) => (
          <a key={service.title} className="glass-card service-card" href="#contact">
            <div className="service-card-top">
              <span className="service-icon">{service.icon}</span>
              <span className="service-arrow" aria-hidden="true">↗</span>
            </div>
            <h3>{service.title}</h3>
            <p>{service.desc}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
