import assert from "node:assert/strict";
import { spawn } from "node:child_process";

// Pemeriksaan kontrak hanya menyentuh backend buatan pada port acak lokal.
const server = spawn(process.execPath, [new URL("backend-uji.mjs", import.meta.url).pathname], {
  env: { ...process.env, FULI_FIXTURE_PORT: "0" },
  stdio: ["ignore", "pipe", "inherit"],
});
try {
  const alamat = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Fixture tidak siap.")), 5000);
    server.once("error", reject);
    server.stdout.on("data", (data) => {
      const match = String(data).match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { clearTimeout(timer); resolve(match[0]); }
    });
  });
  const headers = { "Content-Type": "application/json", "x-malika-uid": "uji-kontrak" };
  const post = (path, body) => fetch(`${alamat}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const identity = await (await post("/chat/identity", { uid: "uji-kontrak" })).json();
  assert.equal(identity.uid, "uji-kontrak");
  assert(identity.token.startsWith("uji."));
  const { thread } = await (await post("/chat/threads", {})).json();
  const base = `/chat/threads/${thread.id}`;
  const aliran = await post(`${base}/stream`, { text: "UJI: Kontrak aliran" });
  assert(aliran.headers.get("content-type").includes("text/event-stream"));
  const sse = await aliran.text();
  for (const nama of ["status", "text", "malika_ui", "done"]) assert(sse.includes(`event: ${nama}\n`));
  const { messages } = await (await fetch(`${alamat}${base}/messages`, { headers })).json();
  assert.equal(messages.length, 2);
  assert(messages[1].content.includes("```malika_ui"));
  const gagal = await post(`${base}/stream`, { text: "uji-gagal" });
  assert.equal(gagal.status, 503);
  const ulang = await post(`${base}/stream`, { text: "uji-gagal" });
  assert.equal(ulang.status, 200);
  assert((await ulang.text()).includes("event: done"));
  const { suggestions } = await (await fetch(`${alamat}${base}/suggestions`, { headers })).json();
  assert.equal(suggestions.length, 2);
  const tidakBerhak = await fetch(`${alamat}${base}/messages`, { headers: { "x-malika-uid": "identitas-uji-lain" } });
  assert.equal(tidakBerhak.status, 404);
  const ringkasan = await (await fetch(`${alamat}/__uji/health`)).json();
  assert.equal(ringkasan.selesai, 2);
  assert.equal(ringkasan.gagal, 1);
  console.log("LULUS: identitas, pembuatan utas, empat jenis event SSE, riwayat, metadata UI, gagal/ulang, saran, isolasi identitas; 2 jawaban selesai dan 1 kegagalan buatan.");
} finally {
  server.kill("SIGTERM");
}
