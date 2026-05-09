variable "yc_token" {
  description = "Yandex Cloud IAM Token"
  type        = string
  sensitive   = true
}

variable "yc_ru_token" {
  description = "Yandex Cloud IAM Token for Russia"
  type        = string
  sensitive   = true
  default     = ""
}

variable "yc_cloud_id" {
  description = "Yandex Cloud ID (Kazakhstan)"
  type        = string
}

variable "yc_folder_id" {
  description = "Yandex Folder ID (Kazakhstan)"
  type        = string
}

variable "yc_ru_folder_id" {
  description = "Yandex Folder ID (Russia) for YDB"
  type        = string
  default     = "b1gjh7irh9poadr6llcg"
}

variable "yc_zone" {
  description = "Yandex Cloud Default Zone"
  type        = string
  default     = "kz1-a"
}

variable "yc_endpoint" {
  description = "Yandex Cloud API Endpoint"
  type        = string
  default     = "api.yandexcloud.kz"
}

variable "service_account_id" {
  description = "Service Account ID"
  type        = string
}

variable "bot_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "bot_token_dev" {
  type      = string
  sensitive = true
  default   = ""
}

variable "app_env" {
  type    = string
  default = "production"
}

variable "apify_api_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "openai_api_key" {
  type      = string
  sensitive = true
  default   = ""
}

variable "openai_api_base_url" {
  type    = string
  default = ""
}

variable "ytdl_api_base_url" {
  type    = string
  default = ""
}

variable "video_translate_api_url" {
  type    = string
  default = ""
}

variable "publish_channel_id" {
  type    = string
  default = ""
}

variable "app_id" {
  type    = string
  default = ""
}

variable "app_hash" {
  type      = string
  sensitive = true
  default   = ""
}

variable "session" {
  type      = string
  sensitive = true
  default   = ""
}

variable "proxy_url" {
  type    = string
  default = ""
}

variable "ehp_proxy_url" {
  type    = string
  default = ""
}
