"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** @module build */
const pip_services3_components_node_1 = require("pip-services3-components-node");
const pip_services3_commons_node_1 = require("pip-services3-commons-node");
const MongooseConnection_1 = require("../persistence/MongooseConnection");
/**
 * Creates Mongoose components by their descriptors.
 *
 * @see [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/classes/build.factory.html Factory]]
 * @see [[MongooseConnection]]
 */
class DefaultMongooseFactory extends pip_services3_components_node_1.Factory {
    /**
     * Create a new instance of the factory.
     */
    constructor() {
        super();
        this.registerAsType(DefaultMongooseFactory.MongooseConnectionDescriptor, MongooseConnection_1.MongooseConnection);
    }
}
exports.DefaultMongooseFactory = DefaultMongooseFactory;
DefaultMongooseFactory.Descriptor = new pip_services3_commons_node_1.Descriptor("pip-services", "factory", "rpc", "default", "1.0");
DefaultMongooseFactory.MongooseConnectionDescriptor = new pip_services3_commons_node_1.Descriptor("pip-services", "connection", "mongoose", "*", "1.0");
//# sourceMappingURL=DefaultMongooseFactory.js.map