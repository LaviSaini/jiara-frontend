const database = require('../../connection/connect');
const sequelize = require('../../connection/connect');
const Sequelize = require('sequelize');
const normalizedPath = require('path').join(__dirname, '../models/models');
const models = {};
require('fs').readdirSync(normalizedPath).forEach((file) => {
    if (file.indexOf('.js') >= 0) {
        // eslint-disable-next-line import/no-dynamic-require, global-require
        models[file.replace('.js', '')] = require(`${normalizedPath}/${file}`)(sequelize, Sequelize);
    }
});

const dbService = (environment, migrate) => {
    const authenticateDB = () => database.authenticate();
    const dropDB = () => database.drop();

    const syncDB = () => database.sync().then(() => {
    });

    const successfulDBStart = () => (
        console.info('connection to the database has been established successfully')
    );

    const errorDBStart = (err) => (
        console.info('unable to connect to the database:', err)
    );

    const wrongEnvironment = () => {
        console.warn(`only development, staging, test and production are valid NODE_ENV variables but ${environment} is specified`);
        return process.exit(1);
    };

    const startMigrateTrue = async () => {
        try {
            await syncDB();
            successfulDBStart();
        } catch (err) {
            errorDBStart(err);
        }
    };

    const startMigrateFalse = async () => {
        try {
            await syncDB();
            successfulDBStart();
        } catch (err) {
            errorDBStart(err);
        }
    };

    const startDev = async () => {
        try {
            await authenticateDB();

            if (migrate) {
                return startMigrateTrue();
            }

            return startMigrateFalse();
        } catch (err) {
            return errorDBStart(err);
        }
    };

    const startStage = async () => {
        try {
            await authenticateDB();

            if (migrate) {
                return startMigrateTrue();
            }

            return startMigrateFalse();
        } catch (err) {
            return errorDBStart(err);
        }
    };

    const startTest = async () => {
        try {
            await authenticateDB();
            await dropDB();
            await startMigrateFalse();
        } catch (err) {
            errorDBStart(err);
        }
    };

    const startProd = async () => {
        try {
            await authenticateDB();
            await startMigrateFalse();
        } catch (err) {
            errorDBStart(err);
        }
    };

    const start = async () => {
        console.info('DB Environment:', environment);
        switch (environment) {
            case 'development':
                await startDev();
                break;
            case 'staging':
                await startStage();
                break;
            case 'testing':
                await startTest();
                break;
            case 'production':
                await startProd();
                break;
            default:
                await wrongEnvironment();
        }
    };

    return {
        start,
    };
};

module.exports = dbService;
