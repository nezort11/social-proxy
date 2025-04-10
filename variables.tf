variable "yc_token" {
  description = "Yandex Cloud IAM Token"
  type        = string
  sensitive   = true
}

variable "yc_cloud_id" {
  description = "Yandex Cloud ID"
  type        = string
}

variable "yc_folder_id" {
  description = "Yandex Folder ID"
  type        = string
}

variable "yc_zone" {
  description = "Yandex Cloud Default Zone"
  type        = string
  default     = "ru-central1-a"
}

variable "service_account_id" {
  description = "Service Account ID"
  type        = string
}
