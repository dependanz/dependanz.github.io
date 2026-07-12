import Header from "@/app/ui/header";
import HippocampusApp from "./hippocampus-app";

export const metadata = {
  title: "hippocampus — danzel serrano",
  description: "Bring-your-own-repo spaced-repetition study dashboard, powered by hippocampus-core."
};

export default function HippocampusPage() {
  return (
    <>
      <Header pageName="hippocampus" />
      <HippocampusApp />
    </>
  );
}
