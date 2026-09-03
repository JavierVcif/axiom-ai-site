# VivaForge

Landing page + chatbot de IA para VivaForge, un estudio de contenido con IA
(video, imagen, contenido para redes). Corre en Cloudflare Workers.

## Stack

- Sitio estático en `public/` (HTML/CSS/JS puro, sin build step).
- Worker en `src/index.ts` (TypeScript) que sirve `/api/chat`, respaldado
  por Cloudflare Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`),
  sin base de conocimiento externa (RAG) — el conocimiento del negocio está
  escrito directo en el `SYSTEM_PROMPT` de `src/index.ts`.
- `wrangler.jsonc` configura `assets.directory: ./public` y
  `run_worker_first: ["/api/*"]` — todo lo demás lo sirve Cloudflare directo
  desde `public/`, sin pasar por el Worker.
- Deploy: Cloudflare Worker `vivaforge`, dominio `vivaforge.io` /
  `www.vivaforge.io` (redirige a la raíz), más el subdominio
  `vivaforge.javier-vegac.workers.dev`.

## Estructura

```
public/            # sitio estático servido tal cual
  index.html
  css/style.css     # incluye el CSS del widget de chat al final
  js/script.js      # interacciones del sitio
  js/chat.js        # lógica del widget de chat
  assets/           # videos e imágenes
  _headers          # cabeceras de seguridad (CSP, HSTS, etc.)
  .assetsignore     # excluye .git, .claude, etc. de los assets públicos
src/
  index.ts          # Worker: maneja POST /api/chat
wrangler.jsonc
package.json
tsconfig.json
```

## Comandos

- `npm run dev` — `wrangler dev`, sirve el sitio + el Worker localmente en
  `http://127.0.0.1:8787` (usa esto en vez de un servidor estático simple;
  el chat necesita el runtime real del Worker).
- `npm run deploy` — `wrangler deploy`. **Pide confirmación explícita al
  usuario antes de correr esto** — sobrescribe producción.
- `npm run typecheck` — `tsc --noEmit`.

## Actualizar el conocimiento del bot

No hay base de conocimiento externa. Para cambiar lo que sabe el bot, edita
el `SYSTEM_PROMPT` en `src/index.ts` directamente (servicios, contacto,
tono, instrucciones) y vuelve a desplegar.

## Secrets

Ninguno. El binding `AI` de Workers AI no requiere API key externa. Si en
el futuro se agrega RAG (OpenAI + Vectorize), leer
`~/.claude/skills/chatbot-sitio-web/reference/manejo-seguro-de-secrets.md`
antes de tocar cualquier key.

## Notas

- El repo de GitHub sigue llamándose `axiom-ai-site` (nombre heredado de
  un rebrand anterior) — no afecta nada visible, es solo el nombre del
  repositorio.
- `Videos/` en la raíz son los exports originales sin usar — el sitio usa
  las copias en `public/assets/videos/`. Está en `.gitignore`.
