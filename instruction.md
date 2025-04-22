# 2FA iframe - 完整部署指南

本文档提供了从零开始创建、配置和部署2FA iframe系统的详细指南。

## 目录

1. [准备工作](#准备工作)
2. [本地开发环境设置](#本地开发环境设置)
3. [GitHub仓库设置](#github仓库设置)
4. [服务器配置](#服务器配置)
5. [部署流程](#部署流程)
6. [维护指南](#维护指南)
7. [常见问题解决](#常见问题解决)

## 准备工作

### 所需工具

- Mac电脑 (本地开发)
- 一台Debian系统的VPS服务器 (IP: 193.9.44.227)
- 域名: kocboost.com (已配置DNS解析)
- Git
- Node.js (v14+)
- npm

## 本地开发环境设置

1. 创建项目文件夹并初始化Git:

```bash
# 创建项目文件夹
mkdir -p ~/Netease/Projects/2fa-iframe
cd ~/Netease/Projects/2fa-iframe

# 初始化Git仓库
git init
```

2. 添加、提交现有的所有文件:

```bash
git add .
git commit -m "Initial commit"
```

## GitHub仓库设置

1. 在GitHub上创建新仓库:

   - 打开 [GitHub](https://github.com) 并登录
   - 点击右上角"+"按钮，选择"New repository"
   - 仓库名称填写 "2fa-iframe"
   - 保持仓库为Public
   - 不要初始化仓库（不要添加README、.gitignore或许可证）
   - 点击"Create repository"

2. 将本地仓库连接到GitHub:

```bash
git remote add origin https://github.com/你的用户名/2fa-iframe.git
git branch -M main
git push -u origin main
```

## 服务器配置

### 1. SSH密钥设置

1. 在本地生成SSH密钥:

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
```

按照提示完成SSH密钥的创建，可以直接按Enter接受默认位置和空密码。

2. 将SSH公钥添加到服务器:

```bash
# 查看公钥
cat ~/.ssh/id_ed25519.pub

# 复制上述命令的输出内容
```

3. 使用密码登录服务器:

```bash
ssh root@193.9.44.227
```

4. 在服务器上创建authorized_keys文件:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo "复制的公钥内容" > ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

5. 测试SSH无密码登录:

```bash
# 在本地执行
ssh root@193.9.44.227
```

如果不再提示输入密码，则表示SSH密钥设置成功。

### 2. 服务器基础配置

1. 更新系统:

```bash
apt update
apt upgrade -y
```

2. 安装必要的软件包:

```bash
apt install -y nginx certbot python3-certbot-nginx nodejs npm git
```

3. 配置防火墙:

```bash
apt install -y ufw
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

### 3. 配置SSL证书

使用Certbot自动配置Nginx和SSL证书:

```bash
certbot --nginx -d kocboost.com --non-interactive --agree-tos -m admin@kocboost.com
```

## 部署流程

### 1. 自动部署脚本

为了简化部署流程，我们已经创建了一个自动部署脚本(`deploy.sh`)。该脚本会:

1. 更新系统包
2. 安装必要的软件
3. 创建目录结构
4. 复制文件
5. 配置Nginx
6. 设置SSL证书
7. 配置systemd服务

### 2. 执行部署

1. 从GitHub克隆项目:

```bash
# 在服务器上执行
cd /tmp
git clone https://github.com/你的用户名/2fa-iframe.git
cd 2fa-iframe
```

2. 执行部署脚本:

```bash
chmod +x server/deploy.sh
sudo ./server/deploy.sh
```

3. 验证部署:

在浏览器中访问 `https://kocboost.com`，应该能看到2FA iframe的配置页面。

### 3. 嵌入iframe

在低代码平台中，使用以下代码嵌入2FA iframe:

```html
<!-- 配置页面嵌入代码 -->
<iframe src="https://kocboost.com/config" width="100%" height="600" frameborder="0"></iframe>

<!-- 显示页面嵌入代码 -->
<iframe src="https://kocboost.com/display" width="100%" height="400" frameborder="0"></iframe>
```

## 维护指南

### 查看日志

```bash
# 查看Node.js服务日志
journalctl -u 2fa-iframe

# 查看Nginx访问日志
tail -f /var/log/nginx/access.log

# 查看Nginx错误日志
tail -f /var/log/nginx/error.log
```

### 重启服务

```bash
# 重启Node.js服务
systemctl restart 2fa-iframe

# 重启Nginx
systemctl restart nginx
```

### 更新应用

```bash
# 在服务器上拉取最新代码
cd /tmp/2fa-iframe
git pull

# 重新运行部署脚本
sudo ./server/deploy.sh
```

## 常见问题解决

### 问题1: 无法访问网站

1. 检查服务状态:

```bash
systemctl status 2fa-iframe
systemctl status nginx
```

2. 检查防火墙设置:

```bash
ufw status
```

3. 检查错误日志:

```bash
journalctl -u 2fa-iframe -n 50
tail -f /var/log/nginx/error.log
```

### 问题2: SSL证书过期

自动更新:
```bash
certbot renew
```

手动更新:
```bash
certbot certonly --nginx -d kocboost.com
```

更新后重启Nginx:
```bash
systemctl restart nginx
```

### 问题3: 数据备份

备份2FA数据:
```bash
cp /opt/2fa-iframe/server/data/2fa_data.json /backup/2fa_data_$(date +%Y%m%d).json
```

恢复2FA数据:
```bash
cp /backup/2fa_data_20230101.json /opt/2fa-iframe/server/data/2fa_data.json
systemctl restart 2fa-iframe
``` 