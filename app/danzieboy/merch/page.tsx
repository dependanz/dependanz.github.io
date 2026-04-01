import { nixieOne } from "@/app/ui/fonts";
import PrankPlayer from "./prank-player";

export const metadata = {
  title: "danzieboy merch",
  description: "get april fooled",
};

export default function DanzieboyMerchPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section
        className="flex w-full max-w-xl flex-col items-center gap-6 rounded-lg border px-5 py-8"
        style={{
          borderColor: "var(--ring)",
          boxShadow: "0 12px 30px var(--shadow-active)",
        }}
      >
        <h1
          className={`${nixieOne.className} text-center text-3xl tracking-[0.25em] lowercase md:text-4xl`}
        >
          get april fooled
        </h1>
        <PrankPlayer />
      </section>
    </main>
  );
}
