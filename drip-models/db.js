const mysql = require('mysql')
const dbConfig = require('../config/drip-db')

// const connection = mysql.createConnection({
//   host: dbConfig.HOST,
//   user: dbConfig.USER,
//   password: dbConfig.PASSWORD,
//   database: dbConfig.DB,
//   timezone: 'utc'
// })

// connection.connect(error => {
//   if (error) throw error
//   console.log('Successfully connected to the database.')
// })

// module.exports = connection

const pool = mysql.createPool({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  timezone: 'utc',
  multipleStatements: true,
})

module.exports = {
  query: function () {
    var sql_args = []
    var args = []
    for (var i = 0; i < arguments.length; i++) {
      args.push(arguments[i])
    }
    var callback = args[args.length - 1] //last arg is callback
    pool.getConnection(function (err, connection) {
      if (err) {
        console.log(err)
        return callback(err)
      }
      if (args.length > 2) {
        sql_args = args[1]
      }
      connection.query(args[0], sql_args, function (err, results) {
        connection.release() // always put connection back in pool after last query
        if (err) {
          console.log(err)
          return callback(err)
        }
        callback(null, results)
      })
    })
  },
}
