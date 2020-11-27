/** @module persistence */
import { IReferenceable } from 'pip-services3-commons-node';
import { IReferences } from 'pip-services3-commons-node';
import { IConfigurable } from 'pip-services3-commons-node';
import { IOpenable } from 'pip-services3-commons-node';
import { ConfigParams } from 'pip-services3-commons-node';
import { ConnectionException } from 'pip-services3-commons-node';
import { CompositeLogger } from 'pip-services3-components-node';

import { createConnection } from "mongoose";

import { MongooseConnectionResolver } from '../connect/MongooseConnectionResolver';

/**
 * Database connection for Mongoose ORM persistence.
 * 
 * By defining a connection and sharing it through multiple persistence components
 * you can reduce number of used database connections.
 * 
 * ### Configuration parameters ###
 * 
 * - connection(s):    
 *   - discovery_key:             (optional) a key to retrieve the connection from [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/connect.idiscovery.html IDiscovery]]
 *   - host:                      host name or IP address
 *   - port:                      port number (default: 27017)
 *   - uri:                       resource URI or connection string with all parameters in it
 * - credential(s):    
 *   - store_key:                 (optional) a key to retrieve the credentials from [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/auth.icredentialstore.html ICredentialStore]]
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
 * - <code>\*:logger:\*:\*:1.0</code>           (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/log.ilogger.html ILogger]] components to pass log messages
 * - <code>\*:discovery:\*:\*:1.0</code>        (optional) [[https://pip-services3-node.github.io/pip-services3-components-node/interfaces/connect.idiscovery.html IDiscovery]] services
 * - <code>\*:credential-store:\*:\*:1.0</code> (optional) Credential stores to resolve credentials
 * 
 */
export class MongooseConnection implements IReferenceable, IConfigurable, IOpenable {

    private _defaultConfig: ConfigParams = ConfigParams.fromTuples(
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
     * Creates a new instance of the connection component.
     */
    public constructor() {
        this._connection = createConnection();
    }

    /**
     * Configures component by passing configuration parameters.
     * 
     * @param config    configuration parameters to be set.
     */
    public configure(config: ConfigParams): void {
        config = config.setDefaults(this._defaultConfig);

        this._connectionResolver.configure(config);

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
            //autoReconnect: autoReconnect,
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
                settings['useUnifiedTopology'] = true;

                this._connection.openUri(uri, settings, (err) => {
                    if (err) {
                        err = new ConnectionException(correlationId, "CONNECT_FAILED", "Connection to mongodb failed").withCause(err);
                    } else {
                        this._database = this._database || this._connection.db.databaseName;
                        this._logger.debug(correlationId, "Connected to mongodb database %s", this._database);
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

    public getConnection(): any {
        return this._connection;
    }

    public getDatabase(): any {
        if (this._connection == null)
            return null;
        return this._connection.db;
    }

    public getDatabaseName(): string {
        return this._database;
    }

}
