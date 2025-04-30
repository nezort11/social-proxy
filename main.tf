# https://registry.terraform.io/providers/yandex-cloud/yandex/latest/docs
terraform {
  required_providers {
    yandex = {
      source = "yandex-cloud/yandex"
      version = "0.138.0"
    }
  }
}

provider "yandex" {
  token     = var.yc_token
  cloud_id  = var.yc_cloud_id
  folder_id = var.yc_folder_id
  zone      = var.yc_zone  # "ru-central1-a"
}

resource "yandex_function" "social-ingest-function" {
  name       = "social-ingest-function"
  user_hash  = filebase64sha256("social-translator-bot.zip")
  runtime    = "nodejs18"
  entrypoint = "build/ingest.handler"
  service_account_id = var.service_account_id

  memory = 2048
  execution_timeout = 120
  concurrency = 3

  content {
    zip_filename = "social-translator-bot.zip"
  }
}

resource "yandex_function" "social-publish-function" {
  name       = "social-publish-function"
  user_hash  = filebase64sha256("social-translator-bot.zip")
  runtime    = "nodejs18"
  entrypoint = "build/publish.handler"
  service_account_id = var.service_account_id

  memory = 2048
  execution_timeout = 60
  concurrency = 3

  content {
    zip_filename = "social-translator-bot.zip"
  }

# Error: Zip archive content size 43654324 exceeds the maximum size 3670016, use object storage to upload the content
#   package {
#     # Upload to bucket to avoid function installing dependencies restrictions
#     # https://yandex.cloud/en/docs/functions/concepts/limits#functions-other-restrictions
#     bucket_name = yandex_storage_bucket.social-translator-bot-code.id
#     object_name = "function.zip"
#   }
}

resource "yandex_function_trigger" "social-ingest-function-trigger" {
  name        = "social-ingest-function-trigger"
  description = "Triggers the ingest function daily at 06:00 UTC+3"

  function {
    id = yandex_function.social-ingest-function.id
    service_account_id = var.service_account_id
  }

  timer {
    cron_expression = "0 3 ? * * *"
  }
}

resource "yandex_function_trigger" "social-publish-function-trigger" {
  name        = "social-publish-function-trigger"
  description = "Triggers the publish function every 17 minutes"

  function {
    id = yandex_function.social-publish-function.id
    service_account_id = var.service_account_id
  }

  timer {
    cron_expression = "*/17 * ? * * *"
  }
}
