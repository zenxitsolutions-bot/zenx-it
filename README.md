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
The contact form posts new enquiries to [`admin-server`](admin-server) (also read by the [Admin Portal](admin/README.md)). Copy `.env.example` to `.env.local` and set `VITE_ADMIN_API_URL` (same backend as `admin/.env.local`) to enable this. Without it, the form shows an error and does not submit an enquiry.

### Enquiry field requirements

Only full name, a valid phone number, and email are required on the public enquiry page.
Company name, website, service, referral source, and message are optional. Blank optional
answers are stored as `NULL`, not filled with an invented service or company name.

For an existing deployment, run `npm run db:migrate` from `admin-server` before deploying
the updated API and website/admin builds. This makes the enquiry's company, service, and
source columns nullable without deleting existing enquiries. Restart the API after deploying
its code. The admin portal accepts these incomplete business details and asks for a company
name later if an enquiry is converted into a customer account.

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
Read [Security and scaling deployment notes](SECURITY_DEPLOYMENT.md) before deploying the pending
hardening changes. They require database migrations, coordinated API/frontend releases, stronger
production configuration, and users signing in again.

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
