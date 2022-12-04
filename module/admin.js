const dotenv = require('dotenv');
dotenv.config();

const log4js = require( "log4js" );
log4js.configure("./config/log4js.json");
const logger = log4js.getLogger(process.env.LOG_CATEGORY);

const aMC = require('./admin-micro-connector');

const dbManager = require('./db.js');
let _connectedClients = [];

module.exports = (function () {
    var namespace;
    let connectedAdmin = [];
    function set(ns) {
        namespace = ns;
        namespace.on('connection', function (socket) {
            logger.info("Admin connected!");
            connectedAdmin.push(socket);
            logger.debug('Number of connected micro-pcs: ', _connectedClients.length);
            listConnectedClients(_connectedClients);
            socket.on('startEvent', function (microCode) {
                logger.info('Received startEvent - microCode: ', microCode);
                namespace.emit('startEvent', microCode);
                aMC.microPc.start(microCode);
            });

            socket.on('startAll', function (microCodes) {
                logger.info('Received startAll event:', microCodes);
                microCodes.forEach(function (microCode) {
                    logger.debug("microCode:", microCode);
                    namespace.emit('startEvent', microCode);
                    aMC.microPc.start(microCode);
                });
            });

            socket.on('stopEvent', async function (microCode) {
                logger.info("Received stopEvent: ", microCode);
                namespace.emit('stopEvent', microCode);
                aMC.microPc.stop(microCode);
                try {
                    await dbManager.delete(microCode, "state");
                } catch (err) {
                    logger.error("Delete state error: ", err);
                }
            });

            socket.on('stopAll', function (microCodes) {
                logger.info('Received stopAll event: ', microCodes);
                microCodes.forEach(async function (microCode) {
                    logger.debug("microCode:", microCode);
                    namespace.emit('stopEvent', microCode);
                    aMC.microPc.stop(microCode);
                    try {
                        await dbManager.delete(microCode, "setting");
                        await dbManager.delete(microCode, "state");
                    } catch (err) {
                        logger.error("Delete state or setting error: ", err);
                    }
                });
            });

            socket.on('updateSettingEvent', async function (settingLine) {
                logger.info('Received updateSettingEvent event: ', settingLine);
                if (settingLine.lineId) {
                    logger.debug(">> settingLine.lineId: ", settingLine.lineId);
                    try {
                        await aMC.microPc.updateSetting(settingLine);
                    } catch (error) {
                        logger.error(">> updateSetting error: ", error);
                    }
                }
                else {
                    logger.debug(">> settingLine.lineId == NULL ");
                    for (const settingMicro of settingLine) {
                        logger.debug(">> settingMicro: ", settingMicro);
                        try {
                            await dbManager.save(settingMicro, "setting");
                            await aMC.microPc.updateSetting(settingMicro.microCode);
                        } catch (error) {
                            logger.error(">> Save setting or updateSetting error: ", error);
                        }
                    }
                }
            });

            socket.on('stoppedAllEvent', function (microCodes) {
                logger.info("Received stoppedAllEvent: ", microCodes.length);
                microCodes.forEach(async function (microCode) {
                    logger.debug("microCode: ", microCode);
                    aMC.microPc.resetArrPdf(microCode);
                });
            });

            socket.on('disconnect', () => {
                logger.info("Received disconnect event");
                let disIndex = connectedAdmin.findIndex(el => el.io === socket);
                logger.debug("disIndex: ", disIndex);
                connectedAdmin.splice(disIndex, 1);
                logger.debug("Number of connected admins: ", connectedAdmin.length);
            });

            socket.on("listMicro", async (microInLine) => {
                logger.info("Received listMicro event: ", microInLine);
                microInLine.forEach(async (microCode) => {
                    logger.debug("microCode: ", microCode);
                    const state = await dbManager.load(microCode, "state");
                    logger.debug("state: ", state);
                    if (state) {
                        socket.emit("loadRealTime", state);
                    }
                })
            })
        });
    }

    function listConnectedClients(connectedClients) {
        logger.info("listConnectedClients function");
        _connectedClients = connectedClients;
        logger.debug('connectedClients.length: ', connectedClients.length);
        const microCodes = connectedClients.map(({ microCode }) => ({ microCode }));
        logger.debug("microCodes: ", microCodes);
        for (const socket of connectedAdmin) {
            if (microCodes) {
                logger.debug("microCodes != NULL");
                socket.emit('update-sockets', microCodes);
            } else {
                logger.debug("microCodes == NULL");
                socket.emit('update-sockets');
            }

        }
    }

    function downSuccess(microSettingRecord) {
        logger.info("downSuccess function. microSettingRecord: ", microSettingRecord);
        for (const socket of connectedAdmin) {
            socket.emit("downSuccess", microSettingRecord);
        }
    }
    function downError(infoFileError) {
        logger.info("downError function. infoFileError: ", infoFileError);
        for (const socket of connectedAdmin) {
            socket.emit("downError", infoFileError);
        }
    }
    function nextPdfOrPage(state) {
        logger.info("nextPdfOrPage function. state: ", state);
        for (const socket of connectedAdmin) {
            if (state) {
                socket.emit("loadRealTime", state);
            }
        }
    }
    // function preventTimeoutAdmin(microCode) {
    //     logger.mark("preventTimeoutAdmin");
    //     for (const socket of connectedAdmin) {
    //         socket.emit("preventTimeoutWeb", microCode);
    //     }
    // }
    const result = {
        setNS: set,
        listConnectedClients: listConnectedClients,
        downSuccess: downSuccess,
        downError: downError,
        nextPdfOrPage: nextPdfOrPage
        // preventTimeoutAdmin: preventTimeoutAdmin
    };

    aMC.admin = result;

    return result;
})()