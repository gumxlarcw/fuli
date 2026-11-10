/**
 * Pintu tunggal Fuli ke backend. Hanya rute chat yang lolos; rute lain ditolak 404.
 * Tidak ada kunci di sini: identitas anonim dibawa dari peramban lewat x-malika-token.
 * Nama header tetap x-malika-* karena itu kontrak backend yang juga dipakai portal lama.
 */
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

// Alamat sungguhan hanya dari lingkungan. Jangan menulis alamat Tailscale atau LAN di sini.
const BACKEND = (process.env.BACKEND_BASE_URL || "http://127.0.0.1:5000").replace(/\/$/, "");

const IZIN: Array<[string, RegExp]> = [
  ["POST", /^chat\/identity$/],
  ["GET", /^chat\/threads$/],
  ["POST", /^chat\/threads$/],
  ["DELETE", /^chat\/threads\/\d+$/],
  ["GET", /^chat\/threads\/\d+\/messages$/],
  ["GET", /^chat\/threads\/\d+\/suggestions$/],
  ["POST", /^chat\/threads\/\d+\/stream$/],
  ["POST", /^chat-feedback$/],
  ["POST", /^error-learning\/flag$/],
  ["GET", /^search\/knowledge\/\d+$/],
];

const BATAS_TUBUH = 64 * 1024;

async function teruskan(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const jalur = path.join("/");
  if (!IZIN.some(([m, pola]) => m === req.method && pola.test(jalur))) {
    return Response.json({ ok: false, error: "rute_tidak_ada" }, { status: 404 });
  }

  const kepala: Record<string, string> = {};
  for (const nama of ["x-malika-uid", "x-malika-token"]) {
    const nilai = req.headers.get(nama);
    if (nilai) kepala[nama] = nilai;
  }

  let tubuh: string | undefined;
  if (req.method === "POST") {
    tubuh = await req.text();
    if (tubuh.length > BATAS_TUBUH) {
      return Response.json({ ok: false, error: "pesan_terlalu_panjang" }, { status: 413 });
    }
    kepala["Content-Type"] = "application/json";
  }

  let jawab: Response;
  try {
    jawab = await fetch(`${BACKEND}/${jalur}`, { method: req.method, headers: kepala, body: tubuh, cache: "no-store" });
  } catch {
    return Response.json({ ok: false, error: "backend_tak_terjangkau" }, { status: 502 });
  }

  const jenis = jawab.headers.get("content-type") || "application/json";
  if (jenis.includes("text/event-stream") && jawab.body) {
    return new Response(jawab.body, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  }

  return new Response(await jawab.text(), {
    status: jawab.status,
    headers: { "Content-Type": jenis, "Cache-Control": "no-store" },
  });
}

export const GET = teruskan;
export const POST = teruskan;
export const DELETE = teruskan;
