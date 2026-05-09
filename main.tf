# https://registry.terraform.io/providers/yandex-cloud/yandex/latest/docs
terraform {
  required_providers {
    yandex = {
      source  = "yandex-cloud/yandex"
      version = "0.201.0"
    }
    local = {
      source  = "hashicorp/local"
      version = "2.8.0"
    }
  }
}

provider "yandex" {
  token     = var.yc_token
  cloud_id  = var.yc_cloud_id
  folder_id = var.yc_folder_id
  zone      = var.yc_zone
}

resource "yandex_iam_service_account" "social-sa" {
  name        = "social-sa"
  description = "Service account for social-proxy"
}

resource "yandex_resourcemanager_folder_iam_member" "sa-editor" {
  folder_id = var.yc_folder_id
  role      = "editor"
  member    = "serviceAccount:${yandex_iam_service_account.social-sa.id}"
}

resource "yandex_resourcemanager_folder_iam_member" "sa-ydb-admin" {
  folder_id = var.yc_folder_id
  role      = "ydb.admin"
  member    = "serviceAccount:${yandex_iam_service_account.social-sa.id}"
}

resource "yandex_iam_service_account_key" "sa-key" {
  service_account_id = yandex_iam_service_account.social-sa.id
}

resource "local_sensitive_file" "yc_sakey" {
  filename = "${path.module}/env/yc_sakey.json"
  content  = jsonencode({
    id                 = yandex_iam_service_account_key.sa-key.id
    service_account_id = yandex_iam_service_account.social-sa.id
    created_at         = yandex_iam_service_account_key.sa-key.created_at
    key_algorithm      = yandex_iam_service_account_key.sa-key.key_algorithm
    public_key         = yandex_iam_service_account_key.sa-key.public_key
    private_key        = yandex_iam_service_account_key.sa-key.private_key
  })
}

resource "yandex_ydb_database_serverless" "social-db" {
  name      = "social-db"
  folder_id = var.yc_folder_id
}

resource "yandex_iam_service_account_static_access_key" "sa-static-key" {
  service_account_id = yandex_iam_service_account.social-sa.id
}

resource "yandex_storage_bucket" "social-bot-code" {
  bucket     = "social-bot-code-${var.yc_folder_id}"
  access_key = yandex_iam_service_account_static_access_key.sa-static-key.access_key
  secret_key = yandex_iam_service_account_static_access_key.sa-static-key.secret_key
}

resource "yandex_storage_object" "function-code" {
  access_key  = yandex_iam_service_account_static_access_key.sa-static-key.access_key
  secret_key  = yandex_iam_service_account_static_access_key.sa-static-key.secret_key
  bucket      = yandex_storage_bucket.social-bot-code.bucket
  key         = "function.zip"
  source      = "social-translator-bot.zip"
  source_hash = filemd5("social-translator-bot.zip")
}

locals {
  fn_env = {
    YDB_ENDPOINT            = "grpcs://${yandex_ydb_database_serverless.social-db.ydb_api_endpoint}"
    YDB_DATABASE            = yandex_ydb_database_serverless.social-db.database_path
    APP_ENV                 = var.app_env
    BOT_TOKEN               = var.bot_token_dev # User says this one works
    BOT_TOKEN_DEV           = var.bot_token_dev
    DEBUG                   = "ydb-sdk,*"
    APIFY_API_TOKEN         = var.apify_api_token

    OPENAI_API_KEY          = var.openai_api_key
    OPENAI_API_BASE_URL     = var.openai_api_base_url
    YTDL_API_BASE_URL       = var.ytdl_api_base_url
    VIDEO_TRANSLATE_API_URL = var.video_translate_api_url
    PUBLISH_CHANNEL_ID      = var.publish_channel_id
    APP_ID                  = var.app_id
    APP_HASH                = var.app_hash
    SESSION                 = var.session
    PROXY_URL               = var.proxy_url
    EHP_PROXY_URL           = var.ehp_proxy_url
  }
}

resource "yandex_function" "social-ingest-function" {
  name               = "social-ingest-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/ingest.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 120
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function" "social-publish-function" {
  name               = "social-publish-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/publish.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 60
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function" "social-forward-function" {
  name               = "social-forward-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/forward.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 180
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function" "music-forward-function" {
  name               = "music-forward-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/forward_playlist.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 600
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function" "shorts-forward-function" {
  name               = "shorts-forward-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/forward_shorts.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 600
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function" "social-forward-proxy-function" {
  name               = "social-forward-proxy-function"
  user_hash          = filebase64sha256("social-translator-bot.zip")
  runtime            = "nodejs18"
  entrypoint         = "build/forward_proxy.handler"
  service_account_id = yandex_iam_service_account.social-sa.id
  memory             = 2048
  execution_timeout  = 180
  concurrency        = 3
  environment        = local.fn_env
  package {
    bucket_name = yandex_storage_bucket.social-bot-code.bucket
    object_name = yandex_storage_object.function-code.key
  }
}

resource "yandex_function_trigger" "social-ingest-function-trigger" {
  name        = "social-ingest-function-trigger"
  description = "Triggers the ingest function daily"
  function {
    id                 = yandex_function.social-ingest-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 3 ? * * *"
  }
}

resource "yandex_function_trigger" "social-publish-function-trigger" {
  name        = "social-publish-function-trigger"
  description = "Triggers the publish function 2 times a day"
  function {
    id                 = yandex_function.social-publish-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 10,22 * * ? *"
  }
}

resource "yandex_function_trigger" "social-forward-function-trigger" {
  name        = "social-forward-function-trigger"
  description = "Triggers the forward function every hour"
  function {
    id                 = yandex_function.social-forward-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 * ? * * *"
  }
}

resource "yandex_function_trigger" "music-forward-function-trigger" {
  name        = "music-forward-function-trigger"
  description = "Triggers the forward music every day"
  function {
    id                 = yandex_function.music-forward-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 5 * * ? *"
  }
}

resource "yandex_function_trigger" "shorts-forward-function-trigger" {
  name        = "shorts-forward-function-trigger"
  description = "Triggers the forward shorts every 3 hours"
  function {
    id                 = yandex_function.shorts-forward-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 0/3 ? * * *"
  }
}

resource "yandex_function_trigger" "social-forward-proxy-function-trigger" {
  name        = "social-forward-proxy-function-trigger"
  description = "Triggers the forward proxy every hour"
  function {
    id                 = yandex_function.social-forward-proxy-function.id
    service_account_id = yandex_iam_service_account.social-sa.id
  }
  timer {
    cron_expression = "0 * ? * * *"
  }
}
