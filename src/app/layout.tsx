import type { Metadata } from "next";
import { Archivo, Archivo_Black, Instrument_Serif } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { auth, signOut } from "@/auth";
import SmoothScroll from "@/components/SmoothScroll";
import Header from "@/components/Header";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  weight: "400",
  subsets: ["latin"],
});

const editorial = Instrument_Serif({
  variable: "--font-editorial",
  weight: "400",
  style: ["italic", "normal"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DAYFILM",
  description: "One film a day. Record it, cut it, keep it — or share it.",
};

// Runs before hydration so the stored theme applies before first paint —
// otherwise a dark-mode visitor sees a flash of the light palette (or vice
// versa) while React boots.
const NO_FLASH_THEME_SCRIPT = `
(function () {
  try {
    var t = localStorage.getItem("theme");
    if (t === "light" || t === "dark") {
      document.documentElement.setAttribute("data-theme", t);
    }
  } catch (e) {}
})();
`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${archivo.variable} ${archivoBlack.variable} ${editorial.variable} h-full antialiased`}
    >
      <body className="grain min-h-full">
        <Script id="theme-no-flash" strategy="beforeInteractive">
          {NO_FLASH_THEME_SCRIPT}
        </Script>
        <SmoothScroll>
          <Header
            user={session?.user ?? null}
            signOutAction={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          />
          <main>{children}</main>
        </SmoothScroll>
      </body>
    </html>
  );
}
