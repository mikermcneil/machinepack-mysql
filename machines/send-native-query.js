module.exports = {


  friendlyName: 'Send native query',


  description: 'Send a native query to the MySQL database.',


  inputs: {

    connection:
      require('../constants/connection.input'),

    nativeQuery: {
      description: 'A SQL statement as a string (or to use built-in escaping, this should be provided as a dictionary).',
      extendedDescription: 'If provided as a dictionary, this should contain `sql` (the SQL statement string; e.g. \'SELECT * FROM dogs WHERE name = ?\') as well as an array of `bindings` (e.g. [\'David\']).',
      moreInfoUrl: 'https://github.com/felixge/node-mysql#performing-queries',
      whereToGet: {
        description: 'This is oftentimes compiled from Waterline query syntax using "Compile statement", however it could also originate from userland code.',
      },
      example: '*',
      required: true
    },

    meta:
      require('../constants/meta.input')

  },


  exits: {

    success: {
      description: 'The native query was executed successfully.',
      outputVariableName: 'report',
      outputDescription: 'The `result` property is the result data the database sent back.  The `meta` property is reserved for custom driver-specific extensions.',
      moreInfoUrl: 'https://github.com/felixge/node-mysql#getting-the-id-of-an-inserted-row',
      example: {
        result: '===',
        meta: '==='
      }
    },

    queryFailed: {
      description: 'The database returned an error when attempting to execute the native query.',
      outputVariableName: 'report',
      outputDescription: 'The `error` property is a JavaScript Error instance with more details about what went wrong.  The `meta` property is reserved for custom driver-specific extensions.',
      example: {
        error: '===',
        meta: '==='
      }
    },

    badConnection:
      require('../constants/badConnection.exit')

  },


  fn: function (inputs, exits) {
    var util = require('util');
    var validateConnection = require('../helpers/validate-connection');

    // Validate provided connection.
    if ( !validateConnection({ connection: inputs.connection }).execSync() ) {
      return exits.badConnection();
    }


    // Validate query
    // (supports raw SQL string or dictionary consisting of `sql` and `bindings` properties)
    var sql;
    var bindings = [];
    if ( util.isString(inputs.nativeQuery) ) {
      sql = inputs.nativeQuery;
    }
    else if ( util.isObject(inputs.nativeQuery) && util.isString(inputs.nativeQuery.sql) ) {
      sql = inputs.nativeQuery.sql;
      if ( util.isArray(inputs.nativeQuery.bindings) ) {
        bindings = inputs.nativeQuery.bindings;
      }
    }
    else {
      return exits.error(new Error('Provided `nativeQuery` is invalid.  Please specify either a string of raw SQL or a dictionary like `{sql: \'SELECT * FROM dogs WHERE name = $1\', bindings: [\'Rover\']}`.'));
    }


    // Send native query to the database using node-mysql.
    inputs.connection.query({
      sql: sql,
      values: bindings
    }, function () {
      // The exact format of the arguments for this callback are not part of
      // the officially documented behavior of node-mysql (at least not as
      // of March 2016 when this comment is being written).
      //
      // If you need to trace this down to the implementation, you might try
      // checking out the following links in order (from top to bottom):
      //  • https://github.com/felixge/node-mysql#performing-queries
      //  • https://github.com/felixge/node-mysql/blob/f5bd13d8c54ce524a6bff48bfceb15fdca3a938a/lib/protocol/ResultSet.js
      //  • https://github.com/felixge/node-mysql/blob/d4a5fd7b5e92a1e09bf3c85d24265eada8a84ad8/lib/protocol/sequences/Sequence.js#L96
      //  • https://github.com/felixge/node-mysql/blob/1720920f7afc660d37430c35c7128b20f77735e3/lib/protocol/sequences/Query.js#L94
      //  • https://github.com/felixge/node-mysql/blob/1720920f7afc660d37430c35c7128b20f77735e3/lib/protocol/sequences/Query.js#L144
      //
      // For example, here are the raw arguments provided to the `.query()`
      // callback for different types of queries:
      // ====================================================================
      // * * * * * *
      // CREATE TABLE
      // * * * * * *
      // ```
      // null,
      // {         // an OkPacket instance
      //   fieldCount: 0,
      //   affectedRows: 0,
      //   insertId: 0,
      //   serverStatus: 2,
      //   warningCount: 0,
      //   message: '',
      //   protocol41: true,
      //   changedRows: 0
      // },
      // undefined
      // ```
      //
      // * * * * * *
      // SELECT
      // * * * * * *
      // ```
      // null,
      // [        // an array of `RowDataPacket` instances:
      //   {
      //     id: 1,
      //     CustomerName: 'Cardinal',
      //     ...
      //   },
      //   ...
      // ],
      // [        // an array of `FieldPacket` instances:
      //   {
      //     catalog: 'def',
      //     db: 'mikermcneil',
      //     table: 'some_table',
      //     orgTable: 'some_table',
      //     name: 'id',
      //     orgName: 'id',
      //     charsetNr: 33,
      //     length: 765,
      //     type: 253,
      //     flags: 20483,
      //     decimals: 0,
      //     default: undefined,
      //     zeroFill: false,
      //     protocol41: true
      //   },
      //   ...
      // ]
      // ```
      //
      // * * * * * *
      // INSERT
      // * * * * * *
      // ```
      // null,
      // {             // an OkPacket instance
      //   fieldCount: 0,
      //   affectedRows: 1,
      //   insertId: 1,
      //   serverStatus: 2,
      //   warningCount: 0,
      //   message: '',
      //   protocol41: true,
      //   changedRows: 0
      // },
      // undefined
      // ```
      //
      // * * * * * *
      // DELETE
      // * * * * * *
      // ```
      // null,
      // {         // an OkPacket instance
      //   fieldCount: 0,
      //   affectedRows: 1,
      //   insertId: 0,
      //   serverStatus: 34,
      //   warningCount: 0,
      //   message: '',
      //   protocol41: true,
      //   changedRows: 0
      // },
      // undefined
      // ```
      // * * * * * *
      // UPDATE
      // * * * * * *
      // ```
      // null,
      // {         // an OkPacket instance
      //   fieldCount: 0,
      //   affectedRows: 1,
      //   insertId: 0,
      //   serverStatus: 34,
      //   warningCount: 0,
      //   message: '(Rows matched: 1  Changed: 1  Warnings: 0',
      //   protocol41: true,
      //   changedRows: 1
      // },
      // undefined
      // ```
      // ====================================================================


      // If the first argument is truthy, then treat it as an error.
      // (i.e. close shop early &gtfo; via the `queryFailed` exit)
      if ( arguments[0] ) {
        return exits.queryFailed({
          error: arguments[0]
        });
      }


      // Otherwise, the query was successful.

      // Since the arguments passed to this callback and their data format
      // can vary across different types of queries, we do our best to normalize
      // that here.  However, in order to do so, we have to be somewhat
      // opinionated; i.e. using the following heuristics when building the
      // standard `result` dictionary:
      //  • If the 2nd arg is an array, we expose it as `result.rows`.
      //  • Otherwise if the 2nd arg is a dictionary, we expose it as `result`.
      //  • If the 3rd arg is an array, we include it as `result.fields`.
      //    (if the 3rd arg is an array AND the 2nd arg is a dictionary, then
      //     the 3rd arg is tacked on as the `fields` property of the 2nd arg.
      //     If the 2nd arg already had `fields`, it is overridden.)
      var normalizedNativeResult;
      if ( arguments[1] ) {
        // `result :=`
        // `result.rows :=`
        if ( util.isArray(arguments[1]) ) {
          normalizedNativeResult = { rows: arguments[1] };
        }
        // `result :=`
        else if ( util.isObject(arguments[1]) ) {
          normalizedNativeResult = arguments[1];
        }
        else { return exits.error(new Error('Query was successful, but output from node-mysql is in an unrecognized format.  Output:\n'+util.inspect(Array.prototype.slice.call(arguments), {depth: null}))); }
      }
      if ( arguments[2] ) {
        // `result.fields :=`
        if ( util.isArray(arguments[2]) ) {
          normalizedNativeResult.fields = arguments[2];
        }
        else { return exits.error(new Error('Query was successful, but output from node-mysql is in an unrecognized format.  Output:\n'+util.inspect(Array.prototype.slice.call(arguments), {depth: null}))); }
      }

      // Finally, return the normalized result.
      //
      // For flexibility, an unadulterated reference to this callback's
      // arguments object is also exposed as `meta.rawArguments`.
      return exits.success({
        result: normalizedNativeResult,
        meta: { rawArguments: arguments }
      });
    });//</callback from sending native query via node-mysql>
  }


};
