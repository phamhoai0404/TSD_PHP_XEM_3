const dotenv = require('dotenv');
dotenv.config();

const log4js = require( "log4js" );
log4js.configure("./config/log4js.json");
const logger = log4js.getLogger(process.env.LOG_CATEGORY);

let Singleton = require('./singleton')

module.exports = (function () {
    const singleton = Singleton.getInstance();
    let db;

    function setDB(dbName) {
        logger.info('setDB function:', dbName)
        if (dbName === 'setting') {
            logger.debug('>> dbName === setting')
            db = singleton.db_setting;
        } else {
            logger.debug('>> dbName === state')
            db = singleton.db_state;
        }
    }

    function load(microCode, dbName) {
        setDB(dbName);
        logger.info('load function:', microCode, dbName);
        return new Promise((resolve, reject) => {
            db.findOne({
                _id: microCode
            }, (err, result) => {
                if (err){
                    logger.error('>> load data error', err);
                    reject(err);
                } else {
                    logger.info('>> load data ok', result);
                    resolve(result);
                }
            });
        });
    }

    function save(obj, dbName) {
        setDB(dbName);
        logger.info('save function:', obj, dbName);
        return new Promise((resolve, reject) => {
            db.update({
                _id: obj.microCode,
            }, {
                record: obj.record,
                _id: obj.microCode
            }, {
                upsert: true
            }, (err, result) => {
                if (err) {
                    logger.error('>> save error', err);
                    reject(err);
                } else {
                    logger.info('>> save ok', result);
                    resolve(result);
                }
            })
        });
    }

    function remove(microCode, dbName) {
        setDB(dbName);
        logger.info('remove function:', microCode, dbName);
        return new Promise((resolve, reject) => {
            db.remove({
                _id: microCode
            }, {
                multi: true
            }, (err, numDeleted) => {
                if (err) {
                    logger.error('>> remove error', err);
                    reject(err);
                } else {
                    logger.info('>> remove ok', numDeleted, 'record(s)');
                    resolve();
                }
            });
        });
    }
    return {
        load: load,
        save: save,
        delete: remove
    }
})()