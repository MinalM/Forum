export interface ExperimentUser {
  userID: string;
  email?: string;
  custom?: {
    role?: string;
    authProvider?: string;
  };
}
