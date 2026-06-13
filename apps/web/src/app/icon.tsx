import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
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

export default async function Icon() {
  const [regular, bold] = await Promise.all([loadFont(400), loadFont(800)]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        background: "white",
        borderRadius: 40,
        fontFamily: "Outfit",
        letterSpacing: "-0.05em",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: -40,
        }}
      >
        <span style={{ fontWeight: 400, fontSize: 160, lineHeight: 1 }}>
          vo
        </span>
        <span
          style={{
            fontWeight: 800,
            fontSize: 160,
            lineHeight: 1,
            marginTop: -70,
          }}
        >
          xx
        </span>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Outfit", data: regular, weight: 400 },
        { name: "Outfit", data: bold, weight: 800 },
      ],
    },
  );
}
