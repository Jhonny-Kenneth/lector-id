import type { Metadata } from "next";

// Las paginas de SuperBets usan su propio favicon; el grupo (superbets) no cambia la URL.
export const metadata: Metadata = {
  icons: { icon: "/icon-superbets.png" },
};

export default function SuperbetsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
