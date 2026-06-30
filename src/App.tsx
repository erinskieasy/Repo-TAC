import { useState } from "react";
import { TacDashboard } from "./components/tac";
import { OpportunityBriefWorkbench } from "./components/opportunity-brief";
import { ExecutiveDashboard } from "./components/executive";
import { useTheme } from "./theme";

type AppView = "dashboard" | "opportunity-brief" | "executive";

export default function App() {
  const [view, setView] = useState<AppView>("dashboard");
  const { theme, toggleTheme } = useTheme();

  if (view === "opportunity-brief") {
    return (
      <OpportunityBriefWorkbench
        onExit={() => setView("dashboard")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  if (view === "executive") {
    return (
      <ExecutiveDashboard
        onExit={() => setView("dashboard")}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <TacDashboard
      onNewProject={() => setView("opportunity-brief")}
      onOpenExecutive={() => setView("executive")}
      theme={theme}
      onToggleTheme={toggleTheme}
    />
  );
}
