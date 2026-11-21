export interface AttributeFilter {
  attributeId: number;
  parentDataListId: number | null;
  attributeValue: string;
}

export interface SwapDataEntityDetail {
  moduleType: number;
  isSwapAll: boolean;
  recordIdsToSwap: number[];
  attributeFilters: AttributeFilter[];
}

export interface SwapDataRequest {
  projectId: number;
  oldOwnerUserId: string;
  newOwnerUserId: string;
  swapDataEntityDetails: SwapDataEntityDetail[];
}
