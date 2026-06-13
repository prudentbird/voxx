import { JetBrains_Mono, Outfit, Plus_Jakarta_Sans } from "next/font/google";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const fontClasses = `${outfit.variable} ${jakarta.variable} ${jetbrainsMono.variable}`;
