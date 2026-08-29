export default function Products() {
  return (
    <section id="products" className="products section">
      <div className="section-kicker">03 / OUR PRODUCTS</div>
      <div className="product-intro">
        <h2>
          We don't only
          <br />
          <em>build for clients.</em>
        </h2>
        <p>We build products from real business problems too.</p>
      </div>

      <article className="product-card dietitian">
        <div className="product-copy">
          <span className="product-number">PRODUCT / 01</span>
          <h3>
            ZenX
            <br />
            <em>Dietitian</em>
          </h3>
          <p>
            A connected platform that makes it easier for dietitians to
            manage clients, appointments, diet plans, measurements and
            weight progress in one place.
          </p>
          <ul>
            <li>Client management</li>
            <li>Diet plans & weekly recipes</li>
            <li>Weight & measurement progress</li>
            <li>Appointments & communication</li>
          </ul>
          <a className="btn btn-light" href="#contact">
            Talk about Dietitian <span>↗</span>
          </a>
        </div>
        <div className="dashboard diet-dashboard">
          <div className="dash-top">
            <strong>ZENX / DIETITIAN</strong>
            <span>● LIVE</span>
          </div>
          <div className="dash-body">
            <div className="dash-side">
              <span>Overview</span>
              <span>Clients</span>
              <span>Diet Plans</span>
              <span>Progress</span>
              <span>Messages</span>
            </div>
            <div className="dash-content">
              <div className="dash-greeting">Good morning, Dietitian.</div>
              <div className="stats">
                <div>
                  <small>ACTIVE CLIENTS</small>
                  <strong>128</strong>
                </div>
                <div>
                  <small>TODAY'S CALLS</small>
                  <strong>08</strong>
                </div>
                <div>
                  <small>PLANS THIS WEEK</small>
                  <strong>34</strong>
                </div>
              </div>
              <div className="chart">
                <span className="chart-line"></span>
                <div className="chart-grid"></div>
                <small>WEIGHT PROGRESS</small>
              </div>
            </div>
          </div>
        </div>
      </article>

      <article className="product-card pos">
        <div className="pos-screen">
          <div className="pos-bar">
            <strong>ZENX POS</strong>
            <span>REGISTER 01</span>
          </div>
          <div className="pos-grid">
            <div className="product-tile">
              Croissant
              <br />
              <b>$3.49</b>
            </div>
            <div className="product-tile">
              Coffee
              <br />
              <b>$2.99</b>
            </div>
            <div className="product-tile">
              Sandwich
              <br />
              <b>$6.49</b>
            </div>
            <div className="product-tile">
              Pastry
              <br />
              <b>$4.25</b>
            </div>
          </div>
          <div className="receipt">
            <small>CURRENT SALE</small>
            <p>
              Croissant × 2 <b>$6.98</b>
            </p>
            <p>
              Coffee × 1 <b>$2.99</b>
            </p>
            <hr />
            <strong>
              TOTAL <span>$9.97</span>
            </strong>
            <button>PAY NOW</button>
          </div>
        </div>
        <div className="product-copy">
          <span className="product-number">PRODUCT / 02</span>
          <h3>
            ZenX
            <br />
            <em>POS</em>
          </h3>
          <p>
            A simple POS experience for small businesses that want less
            complexity and more control over everyday sales.
          </p>
          <ul>
            <li>Fast checkout</li>
            <li>Barcode-ready products</li>
            <li>Inventory management</li>
            <li>Sales & business reports</li>
          </ul>
          <a className="btn btn-light" href="#contact">
            Talk about POS <span>↗</span>
          </a>
        </div>
      </article>
    </section>
  );
}
