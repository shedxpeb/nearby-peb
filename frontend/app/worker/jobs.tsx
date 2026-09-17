import { WorkerJobs } from "@/app/worker/screens/WorkerJobs";

export default function JobsPage() {
  const handleNavigate = (screen: string, jobId?: string) => {
    if (screen === "job" && jobId) {
      // Navigate to job detail
    }
  };

  return <WorkerJobs onNavigate={handleNavigate} />;
}
