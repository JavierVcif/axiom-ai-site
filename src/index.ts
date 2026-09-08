// Chatbot de VivaForge — sin RAG, el conocimiento del negocio va directo
// en el system prompt.

export interface Env {
  AI: Ai;
  ASSETS: Fetcher;
  RESEND_API_KEY: string;
}

const SYSTEM_PROMPT = `Eres el asistente virtual del sitio web de VivaForge, un estudio de contenido con inteligencia artificial.

SOBRE VIVAFORGE:
VivaForge produce video, imagen, audio y contenido para redes con inteligencia artificial, con curaduría humana en cada pieza — no es solo el output crudo de un modelo. La promesa central es "calidad de agencia, ritmo de IA": producir contenido de calidad constante sin depender de un equipo de producción completo.

SERVICIOS PRINCIPALES:
1. Video con IA — video de marca, anuncios y contenido para redes generado y editado con IA (guion, storyboard, generación, edición, voces y música incluidas).
2. Imagen & branding — piezas visuales, fotografía de producto y assets de marca generados con IA para campañas.
3. Contenido para redes — paquete mensual de video, imagen y copy, con calendario de contenido, para que la marca del cliente publique sin pausas.

SERVICIOS ADICIONALES (bajo demanda, no el foco principal):
- Agentes de IA & automatización — chatbots y flujos automatizados para tareas del negocio del cliente.
- Consultoría & estrategia de IA — diagnóstico y hoja de ruta para adoptar IA en la operación del cliente.

PROCESO DE TRABAJO: Brief & referencias → Producción con IA → Curaduría & edición → Entrega & calendario.

CONTACTO:
- Correo: hola@vivaforge.io
- El formulario de contacto en la página también sirve para agendar una llamada gratuita de 20 minutos.

INSTRUCCIONES DE RESPUESTA:
- Responde SIEMPRE en español, con un tono premium, directo y sin relleno — el mismo tono del sitio.
- Sé breve: 2-4 frases por respuesta salvo que el usuario pida más detalle.
- Responde solo sobre VivaForge y lo descrito arriba. No inventes precios, plazos ni datos que no aparecen aquí — si preguntan precio exacto, indica que se define según el proyecto y que lo mejor es agendar una llamada.
- Si preguntan algo que NO tiene relación con VivaForge (trivia, temas generales, otros negocios), NO lo respondas bajo ninguna circunstancia, ni siquiera parcialmente. Indica que solo puedes ayudar con temas de VivaForge y redirige a contacto.
- Cuando sea natural, invita a escribir a hola@vivaforge.io o a agendar una llamada gratuita.`;

const MAX_HISTORY = 8;
const MAX_MESSAGE_LENGTH = 1000;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/chat") {
      if (request.method !== "POST") {
        return json({ error: "Método no permitido" }, 405);
      }
      return handleChat(request, env);
    }

    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return json({ error: "Método no permitido" }, 405);
      }
      return handleContact(request, env);
    }

    return json({ error: "No encontrado" }, 404);
  },
} satisfies ExportedHandler<Env>;

async function handleChat(request: Request, env: Env): Promise<Response> {
  let body: { messages?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const incoming = Array.isArray(body.messages) ? body.messages : [];
  const history: ChatMessage[] = incoming
    .filter(
      (m: unknown): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string"
    )
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_MESSAGE_LENGTH) }));

  if (history.length === 0 || history[history.length - 1].role !== "user") {
    return json({ error: "Falta el mensaje del usuario" }, 400);
  }

  const messages = [{ role: "system" as const, content: SYSTEM_PROMPT }, ...history];

  try {
    const result = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages,
      max_tokens: 400,
    });

    const reply =
      typeof result === "object" && result !== null && "response" in result
        ? String((result as { response: unknown }).response)
        : "";

    if (!reply.trim()) {
      return json({ error: "No se pudo generar una respuesta" }, 502);
    }

    return json({ reply });
  } catch (err) {
    console.error("AI run failed", err);
    return json({ error: "Error generando la respuesta" }, 502);
  }
}

const CONTACT_TO = ["javier.vegac@gmail.com", "fpaz.vega@gmail.com"];
const CONTACT_FROM = "VivaForge <contacto@mail.vivaforge.io>";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FIELD_LENGTH = 200;
const MAX_MESSAGE_FIELD_LENGTH = 3000;

interface ContactBody {
  name?: unknown;
  email?: unknown;
  company?: unknown;
  message?: unknown;
}

async function handleContact(request: Request, env: Env): Promise<Response> {
  let body: ContactBody;
  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const company = typeof body.company === "string" ? body.company.trim().slice(0, MAX_FIELD_LENGTH) : "";
  const message =
    typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE_FIELD_LENGTH) : "";

  if (!name || !email || !message) {
    return json({ error: "Faltan campos obligatorios" }, 400);
  }
  if (!EMAIL_RE.test(email)) {
    return json({ error: "Correo inválido" }, 400);
  }

  const subject = `Nuevo contacto de ${name}${company ? ` — ${company}` : ""}`;
  const text = `Nombre: ${name}\nCorreo: ${email}\nEmpresa: ${company || "-"}\n\nMensaje:\n${message}`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: CONTACT_TO,
        reply_to: email,
        subject,
        text,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("Resend send failed", res.status, errBody);
      return json({ error: "No se pudo enviar el mensaje" }, 502);
    }

    return json({ ok: true });
  } catch (err) {
    console.error("Contact send failed", err);
    return json({ error: "No se pudo enviar el mensaje" }, 502);
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
