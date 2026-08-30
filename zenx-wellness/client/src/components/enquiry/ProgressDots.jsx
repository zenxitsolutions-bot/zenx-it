export function ProgressDots({ step, total }) {
  return (
    <div className="mb-6 flex gap-1.5" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={total}>
      {Array.from({ length: total }, (_, i) => (
        <i
          key={i}
          className={`h-1.5 flex-1 rounded-full ${i < step ? 'bg-sage-deep' : 'bg-sage/60'}`}
        />
      ))}
    </div>
  );
}
