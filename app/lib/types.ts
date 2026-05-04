export type DeductionDisputeStatus =
  | "New"
  | "Not Started"
  | "In Review"
  | "Submitted"
  | "Resolved";

export type DeductionRecord = {
  id: string;
  distributor: string;
  retailer: string;
  invoiceNumber: string;
  deductionCode: string;
  deductionType: string;
  reason: string;
  amount: number;
  date: string;
  flagged: boolean;
  disputeStatus: DeductionDisputeStatus;
};
