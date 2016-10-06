// Require the individual lodash modules needed
// and export the functions
exports.isArray = Array.isArray; // lodash.isarray is deprecated
exports.isEmpty = require('cloudant-sync.isempty');
exports.isFunction = require('cloudant-sync.isfunction');
exports.isObject = require('cloudant-sync.isobject');
exports.isString = require('cloudant-sync.isstring');
