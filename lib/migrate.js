'use strict'

const _ = require('lodash')
const chalk = require('chalk')
const inquirer = require('inquirer')

function Migrate (onlineRequest, localRequest, localDomain) {
  this.onlineGroup = ''
  this.localGroup = ''
  this.onlineRequest = onlineRequest
  this.localRequest = localRequest
  this.localDomain = localDomain
}

Migrate.prototype.setMigrateType = function setMigrateType () {
  inquirer
    .prompt([
      {
        type: 'list',
        message: `选择迁入项目的类型（${this.localDomain}）`,
        name: 'migrateType',
        choices: [
          { name: '个人项目', value: 'personal' },
          { name: '团队项目', value: 'team' }
        ]
      }
    ])
    .then(answers => {
      if (answers.migrateType === 'team') {
        this.getGroup()
      } else {
        this.getMigrateType()
      }
    })
}

Migrate.prototype.getMigrateType = function getMigrateType () {
  inquirer
    .prompt([
      {
        type: 'list',
        message: '选择迁出项目的类型（easy-mock.com）',
        name: 'migrateType',
        choices: [
          { name: '个人项目', value: 'personal' },
          { name: '团队项目', value: 'team' }
        ]
      }
    ])
    .then(answers => {
      if (answers.migrateType === 'personal') {
        this.getProjects()
      } else {
        this.getGroup(true)
      }
    })
}

Migrate.prototype.getGroup = function getGroup (isOnline) {
  const request = isOnline ? this.onlineRequest : this.localRequest
  const msg = isOnline ? '选择团队（easy-mock.com）' : `选择团队（${this.localDomain}）`
  request
    .get('/group')
    .then(res => {
      const body = res.data.data
      if (body && body.length) {
        return inquirer.prompt([{
          type: 'list',
          message: msg,
          name: 'group',
          choices: body.map(item => ({name: item.name, value: item._id}))
        }])
      }
      console.log(chalk.gray('\n(无可用团队)'))
      process.exit(1)
    })
    .then(answers => {
      if (isOnline) {
        this.onlineGroup = answers.group
        this.getProjects()
      } else {
        this.localGroup = answers.group
        this.getMigrateType()
      }
    })
}

Migrate.prototype.getProjects = function getProjects () {
  this.onlineRequest
    .get('/project', {
      params: {
        group: this.onlineGroup
      }
    })
    .then(res => {
      const body = res.data.data
      if (body && body.length) {
        return inquirer.prompt([{
          type: 'checkbox',
          message: '选择要迁出的项目（easy-mock.com）',
          name: 'projects',
          choices: body.map(item => ({name: `${item.name}(${item.url})`, value: item._id}))
        }])
      }
      console.log(chalk.gray('\n(无可用项目)'))
      process.exit(1)
    })
    .then(answers => {
      this.migrate(answers.projects)
    })
}

Migrate.prototype.migrate = function migrate (onlineProjects) {
  if (!onlineProjects.length) {
    console.log(chalk.gray('\n(无可用项目)'))
    process.exit(1)
  }

  Promise
    .all(onlineProjects.map(id => this.onlineRequest.get('/mock', { params: { project_id: id } })))
    .then(projects => projects.map(res => res.data.data))
    .then(projects => {
      projects.forEach(item => {
        const project = item.project
        const apis = item.mocks
        this.localRequest
          .post('/project/create', {
            url: project.url,
            name: project.name,
            group: this.localGroup,
            swaggerUrl: project.swaggerUrl,
            description: project.description
          })
          .then(res => this.localRequest.get('/project', {
            params: { group: this.localGroup }
          }))
          .then(res => _.find(res.data.data, {
            url: project.url,
            name: project.name
          }))
          .then(project => {
            if (!project) {
              console.log(chalk.gray('\n(无可用项目)'))
              process.exit(1)
            }
            console.log()
            apis.forEach(api => {
              this.localRequest
                .post('/mock/create', {
                  mode: api.mode,
                  project_id: project._id,
                  description: api.description,
                  url: api.url,
                  method: api.method
                })
                .then(res => {
                  console.log(chalk.green(`[${api.method.toUpperCase()} ${api.url}](${project.url} ${project.name}) 创建成功`))
                })
            })
          })
      })
    })
}

module.exports = Migrate
