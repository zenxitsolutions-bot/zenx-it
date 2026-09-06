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
    <section className="industries section">
      <div className="section-kicker">05 / BUILT FOR BUSINESS</div>
      <h2>
        Different businesses.
        <br />
        <em>One digital mindset.</em>
      </h2>
      <div className="industry-cloud">
        {INDUSTRIES.map((name) => (
          <span key={name}>{name}</span>
        ))}
      </div>
    </section>
  );
}
