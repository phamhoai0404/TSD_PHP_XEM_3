const dotenv = require('dotenv');
dotenv.config();

const log4js = require( "log4js" );
log4js.configure("./config/log4js.json");
const logger = log4js.getLogger(process.env.LOG_CATEGORY);

const app = require('express')();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const admin = require('./module/admin');
const microPc = require('./module/micro-pc');
const Singleton = require('./module/singleton');

const adminNs = io.of('/admin');
const microPcNs = io.of('/micro-pc');

console.log(Singleton);

admin.setNS(adminNs);
microPc.setNS(microPcNs);

let singleton = Singleton.getInstance();
singleton.admin = admin;
singleton.microPc = microPc;
singleton.db_state.persistence.setAutocompactionInterval(process.env.AUTO_COMPACT_INTERVAL);
singleton.db_setting.persistence.setAutocompactionInterval(process.env.AUTO_COMPACT_INTERVAL);

http.listen(process.env.PORT, function () {
   logger.info('listening on *:', process.env.PORT);
});
