# Migrate2Local

[Easy Mock](https://easy-mock.com) 线上项目迁移工具。

## Using

```
$ git clone https://github.com/easy-mock/migrate2local.git
$ cd migrate2local
$ node index.js
```

## Config

请先配置目录下的 config.js 以完成准备工作。

```
// config.js
module.exports = {
  onlineUserName: '', // 线上用户名（easy-mock.com）
  onlineUserPassword: '', // 线上用户密码（easy-mock.com）
  domain: '', // 自建的站点域名（如：http://localhost:7300）
  localUserName: '', // 自建站点的用户名
  localUserPassword: '' // 自建站点的用户密码
}
```

## License

MIT