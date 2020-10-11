const sql = require('./db.js')
const request = require('request')
const cheerio = require('cheerio')

const PROJECT_NOT_FOUND = 'project-not-found'
const PROJECT_CLOSED = 'project-closed'
const PROJECT_NO_LATEST_DATA = 'project-no-latest-data'
const PLATFORM_MAP_BY_ID = {
  1: 'kickstarter',
  2: 'indiegogo',
  3: 'zeczec',
  4: 'flyingV',
  5: 'makuake',
  6: 'greenfunding',
  7: 'hahow',
  8: 'wadiz',
  9: 'campfire',
}

const Project = function () {}
Project.platformCrawlerStatusList = Object.keys(PLATFORM_MAP_BY_ID).map(
  (key) => ({
    platformId: key,
    platformTitle: PLATFORM_MAP_BY_ID[key],
    records: [],
  })
)

Project.findById = ({ platformId, projectId }, result) => {
  sql.query(
    `
    SELECT * FROM crowdfunding.funding_timeline
    JOIN crowdfunding.fundings on crowdfunding.funding_timeline.source = crowdfunding.fundings.source and crowdfunding.funding_timeline.source_id = crowdfunding.fundings.source_id
    WHERE crowdfunding.funding_timeline.source = ${platformId} && crowdfunding.funding_timeline.source_id = '${projectId}';
    `,
    (err, res) => {
      if (err) {
        console.log('error: ', err)
        result(err, null)
        return
      }

      if (res.length) {
        // console.log('found project: ', res[0])
        result(null, res[0])
        return
      }

      // not found project with the id
      result({ kind: 'not_found' }, null)
    }
  )
}

Project.getAllLiveProjectsByPlatform = (platformId) => {
  return new Promise((resolve, reject) => {
    const now = Date.now()
    const localTimeShift = 8 * 60 * 60 * 1000
    const localTime = new Date(now + localTimeShift)
      .toISOString()
      .split('.')[0]
      .replace('T', ' ')
    // console.log(localTime)
    sql.query(
      `SELECT * FROM crowdfunding.funding_timeline
      JOIN crowdfunding.fundings on crowdfunding.funding_timeline.source = crowdfunding.fundings.source and crowdfunding.funding_timeline.source_id = crowdfunding.fundings.source_id
      WHERE crowdfunding.funding_timeline.source = ${platformId} and started_at <= '${localTime}' and finished_at >= '${localTime}';
    `,
      (err, res) => {
        if (err) {
          console.log('error: ', err)
          reject(err)
        }
        resolve(res)
      }
    )
  })
}

Project.checkCrawlerStatus = () => {
  const platformIdList = Object.keys(PLATFORM_MAP_BY_ID)
  // const platformIdList = [3, 4, 7]
  platformIdList.forEach(async (platformId) => {
    const crawlerStatus = await getCrawlerStatusByPlatformId(platformId)
    Project.storeCrawlerStatus(platformId, crawlerStatus)
  })
}

Project.storeCrawlerStatus = (platformId, status) => {
  // console.log(platformId, status)
  let platform = Project.platformCrawlerStatusList.find(
    (crawlerStatus) => crawlerStatus.platformId === platformId
  )
  platform.numberOfNoLatestDataProject = status.numberOfNoLatestDataProject

  const length = platform.records.length
  if (length > 3) {
    platform.records.shift()
  }
  platform.records.push(status)
}

Project.getCrawlerStatus = () => {
  return Project.platformCrawlerStatusList
}

module.exports = Project

async function getCrawlerStatusByPlatformId(platformId) {
  const time = process.hrtime()
  const allLiveProject = await Project.getAllLiveProjectsByPlatform(platformId)
  const numberOfLiveProject = allLiveProject.length

  const now = Date.now()
  const localTimeShift = 8 * 60 * 60 * 1000
  const localDateTime = new Date(now + localTimeShift)
    .toISOString()
    .split('.')[0]
    .replace('T', ' ')
  // console.log('localDateTime:', localDateTime)

  // 檢查過去 2 小時那個時間點
  const pastTimeShift = 3 * 60 * 60 * 1000
  const dateTimeToCheck = new Date(now + localTimeShift - pastTimeShift)
    .toISOString()
    .split('.')[0]
    .replace('T', ' ')
  // console.log('dateTimeToCheck:', dateTimeToCheck)

  const problemProjects = []
  allLiveProject.forEach((project) => {
    const timelineJSON = JSON.parse(project.timeline)
    timeStampList = timelineJSON.map((data) => data[0])
    const latestTimeStamp = Math.max(...timeStampList) * 1000
    const latestDateTime = new Date(latestTimeStamp + localTimeShift)
      .toISOString()
      .split('.')[0]
      .replace('T', ' ')

    if (new Date(latestDateTime) < new Date(dateTimeToCheck)) {
      problemProjects.push(project)
    }
  })

  const numberOfProblemProject = problemProjects.length
  const numberOfPassedProject = numberOfLiveProject - numberOfProblemProject
  const notFoundProjects = []
  const closedProjects = []
  const noLatestDataProjects = []

  for (let i = 0; i < numberOfProblemProject; i++) {
    const project = problemProjects[i]
    await sleep(300)
    const projectStatus = await getProjectStatus(platformId, project.source_id)

    if (projectStatus === PROJECT_NOT_FOUND) {
      notFoundProjects.push({
        pageUrl: project.page_url,
        projectId: project.source_id,
      })
    }
    if (projectStatus === PROJECT_CLOSED) {
      closedProjects.push({
        pageUrl: project.page_url,
        projectId: project.source_id,
      })
    }
    if (projectStatus === PROJECT_NO_LATEST_DATA) {
      noLatestDataProjects.push({
        pageUrl: project.page_url,
        projectId: project.source_id,
      })
    }
  }

  const diff = process.hrtime(time)
  return {
    platformId,
    localDateTime,
    dateTimeToCheck,
    numberOfLiveProject,
    numberOfPassedProject,
    numberOfProblemProject,
    numberOfNotFoundProject: notFoundProjects.length,
    notFoundProjects,
    numberOfClosedProject: closedProjects.length,
    closedProjects,
    numberOfNoLatestDataProject: noLatestDataProjects.length,
    noLatestDataProjects,
    timeSpend: diff[0],
  }
}

function getProjectStatus(platformId, projectId) {
  const projectStatusHandleMapByPlatformId = {
    // kickstarter
    1: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // indiegogo
    2: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // zeczec
    3: new Promise((resolve, reject) => {
      request(
        {
          url: `https://www.zeczec.com/projects/${projectId}`,
          method: 'GET',
        },
        function (error, response, body) {
          if (error || !body) {
            console.log(error)
            reject(error)
          }

          if (response.statusCode === 404) {
            resolve(PROJECT_NOT_FOUND)
          }

          const $ = cheerio.load(body)
          // 若專案頁面沒有剩餘時間，表示專案已結束
          if (
            !$(
              'body > div.container.mv4-l.mt3-l > div.gutter3-l.flex > div.w-30-l.w-100.ph3 > div.mb1.f7 > span.mr2.b'
            )
              .text()
              .includes('剩餘時間')
          ) {
            resolve(PROJECT_CLOSED)
          }
          resolve(PROJECT_NO_LATEST_DATA)
        }
      )
    }),
    // flingV
    4: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // makuake
    5: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // greenfunding
    6: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // hahow
    7: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // wadiz
    8: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
    // campfire
    9: new Promise((resolve, reject) => {
      resolve(PROJECT_NO_LATEST_DATA)
    }),
  }
  return projectStatusHandleMapByPlatformId[platformId]
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
