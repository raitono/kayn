'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.ddragonRequestTypeToUrl = exports.DDragonRequestTypes = undefined;

var _request = require('request');

var _request2 = _interopRequireDefault(_request);

var _RegionHelper = require('../Utils/RegionHelper');

var _RegionHelper2 = _interopRequireDefault(_RegionHelper);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const DDragonRequestTypes = exports.DDragonRequestTypes = {
    REALMS: 'realms',
    API: 'api',
    CDN: {
        BASE: 'cdn', // for just /cdn/endpoint
        TARBALL: 'tarball', // requires own case because the endpoint contains version information, which the Endpoint manager doesn't know of
        DATA: 'cdn_data',
        IMAGE: {
            WITH_VERSION: 'cdn_img_with_version',
            STATIC: 'cdn_img_static'
        }
    }

    // Not sure how I should handle realms, versions, and a regular URL in an easy-to-code way...
    // As realm/version endpoints have different structures from cdn endpoints. We'll see!
    // Committing this to just show my thought process for now.
};const baseUrl = 'https://ddragon.leagueoflegends.com/';
const createRealmsUrl = endpoint => `${baseUrl}realms/${endpoint}`;
const createApiUrl = endpoint => `${baseUrl}api/${endpoint}`;
// Note that this function has optional arguments. Be careful!
const createBaseCdnUrl = endpoint => `${baseUrl}cdn/${endpoint}`;
const createCdnUrl = (type, version, locale, endpoint) => createBaseCdnUrl(`${version ? version + '/' : ''}${type}/${locale ? locale + '/' : ''}${endpoint}`);
const createDataUrl = (version, locale, endpoint) => createCdnUrl('data', version, locale, endpoint);
const createImageUrl = (version, endpoint) => createCdnUrl('img', version, null, endpoint);

const ddragonRequestTypeToUrl = exports.ddragonRequestTypeToUrl = (type, urlInformation) => {
    switch (type) {
        case DDragonRequestTypes.REALMS:
            return createRealmsUrl(urlInformation.endpoint);
        case DDragonRequestTypes.API:
            return createApiUrl(urlInformation.endpoint);
        case DDragonRequestTypes.CDN.BASE:
            return createBaseCdnUrl(urlInformation.endpoint);
        case DDragonRequestTypes.CDN.TARBALL:
            return createBaseCdnUrl(`dragontail-${urlInformation.version}.tgz`);
        case DDragonRequestTypes.CDN.DATA:
            if (!urlInformation.version) {
                throw new Error(`
                [kayn]: version() is required for DDragon data requests currently.
                e.g. kayn.DDragon.Champion.list().version('8.15.1')
                `);
            }
            return createDataUrl(urlInformation.version, urlInformation.locale, urlInformation.endpoint);
        case DDragonRequestTypes.CDN.IMAGE.WITH_VERSION:
            return createImageUrl(urlInformation.version, urlInformation.endpoint);
        case DDragonRequestTypes.CDN.IMAGE.STATIC:
            return createImageUrl(null, urlInformation.endpoint);
        default:
            throw new Error('Invalid DDragonRequestType.');
    }
};

