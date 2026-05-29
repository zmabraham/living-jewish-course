# Deploying

## GitHub Pages (this deploy)

The site is a fully static SPA (no build step), so GitHub Pages serves it
directly from the repo root.

```sh
# one-time setup
gh repo create living-jewish-course --public --source=. --remote=origin --push
gh api -X POST /repos/:owner/living-jewish-course/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Or via the UI: **Settings → Pages → Build and deployment → Source: Deploy from
a branch → `main` / `/ (root)`**.

The `.nojekyll` file at the repo root prevents Jekyll from filtering
`/_` paths; nothing else is needed.

After Pages is enabled, the site lives at:

`https://<owner>.github.io/living-jewish-course/`

## Local development

```sh
python -m http.server 8000
# open http://localhost:8000
```

No bundler, no dependencies. ES modules load directly. Hot reload requires
a refresh.

## Path to production

`BUILD-SPEC.md §5–§6` describe the production target — accounts, payment,
server-side gating, cross-device progress. GitHub Pages can't host any of
that on its own, so the production deploy needs:

| Need | Suggested provider |
|---|---|
| Static frontend | Vercel / Netlify (replaces Pages) |
| API + server-side grading | Vercel Functions / a small Node or FastAPI service |
| Database | Postgres on Supabase / Neon |
| Managed auth | Clerk / Auth0 / Supabase Auth |
| Payment (when enabled) | Stripe |

The frontend is structured so you only need to swap `js/state.js` from
`localStorage` to an API client, and have `js/quiz.js`'s `wireGate()` POST
the picks instead of grading locally. The shape of the lesson JSON does
not change.

## Publishing content

Content lives in `content/lessons/*.json`. The 26 shells currently shipped
have `"status": "draft"` and a placeholder body. To publish a chapter:

1. Run `python scripts/extract_book.py --pdf <path>` (writes to `data/extracted/`).
2. Review the extracted JSON; fix every Hebrew passage from a clean source.
3. Copy the reviewed file into `content/lessons/`, set
   `"status": "published"`, commit, and push. Pages will rebuild within ~1 min.

`data/extracted/` is `.gitignore`d, so raw extractor output never lands in
the public repo by accident.
