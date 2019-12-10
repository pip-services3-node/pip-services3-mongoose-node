let process = require('process');

import { ConfigParams, ConnectionException } from 'pip-services3-commons-node';
import { Descriptor } from 'pip-services3-commons-node';
import { References } from 'pip-services3-commons-node';
import { MongooseConnection } from '../../src/persistence/MongooseConnection';
import { DummyPersistenceFixture } from '../fixtures/DummyPersistenceFixture';
import { DummyMongoosePersistence } from './DummyMongoosePersistence';

suite('DummyMongoDbConnection', ()=> {
    let connection: MongooseConnection;
    let persistence: DummyMongoosePersistence;
    let fixture: DummyPersistenceFixture;

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

        persistence = new DummyMongoosePersistence();
        persistence.setReferences(References.fromTuples(
            new Descriptor("pip-services", "connection", "mongoose", "default", "1.0"), connection
        ));

        fixture = new DummyPersistenceFixture(persistence);

        connection.open(null, (err: any) => {
            if (err) {
                done(err);
                return;
            }

            persistence.open(null, (err: any) => {
                if (err) {
                    done(err);
                    return;
                }
    
                persistence.clear(null, (err) => {
                    done(err);
                });
            });
        });
    });

    teardown((done) => {
        connection.close(null, (err) => {
            persistence.close(null, done);
        });
    });

    test('Crud Operations', (done) => {
        fixture.testCrudOperations(done);
    });

    test('Batch Operations', (done) => {
        fixture.testBatchOperations(done);
    });
});