const STEPS = [
  {
    no: "01",
    title: "Discover",
    desc: "We learn about your goals, challenges, and opportunities.",
  },
  {
    no: "02",
    title: "Design",
    desc: "We craft solutions that are human-centered, practical, and beautiful.",
  },
  {
    no: "03",
    title: "Develop",
    desc: "We build, refine, and support — turning ideas into real-world impact.",
  },
];

export default function Process() {
  return (
    <section id="process" className="process">
      <p className="eyebrow">How we work</p>
      <h2>
        Simple process.
        <br />
        Exceptional outcomes.
      </h2>
      <div className="process-grid">
        {STEPS.map((step) => (
          <article key={step.no}>
            <span>
              {step.no} <i />
            </span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
