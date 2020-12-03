# <img src="https://github.com/pip-services/pip-services/raw/master/design/Logo.png" alt="Pip.Services Logo" style="max-width:30%"> <br/> Mongoose components for Node.js

This module is a part of the [Pip.Services](http://pipservices.org) polyglot microservices toolkit.

The Mongoose module simplifies working with Mongo databases using ODM and contains everything you need to get started with MongoDB.

The module contains the following packages:
 
- **Build** - contains a factory for creating MongoDB persistence components.
- **Connect** - instruments for configuring connections to the database. The component receives a set of configuration parameters and uses them to generate all necessary database connection parameters.
- **Persistence** - abstract classes for working with the database that can be used for connecting to collections and performing basic CRUD operations.

**NOTE: This module has been deprecated. We recommend to use plan [MongoDb](http://github.com/pip-services3-node/pip-services3-mongodb-node) persistence instead.**

<a name="links"></a> Quick links:

* [Configuration](https://www.pipservices.org/recipies/configuration)
* [API Reference](https://pip-services3-node.github.io/pip-services3-mongoose-node/globals.html)
* [Change Log](CHANGELOG.md)
* [Get Help](https://www.pipservices.org/community/help)
* [Contribute](https://www.pipservices.org/community/contribute)


## Use

Install the NPM package as
```bash
npm install pip-services3-mongoose-node --save
```

As an example, lets create persistence for the following data object.

```typescript
import { IIdentifiable } from 'pip-services3-commons-node';

export class MyObject implements IIdentifiable {
  public id: string;
  public key: string;
  public value: number;
}
```

The persistence component shall implement the following interface with a basic set of CRUD operations.

```typescript
export interface IMyPersistence {
    getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
      callback: (err: any, page: DataPage<MyObject>) => void): void;
    
    getOneById(correlationId: string, id: string, callback: (err: any, item: MyObject) => void): void;
    
    getOneByKey(correlationId: string, key: string, callback: (err: any, item: MyObject) => void): void;
    
    create(correlationId: string, item: MyObject, callback?: (err: any, item: MyObject) => void): void;
    
    update(correlationId: string, item: MyObject, callback?: (err: any, item: MyObject) => void): void;
    
    deleteById(correlationId: string, id: string, callback?: (err: any, item: MyObject) => void): void;
}
```

Before starting persistence you shall create a schema, that Mongoose will use to perform object relational mapping.
Here is the schema for `MyObject`.

```typescript
import { Schema } from "mongoose";

export let MyObjectMongooseSchema = function(): Schema {

  let schema: Schema = new Schema(
    {
      _id: { type: String },
      key: { type: String, required: true },
      value: { type: String, required: false }
    },
    {
        autoIndex: true
    }
  );

  schema.index({ key: 1 });

  schema.set('toJSON', {
    transform: function (doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  });

  return schema;
}
```

To implement Mongoose persistence component you shall inherit `IdentifiableMongoosePersistence`. 
Most CRUD operations will come from the base class. You only need to override `getPageByFilter` method with a custom filter function.
And implement a `getOneByKey` custom persistence method that doesn't exist in the base class.

```typescript
import { IdentifiableMongoosePersistence } from 'pip-services3-mongoose-node';

export class MyMongoosePersistence extends IdentifableMongoosePersistence {
  public constructor() {
    super('myobjects', MyObjectMongooseSchema());
  }

  private composeFilter(filter: FilterParams): any {
    filter = filter || new FilterParams();
    
    let id = filter.getAsNullableString("id");

    let criteria = [];

    let id = filter.getAsNullableString('id');
    if (id != null)
        criteria.push({ _id: id });

    let tempIds = filter.getAsNullableString("ids");
    if (tempIds != null) {
        let ids = tempIds.split(",");
        criteria.push({ _id: { $in: ids } });
    }

    let key = filter.getAsNullableString("key");
    if (key != null)
        criteria.push({ key: key });

    return criteria.length > 0 ? { $and: criteria } : null;
  }
  
  public getPageByFilter(correlationId: string, filter: FilterParams, paging: PagingParams,
    callback: (err: any, page: DataPage<MyObject>) => void): void {
    super.getPageByFilter(correlationId, this.composeFilter(filter), paging, "_id", null, callback);
  }  
  
  public getOneByKey(correlationId: string, key: string,
    callback: (err: any, item: MyObject) => void): void {

    let filter = { key: key };

    this._model.findOne(filter, (err, item) => {
      if (!err)
        this._logger.trace(correlationId, "Retrieved from %s by key = %s", this._collection, key);

      item = this.convertToPublic(item);
      callback(err, item);
    });
  }

}
```

Configuration for your microservice that includes mongodb persistence may look the following way.

```yaml
...
{{#if MONGODB_ENABLED}}
- descriptor: pip-services:connection:mongoose:con1:1.0
  collection: {{MONGO_COLLECTION}}{{#unless MONGO_COLLECTION}}applications{{/unless}}
  connection:
    uri: {{{MONGO_SERVICE_URI}}}
    host: {{{MONGO_SERVICE_HOST}}}{{#unless MONGO_SERVICE_HOST}}localhost{{/unless}}
    port: {{MONGO_SERVICE_PORT}}{{#unless MONGO_SERVICE_PORT}}27017{{/unless}}
    database: {{MONGO_DB}}{{#unless MONGO_DB}}app{{/unless}}
  credential:
    username: {{MONGO_USER}}
    password: {{MONGO_PASS}}
    
- descriptor: myservice:persistence:mongoose:default:1.0
  dependencies:
    connection: pip-services:connection:mongoose:con1:1.0
{{/if}}
...
```

## Develop

For development you shall install the following prerequisites:
* Node.js 8+
* Visual Studio Code or another IDE of your choice
* Docker
* Typescript

Install dependencies:
```bash
npm install
```

Compile the code:
```bash
tsc
```

Run automated tests:
```bash
npm test
```

Generate API documentation:
```bash
./docgen.ps1
```

Before committing changes run dockerized build and test as:
```bash
./build.ps1
./test.ps1
./clear.ps1
```

## Contacts

The library is created and maintained by **Sergey Seroukhov**.

The documentation is written by **Mark Makarychev**.
