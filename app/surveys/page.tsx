import Link from "next/link";

export const metadata = {
  title: "surveys",
  description: "listening studies",
};

export default function SurveysIndex() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">surveys</h1>
      <p className="text-sm opacity-70 mb-6">
        Listening studies hosted here. These are research/experimental and are typically run via
        Prolific.
      </p>
      <ul className="space-y-3">
        <li
          className="rounded-md border p-4 transition-shadow duration-300 hover:shadow-[0_12px_30px_var(--shadow-active)]"
          style={{ borderColor: "var(--ring)" }}
        >
          <Link href="/surveys/evc-pilot" className="block">
            <div className="font-semibold">EVC pilot — voice conversion listening study</div>
            <div className="text-sm opacity-70">
              Rate synthetic emotional speech (~5 min). Placeholder stimuli.
            </div>
          </Link>
        </li>
      </ul>
    </main>
  );
}
