# <img src="https://github.com/pip-services/pip-services/raw/master/design/Logo.png" alt="Pip.Services Logo" style="max-width:30%"> <br/> Mongoose components for Node.js

This module is a part of the [Pip.Services](http://pipservices.org) polyglot microservices toolkit.

The Mongoose module simplifies working with Mongo databases using ODM and contains everything you need to get started with MongoDB.

The module contains the following packages:
 
- **Build** - contains a factory for creating MongoDB persistence components.
- **Connect** - instruments for configuring connections to the database. The component receives a set of configuration parameters and uses them to generate all necessary database connection parameters.
- **Persistence** - abstract classes for working with the database that can be used for connecting to collections and performing basic CRUD operations.

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
