if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config()
}
const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const port = process.env.PORT || 3000
const exphbs = require('express-handlebars')
const cors = require('cors')
const CronJob = require('cron').CronJob
const Project = require('./models/project')

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.engine(
  'handlebars',
  exphbs({
    helpers: {
      json: function (context) {
        return JSON.stringify(context)
      },
    },
  })
)
app.set('view engine', 'handlebars')

app.use('/', require('./routes/index'))

new CronJob(
  '0 0 0,6,12,18 * * *',
  function () {
    Project.checkCrawlerStatus()
  },
  null,
  true,
  'Asia/Taipei'
)
Project.checkCrawlerStatus()

app.listen(port, () => {
  console.log(`Express listening on port ${port}`)
})
