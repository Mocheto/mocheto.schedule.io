import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Brújula · Plan de alimentación y movimiento",
  description: "Un plan flexible de doce semanas para comer mejor, moverse y medir el progreso.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
