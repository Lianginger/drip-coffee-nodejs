const Project = require('../models/project')
const JSEncrypt = require('node-jsencrypt')
const decrypt = new JSEncrypt()

let privateKey = ''
new String(process.env.RSA_PRIVATE_KEY).split(/\\n/).forEach((item) => {
  privateKey += `${item}\n`
})
decrypt.setPrivateKey(privateKey)

exports.findOne = (req, res) => {
  Project.findById(
    {
      platformId: req.params.platformId,
      projectId: req.params.projectId,
    },
    (err, data) => {
      if (err) {
        if (err.kind === 'not_found') {
          res.status(404).send({
            message: `Not found project with id ${req.params.projectId}.`,
          })
        } else {
          res.status(500).send({
            message: 'Error retrieving project with id ' + req.params.projectId,
          })
        }
      } else res.render('project', { data })
    }
  )
}

exports.findOneAPI = (req, res) => {
  Project.findById(
    {
      platformId: req.params.platformId,
      projectId: req.params.projectId,
    },
    (err, data) => {
      if (err) {
        if (err.kind === 'not_found') {
          res.status(404).send({
            message: `Not found project with id ${req.params.projectId}.`,
          })
        } else {
          res.status(500).send({
            message: 'Error retrieving project with id ' + req.params.projectId,
          })
        }
      } else res.json(data)
    }
  )
}

exports.getCrawlerStatus = (req, res) => {
  const crawlerPlatformList = Project.getCrawlerStatus()
  const crawlerStatus = [...crawlerPlatformList].map((platform) => {
    platform.records.reverse()
    return platform
  })
  // console.log(crawlerStatus)
  res.render('crawlerStatus', {
    crawlerStatus,
  })
}

exports.decryptURL = (req, res) => {
  let encryptedURL = req.params.encryptedURL
  encryptedURL = encryptedURL.replace(/_/gi, '/')

  const decryptedURL = decrypt.decrypt(encryptedURL)
  res.redirect(`/${decryptedURL}`)
}
