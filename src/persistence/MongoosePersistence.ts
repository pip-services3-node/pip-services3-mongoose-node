/** @module persistence */
import { IReferenceable } from 'pip-services3-commons-node';
import { IReferences } from 'pip-services3-commons-node';
import { IConfigurable } from 'pip-services3-commons-node';
import { IOpenable } from 'pip-services3-commons-node';
import { ICleanable } from 'pip-services3-commons-node';
import { ConfigParams } from 'pip-services3-commons-node';
import { ConnectionException } from 'pip-services3-commons-node';
import { CompositeLogger } from 'pip-services3-components-node';

import { Schema } from "mongoose";
import { createConnection } from "mongoose";

import { MongooseConnectionResolver } from '../connect/MongooseConnectionResolver';

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
export class MongoosePersistence implements IReferenceable, IConfigurable, IOpenable, ICleanable {

    private _defaultConfig: ConfigParams = ConfigParams.fromTuples(
        "collection", null,

        // connections.*
        // credential.*

        "options.max_pool_size", 2,
        "options.keep_alive", 1,
        "options.connect_timeout", 5000,
        "options.auto_reconnect", true,
        "options.max_page_size", 100,
        "options.debug", true
    );

    /** 
     * The logger.
     */
    protected _logger: CompositeLogger = new CompositeLogger();
    /**
     * The connection resolver.
     */
    protected _connectionResolver: MongooseConnectionResolver = new MongooseConnectionResolver();
    /**
     * The configuration options.
     */
    protected _options: ConfigParams = new ConfigParams();

    /**
     * The MongoDB connection object.
     */
    protected _connection: any;
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
        this._connection = createConnection();
        this._collection = collection;
        this._schema = schema;
        
        if (collection != null && schema != null) {
            schema.set('collection', collection);
            this._model = this._connection.model(collection, schema);
        }
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
        config = config.setDefaults(this._defaultConfig);

        this._connectionResolver.configure(config);

        let collection = config.getAsStringWithDefault('collection', this._collection);
        if (collection != this._collection && this._schema != null) {
            this._collection = collection;
            this._schema.set('collection', collection);
            this._model = this._model = this._connection.model(collection, this._schema);
        }

        this._options = this._options.override(config.getSection("options"));
    }

    /**
	 * Sets references to dependent components.
	 * 
	 * @param references 	references to locate the component dependencies. 
     */
    public setReferences(references: IReferences): void {
        this._logger.setReferences(references);
        this._connectionResolver.setReferences(references);
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
        return this._connection.readyState == 1;
    }

    private composeSettings(): any {
        let maxPoolSize = this._options.getAsNullableInteger("max_pool_size");
        let keepAlive = this._options.getAsNullableInteger("keep_alive");
        let connectTimeoutMS = this._options.getAsNullableInteger("connect_timeout");
        let socketTimeoutMS = this._options.getAsNullableInteger("socket_timeout");
        let autoReconnect = this._options.getAsNullableBoolean("auto_reconnect");
        let reconnectInterval = this._options.getAsNullableInteger("reconnect_interval");
        let debug = this._options.getAsNullableBoolean("debug");

        let ssl = this._options.getAsNullableBoolean("ssl");
        let replicaSet = this._options.getAsNullableString("replica_set");
        let authSource = this._options.getAsNullableString("auth_source");

        let settings: any = {
            poolSize: maxPoolSize,
            keepAlive: keepAlive,
            autoReconnect: autoReconnect,
            reconnectInterval: reconnectInterval,
            connectTimeoutMS: connectTimeoutMS,
            socketTimeoutMS: socketTimeoutMS
        };

        if (ssl != null)
            settings.ssl = ssl;
        if (replicaSet != null)
            settings.replicaSet = replicaSet;
        if (authSource != null)
            settings.authSource = authSource;

        return settings;
    }

    /**
	 * Opens the component.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public open(correlationId: string, callback?: (err: any) => void): void {
        this._connectionResolver.resolve(correlationId, (err, uri) => {
            if (err) {
                if (callback) callback(err);
                else this._logger.error(correlationId, err, 'Failed to resolve Mongoose connection');
                return;
            }

            this._logger.debug(correlationId, "Connecting to mongoose");

            try {
                let settings = this.composeSettings();

                // For forward compatibility
                settings['useNewUrlParser'] = true;
                settings['useFindAndModify'] = false;
                settings['useCreateIndex'] = true;

                this._connection.openUri(uri, settings, (err) => {
                    if (err) {
                        err = new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed").withCause(err);
                    } else {
                        this._database = this._database || this._connection.db.databaseName;
                        this._logger.debug(correlationId, "Connected to mongodb database %s, collection %s", this._database, this._collection);
                    }

                    if (callback) callback(err);
                });
            } catch (ex) {
                let err = new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed").withCause(ex);

                callback(err);
            }
        });
    }

    /**
	 * Closes component and frees used resources.
	 * 
	 * @param correlationId 	(optional) transaction id to trace execution through call chain.
     * @param callback 			callback function that receives error or null no errors occured.
     */
    public close(correlationId: string, callback?: (err: any) => void): void {
        this._connection.close((err) => {
            if (err)
                err = new ConnectionException(correlationId, 'DISCONNECT_FAILED', 'Disconnect from mongodb failed: ') .withCause(err);
            else
                this._logger.debug(correlationId, "Disconnected from mongodb database %s", this._database);

            if (callback) callback(err);
        });
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

}
