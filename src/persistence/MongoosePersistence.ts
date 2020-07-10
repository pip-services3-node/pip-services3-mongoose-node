/** @module persistence */

/** @hidden */
let _ = require('lodash');
/** @hidden */
let async = require('async');

import { IReferenceable } from 'pip-services3-commons-node';
import { IUnreferenceable } from 'pip-services3-commons-node';
import { IReferences } from 'pip-services3-commons-node';
import { IConfigurable } from 'pip-services3-commons-node';
import { IOpenable } from 'pip-services3-commons-node';
import { ICleanable } from 'pip-services3-commons-node';
import { ConfigParams } from 'pip-services3-commons-node';
import { ConnectionException } from 'pip-services3-commons-node';
import { InvalidStateException } from 'pip-services3-commons-node';
import { ConfigException } from 'pip-services3-commons-node';
import { DependencyResolver } from 'pip-services3-commons-node';
import { CompositeLogger } from 'pip-services3-components-node';
import { PagingParams } from 'pip-services3-commons-node';
import { DataPage } from 'pip-services3-commons-node';

import { Schema } from "mongoose";

import { MongooseConnectionResolver } from '../connect/MongooseConnectionResolver';
import { MongooseConnection } from './MongooseConnection';

/**
 * Abstract persistence component that stores data in MongoDB
 * and is based using Mongoose object relational mapping.
 * 
 * This is the most basic persistence component that is only
 * able to store data items of any type. Specific CRUD operations
 * over the data items must be implemented in child classes by
 * accessing <code>this._collection</code> or <code>this._model</code> properties.
 * 
 * ### Configuration parameters ###
 * 
 * - collection:                  (optional) MongoDB collection name
 * - connection(s):    
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):    
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/auth.icredentialstore.html ICredentialStore]]
 *   - username:                  (optional) user name
 *   - password:                  (optional) user password
 * - options:
 *   - max_pool_size:             (optional) maximum connection pool size (default: 2)
 *   - keep_alive:                (optional) enable connection keep alive (default: true)
 *   - connect_timeout:           (optional) connection timeout in milliseconds (default: 5000)
 *   - socket_timeout:            (optional) socket timeout in milliseconds (default: 360000)
 *   - auto_reconnect:            (optional) enable auto reconnection (default: true)
 *   - reconnect_interval:        (optional) reconnection interval in milliseconds (default: 1000)
 *   - max_page_size:             (optional) maximum page size (default: 100)
 *   - replica_set:               (optional) name of replica set
 *   - ssl:                       (optional) enable SSL connection (default: false)
 *   - auth_source:               (optional) authentication source
 *   - debug:                     (optional) enable debug output (default: false).
 * 
 * ### References ###
 * 
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 * 
 * ### Example ###
 * 
 *     class MyMongoosePersistence extends MongooosePersistence<MyData> {
 *    
 *       public constructor() {
 *           base("mydata", new MyDataMongooseSchema());
 *     }
 * 
 *     public getByName(correlationId: string, name: string, callback: (err, item) => void): void {
 *         let criteria = { name: name };
 *         this._model.findOne(criteria, callback);
 *     }); 
 * 
 *     public set(correlatonId: string, item: MyData, callback: (err) => void): void {
 *         let criteria = { name: item.name };
 *         let options = { upsert: true, new: true };
 *         this._model.findOneAndUpdate(criteria, item, options, callback);
 *     }
 * 
 *     }
 * 
 *     let persistence = new MyMongoosePersistence();
 *     persistence.configure(ConfigParams.fromTuples(
 *         "host", "localhost",
 *         "port", 27017
 *     ));
 * 
 *     persitence.open("123", (err) => {
 *          ...
 *     });
 * 
 *     persistence.set("123", { name: "ABC" }, (err) => {
 *         persistence.getByName("123", "ABC", (err, item) => {
 *             console.log(item);                   // Result: { name: "ABC" }
 *         });
 *     });
 */
export class MongoosePersistence<T> implements IReferenceable, IUnreferenceable, IConfigurable, IOpenable, ICleanable {

    private static _defaultConfig: ConfigParams = ConfigParams.fromTuples(
        "collection", null,
        "dependencies.connection", "*:connection:mongoose:*:1.0",

        // connections.*
        // credential.*

        "options.max_pool_size", 2,
        "options.keep_alive", 1,
        "options.connect_timeout", 5000,
        "options.auto_reconnect", true,
        "options.max_page_size", 100,
        "options.debug", true
    );

    private _config: ConfigParams;
    private _references: IReferences;
    private _opened: boolean;
    private _localConnection: boolean;
    protected _maxPageSize: number = 100;

    /**
     * The dependency resolver.
     */
    protected _dependencyResolver: DependencyResolver = new DependencyResolver(MongoosePersistence._defaultConfig);
    /** 
     * The logger.
     */
    protected _logger: CompositeLogger = new CompositeLogger();

    /**
     * The Mongoose connection component.
     */
    protected _connection: MongooseConnection;
    /**
     * The MongoDB database name.
     */
    protected _database: string;
    /**
     * The MongoDB collection object.
     */
    protected _collection: string;
    /**
     * The Mongoose model object.
     */
    protected _model: any;
    /**
     * The Mongoose schema.
     */
    protected _schema: Schema;

