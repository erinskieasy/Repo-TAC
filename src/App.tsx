import { useState } from "react";
import { TacDashboard } from "./components/tac";
import { OpportunityBriefWorkbench } from "./components/opportunity-brief";

type AppView = "dashboard" | "opportunity-brief";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");

  if (view === "opportunity-brief") {
    return <OpportunityBriefWorkbench onExit={() => setView("dashboard")} />;
  }

  return <TacDashboard onNewProject={() => setView("opportunity-brief")} />;
}
