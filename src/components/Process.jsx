const STEPS = [
  { no: "01", title: "Discover", icon: "⌕", desc: "We start with your business, customers, and the result you want." },
  { no: "02", title: "Design", icon: "✎", desc: "We turn the idea into a clear, memorable digital experience." },
  { no: "03", title: "Build", icon: "</>", desc: "We develop a fast, responsive product that works across devices." },
  { no: "04", title: "Launch", icon: "▲", desc: "We ship cleanly — live, tested, and ready for real customers." },
  { no: "05", title: "Grow", icon: "▦", desc: "We keep improving visibility, conversions, and the tools behind the business." },
];

export default function Process() {
  return (
    <section id="process" className="process section">
      <div className="section-center">
        <p className="eyebrow">HOW WE WORK</p>
        <h2>
          How We Grow <em>Your Business</em>
        </h2>
      </div>
      <div className="process-track">
        {STEPS.map((step, i) => (
          <div className="process-step" key={step.no}>
            {i < STEPS.length - 1 && <span className="process-line" aria-hidden="true"></span>}
            <span className="process-icon">{step.icon}</span>
            <small>{step.no}</small>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
