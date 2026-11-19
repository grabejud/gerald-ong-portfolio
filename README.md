# Gerald Onde Ong portfolio

Static portfolio site with editable project records managed by Decap CMS. The source records live in `content/projects/*.json`; `npm run build` generates the existing homepage and project URLs into `dist/` while carrying over the current page-specific HTML and assets.

## Local build and validation

Requires Node.js 20 or newer. From the repository root:

```sh
npm run build
npm test
```

Open `dist/index.html` to inspect the generated site. The Pages workflow builds and validates pull requests without publishing them. Merges to `main` build and deploy through GitHub Actions.

## Decap CMS

The admin interface is under `/admin/`. Project content and uploaded images are committed to this repository. The CMS backend targets `main`; authorized edits committed there will trigger a Pages deployment.

GitHub Pages cannot host the OAuth server Decap's GitHub backend requires. Before using live `/admin/`, configure a trusted HTTPS OAuth proxy (or choose Decap Turbo), then follow [docs/cms-auth-and-pages.md](docs/cms-auth-and-pages.md). Never place OAuth client secrets or access tokens in this repository.
