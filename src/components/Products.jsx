export default function Products() {
  return (
    <section id="products" className="products section">
      <div className="work-head">
        <div>
          <p className="eyebrow">FEATURED WORK</p>
          <h2>
            Real Projects. <em>Real Products.</em>
          </h2>
          <p>
            We don’t only build for clients. We ship products from real business
            problems — starting with care practices and small-business retail.
          </p>
        </div>
        <a className="btn btn-ghost" href="#contact">
          Talk about a product
        </a>
      </div>

      <article className="work-showcase">
        <div className="work-devices">
          <div className="device-laptop">
            <div className="device-laptop-bar">
              <span></span><span></span><span></span>
              <strong>zenxitsolutions.com/dietitian</strong>
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
                      <strong>24</strong>
                    </div>
                    <div>
                      <small>TODAY'S CALLS</small>
                      <strong>4</strong>
                    </div>
                    <div>
                      <small>PLANS THIS WEEK</small>
                      <strong>12</strong>
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
          </div>
          <div className="device-phone" aria-hidden="true">
            <div className="phone-notch"></div>
            <p>Today’s meals</p>
            <div className="phone-card">Breakfast</div>
            <div className="phone-card">Lunch</div>
            <div className="phone-card">Dinner</div>
          </div>
        </div>

        <aside className="glass-card work-info">
          <span className="product-number">PRODUCT / 01</span>
          <h3>ZenX Dietitian</h3>
          <p>
            A connected platform for dietitians to manage clients, appointments,
            diet plans, measurements, and weight progress in one place.
          </p>
          <div className="work-tags">
            <span>Web App</span>
            <span>Portal</span>
            <span>Care</span>
          </div>
          <a className="text-link" href="#contact">
            Talk about Dietitian <span>→</span>
          </a>
        </aside>
      </article>

      <article className="work-showcase work-showcase-pos">
        <aside className="glass-card work-info">
          <span className="product-number">PRODUCT / 02</span>
          <h3>ZenX POS</h3>
          <p>
            A simple POS experience for small businesses that want less
            complexity and more control over everyday sales.
          </p>
          <div className="work-tags">
            <span>Retail</span>
            <span>Checkout</span>
            <span>Inventory</span>
          </div>
          <a className="text-link" href="#contact">
            Talk about POS <span>→</span>
          </a>
        </aside>

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
            <button type="button" tabIndex={-1}>PAY NOW</button>
          </div>
        </div>
      </article>
    </section>
  );
}
