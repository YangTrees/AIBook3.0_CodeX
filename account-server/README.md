# AI课程账号管理服务

## 本地运行

1. 在项目根目录运行 `npm run account-server`。
2. 第一次启动会自动创建管理员，账号为 `admin`。
3. 初始密码会显示在终端，并写入 `account-server/data/initial-admin.txt`。
4. 打开 `http://127.0.0.1:4181/admin` 管理学习账号。
5. 另开一个终端运行 `npm run dev`，课程网页会通过本地代理连接账号服务。

## 正式部署

- 使用 HTTPS。
- 将网站 `/AIBook/api/*` 反向代理到本服务的 `/api/*`。
- 设置 `NODE_ENV=production`、`HOST=127.0.0.1` 和稳定的 `AIBOOK_ACCOUNT_DATA_DIR`。
- 定期备份数据目录中的 `accounts.json` 和 `session-secret.txt`。
- 首次登录后修改管理员密码并删除 `initial-admin.txt`。
