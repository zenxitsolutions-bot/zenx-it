# ZenX IT Solutions Website

A responsive, single-page marketing website for ZenX IT Solutions Pvt Ltd, built with React + Vite.

## Included
- Original design inspired by the visual direction of the supplied Codile Dribbble reference
- Responsive desktop/tablet/mobile layout
- Animated marquee
- Scroll reveal animations (IntersectionObserver via a `useReveal` hook)
- Interactive service rows (pointer-follow spotlight)
- ZenX Dietitian product showcase
- ZenX POS product showcase
- Contact form (Company, Contact, Phone, Email, Website, Service, Source, Message) that posts new enquiries to the ZenX Admin backend when configured — see below
- SEO title and description

## Project structure
```
index.html              Vite entry HTML
src/
  main.jsx               React root
  App.jsx                Page layout / section order
  index.css               Global styles (migrated from the original styles.css)
  hooks/useReveal.js     Scroll-reveal IntersectionObserver hook
  components/
    Navbar.jsx           Nav + mobile menu toggle
    Hero.jsx
    Statement.jsx
    Services.jsx
    Products.jsx         Dietitian + POS product showcases
    Process.jsx
    Industries.jsx
    Contact.jsx
    ContactForm.jsx
    Footer.jsx
  lib/adminApi.js        Posts to the ZenX Admin backend (no-op if VITE_ADMIN_API_URL is unset)
legacy-static/           Original plain HTML/CSS/JS version, kept for reference
admin/                   Private ZenX Admin Portal (CRM) — see admin/README.md
```

## Connecting the contact form to the Admin Portal
The contact form posts new enquiries to [`admin-server`](admin-server) (also read by the [Admin Portal](admin/README.md)). Copy `.env.example` to `.env.local` and set `VITE_ADMIN_API_URL` (same backend as `admin/.env.local`) to enable this — without it the form still validates and shows a success state, it just won't persist anywhere.

## Run locally
```
npm install
npm run dev
```

## Build for production
```
npm run build
npm run preview
```
Deploy the generated `dist/` folder to Netlify, Vercel, GitHub Pages, or any static hosting service.

## Deploying the whole system
Three pieces deploy independently:
- This site (static, e.g. Netlify) — set `VITE_ADMIN_API_URL` and `VITE_ADMIN_URL`.
- [`admin/`](admin) (static, e.g. Netlify — see its own `netlify.toml`) — set `VITE_ADMIN_API_URL`.
- [`admin-server/`](admin-server) (Node API, e.g. Render — see its own `render.yaml`) — must share
  one secret with wellness-app's deployment (`ZENX_DIETITIAN_HANDOFF_SECRET` here =
  `ZENX_HANDOFF_SECRET` there) for the SSO handoff into wellness-app to work.

## Before launch
Replace:
- hello@zenxitsolutions.com with your real email
- product mockup numbers with real data
- any future case studies/testimonials with verified information
- social media links and company address once available

The design intentionally does not use invented client statistics.