class DDragonRequest {
    constructor(config, endpoint, requestType, methodName, dataTransformer) {
        this.payload = {
            endpoint,
            version: '',
            locale: '',
            region: '',
            type: requestType
        };
        this.config = config;
        this.methodName = methodName;
        this.dataTransformer = dataTransformer;
    }
    version(version) {
        if (typeof version !== 'string') throw new Error('DDragonRequest.version takes in a string.');
        if (version) this.payload.version = version;
        return this;
    }
    locale(locale) {
        if (this.payload.locale) throw new Error('Do not call DDragonRequest.locale twice.');
        // Add locale checker
        if (locale) this.payload.locale = locale;
        return this;
    }
    region(region) {
        if (this.payload.region) throw new Error('Do not call Request.region twice.');
        if (!_RegionHelper2.default.isValidRegion(region)) throw new Error('Bad region value in Request.region.');
        if (region) this.payload.region = region;
        return this;
    }
    then(resolve, reject) {
        var _this = this;

        return _asyncToGenerator(function* () {
            const self = _this;
            return new Promise(function (innerResolve, innerReject) {
                return self.callback(function (err, res) {
                    return err ? innerReject(err) : innerResolve(res);
                });
            }).then(resolve, reject);
        })();
    }
    catch(callback) {
        var _this2 = this;

        return _asyncToGenerator(function* () {
            return _this2.then(null, callback);
        })();
    }
    callback(cb) {
        var _this3 = this;

        return _asyncToGenerator(function* () {
            if (!_this3.payload.locale) _this3.payload.locale = _this3.config.locale;
            const { endpoint, version, locale, region, type } = _this3.payload;
            // Hack for making `version` optional!
            // The way this works is that for the given default region,
            // there is a set of versions associated with that region.
            // If the version map for the region is already cached, we use that.
            // Otherwise, we call the endpoint manually, cache it, and then proceed.
            if (type === DDragonRequestTypes.CDN.DATA && !version) {
                const getVersionFromMap = function (endpoint, versions) {
                    if (endpoint.includes('item')) return versions.n.item;
                    if (endpoint.includes('summoner')) return versions.n.summoner;
                    if (endpoint.includes('champion')) return versions.n.champion;
                    if (endpoint.includes('profileicon')) return versions.n.profileicon;
                    if (endpoint.includes('map')) return versions.n.map;
                    if (endpoint.includes('language')) return versions.n.language;
                    return versions.v;
                };
                const executeWithVersion = function (endpoint, versions) {
                    const version = getVersionFromMap(endpoint, versions);
                    const url = ddragonRequestTypeToUrl(type, {
                        endpoint,
                        locale,
                        version
                    });
                    _this3.execute(url, cb);
                };
                const realmArg = {
                    endpoint: (region || _this3.config.region) + '.json'
                };
                const self = _this3;
                if (_this3.config.cacheOptions.cache) {
                    // Cache exists and version is unspecified
                    _this3.config.cacheOptions.cache.get({
                        key: ddragonRequestTypeToUrl(DDragonRequestTypes.REALMS, realmArg)
                    }, function (err, data) {
                        if (data) {
                            executeWithVersion(endpoint, data);
                        } else {
                            const url = ddragonRequestTypeToUrl(DDragonRequestTypes.REALMS, realmArg);
                            self.execute(url, true, function (err, data) {
                                executeWithVersion(endpoint, data);
                            });
                        }
                    });
                    return;
                } else {
                    // Cache does not exist and version is unspecified
                    const url = ddragonRequestTypeToUrl(DDragonRequestTypes.REALMS, realmArg);
                    self.execute(url, true, function (err, data) {
                        executeWithVersion(endpoint, data);
                    });
                    return;
                }
            }
            // Cache does not exist and version is specified
            const url = ddragonRequestTypeToUrl(type, {
                endpoint,
                locale,
                version
            });
            _this3.execute(url, cb);
        })();
    }
    execute(url, isRealmPreRequest, cb) {
        var _this4 = this;

        return _asyncToGenerator(function* () {
            if (typeof isRealmPreRequest === 'function') {
                cb = isRealmPreRequest;
                isRealmPreRequest = false;
            }
            const { cacheOptions, debugOptions } = _this4.config;
            const fn = (() => {
                var _ref = _asyncToGenerator(function* (err, data) {
                    const debugURL = url;
                    try {
                        if (data) {
                            if (debugOptions.isEnabled) {
                                debugOptions.loggers.cache.get(debugURL);
                            }
                            ok(data)(cb);
                        } else {
                            if (debugOptions.isEnabled) {
                                debugOptions.loggers.request.outgoing(url);
                            }
                            // TODO: Handle this in the future, of course.
                            const { body: res, statusCode } = yield makeRequest(url);
                            try {
                                // `request` is making a JSON request, while this is an XML page,
                                // so it doesn't recognize this error within the `catch` block (I think).
                                if (statusCode >= 300) {
                                    if (debugOptions.isEnabled) {
                                        debugOptions.loggers.request.incoming.failure(`[${statusCode}] ${url}`);
                                    }
                                    error({ statusCode, url })(cb);
                                    return;
                                }
                                if (debugOptions.isEnabled) {
                                    debugOptions.loggers.request.incoming.success(debugURL);
                                }
                                const blob = JSON.parse(res);
                                const transformedBlob = _this4.dataTransformer && !isRealmPreRequest ? _this4.dataTransformer(blob) : blob;
                                if (cacheOptions.cache && cacheOptions.ttls[_this4.methodName] > 0) {
                                    cacheOptions.cache.set({
                                        key: url,
                                        ttl: cacheOptions.ttls[_this4.methodName]
                                    }, transformedBlob);
                                    if (debugOptions.isEnabled) {
                                        debugOptions.loggers.cache.set(`${url}`);
                                    }
                                }
                                ok(transformedBlob)(cb);
                            } catch (ex) {
                                // Don't think this is useful?
                                error({
                                    statusCode: ex.statusCode,
                                    url,
                                    error: ex
                                })(cb);
                            }
                        }
                    } catch (ex) {
                        // Don't think this is useful?
                        error({ statusCode: ex.statusCode, url, error: ex })(cb);
                    }
                });

                return function fn(_x, _x2) {
                    return _ref.apply(this, arguments);
                };
            })();
            if (cacheOptions.cache) {
                cacheOptions.cache.get({ key: url }, fn);
            } else {
                fn();
            }
        })();
    }
}

const makeRequest = (url, opts) => new Promise((resolve, reject) => {
    _request2.default.get(url, (err, res) => {
        if (err) reject(err);else resolve(res);
    });
});

const ok = blob => cb => cb(null, blob);
const error = blob => cb => cb(blob, null);

exports.default = DDragonRequest;