export class OpportunityDetails {
    public opportunityId: Number;
    public opportunityName: string;
    public winProbability: Number;
    public status: string;
    public stageId: number;
    public statusId: Number;
    public statusAttributeId: Number;
    public customerName: string;
    public value: Number;
    public expectedClosureDate: string;
    public contacts: {
        id: Number;
        name: string
    }[];
    public ownerName?: string;
}