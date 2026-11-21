export class companiesModel
{
    "companyId": Number
    "companyName": String
    "projectId": Number
    "companyTypeName"?:String
    "cityName"?:String

    "companyType": {
      "id": Number,
      "companyTypeName": String,
      "projectId": Number,
      "isActive": Number
    }
    "isActive": Number
    "address": String
    "country": {
      "countryId": Number,
      "countryName": String
    }
    "state": {
      "stateId": Number,
      "stateName": String,
      "countryId": Number
    }
    "city": {
      "cityId": Number,
      "cityName": String,
      "stateId": Number,
      "latitude": String | Number,
      "longitude": String | Number
    }
    "customAttributeValues": [
      {
        "attributeId": Number,
        "attributeType": any,
        "value": [
          any
        ]
      }
    ]
    "updatedBy": Number
  }