    /**
     * Creates a new instance of the persistence component.
     * 
     * @param collection    (optional) a collection name.
     * @param schema        (optional) a Mongoose schema. 
     */
    public constructor(collection?: string, schema?: Schema) {
        this._collection = collection;
        this._schema = schema;
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
        config = config.setDefaults(MongoosePersistence._defaultConfig);
        this._config = config;

        this._dependencyResolver.configure(config);

        this._collection = config.getAsStringWithDefault('collection', this._collection);
    }

    /**
	 * Sets references to dependent components.
	 * 
	 * @param references 	references to locate the component dependencies. 
     */
    public setReferences(references: IReferences): void {
        this._references = references;
        this._logger.setReferences(references);

        // Get connection
        this._dependencyResolver.setReferences(references);
        this._connection = this._dependencyResolver.getOneOptional('connection');
        // Or create a local one
        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        } else {
            this._localConnection = false;
        }
    }

    /**
	 * Unsets (clears) previously set references to dependent components. 
     */
    public unsetReferences(): void {
        this._connection = null;
    }

    private createConnection(): MongooseConnection {
        let connection = new MongooseConnection();

        if (this._config)
            connection.configure(this._config);

        if (this._references)
            connection.setReferences(this._references);

        return connection;
    }

    /** 
     * Converts object value from internal to public format.
     * 
     * @param value     an object in internal format to convert.
     * @returns converted object in public format.
     */
    protected convertToPublic(value: any): any {
        if (value && value.toJSON)
            value = value.toJSON();
        return value;
    }

    /** 
     * Convert object value from public to internal format.
     * 
     * @param value     an object in public format to convert.
     * @returns converted object in internal format.
     */
    protected convertFromPublic(value: any): any {
        return value;
    }

    /**
	 * Checks if the component is opened.
	 * 
	 * @returns true if the component has been opened and false otherwise.
     */
    public isOpen(): boolean {
        return this._opened;
    }

    /**
	 * Opens the component.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public open(correlationId: string, callback?: (err: any) => void): void {
        if (this._opened) {
            callback(null);
            return;
        }

        if (this._collection == null) {
            let err = new ConfigException(correlationId, 'NO_COLLECTION', 'MongoDB collection is not set');
            if (callback) callback(err);
            return;
        }

        // Todo: temporary disabled
        // if (this._schema == null) {
        //     let err = new InvalidStateException(correlationId, 'NO_SCHEMA', 'Mongoose schema is not set');
        //     if (callback) callback(err);
        //     return;
        // }

        if (this._connection == null) {
            this._connection = this.createConnection();
            this._localConnection = true;
        }

        let openCurl = (err) => {
            if (err == null && this._connection == null) {
                err = new InvalidStateException(correlationId, 'NO_CONNECTION', 'Mongoose connection is missing');
            }

            if (err == null && !this._connection.isOpen()) {
                err = new ConnectionException(correlationId, "CONNECT_FAILED", "Mongoose connection is not opened");
            }

            this._opened = false;

            if (err) {
                if (callback) callback(err);
            } else {
                this._opened = true;

                this._database = this._connection.getDatabaseName();
                let connection = this._connection.getConnection();

                if (this._collection != null && this._schema != null) {
                    this._schema.set('collection', this._collection);
                    this._model = connection.model(this._collection, this._schema);
                }

                this._logger.debug(correlationId, "Connected to mongodb database %s, collection %s", this._database, this._collection);

                if (callback) callback(err);
            }
        };

        if (this._localConnection) {
            this._connection.open(correlationId, openCurl);
        } else {
            openCurl(null);
        }
    }

    /**
	 * Closes component and frees used resources.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public close(correlationId: string, callback?: (err: any) => void): void {
        if (!this._opened) {
            callback(null);
            return;
        }

        if (this._connection == null) {
            callback(new InvalidStateException(correlationId, 'NO_CONNECTION', 'MongoDb connection is missing'));
            return;
        }

        let closeCurl = (err) => {
            this._opened = false;
            this._model = null;

            if (callback) callback(err);
        }

        if (this._localConnection) {
            this._connection.close(correlationId, closeCurl);
        } else {
            closeCurl(null);
        }
    }

    /**
	 * Clears component state.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public clear(correlationId: string, callback?: (err: any) => void): void {
        // Return error if collection is not set
        if (this._collection == null) {
            if (callback) callback(new Error('Collection name is not defined'));
            return;
        }

        // this._connection.db.dropCollection(this._collection, (err) => {
        //     if (err && (err.message != "ns not found" || err.message != "topology was destroyed"))
        //         err = null;

        //     if (err) {
        //         err = new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed")
        //             .withCause(err);
        //     }

        //     if (callback) callback(err);
        // });

        this._model.deleteMany({}, (err) => {
            if (err) {
                err = new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed")
                    .withCause(err);
            }

            if (callback) callback(err);
        });
    }

    /**
     * Gets a page of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getPageByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @param paging            (optional) paging parameters
     * @param sort              (optional) sorting JSON object
     * @param select            (optional) projection JSON object
     * @param callback          callback function that receives a data page or error.
     */
    protected getPageByFilter(correlationId: string, filter: any, paging: PagingParams,
        sort: any, select: any, callback: (err: any, items: DataPage<T>) => void): void {
        // Adjust max item count based on configuration
        paging = paging || new PagingParams();
        let skip = paging.getSkip(-1);
        let take = paging.getTake(this._maxPageSize);
        let pagingEnabled = paging.total;

        // Configure statement
        let statement = this._model.find(filter);

        if (skip >= 0) statement.skip(skip);
        statement.limit(take);
        if (sort && !_.isEmpty(sort)) statement.sort(sort);
        if (select && !_.isEmpty(select)) statement.select(select);

        statement.exec((err, items) => {
            if (err) {
                callback(err, null);
                return;
            }

            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collection);

            items = _.map(items, this.convertToPublic);

            if (pagingEnabled) {
                this._model.countDocuments(filter, (err, count) => {
                    if (err) {
                        callback(err, null);
                        return;
                    }

                    let page = new DataPage<T>(items, count);
                    callback(null, page);
                });
            } else {
                let page = new DataPage<T>(items);
                callback(null, page);
            }
        });
    }

    /**
     * Gets a number of data items retrieved by a given filter.
     * 
     * This method shall be called by a public getCountByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @param callback          callback function that receives a data page or error.
     */
    protected getCountByFilter(correlationId: string, filter: any,
        callback: (err: any, count: number) => void): void {

        // Configure statement
        let statement = this._model.find(filter);

        this._model.countDocuments(filter, (err, count) => {
            if (err) {
                callback(err, null);
                return;
            }

            if (count != null)
                this._logger.trace(correlationId, "Counted %d items in %s", count, this._collection);

            callback(null, count);
        });
    }

    /**
     * Gets a list of data items retrieved by a given filter and sorted according to sort parameters.
     * 
     * This method shall be called by a public getListByFilter method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId    (optional) transaction id to trace execution through call chain.
     * @param filter           (optional) a filter JSON object
     * @param paging           (optional) paging parameters
     * @param sort             (optional) sorting JSON object
     * @param select           (optional) projection JSON object
     * @param callback         callback function that receives a data list or error.
     */
    protected getListByFilter(correlationId: string, filter: any, sort: any, select: any,
        callback: (err: any, items: T[]) => void): void {

        // Configure statement
        let statement = this._model.find(filter);

        if (sort && !_.isEmpty(sort)) statement.sort(sort);
        if (select && !_.isEmpty(select)) statement.select(select);

        statement.exec((err, items) => {
            if (err) {
                callback(err, null);
                return;
            }

            if (items != null)
                this._logger.trace(correlationId, "Retrieved %d from %s", items.length, this._collection);

            items = _.map(items, this.convertToPublic);
            callback(null, items);
        });
    }

    /**
     * Gets a random item from items that match to a given filter.
     * 
     * This method shall be called by a public getOneRandom method from child class that
     * receives FilterParams and converts them into a filter function.
     * 
     * @param correlationId     (optional) transaction id to trace execution through call chain.
     * @param filter            (optional) a filter JSON object
     * @param callback          callback function that receives a random item or error.
     */
    protected getOneRandom(correlationId: string, filter: any, callback: (err: any, item: T) => void): void {
        this._model.countDocuments(filter, (err, count) => {
            if (err) {
                callback(err, null);
                return;
            }

            let pos = _.random(0, count - 1);

            this._model.find(filter)
                .skip(pos >= 0 ? pos : 0)
                .limit(1)
                .exec((err, items) => {
                    let item = (items != null && items.length > 0) ? items[0] : null;

                    item = this.convertToPublic(item);
                    callback(err, item);
                });
        });
    }

    /**
    * Creates a data item.
    * 
    * @param correlation_id    (optional) transaction id to trace execution through call chain.
    * @param item              an item to be created.
    * @param callback          (optional) callback function that receives created item or error.
    */
    public create(correlationId: string, item: T, callback?: (err: any, item: T) => void): void {
        if (item == null) {
            callback(null, null);
            return;
        }
    
        let newItem = this.convertFromPublic(item);
        this._model.create(newItem, (err, newItem) => {
            if (!err)
                this._logger.trace(correlationId, "Created in %s with id = %s", this._collection, newItem._id);

            newItem = this.convertToPublic(newItem);
            callback(err, newItem);
        });
    }

    /**
    * Deletes data items that match to a given filter.
    * 
    * This method shall be called by a public deleteByFilter method from child class that
    * receives FilterParams and converts them into a filter function.
    * 
    * @param correlationId     (optional) transaction id to trace execution through call chain.
    * @param filter            (optional) a filter JSON object.
    * @param callback          (optional) callback function that receives error or null for success.
    */
    public deleteByFilter(correlationId: string, filter: any, callback?: (err: any) => void): void {
        this._model.deleteMany(filter, (err, count) => {
            if (!err)
                this._logger.trace(correlationId, "Deleted %d items from %s", count, this._collection);

            if (callback) callback(err);
        });
    }

}
