import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Finesse Fashion Design Enterprise",
  description: "Embroidery, heat press, and custom garment design — orders, production tracking, and shop management."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
