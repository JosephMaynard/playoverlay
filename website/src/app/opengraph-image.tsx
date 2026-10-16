import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "PlayOverlay: live score and match-clock graphics for community sports streams";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NAVY = "#092049";
const STRIPE = ["#ef4136", "#27aae1", "#2bb673", "#f9ed32", "#ff8b2c"];

/**
 * The logo SVG styles its shapes with CSS classes, which the image renderer
 * doesn't apply. Swap each class for a plain fill attribute (and drop the
 * hidden layer) so it renders as an <img>.
 */
async function logoDataUri(): Promise<string> {
  const svg = await readFile(join(process.cwd(), "public", "playoverlay-logo.svg"), "utf8");
  const fills: Record<string, string> = {};
  for (const match of svg.matchAll(/\.(cls-\d+)\{fill:(#[0-9a-fA-F]{6})(;display:none)?\}/g)) {
    fills[match[1]] = match[3] ? "none" : match[2];
  }
  const inlined = svg
    .replace(/<defs>[\s\S]*?<\/defs>/, "")
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/class="(cls-\d+)"/g, (_, name: string) => `fill="${fills[name] ?? "none"}"`);
  return `data:image/svg+xml;base64,${Buffer.from(inlined).toString("base64")}`;
}

export default async function OpengraphImage() {
  const logo = await logoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: NAVY,
          color: "#ffffff",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 88px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <img src={logo} width={128} height={128} alt="" />
            <div style={{ fontSize: 88, fontWeight: 700, letterSpacing: -2 }}>PlayOverlay</div>
          </div>
          <div
            style={{
              marginTop: 40,
              fontSize: 44,
              lineHeight: 1.25,
              color: "rgba(255,255,255,0.88)",
              maxWidth: 980,
            }}
          >
            Live score and match-clock graphics for community sports streams
          </div>
          <div style={{ marginTop: 32, fontSize: 28, color: "rgba(255,255,255,0.62)" }}>
            Free and open source. Windows, macOS and Linux.
          </div>
        </div>
        <div style={{ display: "flex", height: 14 }}>
          {STRIPE.map((colour) => (
            <div key={colour} style={{ flex: 1, background: colour }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
