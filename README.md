# Unbadged (closed beta)

Anonymous, invite-only community for people who work.

- `public/` is the whole website: plain HTML, CSS, and JavaScript, no build step.
- Data, sign-in, photos, and live chat run on Supabase (project `ciaajponuxvvcttalvwa`).
- Server functions: `signup`, `link-device`, `delete-account` (Supabase Edge Functions).
- Security is enforced in the database with row-level security; nothing in the browser is trusted.

## Deploy

Vercel serves the `public/` folder as a static site. Every push to `main` redeploys.
