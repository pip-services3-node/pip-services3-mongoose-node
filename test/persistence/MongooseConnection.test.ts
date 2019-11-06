var assert = require('chai').assert;
let process = require('process');

import { ConfigParams } from 'pip-services3-commons-node';
import { MongooseConnection } from '../../src/persistence/MongooseConnection';

suite('MongooseConnection', ()=> {
    let connection: MongooseConnection;

    let mongoUri = process.env['MONGO_URI'];
    let mongoHost = process.env['MONGO_HOST'] || 'localhost';
    let mongoPort = process.env['MONGO_PORT'] || 27017;
    let mongoDatabase = process.env['MONGO_DB'] || 'test';
    if (mongoUri == null && mongoHost == null)
        return;

    setup((done) => {
        let dbConfig = ConfigParams.fromTuples(
            'connection.uri', mongoUri,
            'connection.host', mongoHost,
            'connection.port', mongoPort,
            'connection.database', mongoDatabase
        );

        connection = new MongooseConnection();
        connection.configure(dbConfig);

        connection.open(null, done);
    });

    teardown((done) => {
        connection.close(null, done);
    });

    test('Open and Close', (done) => {
        assert.isTrue(connection.isOpen());
        assert.isObject(connection.getConnection());
        assert.isObject(connection.getDatabase());
        assert.isString(connection.getDatabaseName());

        done();
    });
});