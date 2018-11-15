"use strict";

var _ = require("lodash");
var iv1 = require("../../firestore/indexesV1Beta1");
var iv2 = require("../../firestore/indexesV1Beta2");
var logger = require("../../logger");

var utils = require("../../utils");

function _deployRules(context) {
  var rulesDeploy = _.get(context, "firestore.rulesDeploy");
  if (!context.firestoreRules || !rulesDeploy) {
    return Promise.resolve();
  }
  return rulesDeploy.createRulesets();
}

function _deployIndexes(context, options) {
  if (!context.firestoreIndexes) {
    return Promise.resolve();
  }

  var indexesSrc = _.get(context, "firestore.indexes.content");
  if (!indexesSrc) {
    logger.debug("No Firestore indexes present.");
    return Promise.resolve();
  }

  var indexes = indexesSrc.indexes;
  if (!indexes) {
    return utils.reject('Index file must contain an "indexes" property.');
  }

  var version = _.get(context, "firestore.indexes.version");
  if (version === "v1beta1") {
    return iv1.deploy(options.project, indexes);
  } else {
    return new iv2.FirestoreIndexes().deploy(options.project, indexes);
  }
}

/**
 * Deploy indexes.
 */
module.exports = function(context, options) {
  return Promise.all([_deployRules(context), _deployIndexes(context, options)]);
};