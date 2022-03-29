const express = require('express')
const router = express.Router()
const Project = require('../controllers/project')
const Comment = require('../controllers/comment')
const GoogleAnalyticsViewId = require('../controllers/googleAnalyticsViewId')

router.get('/', (req, res) => res.render('home'))
router.get('/privacy', (req, res) => res.render('privacy'))
router.get('/crawler-status', Project.getCrawlerStatus)

router.get('/:encryptedURL', Project.decryptURL)
router.get('/platform/:platformId/projects/:projectId', Project.findOne)
router.get('/api/platform/:platformId/projects/:projectId', Project.findOneAPI)

router.post('/api/comment/insert', Comment.insert)
router.get('/api/adAccountId/:adAccountId/comment/', Comment.find)

router.post(
  '/api/ga-viewId/create-or-update',
  GoogleAnalyticsViewId.createOrUpdate
)
router.get(
  '/api/adAccountId/:adAccountId/ga-viewId',
  GoogleAnalyticsViewId.find
)

module.exports = router
