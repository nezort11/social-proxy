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

## Scripts

List all latest posted:

```sql
SELECT *
  FROM posted
ORDER BY id DESC;
```

Delete some posted tweet:

```sql
DELETE FROM posted
WHERE id = "1932936634061766884";
```

Get specific author tweets:

```sql
SELECT * FROM tweets WHERE JSON_VALUE(data, "$.author.userName") = "JohnPiper";
```
