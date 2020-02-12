if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const port = process.env.PORT | 3000
const exphbs = require('express-handlebars')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.engine('handlebars', exphbs())
app.set('view engine', 'handlebars')

app.use('/', require('./routes/index'))

app.listen(port, () => {
  console.log(`Express listening on port ${port}`)
})
