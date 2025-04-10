# Social media proxy

- volta
- nodejs
- telegraf framework
- serverless framework
- serverless-http
- yandex-cloud-serverless-plugin

## Setup

- install [volta](https://docs.volta.sh/guide/getting-started)

- install [yc cli](https://yandex.cloud/ru/docs/cli/quickstart)

```sh
git clone https://github.com/nezort11/telegraf-serverless-yandex-cloud-template.git your-project-name
cd ./your-project-name
rm -rf .git

volta install node@18
pnpm install

# Start development server
pnpm dev
```
