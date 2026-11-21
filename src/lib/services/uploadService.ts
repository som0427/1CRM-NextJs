import apiClient from './apiClient';

class UploadService {
    /**
     * Uploads an image to the server
     */
    uploadImage(moduleType: Number, image: File, projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
        const formData = new FormData();
        formData.append("projectId", projectId.toString());
        formData.append("moduleType", moduleType.toString());
        formData.append("image", image);
        return apiClient.post(
            process.env.NEXT_PUBLIC_API_URL + '/transactions/api/customType/uploadFieldImage', 
            formData
        );
    }
    uploadDoc(moduleType: Number, mediaFile: File, projectId: number): Promise<{responseData: any, statusCode: number, message: string}> {
        const formData = new FormData();
        formData.append("projectId", projectId.toString());
        formData.append("moduleId", moduleType.toString());
        formData.append("media", mediaFile);
        return apiClient.post(
            process.env.NEXT_PUBLIC_API_URL + '/transactions/api/customType/uploadAttributeRefDoc', 
            formData
        );
    }
}

const uploadService = new UploadService();
export default uploadService;
