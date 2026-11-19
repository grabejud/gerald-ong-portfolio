# GitHub Pages and Decap authentication setup

The site code does not contain OAuth credentials. GitHub Pages serves static files and cannot keep an OAuth client secret private or exchange GitHub authorization codes on its own. Decap's standard GitHub backend therefore needs a separate trusted OAuth service before `/admin/` login can work.

## One-time GitHub Pages setting

After this change is merged, open **Repository Settings → Pages → Build and deployment** and select **GitHub Actions** as the source. The workflow in `.github/workflows/pages.yml` builds on pull requests without deploying; it deploys only from `main`. Confirm the `github-pages` environment is allowed to deploy from `main` if repository environment protections are enabled.

The workflow is intentionally limited to `main`, so the feature branch and this draft pull request do not publish a site. The live Pages setting and current live URL should be confirmed in repository Settings after merge; the connected repository metadata does not expose the Pages configuration to this integration.

## OAuth choices

Choose one of the following before signing in:

1. **Self-host an OAuth proxy** on a separate HTTPS origin, such as a Cloudflare Worker or another maintained serverless service. Create a GitHub OAuth App for it, set its callback URL to the proxy's callback route, and store the client secret only in the proxy provider's encrypted secret store. Then add the proxy origin and route under `backend.base_url` and `backend.auth_endpoint` in `admin/config.yml`.
2. **Use Decap Turbo** as the hosted GitHub authentication option. Create and connect its site/repository following Decap's current setup, then change the Decap backend configuration to its hosted GitHub backend. Review its account, pricing, and access terms before choosing it.

Do not put a client secret or personal access token in `admin/config.yml`, site JavaScript, GitHub Pages environment variables, or committed files. Keep the OAuth app restricted to this repository and grant write access only to people who should be able to publish portfolio edits. The configured backend writes to `main`, which means a CMS save publishes after the Pages workflow succeeds.

## Verification after setup

- Confirm `backend.repo` is `grabejud/gerald-ong-portfolio` and `backend.branch` is `main`.
- Configure the OAuth service's allowed callback and allowed origins for the deployed admin URL.
- Sign in through `/admin/`, edit a draft project field, and confirm the commit is made to `main`.
- Confirm the Pages workflow succeeds and the generated project and homepage directory update.
- Remove test content after verification.

For current OAuth field names and backend behavior, use [Decap's GitHub backend documentation](https://decapcms.org/docs/github-backend/) and [OAuth proxy configuration guide](https://decapcms.org/docs/backends-overview/).
