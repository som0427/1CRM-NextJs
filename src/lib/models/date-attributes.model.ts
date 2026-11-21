import { StdLookupAttribute } from './std-lookup-attribute.model';


export class DateAttributes {
    id: number;
    attributeId: number;
    stdLookupAttribute: StdLookupAttribute;
    previousDateAllowed: number | string;
    futureDateAllowed: number | string;
    minDate?: Date | string;
    maxDate?: Date | string;
}
