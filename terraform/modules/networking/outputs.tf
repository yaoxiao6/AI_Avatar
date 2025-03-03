# AI_Avatar/terraform/modules/networking/outputs.tf

output "dns_name" {
  value = google_dns_managed_zone.default.dns_name
  description = "The DNS name of the created zone"
}

output "name_servers" {
  value = google_dns_managed_zone.default.name_servers
  description = "The name servers for the DNS zone"
}