import { handleAppLink } from "../lib/navigate";

const SERVICES = [
  {
    title: "Web development",
    desc: "High-performing websites that look beautiful and do more.",
    icon: "cube",
    service: "Website",
  },
  {
    title: "Custom software",
    desc: "Tailored solutions to streamline your work and unlock new opportunities.",
    icon: "box",
    service: "Business Software",
  },
  {
    title: "UI / UX design",
    desc: "Thoughtful, intuitive experiences that put your users first.",
    icon: "rings",
    service: "Something else",
  },
  {
    title: "Digital marketing",
    desc: "Reach the right audience with SEO, social media, and paid campaigns that help your business grow.",
    icon: "megaphone",
    service: "Digital Marketing",
  },
];

function ServiceIcon({ name }) {
  if (name === "megaphone") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <path
          d="M8 20h9l18-9v26l-18-9H8v-8Zm9 8 3 12h7l-4-9M17 20v8M40 19l4-2m-4 7h5m-5 5 4 2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (name === "rings") {
    return (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="18" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="30" cy="24" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path
        d="M24 8 40 16v16L24 40 8 32V16L24 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Services() {
  return (
    <section id="services" className="services-band">
      <div className="services">
      <div className="services-head">
        <div>
          <p className="eyebrow">What we do</p>
          <h2>
            Technology that works for you.
          </h2>
        </div>
        <div className="services-aside">
          <p>Custom digital solutions and marketing, designed around your people, your work, and your growth.</p>
          <a href="/enquiry" onClick={(e) => handleAppLink(e, "/enquiry")}>
            Explore all services <span>→</span>
          </a>
        </div>
      </div>
      <div className="service-grid">
        {SERVICES.map((item) => (
          <a
            key={item.title}
            className="service-card"
            href={`/enquiry?service=${encodeURIComponent(item.service)}`}
            onClick={(e) => handleAppLink(e, `/enquiry?service=${encodeURIComponent(item.service)}`)}
          >
            <span className="service-icon">
              <ServiceIcon name={item.icon} />
            </span>
            <h3>{item.title}</h3>
            <p>{item.desc}</p>
            <span className="text-link">
              Learn more <span>→</span>
            </span>
          </a>
        ))}
      </div>
      </div>
    </section>
  );
}
