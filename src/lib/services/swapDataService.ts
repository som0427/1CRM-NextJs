import apiClient from "./apiClient";
import type { AttributeFilter, SwapDataRequest, SwapDataEntityDetail } from "../models/swap-data-request.model";

export type { AttributeFilter, SwapDataRequest, SwapDataEntityDetail };

class SwapDataService {
  getEntityIdentifiers(
    projectId: number,
    moduleType: number,
    ownerId: number,
    pageSize: number,
    pageNum: number,
    data: { attributeFilters: AttributeFilter[] }
  ): Promise<any> {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/common/filter/get-identifiers?projectId=${projectId}&moduleType=${moduleType}&ownerId=${ownerId}&pageSize=${pageSize}&pageNum=${pageNum}`;
    return apiClient.post(url, data);
  }

  swapEntity(reqBody: SwapDataRequest): Promise<any> {
    return apiClient.post(`${process.env.NEXT_PUBLIC_API_URL}/upload/api/swap-data`, reqBody);
  }
}

const swapDataService = new SwapDataService();

export default swapDataService;
