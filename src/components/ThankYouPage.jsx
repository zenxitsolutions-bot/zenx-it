export default function ThankYouPage() {
  return (
    <main className="thank-you-page">
      <section className="thank-you-card" aria-labelledby="thank-you-heading">
        <span className="pulse" aria-hidden="true"></span>
        <p className="eyebrow">Enquiry received</p>
        <h1 id="thank-you-heading">Thank you.</h1>
        <p>
          Your enquiry has been sent successfully. Our team will review it and get
          back to you shortly.
        </p>
        <a className="btn btn-primary" href="/">
          Back to home <span aria-hidden="true">&#8599;</span>
        </a>
      </section>
    </main>
  );
}
