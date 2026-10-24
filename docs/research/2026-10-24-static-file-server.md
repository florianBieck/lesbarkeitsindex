# Static file servers for the frontend image

Research for [#49](https://github.com/florianBieck/lesbarkeitsindex/issues/49) on the map [#46](https://github.com/florianBieck/lesbarkeitsindex/issues/46). It lists facts and trade-offs only. Choosing a server is [#52](https://github.com/florianBieck/lesbarkeitsindex/issues/52), a grilling ticket.

**Question:** which servers can serve the built Vue SPA (`apps/frontend/dist/`) from the frontend container on port 3000, behind the edge Caddy, on the arm64 prod host?

Status as of 2026-10-24. Image facts come from the Docker Hub API and from `docker image inspect` on images pulled for `linux/arm64`. Behaviour marked **(lab)** was checked on an arm64 Mac (Docker 29.9.2). Each candidate ran as `frontend:3000` behind `caddy:2-alpine`, which used the routing from the prod `Caddyfile`. The test `dist/` had the Vite layout: `index.html`, `assets/index-<hash>.js|css`, and unhashed `favicon.ico` and `robots.txt`. The method is at the end.

## The setup this has to fit

- `Dockerfile.frontend` today builds Nuxt in `node:22-alpine` and runs `node .output/server/index.mjs` on `NITRO_PORT=3000`, as root (no `USER`). The new image keeps the builder stage and swaps the runtime stage for a static server that serves `dist/`.
- `docker-compose-prod.yml`: the `frontend` service has no `healthcheck` and no `ports`. `caddy` has `depends_on: [backend, frontend]` in short form, so it waits for start, not for health. Only `r-sidecar` has a health check: `wget -q -O /dev/null http://localhost:8787/health` in `docker-compose.yml`.
- `.github/workflows/build.yml` builds every image natively on `ubuntu-24.04-arm` with `platforms: linux/arm64`. Any candidate needs a `linux/arm64` variant, and all of them have one.
- Vite writes imported assets to `dist/assets/` with hashed names. Files in `public/` (`favicon.ico`, `robots.txt`) are copied to the root of `dist/` "as-is", without a hash ([Vite: build options](https://vite.dev/config/build-options), [Vite: static asset handling](https://vite.dev/guide/assets)). So `assets/*` can be cached forever. `index.html` and the `public/` files can't.

## What the edge Caddy already does, and what it doesn't

The `Caddyfile` has three directives: `tls`, a `@backend` path matcher with `reverse_proxy backend:3000`, and `reverse_proxy frontend:3000`. It has **no `encode`** and **no `header`** directive.

- **No compression at the edge today.** A live check of `https://lix.florianbieck.com/` with `Accept-Encoding: gzip, br, zstd` got the SSR HTML as 583 KB with no `Content-Encoding`. A 387 KB `/_nuxt/*.js` chunk came back uncompressed too. Whatever compresses after the switch is a net gain over today.
- **Cache headers come from the upstream only.** Today Nitro sends `Cache-Control: public, max-age=31536000, immutable` on `/_nuxt/*` and no `Cache-Control` on the HTML. **(lab)** The edge passes `Cache-Control`, `ETag`, `Last-Modified`, `Content-Encoding`, `Vary` and the upstream's `Server` header (e.g. `Server: nginx/1.31.8`) through unchanged. So the inner server owns the cache policy.
- **The edge adds `Via: 1.1 Caddy` to the upstream request and to the response.** See `modules/caddyhttp/reverseproxy/reverseproxy.go` at v2.11.7, [line 915](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/reverseproxy/reverseproxy.go#L915) (request) and [line 1298](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/reverseproxy/reverseproxy.go#L1298) (response). The `reverse_proxy` docs list only the `X-Forwarded-*` headers. **(lab)** The upstream sees `Via: 1.1 Caddy` and `X-Forwarded-Proto`. This matters for nginx (see below).
- **Accept-Encoding passes through.** If the client sends none, Caddy's transport adds `Accept-Encoding: gzip` and decompresses transparently ([reverse_proxy docs](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), `compression` option).
- **Adding `encode` at the edge later wouldn't double-compress.** Caddy's encoder only encodes when `Content-Encoding` is empty ([encode.go L516 at v2.11.7](https://github.com/caddyserver/caddy/blob/v2.11.7/modules/caddyhttp/encode/encode.go#L516)). With no formats given, `encode` defaults to `zstd` then `gzip` ([encode docs](https://caddyserver.com/docs/caddyfile/directives/encode)).
- The edge sets no security headers (HSTS, CSP, and so on). It advertises HTTP/3 (`alt-svc: h3=":443"`, seen live).

**Where compression lives is a separate choice from which server to use:**

- **In the inner server:** the frontend image is self-contained, and only the frontend's responses are compressed.
- **One `encode` line in the edge `Caddyfile`:** it covers every route the site proxies, backend responses included, and inner compression becomes optional.
- **Both:** safe, because of the `Content-Encoding` check above, but redundant.

## Comparison

|                                    | **Caddy** `caddy:2-alpine`                                                                                                                       | **nginx unprivileged** `nginx/nginx-unprivileged:alpine-slim`                                                                | **nginx** `nginx:alpine-slim`                                                               | **static-web-server (SWS)** `joseluisq/static-web-server:2` / `:2-alpine`                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Version (2026-10-22/24)            | Caddy 2.11.7, Alpine 3.23                                                                                                                        | nginx 1.31.8, Alpine 3.24 (the archived `nginxinc/` tag stopped at 1.31.7)                                                   | nginx 1.31.8, Alpine 3.24                                                                   | SWS 2.44.1 (v2 = stable, v3 = dev)                                                                                                     |
| Docker Official Image              | **yes**                                                                                                                                          | no. Published by "NGINX Inc." The old `nginxinc/nginx-unprivileged` repo is **archived** on Docker Hub (see below)           | **yes**                                                                                     | no. Community project by `joseluisq`, Apache-2.0, also on `ghcr.io`                                                                    |
| `linux/arm64`                      | yes (arm64v8)                                                                                                                                    | yes                                                                                                                          | yes (arm64v8)                                                                               | yes                                                                                                                                    |
| Size, arm64, compressed / unpacked | 23.6 MB / 64.0 MB                                                                                                                                | 8.9 MB / 14.0 MB                                                                                                             | 6.2 MB / 14.0 MB                                                                            | scratch 3.5 MB / 6.9 MB; alpine 8.1 MB / 17.2 MB                                                                                       |
| Default user                       | **root** (no `USER`). `/usr/bin/caddy` has the file capability `cap_net_bind_service=ep`                                                         | **uid 101** (`nginx`)                                                                                                        | master **root**, workers uid 101                                                            | scratch: **root**; alpine: **`sws` (uid 1000)**                                                                                        |
| Default port                       | 80 (stock Caddyfile; EXPOSE 80/443/2019)                                                                                                         | 8080                                                                                                                         | 80                                                                                          | 80 (`SERVER_PORT`)                                                                                                                     |
| SPA fallback                       | `try_files {path} /index.html` (internal rewrite). Can be scoped with `handle` so `/assets/*` 404s                                               | `try_files $uri $uri/ /index.html` (internal redirect). Scoped per `location`                                                | same as unprivileged                                                                        | `SERVER_FALLBACK_PAGE` returns 200 for **every** missing GET path, `/assets/*` included. No documented way to scope it                 |
| Cache headers out of the box       | none                                                                                                                                             | none                                                                                                                         | none                                                                                        | **on by default:** HTML `max-age=86400` (1 day), js/css `max-age=31536000` (no `immutable`). Override with TOML `[[advanced.headers]]` |
| Cache headers as wanted **(lab)**  | yes, `header` inside each `handle` block                                                                                                         | yes, `add_header` per `location`                                                                                             | yes                                                                                         | yes, via TOML globs `**` and `/assets/**`                                                                                              |
| Validators **(lab)**               | ETag + Last-Modified, 304 on `If-None-Match`                                                                                                     | ETag + Last-Modified, 304                                                                                                    | same                                                                                        | **no ETag**, Last-Modified only. Fallback responses (deep links) have neither, so they always send the full body                       |
| Compression                        | `encode`: zstd + gzip on the fly. `file_server precompressed` serves `.br/.zst/.gz`                                                              | gzip on the fly (needs `gzip on`, `gzip_types`, **`gzip_proxied any`**). `gzip_static` is compiled in. No brotli/zstd module | same                                                                                        | zstd, br, gzip, deflate on the fly, **on by default**. `--compression-static` (pre-compressed files) is off by default                 |
| Health check                       | `wget` and `curl` both in the image. No built-in endpoint: GET `/` (or add `respond /healthz 200`)                                               | busybox `wget` (no `curl` in `-slim`)                                                                                        | same                                                                                        | alpine: `wget` plus a built-in `/health` (`SERVER_HEALTH=true`). **Scratch: no shell and no wget, so no in-container HEALTHCHECK**     |
| Config for this job                | ~20-line Caddyfile                                                                                                                               | ~17-line `conf.d/default.conf`                                                                                               | ~17 lines, plus a patched `nginx.conf` for non-root                                         | ~5 `ENV` lines plus a ~9-line TOML                                                                                                     |
| Read-only root fs **(lab)**        | starts. Logs errors about `/data/caddy` (instance.uuid, storage-clean lock) but serves                                                           | needs `--tmpfs /tmp` (fails on `mkdir /tmp/proxy_temp` otherwise)                                                            | needs writable `/var/cache/nginx` and `/run` ([image docs](https://hub.docker.com/_/nginx)) | starts, no writes needed                                                                                                               |
| `cap_drop: ALL` **(lab)**          | **fails**: `exec /usr/bin/caddy: operation not permitted` (file capability). Fix: `RUN setcap -r /usr/bin/caddy`, or `cap_add: NET_BIND_SERVICE` | runs                                                                                                                         | not tested                                                                                  | runs                                                                                                                                   |

## Candidate details

### Caddy (official image)

Facts:

- The Docker Official Image page doesn't mention running as non-root. Its own Dockerfile example is `FROM caddy:<version>` + `COPY Caddyfile /etc/caddy/Caddyfile` + `COPY site /srv`. It warns "never use the :latest tag in a production site" ([image docs](https://github.com/docker-library/docs/blob/master/caddy/content.md)).
- SPA: the official [SPA pattern](https://caddyserver.com/docs/caddyfile/patterns#single-page-apps-spas) is `try_files {path} /index.html` + `file_server`. That page also says to put a no-cache `Cache-Control` on `index.html` when assets are hashed.
- `header` runs before `try_files` in the [directive order](https://caddyserver.com/docs/caddyfile/directives#directive-order). Path matchers in `header` therefore see the original path, and the docs suggest a `route` block for headers keyed on the rewritten `/index.html`. Putting the header inside each `handle` block avoids that question. **(lab)** If a matcher-less `header` sits next to a `header /assets/*` in the same block, the matcher-less one sorts last and overwrites the asset header.
- **(lab)** A plain `header Cache-Control ...` also lands on the 404 for a missing `/assets/*` file. The deferred form `header >Cache-Control ...` doesn't, and the sketch uses it.
- `admin off` and `persist_config off` are [global options](https://caddyserver.com/docs/caddyfile/options). The admin API otherwise listens on `localhost:2019`, and the config is persisted to `/config` by default. **(lab)** With both options off, Caddy serves normally as uid 1000. With a read-only root fs it also serves, but logs storage errors for `/data/caddy`.
- The `caddy file-server` CLI (no Caddyfile) has no SPA fallback and no header flags, so this job needs a Caddyfile.
- On the same host, the edge already runs `caddy:2-alpine`. The frontend image would share base layers with it only when both resolve to the same digest, which is unlikely with independent pulls and Renovate digest pins.

Config sketch (lab-tested on direct and edge paths):

```caddyfile
# apps/frontend/Caddyfile (location TBD)
{
	admin off
	persist_config off
	auto_https off
}

:3000 {
	root * /srv
	encode

	handle /assets/* {
		header >Cache-Control "public, max-age=31536000, immutable"
		file_server
	}

	handle {
		header Cache-Control "no-cache"
		try_files {path} /index.html
		file_server
	}
}
```

```dockerfile
FROM caddy:2-alpine
COPY apps/frontend/Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/apps/frontend/dist /srv
# optional hardening (lab-verified): RUN setcap -r /usr/bin/caddy  +  USER 1000:1000
EXPOSE 3000
HEALTHCHECK CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
```

### nginx: `nginx/nginx-unprivileged` (and the official `nginx`)

Facts:

- **Namespace move:** the [docker-nginx-unprivileged README](https://github.com/nginx/docker-nginx-unprivileged) now names `nginx/nginx-unprivileged` on Docker Hub. It says to use the old `nginxinc/nginx-unprivileged` link only "for releases prior to NGINX 1.31.7 (mainline branch) and 1.30.6 (stable branch)". The Docker Hub API reports `nginxinc/nginx-unprivileged` as `archived`, last updated 2026-10-19 (1.31.7). `nginx/nginx-unprivileged:alpine-slim` and `nginx:alpine-slim` are on 1.31.8. The official image's docs still link to the old namespace. The image is also published to ghcr.io, Amazon ECR and Quay.
- Unprivileged differences from upstream: listens on 8080, no `user` directive, pid file at `/tmp/nginx.pid`, `*_temp_path` under `/tmp` (README). The official image can run non-root only after you redefine `pid` and the temp paths yourself ([image docs, "Running nginx as a non-root user"](https://hub.docker.com/_/nginx)).
- `try_files`: "If none of the files were found, an internal redirect to the uri specified in the last parameter is made" ([core module](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)). `etag on` is the default.
- `add_header` applies only to 2xx/3xx unless you add `always`. It is "inherited from the previous configuration level if and only if there are no add_header directives defined on the current level" (`add_header_inherit` since 1.29.3 can change that) ([headers module](https://nginx.org/en/docs/http/ngx_http_headers_module.html)). The sketch therefore sets `Cache-Control` in each `location`, not at `server` level.
- **gzip behind the edge needs `gzip_proxied any`.** The defaults are `gzip off`, `gzip_types text/html`, `gzip_proxied off`, and nginx treats a request as proxied "by the presence of the 'Via' request header field" ([gzip module](https://nginx.org/en/docs/http/ngx_http_gzip_module.html#gzip_proxied)). **(lab)** Without `gzip_proxied any`, direct requests come back gzipped, but requests through the edge Caddy come back **uncompressed**.
- **(lab)** A `listen 3000;` server is IPv4-only. A busybox `wget http://localhost:3000/` health check inside the container then fails ("Connection refused", it tries `::1`). `http://127.0.0.1:3000/` works, and so would adding `listen [::]:3000;` (not tested). The entrypoint's `10-listen-on-ipv6-by-default.sh` didn't add an IPv6 listen to the custom config.
- The upstream `Server: nginx/<version>` header passes through the edge (lab). `server_tokens off` hides the version (not lab-tested).

Config sketch (lab-tested):

```nginx
# apps/frontend/nginx.conf -> /etc/nginx/conf.d/default.conf
server {
    listen 3000;
    root /usr/share/nginx/html;

    gzip on;
    gzip_vary on;
    gzip_proxied any;   # the edge Caddy sends "Via"; without this nothing is compressed
    gzip_types text/css application/javascript image/svg+xml application/json;

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }

    location / {
        add_header Cache-Control "no-cache";
        try_files $uri $uri/ /index.html;
    }
}
```

```dockerfile
FROM nginx/nginx-unprivileged:alpine-slim
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
EXPOSE 3000
HEALTHCHECK CMD wget -q --spider http://127.0.0.1:3000/ || exit 1
```

### static-web-server (SWS)

Facts (from the [v2 docs](https://static-web-server.net/v2/), their [source](https://github.com/static-web-server/docs/tree/main/src/v2), and `static-web-server --help` of 2.44.1):

- Three variants: scratch (`:2`), Alpine (`:2-alpine`), Debian (`:2-debian`). Alpine and Debian are "rootless by default" with user `sws`. **(lab)** Scratch runs as root, but also runs fine with `--user 1000:1000` ([Docker page](https://static-web-server.net/v2/features/docker.html)).
- Fallback: "used for GET requests when the requested path doesn't exist … served with a 200 status code" ([error pages](https://static-web-server.net/v2/features/error-pages.html)). **(lab)** A request for a stale hashed chunk (`/assets/index-OLDHASH.js`) gets `index.html` as `text/html` with status 200. With the `/assets/**` header rule it also gets `immutable, max-age=31536000`.
- Built-in cache headers are on by default: HTML and other files get one day, and js/css/fonts/images get one year ([cache-control headers](https://static-web-server.net/v2/features/cache-control-headers.html)). Custom headers "take precedence over existing ones" ([custom headers](https://static-web-server.net/v2/features/custom-http-headers.html)). **(lab)** Without overrides, `index.html` and deep links are served with `max-age=86400`.
- Compression (zstd > br > gzip > deflate) is on by default for text MIME types ([compression](https://static-web-server.net/v2/features/compression.html)). Pre-compressed lookup is **off** by default according to `--help` and the feature page. The [config-file reference](https://static-web-server.net/v2/configuration/config-file.html) example shows `compression-static = true`, so the docs disagree with each other.
- `/health` (GET/HEAD) is opt-in through `SERVER_HEALTH=true` ([health endpoint](https://static-web-server.net/v2/features/health-endpoint.html)). The docs only show a Kubernetes probe. In Docker, only the Alpine and Debian variants have a client (`wget`) for a `HEALTHCHECK`.
- Config file values override CLI/ENV ([config file](https://static-web-server.net/v2/configuration/config-file.html)). The default config path `./sws.toml` is loaded if present.
- Project: 2.4k GitHub stars. `joseluisq` has 1054 of the commits, the next contributor has 28. Latest release v2.44.1 (2026-10-07).

Config sketch (lab-tested, Alpine variant):

```toml
# apps/frontend/sws.toml
[advanced]

[[advanced.headers]]
source = "**"
headers = { Cache-Control = "no-cache" }

[[advanced.headers]]
source = "/assets/**"
headers = { Cache-Control = "public, max-age=31536000, immutable" }
```

```dockerfile
FROM joseluisq/static-web-server:2-alpine
ENV SERVER_PORT=3000 \
    SERVER_ROOT=/home/sws/public \
    SERVER_FALLBACK_PAGE=/home/sws/public/index.html \
    SERVER_HEALTH=true \
    SERVER_CONFIG_FILE=/etc/sws.toml
COPY apps/frontend/sws.toml /etc/sws.toml
COPY --from=builder /app/apps/frontend/dist /home/sws/public
EXPOSE 3000
HEALTHCHECK CMD wget -q --spider http://127.0.0.1:3000/health || exit 1
```

## Others looked at

- **Apache httpd `httpd:alpine`** (DOI, 2.4.69): 21.1 MB / 78.0 MB on arm64. The master runs as root with `User www-data`, `Listen 80`. SPA through `FallbackResource /index.html` (mod_dir, loaded by default). Unlike SWS, it can be switched off per directory with `FallbackResource disabled` ([mod_dir](https://httpd.apache.org/docs/2.4/mod/mod_dir.html#fallbackresource)). `mod_headers` is loaded. `mod_deflate`, `mod_brotli` and `mod_expires` ship but are commented out in the 551-line `httpd.conf`, which would have to be patched. Not lab-tested. It's the largest image here, with no advantage for this job.
- **Docker Hardened Images** (`dhi.io/caddy:2`, `dhi.io/nginx:1`): free "core features … under Apache 2.0", non-root by default ([DHI docs](https://docs.docker.com/dhi/)). Inspected: user 65532, nginx on 8080, Caddy 17.1 MB / 63.4 MB, nginx 10.6 MB / 50.7 MB. **No shell and no `wget`**, so no `wget` health check. **Pulls need `docker login dhi.io` with a Docker account** ([get started](https://docs.docker.com/dhi/get-started/)). An anonymous token request returned 401. CI would need a new Docker Hub secret for the build stage, while the host still pulls only from ghcr.io. Not lab-tested beyond inspect.
- **Official `nginx:alpine-slim` run as non-root**: same nginx as the unprivileged image, but you maintain the `pid` and temp-path edits yourself. The unprivileged image is NGINX's packaged version of exactly that.
- **No frontend container (outside the ticket's framing):** the edge Caddy could serve `dist/` itself with the same `try_files`/`header` block. The edge today is stock `caddy:2-alpine` with a mounted `Caddyfile`. That route needs a custom edge image or a shared volume, and every frontend deploy would then touch the TLS terminator. It also changes the "three images, all `:latest` on the same SHA" deploy rule. Listed only so #52 can rule it in or out.

## Cross-cutting notes

- **Stale chunks after a deploy.** Vite emits `vite:preloadError` when a dynamic import fails, e.g. for "a user who visited your site before the new deployment" ([Vite: load error handling](https://vite.dev/guide/build#load-error-handling)). Servers differ on what such a user gets **(lab)**:
  - Caddy/nginx with a scoped fallback: 404.
  - SWS: 200 `text/html` with the asset cache headers.
  - Either way the import fails. The difference is a long-cached HTML body under a `.js` URL.
- **Health check plumbing:** the image `HEALTHCHECK` (as in the sketches) and a compose `healthcheck:` (as `r-sidecar` does it) both work. `caddy`'s `depends_on: frontend` would need `condition: service_healthy` to wait on it.
- **Renovate:** `config:best-practices` includes `docker:pinDigests` ([presets](https://docs.renovatebot.com/presets-config/#configbest-practices)). Any new `FROM` gets a digest pin and lands in the existing "Docker image digests" group. The builder stage stays `node:22-alpine`, so the "Node.js" major rule still covers both Dockerfiles.
- **Not covered here:** what replaces the CI e2e "Start frontend" step (`node .output/server/index.mjs`). The map says a preview server. The same image could also run there.

## Open uncertainties

- Sizes and versions are from 2026-10-22/24 and move with every rebuild. The `nginx/nginx-unprivileged` vs `nginx:alpine-slim` compressed-size gap (8.9 MB vs 6.2 MB) is real on Docker Hub, but both unpack to 14.0 MB.
- Lab traffic was HTTP/1.1 on Docker Desktop, not the Hetzner host. TLS, HTTP/2 and HTTP/3 only happen at the edge, so this shouldn't matter for the inner server, but it wasn't run on the host.
- The SWS docs disagree on the `compression-static` default. The 2.44.1 binary says `false`.
- DHI access terms (account login, "Community" tier) are as documented today. Whether CI on GitHub's arm64 runners needs extra rate-limit handling for `dhi.io` wasn't tested.
- Whether to add security headers (HSTS, CSP, `X-Content-Type-Options`) at the edge or in the inner server is out of scope here. Neither does it today.

## Method

The lab files are in the session scratchpad, not in the repo. The steps:

- A fake Vite `dist/` was built into each candidate image with the configs above and run as network alias `frontend`, with a `caddy:2-alpine` edge running the prod routing (`@backend …` plus `reverse_proxy frontend:3000`).
- `curl -H 'Accept-Encoding: gzip, deflate, br, zstd'` probed `/`, `/admin`, `/login?x=1`, `/index.html`, the hashed js/css, a missing hashed js, `/favicon.ico` and `/robots.txt`, both directly and through the edge. The probes recorded status, `Content-Type`, `Cache-Control`, `Content-Encoding`, `Vary`, `ETag`, `Last-Modified` and `Via`.
- Further runs:
  - `--user 1000:1000`
  - `--read-only`
  - `--cap-drop ALL`
  - `--security-opt no-new-privileges`
  - an nginx echo config that shows which request headers the edge sends upstream
- Image sizes: compressed from `hub.docker.com/v2/repositories/<repo>/tags/<tag>` (arm64 entry), unpacked from `docker export | wc -c`.
- Prod baseline: one `curl` each against `https://lix.florianbieck.com/` and one `/_nuxt/*.js` chunk.
