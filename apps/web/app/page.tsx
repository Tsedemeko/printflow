import { getCatalogProducts } from "../lib/api-data";

const services = [
  { name: "Embroidery", blurb: "Logos, names, and badges stitched onto garments, caps, and workwear." },
  { name: "Heat Press", blurb: "Vibrant heat-transfer prints for t-shirts, jerseys, and promo wear." },
  { name: "Overalls & Workwear", blurb: "Branded overalls and uniforms for teams, sites, and businesses." },
  { name: "Jumpsuits", blurb: "Custom-fitted jumpsuits made and finished to your spec." },
  { name: "Wedding Dresses", blurb: "Bespoke bridal dresses designed, tailored, and fitted with care." },
  { name: "Traditional Dress", blurb: "Authentic traditional and cultural attire for every occasion." },
  { name: "Jackets", blurb: "Tailored and branded jackets, from corporate to casual." },
  { name: "Trousers", blurb: "Made-to-measure and altered trousers with a clean finish." },
  { name: "T-Shirts", blurb: "Custom printed and embroidered t-shirts, single or bulk." }
];

const steps = [
  { n: "1", title: "Tell us what you need", text: "Start an order online or visit the shop. Choose your garment and quantity." },
  { n: "2", title: "Share your design", text: "Upload artwork or your logo — we proof it and confirm before production." },
  { n: "3", title: "We make it", text: "Embroidery, heat press, or tailoring — tracked through every stage." },
  { n: "4", title: "Collect or get notified", text: "We message you the moment your order is ready for collection." }
];

export default async function HomePage() {
  const products = await getCatalogProducts();
  const featured = products.filter((product) => product.enabled ?? true).slice(0, 6);

  return (
    <div className="site-bg">
      <header className="public-topbar site-topbar">
        <a className="brand" href="/">{/* eslint-disable-next-line @next/next/no-img-element */}<img className="brand-img" src="/finesse-logo.png" alt="Finesse Fashion Design" /></a>
        <nav className="nav">
          <a href="#services">Services</a>
          <a href="#how">How it works</a>
          <a href="#contact">Contact</a>
          <a href="/order">Order online</a>
          <a href="/login">Staff login</a>
        </nav>
      </header>

      <main className="page site">
        <section className="hero site-hero">
          <div className="hero-copy">
            <span className="eyebrow">Fashion Design Enterprise</span>
            <h1>Finesse Fashion Design Enterprise</h1>
            <p>
              Embroidery, heat press, and custom garment design. From overalls and uniforms to wedding
              and traditional dress — we design, tailor, and brand it, then keep you updated until it&apos;s ready.
            </p>
            <div className="hero-actions">
              <a className="button" href="/order">Start an order</a>
              <a className="button secondary" href="#services">See our services</a>
            </div>
            <div className="hero-tags">
              <span>Embroidery</span>
              <span>Heat Press</span>
              <span>Tailoring</span>
              <span>Bulk orders</span>
            </div>
          </div>
          <div className="brand-visual" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="brand-badge-img" src="/finesse-icon.png" alt="" />
            <strong>FINESSE</strong>
            <span>Fashion Design Enterprise</span>
          </div>
        </section>

        <section id="services" className="site-section">
          <span className="eyebrow">What we do</span>
          <h2>Our services</h2>
          <div className="service-grid" style={{ marginTop: 18 }}>
            {services.map((service) => (
              <article className="card glossy" key={service.name}>
                <h3>{service.name}</h3>
                <p>{service.blurb}</p>
              </article>
            ))}
          </div>
        </section>

        {featured.length > 0 ? (
          <section className="site-section">
            <span className="eyebrow">Order online</span>
            <h2>Popular items &amp; pricing</h2>
            <div className="service-grid" style={{ marginTop: 18 }}>
              {featured.map((product) => (
                <article className="card glossy" key={product.id}>
                  <span className="status">{product.category.replaceAll("_", " ")}</span>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <strong>From R{product.basePrice.toFixed(2)}</strong>
                </article>
              ))}
            </div>
            <div className="hero-actions" style={{ marginTop: 16 }}>
              <a className="button" href="/order">Build your order</a>
            </div>
          </section>
        ) : null}

        <section id="how" className="site-section">
          <span className="eyebrow">Simple &amp; tracked</span>
          <h2>How it works</h2>
          <div className="steps-grid" style={{ marginTop: 18 }}>
            {steps.map((step) => (
              <article className="card glossy step-card" key={step.n}>
                <span className="step-num">{step.n}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="site-section contact-band glossy">
          <div>
            <span className="eyebrow">Visit or call us</span>
            <h2>Get in touch</h2>
            <p>Bring your idea, logo, or measurements — we&apos;ll take it from there.</p>
            <div className="contact-details">
              <div>
                <strong>Johannesburg</strong>
                <span className="muted-note">Shop 12, 135 Pritchard Str, Johannesburg, RSA</span>
              </div>
              <div>
                <strong>Doornfontein</strong>
                <span className="muted-note">Shop 8, 17 Siemert Str, Doornfontein, RSA</span>
              </div>
              <div>
                <strong>Call us</strong>
                <span className="muted-note">078 727 3283 · 072 727 1087</span>
              </div>
            </div>
          </div>
          <div className="contact-actions">
            <a className="button" href="/order">Order online</a>
            <a className="button secondary" href="/kiosk">Use in-store kiosk</a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Finesse Fashion Design Enterprise</span>
        <small>Embroidery · Heat Press · Custom Garment Design</small>
        <small>Shop 12, 135 Pritchard Str, Johannesburg · Shop 8, 17 Siemert Str, Doornfontein</small>
        <small>078 727 3283 · 072 727 1087 · Reg No. 2019/128683/07</small>
      </footer>
    </div>
  );
}
