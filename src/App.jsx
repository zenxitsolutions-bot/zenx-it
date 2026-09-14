import { useEffect, useState } from "react";
import Navbar from "./components/Navbar.jsx";
import Hero from "./components/Hero.jsx";
import Process from "./components/Process.jsx";
import Services from "./components/Services.jsx";
import Cta from "./components/Cta.jsx";
import Footer from "./components/Footer.jsx";
import EnquiryPage from "./components/EnquiryPage.jsx";

function currentPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

function isEnquiryPath(path) {
  return path === "/enquiry" || path === "/contact";
}

export default function App() {
  const [path, setPath] = useState(currentPath);

  useEffect(() => {
    const onPop = () => setPath(currentPath());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const enquiry = isEnquiryPath(path);

  useEffect(() => {
    document.title = enquiry
      ? "Enquiry — ZenX IT Solutions"
      : "ZenX IT Solutions — Good ideas. Beautifully built.";
    if (!enquiry && window.location.hash) {
      requestAnimationFrame(() => document.querySelector(window.location.hash)?.scrollIntoView());
    }
  }, [enquiry, path]);

  return (
    <div className="site">
      <Navbar enquiry={enquiry} />
      {enquiry ? (
        <EnquiryPage key={typeof window === "undefined" ? path : window.location.search} />
      ) : (
        <>
          <Hero />
          <Process />
          <Services />
          <Cta />
        </>
      )}
      <Footer />
    </div>
  );
}
