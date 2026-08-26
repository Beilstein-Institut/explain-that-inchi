# syntax=docker/dockerfile:1

# ---- build stage: compile the static site ----
FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Keep the /explain-that-inchi/ base path so the container mirrors GitHub Pages.
# git is absent in the build context, so vite.config's git-describe falls back
# to 'dev' for the commit string (handled gracefully).
RUN npm run build -- --base=/explain-that-inchi/

# Precompress text assets so nginx's gzip_static can serve them with no runtime
# CPU. -9 because this runs once at build; -k keeps the originals for clients
# that do not send Accept-Encoding: gzip.
#
# .wasm is included. It used to be excluded to protect streaming compilation,
# which was harmless while the wasm was base64-inlined into the JS and never
# fetched at all. Now that the binaryWasm entry fetches it for real, excluding it
# would ship 11.8 MB uncompressed instead of 3.6 MB — worse than the inlined
# build it replaced. Content-Encoding is transfer-level: the browser inflates the
# body before WebAssembly.instantiateStreaming reads it, so streaming compilation
# is unaffected. Content-Type is what streaming needs, and nginx serves
# application/wasm from its own mime.types.
RUN find /app/dist -type f \
      \( -name '*.js' -o -name '*.css' -o -name '*.svg' -o -name '*.wasm' \) \
      -exec gzip -9 -k {} +

# ---- serve stage: nginx with cross-origin-isolation headers ----
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html/explain-that-inchi
EXPOSE 80
