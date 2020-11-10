const mysql = require('mysql')
const dbConfig = require('../config/drip-db')

const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
  timezone: 'utc'
})

connection.connect(error => {
  if (error) throw error
  console.log('Successfully connected to the database.')
})

module.exports = connection
