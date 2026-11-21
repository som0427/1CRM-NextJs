export class opportunitiesLookupModel{
    "opportunityId": Number
    "opportunityName": String
    "projectId": Number
    "opportunityType": {
      "opportunityTypeId": Number,
      "opportunityStatus": String,
      "stage": Number
      "status": Number
    }
    "companyName"?:String
    "company": {
      "companyId": Number,
      "companyName": String
      "address": String
    }
    "description": String
    "value": Number  
    "expectedClosureDate":Number
    "winProbability": Number
    "address": String
    "country": {
      "countryId": Number
      "countryName": String
    }
    "state": {
      "stateId": Number
      "stateName": String
      "countryId": Number
    }
    "city": {
      "cityId": Number
      "cityName": String
      "stateId": Number,
      "latitude": Number
      "longitude": Number
    }
    "isActive": Number
    "location": any
    "frontImageName": String
    "createdOn": any
    "assignedContacts": [
      {
        "contactId": Number
        "contactName": String
        "companyId": Number
      },
      {
        "contactId": Number
        "contactName": String
        "companyId":Number
      }
    ]
    "customAttributeValues": [
      {
        "attributeId": Number
        "attributeType":String
        "value": [
            String
        ]
      }
    ]
    "updatedBy": Number
  }