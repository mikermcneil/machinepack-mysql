module.exports = {


  friendlyName: 'Parse native query result',


  description: 'Parse a raw result from a native query and normalize it for the specified query type.',


  cacheable: true,


  sync: true,


  inputs: {

    queryType: {
      description: 'The type of query operation this raw result came from.',
      moreInfoUrl: 'https://github.com/node-machine/waterline-driver-interface#query-results',
      extendedDescription:
        'Either "select", "insert", "destroy", "update", "count", "sum", or "avg".  '+
        'This determines how the provided raw result will be parsed/coerced.',
      required: true,
      example: 'select',// (select|insert|destroy|update|count|sum|avg)
    },

    nativeQueryResult: {
      description: 'The result data sent back from the the database as a result of a native query.',
      extendedDescription: 'Specifically, be sure to use the `result` property of the output report from a successful native query (i.e. don\'t include `meta`!)  The data provided will be coerced to a JSON-serializable value if it isn\'t one already (see [rttc.dehydrate()](https://github.com/node-machine/rttc#dehydratevalue-allownullfalse-dontstringifyfunctionsfalse)). That means any Date instances therein will be converted to timezone-agnostic ISO timestamp strings (i.e. JSON timestamps).',
      required: true,
      example: '==='
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The result was successfully normalized.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the normalized version of the raw result originally provided.   The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        result: '*',
        meta: '==='
      }
    },

  },


  fn: function (inputs, exits) {

    var normalizedResult;
    switch (inputs.queryType){
      case 'select':
        normalizedResult = inputs.nativeQueryResult.rows;
        break;

      case 'insert':
        normalizedResult = {
          inserted: inputs.nativeQueryResult.insertId
        };
        break;

      case 'update':
        normalizedResult = {
          numRecordsUpdated: inputs.nativeQueryResult.affectedRows
        };
        break;

      case 'delete':
        normalizedResult = {
          numRecordsDeleted: inputs.nativeQueryResult.affectedRows
        };
        break;

      default:

    }

    return exits.success({
      result: normalizedResult
    });
  }


};
