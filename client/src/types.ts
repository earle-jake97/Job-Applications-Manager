export type ApplicationStatus = "Applied" | "Interview" | "Rejected" | "Offer";

export type JobApplication = {
  id: number;
  company: string;
  position: string;
  status: ApplicationStatus;
  jobUrl: string | null;
  dateApplied: string | null;
  notes: string;
  updatedAt: string | null;
};

export type NewApplication = Pick<JobApplication, 'company' | 'position' | 'jobUrl' | 'dateApplied' | 'notes'>;
