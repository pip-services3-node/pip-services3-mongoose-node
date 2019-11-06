/** @module build */
import { Factory } from 'pip-services3-components-node';
import { Descriptor } from 'pip-services3-commons-node';

import { MongooseConnection } from '../persistence/MongooseConnection';

/**
 * Creates Mongoose components by their descriptors.
 * 
 * @see [[https://rawgit.com/pip-services-node/pip-services3-components-node/master/doc/api/classes/build.factory.html Factory]]
 * @see [[MongooseConnection]]
 */
export class DefaultMongooseFactory extends Factory {
	public static readonly Descriptor: Descriptor = new Descriptor("pip-services", "factory", "rpc", "default", "1.0");
    public static readonly MongooseConnectionDescriptor: Descriptor = new Descriptor("pip-services", "connection", "mongoose", "*", "1.0");

    /**
	 * Create a new instance of the factory.
	 */
    public constructor() {
        super();
        this.registerAsType(DefaultMongooseFactory.MongooseConnectionDescriptor, MongooseConnection);
    }
}
