import { NextResponse } from "next/server";
import { Resend } from "resend";

type ContactPayload = {
  name: string;
  email: string;
  message: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 2000;

const CONTROL_CHARS_REGEX = /[\x00-\x1f\x7f]/g;

function sanitizeForEmailHeader(value: string) {
  return value.replace(CONTROL_CHARS_REGEX, "").trim();
}

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const rateLimitState = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const recentTimestamps = (rateLimitState.get(ip) ?? []).filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS,
  );

  if (recentTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitState.set(ip, recentTimestamps);
    return true;
  }

  recentTimestamps.push(now);
  rateLimitState.set(ip, recentTimestamps);
  return false;
}

export async function POST(request: Request) {
  const body = (await request.json()) as Partial<ContactPayload>;
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim() ?? "";
  const message = body.message?.trim() ?? "";

  if (!name || !email || !message) {
    return NextResponse.json(
      { ok: false, error: "Todos los campos son obligatorios." },
      { status: 400 },
    );
  }

  if (
    name.length > MAX_NAME_LENGTH ||
    email.length > MAX_EMAIL_LENGTH ||
    message.length > MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json(
      {
        ok: false,
        error: "Uno de los campos excede la longitud máxima permitida.",
      },
      { status: 400 },
    );
  }

  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { ok: false, error: "El correo electrónico no es válido." },
      { status: 400 },
    );
  }

  const clientIp = getClientIp(request);
  if (isRateLimited(clientIp)) {
    return NextResponse.json(
      {
        ok: false,
        error: "Demasiados mensajes enviados. Intenta de nuevo más tarde.",
      },
      { status: 429 },
    );
  }

  const contactToEmail = process.env.CONTACT_TO_EMAIL;
  if (!contactToEmail) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde.",
      },
      { status: 500 },
    );
  }

  const safeName = sanitizeForEmailHeader(name);

  const resend = new Resend(process.env.RESEND_API_KEY);

  const { error } = await resend.emails.send({
    from: "Arcade Vault <onboarding@resend.dev>",
    to: contactToEmail,
    subject: `Nuevo mensaje de contacto de ${safeName}`,
    text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
  });

  if (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "No se pudo enviar el mensaje. Intenta de nuevo más tarde.",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
