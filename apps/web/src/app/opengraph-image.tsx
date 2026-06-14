import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function loadFont(weight: number): Promise<ArrayBuffer> {
  const css = await fetch(
    `https://fonts.googleapis.com/css2?family=Outfit:wght@${weight}`,
    { headers: { "User-Agent": "Mozilla/5.0" } },
  ).then((r) => r.text());
  const url = css.match(/url\((.+?)\)/)?.[1];
  if (!url) throw new Error("font url not found");
  return fetch(url).then((r) => r.arrayBuffer());
}

export default async function OgImage() {
  const [regular, bold] = await Promise.all([loadFont(400), loadFont(700)]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "72px 80px",
        background: "#000",
        fontFamily: "Outfit",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage:
            "repeating-linear-gradient(45deg, #1f1f1f 0px, #1f1f1f 2px, transparent 2px, transparent 28px)",
          display: "flex",
          opacity: 0.2,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 24,
          maxWidth: 900,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontWeight: 700,
            fontSize: 96,
            lineHeight: 1,
            letterSpacing: "-0.04em",
          }}
        >
          <span style={{ color: "#fff" }}>Write Markdown.</span>
          <span style={{ color: "#ff4a1c" }}>Ship Content Fast.</span>
        </div>
        <p
          style={{
            fontWeight: 400,
            fontSize: 30,
            color: "#666",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          A zero-friction CMS for you and your agents.
        </p>
      </div>

      <div
        style={{
          position: "absolute",
          bottom: 64,
          right: 72,
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <span style={{ fontSize: 40, letterSpacing: "-0.05em", lineHeight: 1, marginTop: -6 }}>
          <span style={{ fontWeight: 400, color: "#fff" }}>vo</span><span style={{ fontWeight: 700, color: "#ff4a1c" }}>xx</span>
        </span>
        <div style={{ width: 1, height: 36, background: "#333", display: "flex" }} />
        <span style={{ fontWeight: 400, fontSize: 20, color: "#555", letterSpacing: "-0.02em" }}>
          voxx.prudentbird.com
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Outfit", data: regular, weight: 400 },
        { name: "Outfit", data: bold, weight: 700 },
      ],
    },
  );
}
