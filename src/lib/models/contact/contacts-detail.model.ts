export class ContactDetailModel
{
    "contactId":Number
    "contactName": String
    "projectId": Number
    "contactType": {
        "id": Number,
        "name": String,
        "enforceLiveLocCapture": Number
      }
    "designation": String
    "mobileNumber": Number
    "email": String

    "cityName"?:String
    "name"? :String
    
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
    "assignedCompanies": [
      {
        "companyId": Number,
        "companyName":String,
        "address": String
      },
      {
        "companyId":Number
        "companyName": String,
        "address": String
      }
    ]
    "customAttributeValues": [
      {
        "attributeId": Number
        "value": [
            any
        ]
      }
    ]
  }