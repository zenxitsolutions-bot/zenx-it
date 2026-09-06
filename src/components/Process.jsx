const STEPS = [
  { no: "01", title: "Understand", desc: "We start with your business, customers and the result you want." },
  { no: "02", title: "Design", desc: "We turn the idea into a clear, memorable digital experience." },
  { no: "03", title: "Build", desc: "We develop a fast, responsive product that works across devices." },
  { no: "04", title: "Grow", desc: "We keep improving visibility, conversions and the tools behind your business." },
];

export default function Process() {
  return (
    <section id="process" className="process section">
      <div className="section-kicker">04 / HOW WE WORK</div>
      <h2>
        Build it.
        <br />
        Launch it.
        <br />
        <em>Grow it.</em>
      </h2>
      <div className="process-grid">
        {STEPS.map((step) => (
          <div className="process-step" key={step.no}>
            <span>{step.no}</span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
