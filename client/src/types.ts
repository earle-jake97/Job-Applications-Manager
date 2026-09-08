export type ApplicationStatus = "Applied" | "Interview" | "Rejected" | "Offer";

export type JobApplication = {
  id: number;
  company: string;
  position: string;
  status: ApplicationStatus;
};
