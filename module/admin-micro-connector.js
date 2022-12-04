class Connector {
    constructor() {
        this._admin = null;
        this._microPc = null;
    }
    get admin() {
        return this._admin;
    }

    get microPc() {
        return this._microPc;
    }

    set admin(value) {
        this._admin = value;
    }

    set microPc(value) {
        this._microPc = value;
    }
};

module.exports = new Connector();