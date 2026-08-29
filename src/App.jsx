import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Statement from "./components/Statement.jsx";
import Services from "./components/Services.jsx";
import Products from "./components/Products.jsx";
import Process from "./components/Process.jsx";
import Industries from "./components/Industries.jsx";
import Contact from "./components/Contact.jsx";
import Footer from "./components/Footer.jsx";

export default function App() {
  return (
    <>
      <div className="noise"></div>

      <Navbar />

      <main id="top">
        <Hero />
        <Statement />
        <Services />
        <Products />
        <Process />
        <Industries />
        <Contact />
      </main>

      <Footer />
    </>
  );
}
