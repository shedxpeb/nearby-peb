import { useState } from "react";
import { WorkerHome } from "@/app/worker/screens/WorkerHome";
import { workerService } from "@/src/services/workerService";

export default function HomePage() {
  const [isOnline, setIsOnline] = useState(false);

  const handleNavigate = (screen: string, jobId?: string) => {
    if (screen === "notifications") {
      // Navigate to notifications
    } else if (screen === "profile") {
      // Navigate to profile
    } else if (screen === "job" && jobId) {
      // Navigate to job detail
    } else if (screen === "accepted" && jobId) {
      // Navigate to job detail
    }
  };

  const handleToggleOnline = async (online: boolean) => {
    setIsOnline(online);
    try {
      await workerService.updateStatus(online ? "ONLINE" : "OFFLINE");
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  return <WorkerHome isOnline={isOnline} onToggleOnline={handleToggleOnline} onNavigate={handleNavigate} />;
}
