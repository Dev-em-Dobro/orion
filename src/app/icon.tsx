import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon PNG — alvo Orion (sidebar), fundo sólido pra aparecer na aba. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#18181b",
          borderRadius: 6,
        }}
      >
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            border: "2.5px solid #22c55e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 13,
              height: 13,
              borderRadius: 7,
              border: "2.5px solid #22c55e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: 2,
                background: "#22c55e",
              }}
            />
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
