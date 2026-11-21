import { SystemAttributeEnum } from "../constants/SystemAttributeEnum.constant";
import { CustomAttibute } from "../models/custom-attibute.model";
import { CustomAttributeTypeEnum } from "../constants/CustomAttributeTypeEnum.constant";
import { AttributeType } from "../models/attribute-type.model";
import apiClient from "../api/apiClient";

class AdvanceSearchService {
    fetchStaticFields(serialKeyAttribId: SystemAttributeEnum): CustomAttibute[] {
        const staticFields: CustomAttibute[] = [];
        staticFields.push(this.createStaticField(SystemAttributeEnum.CREATED_ON, "Created On", CustomAttributeTypeEnum.CREATED_UPDATED_DATE));
        staticFields.push(this.createStaticField(SystemAttributeEnum.UPDATED_ON, "Updated On", CustomAttributeTypeEnum.CREATED_UPDATED_DATE));
        staticFields.push(this.createStaticField(serialKeyAttribId, "Serial Key", CustomAttributeTypeEnum.TEXT_SINGLE_LINE));
        return staticFields;
      }
    
      private createStaticField(id: number, name: string, type: CustomAttributeTypeEnum): CustomAttibute {
        const staticField = new CustomAttibute();
        staticField.id = id;
        staticField.attributeType = new AttributeType(type, null);
        staticField.attributeName = name;
        return staticField;
      }

      getAdvanceSearchOperators(): Promise<{responseData: any[], statusCode: number, message: string}> {
        return apiClient.get(
          process.env.NEXT_PUBLIC_API_URL + '/transactions/api/contact/fetchAdvancedSearchOperators');
      }
}

const advanceSearchService = new AdvanceSearchService();
export default advanceSearchService;