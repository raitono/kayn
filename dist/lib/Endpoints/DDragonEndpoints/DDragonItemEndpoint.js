'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _DDragonRequest = require('../../RequestClient/DDragonRequest');

var _DDragonRequest2 = _interopRequireDefault(_DDragonRequest);

var _methodNames = require('../../Enums/method-names');

var _methodNames2 = _interopRequireDefault(_methodNames);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class DDragonItemEndpoint {
    constructor(config) {
        this.config = config;

        this.list = this.list.bind(this);
    }

    list() {
        return new _DDragonRequest2.default(this.config, 'item.json', _DDragonRequest.DDragonRequestTypes.CDN.DATA, _methodNames2.default.DDRAGON.ITEM_LIST);
    }
}

exports.default = DDragonItemEndpoint;