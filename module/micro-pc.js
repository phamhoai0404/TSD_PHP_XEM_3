const dotenv = require('dotenv');
dotenv.config();

const log4js = require( "log4js" );
log4js.configure("./config/log4js.json");
const logger = log4js.getLogger(process.env.LOG_CATEGORY);

const aMC = require('./admin-micro-connector');

const dbManager = require("./db.js");
module.exports = (function () {
    let namespace;
    let connectedClients = [];

    function set(ns) {
        namespace = ns;
        namespace.on("connection", async function (socket) {
            logger.info("Received connection event")
            let client = {
                io: socket,
                microCode: socket.handshake.query.microCode,
                lineId: null
            };
            logger.info("Micro-pc connected:", client.microCode);
            connectedClients.push(client);
            aMC.admin.listConnectedClients(connectedClients);
            await updateSetting(client.microCode);

            socket.on("downloadedEvent", async (microCode) => {
                logger.info("Received downloadedEvent:", microCode);
                const state = await dbManager.load(microCode, "state");
                if (state) {
                    logger.debug(">> state", state);
                    for (const client of connectedClients) {
                        logger.debug(">>>> client.microCode:", client.microCode);
                        if (client.microCode === microCode) {
                            logger.debug(">>>>>> client.microCode === microCode");
                            client.io.emit("playFileEvent", state);
                        } else {
                            logger.debug(">>>>>> client.microCode !== microCode");
                        }
                    }
                } else {
                    logger.debug(">> state == NULL", state);
                }
            });

            socket.on("updateStateEvent", async state => {
                logger.info('Received updateStateEvent:', state);
                aMC.admin.nextPdfOrPage(state);
                await dbManager.save(state, "state");
            });

            socket.on("downSuccess", (microSettingRecord) => {
                logger.info("Received downSuccess event:", microSettingRecord);
                aMC.admin.downSuccess(microSettingRecord);
            });

            socket.on('downFileFalse', (infoFileError) => {
                logger.info('Received downFileFalse event', infoFileError);
                aMC.admin.downError(infoFileError);
            });

            socket.on('disconnect', () => {
                logger.info("Received disconnect event")
                let disIndex = connectedClients.findIndex(el => el.io === socket);
                logger.debug("Disconnected micro-pc:", connectedClients[disIndex].microCode);
                connectedClients.splice(disIndex, 1);
                aMC.admin.listConnectedClients(connectedClients);
                logger.debug('Number of connected clients:', connectedClients.length);

            });

            socket.on("preventTimeoutMicro", (microCode) => {
                // logger.mark("Received preventTimeoutMicro event");
                // aMC.admin.preventTimeoutAdmin(microCode);
                for (const client of connectedClients) {
                    if (client.microCode === microCode) {
                        client.io.emit("preventTimeoutMicro");
                        break;
                    }
                }
            });
        });
    }

    function start(microCode) {
        logger.info("start function. microCode:", microCode);
        for (const client of connectedClients) {
            logger.debug("client.microCode:", client.microCode);
            if (client.microCode === microCode) {
                logger.debug(">> client.microCode === microCode");
                client.io.emit("playFileEvent");
                break;
            }
        }
    }

    function stop(microCode) {
        logger.info("stop function: microCode:", microCode);
        for (const client of connectedClients) {
            logger.debug("client.microCode:", client.microCode);
            if (client.microCode === microCode) {
                logger.debug(">> client.microCode === microCode");
                client.io.emit("stopEvent");
                break;
            }
        }
    }

    function resetArrPdf(microCode) {
        logger.info("resetArrPdf function. microCode:", microCode);
        for (const client of connectedClients) {
            logger.debug("client.microCode:", client.microCode);
            if (client.microCode === microCode) {
                logger.debug(">> client.microCode === microCode");
                client.io.emit("resetArrPdf");
                break;
            }
        }
    }

    async function updateSetting(microCode) {
        logger.info("updateSetting function. microCode:", microCode);
        if (microCode.lineId) {
            logger.debug(">> microCode.lineId:", microCode.lineId);
            for (const client of connectedClients) {
                logger.debug(">> microCode.lineId:", microCode.lineId);
                if (client.lineId === microCode.lineId) {
                    logger.debug(">>>> client.lineId === microCode.lineId");
                    client.io.emit("updateSettingEvent");
                }
            }
        } else {
            logger.debug(">> microCode.lineId == NULL");
            const microSetting = await dbManager.load(microCode, "setting");
            logger.debug(">> microSetting:", microSetting);
            for (const client of connectedClients) {
                logger.debug(">> client.microCode:", client.microCode);
                if (client.microCode === microCode) {
                    logger.debug(">>>> client.microCode === microCode");
                    if (microSetting) {
                        logger.debug(">>>>>> microSetting != NULL");
                        if (microSetting.record.setting.length == 0) {
                            logger.debug(">>>>>>>> microSetting.record.setting.length == 0", microSetting.record.setting.length);
                            logger.debug('>>>>>>>> delete state:', microCode);
                            dbManager.delete(microCode, "state");
                        }
                        client.lineId = microSetting.record.lineId;
                        logger.debug(">>>>>> client.lineId:", client.lineId);
                        client.io.emit("updateSettingEvent", microSetting.record);
                    }
                    break;
                }
            }
        }
    }

    const result = {
        setNS: set,
        start: start,
        stop: stop,
        updateSetting: updateSetting,
        resetArrPdf: resetArrPdf
    };

    aMC.microPc = result;

    return result;
})();