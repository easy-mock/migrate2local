'use strict'

const url = require('url')
const axios = require('axios')
const chalk = require('chalk')

const Migrate = require('./lib/migrate')
const config = require('./config')

const ONLINE_DOMAIN = 'https://easy-mock.com'

function main () {
  let title = chalk.green(`
==============
你正在使用 migrate2local 迁移你的线上（easy-mock.com）项目到你的本地环境。
请先配置当前目录下的 config.js 以完成准备工作。
注意：该操作只是调用相应环境的接口，并非真正意义上的数据迁移（不过也能达到目的）。
==============`)

  console.log(title)
  console.log()

  login()
}

function login () {
  let onlineRequest
  let localRequest

  createRequestByToken()
    .post('/u/login', {
      name: config.onlineUserName,
      password: config.onlineUserPassword
    })
    .then(res => {
      const body = res.data.data
      if (body && body.token) {
        onlineRequest = createRequestByToken(body.token)
        return createRequestByToken(null, config.domain).post('/u/login', {
          name: config.localUserName,
          password: config.localUserPassword
        })
      }
    })
    .then(res => {
      const body = res.data.data
      if (body && body.token) {
        localRequest = createRequestByToken(body.token, config.domain)
        const migrate = new Migrate(onlineRequest, localRequest, config.domain)
        migrate.setMigrateType()
      }
    })
}

function createRequestByToken (token, domain) {
  const instance = axios.create({
    baseURL: url.resolve(domain || ONLINE_DOMAIN, '/api'),
    headers: {
      Authorization: `Bearer ${token}`
    }
  })

  instance.interceptors.response.use(response => {
    if (!response.data.success) {
      console.log(chalk.red(`\n${response.data.message}(${response.config.url})`))
      process.exit(1)
    }
    return response
  }, error => {
    console.log(chalk.red(error.message))
    process.exit(1)
  })

  return instance
}

main()
