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
  console.log(
    'platformId:',
    platformId,
    'allLiveProject.length:',
    allLiveProject.length
  )
  const numberOfLiveProject = allLiveProject.length

  const now = Date.now()
  const localTimeShift = 8 * 60 * 60 * 1000
  const localDateTime = new Date(now + localTimeShift)
    .toISOString()
    .split('.')[0]
    .replace('T', ' ')
  // console.log('localDateTime:', localDateTime)

  // 檢查過去 3 小時、過去 24 小時時間點
  const timeShift3hour = 3 * 60 * 60 * 1000
  const timeShift24hour = 24 * 60 * 60 * 1000
  const dateTimeToCheck3HoursBefore = new Date(
    now + localTimeShift - timeShift3hour
  )
    .toISOString()
    .split('.')[0]
    .replace('T', ' ')
  const dateTimeToCheck24HoursBefore = new Date(
    now + localTimeShift - timeShift24hour
  )
    .toISOString()
    .split('.')[0]
    .replace('T', ' ')
  // console.log('dateTimeToCheck3HoursBefore:', dateTimeToCheck3HoursBefore)

  const problemProjects = []
  const passedProjects = []
  allLiveProject.forEach((project) => {
    // hotProject: 1 小時爬一次資料
    // passedProject: 24 小時爬一次資料
    const hotProjectOnlyPlatformIdList = [3, 4, 6, 7]
    const timelineJSON = JSON.parse(project.timeline)
    timeStampList = timelineJSON.map((data) => data[0])
    const latestTimeStamp = Math.max(...timeStampList) * 1000
    const latestDateTime = new Date(latestTimeStamp + localTimeShift)
      .toISOString()
      .split('.')[0]
      .replace('T', ' ')

    if (new Date(latestDateTime) < new Date(dateTimeToCheck24HoursBefore)) {
      problemProjects.push(project)
    } else if (
      new Date(latestDateTime) < new Date(dateTimeToCheck3HoursBefore) &&
      hotProjectOnlyPlatformIdList.includes(platformId)
    ) {
      problemProjects.push(project)
    } else if (
      new Date(latestDateTime) < new Date(dateTimeToCheck3HoursBefore)
    ) {
      passedProjects.push({
        pageUrl: project.page_url,
        projectId: project.source_id,
      })
    }
  })

  const numberOfProblemProject = problemProjects.length
  const numberOfPassedProject = passedProjects.length
  const numberOfHotProject =
    numberOfLiveProject - numberOfProblemProject - numberOfPassedProject

  const notFoundProjects = []
  const closedProjects = []
  const noLatestDataProjects = []
  console.log(
    'platformId:',
    platformId,
    'numberOfProblemProject',
    numberOfProblemProject
  )

  for (let i = 0; i < numberOfProblemProject; i++) {
    const project = problemProjects[i]

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
    numberOfLiveProject,
    numberOfHotProject,
    numberOfPassedProject,
    passedProjects,
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
    1() {
      return new Promise((resolve, reject) => {
        resolve(PROJECT_NO_LATEST_DATA)
      })
    },
    // indiegogo
    2() {
      return new Promise((resolve, reject) => {
        resolve(PROJECT_NO_LATEST_DATA)
      })
    },
    // zeczec
    3() {
      return new Promise(async (resolve, reject) => {
        await sleep(300)
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
      })
    },
    // flingV
    4() {
      return new Promise((resolve, reject) => {
        request(
          {
            url: `https://www.flyingv.cc/projects/${projectId}`,
            method: 'GET',
            headers: {
              Referer: 'https://drip-plugin.crowdfunding.coffee/',
            },
            followRedirect: false,
          },
          function (error, response, body) {
            if (error || !body) {
              console.log(error)
              reject(error)
            }

            if (response.statusCode === 404 || response.statusCode === 302) {
              resolve(PROJECT_NOT_FOUND)
            }

            resolve(PROJECT_NO_LATEST_DATA)
          }
        )
      })
    },
    // makuake
    5() {
      return new Promise((resolve, reject) => {
        resolve(PROJECT_NO_LATEST_DATA)
      })
    },
    // greenfunding
    6() {
      return new Promise((resolve, reject) => {
        resolve(PROJECT_NO_LATEST_DATA)
      })
    },
    // hahow
    7() {
      return new Promise((resolve, reject) => {
        request(
          {
            url: `https://hahow.in/courses/${projectId}`,
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

            // const $ = cheerio.load(body)
            // console.log(2, body)
            // if (
            //   $('#main-screen div.purchase-wrap > div > button')
            //     .text()
            //     .includes('已下架')
            // ) {
            //   resolve(PROJECT_CLOSED)
            // }
            resolve(PROJECT_NO_LATEST_DATA)
          }
        )
      })
    },
    // wadiz
    8() {
      return new Promise((resolve, reject) => {
        resolve(PROJECT_NO_LATEST_DATA)
      })
    },
    // campfire
    9() {
      return new Promise((resolve, reject) => {
        request(
          {
            url: `https://camp-fire.jp/projects/view/${projectId}`,
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

            resolve(PROJECT_NO_LATEST_DATA)
          }
        )
      })
    },
  }
  return projectStatusHandleMapByPlatformId[platformId]()
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
