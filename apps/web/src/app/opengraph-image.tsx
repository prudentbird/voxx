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
        justifyContent: "flex-end",
        padding: "72px 80px",
        background: "#0a0a0a",
        fontFamily: "Outfit",
        letterSpacing: "-0.03em",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          marginBottom: 40,
        }}
      >
        <span
          style={{ fontWeight: 400, fontSize: 120, color: "#fff", lineHeight: 1 }}
        >
          vo
        </span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 120,
            color: "#ff4a1c",
            lineHeight: 1,
            marginTop: -30,
          }}
        >
          xx
        </span>
      </div>
      <p
        style={{
          fontWeight: 400,
          fontSize: 28,
          color: "#888",
          margin: 0,
          maxWidth: 700,
          lineHeight: 1.4,
        }}
      >
        A zero-friction CMS for Next.js — write markdown, ship content.
      </p>
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
