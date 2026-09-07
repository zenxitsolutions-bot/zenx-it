import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Services from "./components/Services.jsx";
import Process from "./components/Process.jsx";
import Products from "./components/Products.jsx";
import Industries from "./components/Industries.jsx";
import Cta from "./components/Cta.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <div className="noise"></div>
      <div className="page-glow" aria-hidden="true"></div>

      <Navbar />

      <main id="top">
        <Hero />
        <Services />
        <Process />
        <Products />
        <Industries />
        <Cta />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
