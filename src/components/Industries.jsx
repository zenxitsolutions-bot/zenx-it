const INDUSTRIES = [
  "Restaurants",
  "Healthcare",
  "Dietitians",
  "Retail",
  "Startups",
  "Local Businesses",
  "Professional Services",
  "E-commerce",
  "Small Business",
];

export default function Industries() {
  return (
    <section id="about" className="industries section">
      <div className="section-center">
        <p className="eyebrow">WHO WE BUILD FOR</p>
        <h2>
          Different businesses. <em>One digital mindset.</em>
        </h2>
        <p className="section-lead">
          Your business is more than a website. It needs to be found, understood, and remembered.
        </p>
      </div>
      <div className="industry-cloud">
        {INDUSTRIES.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </section>
  );
}
