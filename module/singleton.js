const dotenv = require('dotenv');
dotenv.config();

const log4js = require( "log4js" );
log4js.configure("./config/log4js.json");
const logger = log4js.getLogger(process.env.LOG_CATEGORY);

let instance;
function createInstance() {
    let Datastore = require('nedb');
    const db_state = new Datastore({
        filename: './state.db',
        autoload: true
    });
    const db_setting = new Datastore({
        filename: './setting.db',
        autoload: true
    });
    let object = {
        db_state: db_state,
        db_setting: db_setting,
        controller: null,
        player: null
    };
    return object;
}

function getInstance() {
    if (!instance) {
        logger.debug('No instance');
        instance = createInstance();
    }
    logger.debug('Has instance');
    return instance;
}

module.exports = {
    getInstance: getInstance
};