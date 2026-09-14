const AGENDA = [
  ["10:30 AM", "Amelia Carter", "Follow-up"],
  ["1:00 PM", "Daniel Chen", "Meal plan"],
  ["3:30 PM", "Hana Lee", "Progress check"],
];

const MENU = [
  ["Americano", "$3.50"],
  ["Cappuccino", "$4.50"],
  ["Latte", "$4.50"],
  ["Blueberry muffin", "$3.90"],
  ["Avocado toast", "$6.50"],
];

const ORDER = [
  ["Latte", "$4.50"],
  ["Blueberry muffin", "$3.90"],
  ["Avocado toast", "$6.50"],
];

export default function ProductStage() {
  return (
    <div className="product-stage" id="products">
      <aside className="product-caption product-caption-left">
        <strong>ZenX Dietitian</strong>
        <p>Nutrition plans. Healthier tomorrows.</p>
      </aside>
      <aside className="product-caption product-caption-right">
        <strong>ZenX POS</strong>
        <p>Simple tools. Smoother business.</p>
      </aside>

      <div className="stage-canvas">

      <div className="device device-diet" aria-hidden="true">
        <div className="diet-top">
          <b>ZenX Dietitian</b>
          <span>Client care</span>
        </div>
        <div className="diet-shell">
          <aside className="diet-side">
            <em>Overview</em>
            <span>Clients</span>
            <span>Meal plans</span>
            <span>Progress</span>
            <span>Messages</span>
            <span>Settings</span>
          </aside>
          <div className="diet-main">
            <header className="diet-head">
              <div>
                <h3>Good morning, Jamie</h3>
                <small>A little care goes a long way today</small>
              </div>
              <time>April 11, 2026</time>
            </header>
            <div className="diet-mid">
              <div className="diet-stats">
                <div>
                  <small>Active</small>
                  <strong>24</strong>
                </div>
                <div>
                  <small>Plans</small>
                  <strong>18</strong>
                </div>
                <div>
                  <small>Check-ins</small>
                  <strong>12</strong>
                </div>
              </div>
              <p className="diet-quote">Small changes make a big difference.</p>
              <figure className="diet-photo">
                <img
                  src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=480&q=80"
                  alt=""
                />
              </figure>
            </div>
            <div className="diet-agenda">
              <p>Today’s agenda</p>
              {AGENDA.map(([time, name, type]) => (
                <div key={time}>
                  <span className="avatar" />
                  <span>{time}</span>
                  <strong>{name}</strong>
                  <em>{type}</em>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="device device-pos" aria-hidden="true">
        <div className="pos-top">
          <b>ZenX POS</b>
          <span>Cafe manager</span>
        </div>
        <div className="pos-shell">
          <div className="pos-menu">
            <div className="pos-search">Search products, customers…</div>
            <div className="pos-nav">
              <span className="is-on">Home</span>
              <span>Products</span>
              <span>Reports</span>
            </div>
            <div className="pos-tiles">
              <img src="/images/pos-coffee.jpg" width="240" height="240" alt="Coffee" />
              <img src="/images/pos-pastry.jpg" width="240" height="240" alt="Pastry" />
              <img src="/images/pos-latte.jpg" width="240" height="240" alt="Latte" />
              <img src="/images/pos-toast.jpg" width="240" height="240" alt="Avocado toast" />
            </div>
            <ul>
              {MENU.map(([name, price]) => (
                <li key={name}>
                  {name} <b>{price}</b>
                </li>
              ))}
            </ul>
          </div>
          <div className="pos-ticket">
            <div className="pos-ticket-head">
              <strong>Current order</strong>
              <span>Dine in</span>
            </div>
            {ORDER.map(([name, price]) => (
              <p key={name}>
                {name} <b>{price}</b>
              </p>
            ))}
            <hr />
            <p className="pos-total">
              Total <b>$14.90</b>
            </p>
            <button type="button" tabIndex={-1}>
              Complete payment
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
