import HippocampusApp from "./hippocampus-app";

export const metadata = {
  title: "hippocampus — danzel serrano",
  description: "Bring-your-own-repo spaced-repetition study dashboard, powered by hippocampus-core."
};

// Standalone page: intentionally does NOT render the site <Header>, so /hippocampus is fully
// self-contained and never touches the portfolio navbar. It keeps the shared minimal light/dark
// theme (from app/providers.tsx in the root layout) and carries its own small theme toggle.
export default function HippocampusPage() {
  return <HippocampusApp />;
}
