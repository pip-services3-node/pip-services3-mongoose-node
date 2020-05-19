import { FilterParams } from 'pip-services3-commons-node';
import { PagingParams } from 'pip-services3-commons-node';
import { DataPage } from 'pip-services3-commons-node';

import { IdentifiableMongoosePersistence } from '../../src/persistence/IdentifiableMongoosePersistence';
import { Dummy } from '../fixtures/Dummy';
import { IDummyPersistence } from '../fixtures/IDummyPersistence';
import { DummyMongooseSchema } from './DummyMongooseSchema';

export class DummyMongoosePersistence 
    extends IdentifiableMongoosePersistence<Dummy, string> 
    implements IDummyPersistence
{
    public constructor() {
        super('dummies', DummyMongooseSchema());
    }

    public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams, 
        callback: (err: any, page: DataPage<Dummy>) => void): void {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition: any = {};
        if (key != null)
            filterCondition['key'] = key;

        super.getPageByFilter(correlationId, filterCondition, paging, null, null, callback);
    }

    public getCountByFilter(correlationId: string, filter: FilterParams, 
        callback: (err: any, count: number) => void): void {
        filter = filter || new FilterParams();
        let key = filter.getAsNullableString('key');

        let filterCondition: any = {};
        if (key != null)
            filterCondition['key'] = key;

        super.getCountByFilter(correlationId, filterCondition, callback);
    }
}