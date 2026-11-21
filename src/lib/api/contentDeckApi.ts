import apiClient from "../services/apiClient";

// Sample data structure that matches AG Grid column definitions exactly
interface DeckGridData {
  id: number;
  deckId: number;
  deckCode: string;
  deckName: string;
  code: string;
  name: string;
  cards: number;
  assigned: number;
  due: string;
  completion: string;
  status: string;
  contentTopicId: number | null;
  contentTopicName: string | null;
  sequenceDisplayOrder: number | null;
}

export interface SequenceDeckItem {
  deckId: number;
  sequenceOrder: number;
}

export interface SaveDeckSequencePayload {
  projectId: number;
  topicId: number;
  sequenceList: SequenceDeckItem[];
}



export async function fetchContentDecks(projectId: number): Promise<DeckGridData[]> {
  try {

    const response = await apiClient.get<{ responseData: any, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/decks?projectId=${projectId}`
    );
    
    if(response.statusCode === 200){
      return response.responseData;
    }
    return [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Return fallback data in case of error
    return [];
  }
}

export async function fetchDeckData(deckId:number, projectId: number): Promise<any[]> {
  try {

    const response = await apiClient.get<{ responseData: any, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/getDeckData?projectId=${projectId}&deckId=${deckId}`
    );
    
    if(response.statusCode === 200){
      return response.responseData;
    }
    return [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Return fallback data in case of error
    return [];
  }
}

export async function addTraingramDeck(payload:any): Promise<any> {
  try {

    console.log('addTraingramDeck payload:', payload);
    const response = await apiClient.post<{ responseData: any, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/addEditDeck`,
      payload
    );
    
    if(response.statusCode === 201 || response.statusCode === 200){
      return response.responseData;
    }
  } catch (error) {
    console.error('', error);
    // Return fallback data in case of error
    return [];
  }
}

export async function saveDeckSequence(payload: SaveDeckSequencePayload): Promise<any> {
  try {
    const response = await apiClient.post<{ responseData: any, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/api/traingram/contentTopics/sequenceDecks`,
      payload
    );

    if (response.statusCode === 200 || response.statusCode === 201) {
      return response;
    }
    return null;
  } catch (error) {
    console.error('Error saving deck sequence:', error);
    throw error;
  }
}

// Fetch roles from API using contentDeckService
export async function getRoles(projectId: number): Promise<any> {
  try {

    const response = await apiClient.get<{ responseData: any, statusCode: number, message: string }>(
      `${process.env.NEXT_PUBLIC_API_URL}/setting/api/roles/?projectId=${projectId}&activeStatus=1`
    );
    
    if(response.statusCode === 200){
      return response.responseData;
    }
    return [];
  } catch (error) {
    console.error('Error fetching roles:', error);
    // Return fallback data in case of error
    return [];
  }
}

