export type ApplicationStatus = "Applied" | "Interview" | "Rejected" | "Offer";
export type ApplicationLocation = 'In-office' | 'Hybrid' | 'Remote';

export type JobApplication = {
  id: number;
  company: string;
  position: string;
  status: ApplicationStatus;
  location: ApplicationLocation | null;
  jobUrl: string | null;
  dateApplied: string | null;
  notes: string;
  updatedAt: string | null;
};

export type NewApplication = Pick<JobApplication, 'company' | 'position' | 'jobUrl' | 'dateApplied' | 'notes' | 'location'>;
