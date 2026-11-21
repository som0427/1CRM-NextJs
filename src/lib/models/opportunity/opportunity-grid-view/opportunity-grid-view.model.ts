import { OpportunityDetails } from "./opportunity-details.model";

export class OpportunityGridViewModel {
    public statusId: number;
    public status: string;
    public stageId: number;
    public statusDisplayOrder: number;
    public oppDetails: OpportunityDetails[];
}