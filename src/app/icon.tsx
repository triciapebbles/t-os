import { ImageResponse } from "next/og";

// Generates the browser-tab favicon on the fly — a plain cabbage emoji —
// instead of needing an uploaded image asset. Next.js picks this up
// automatically because of the file name "icon.tsx" in src/app.
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 26,
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        🥬
      </div>
    ),
    { ...size }
  );
}
