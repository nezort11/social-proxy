#!/bin/bash
set -e

# Load .env into current shell and export as TF_VARs
if [ -f ./env/.env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and exports
    if [[ "$line" =~ ^# ]] || [[ "$line" =~ ^export ]]; then
      continue
    fi
    if [[ "$line" =~ = ]]; then
      key=$(echo "$line" | cut -d= -f1)
      val=$(echo "$line" | cut -d= -f2- | sed 's/^"//;s/"$//')
      # Map to TF_VAR_ lowercase key
      tf_key="TF_VAR_$(echo "$key" | tr '[:upper:]' '[:lower:]')"
      export "$tf_key"="$val"
    fi
  done < ./env/.env
fi

echo "Applying Terraform to update environment variables..."
pnpm tf apply -auto-approve

echo "Deployment Update Complete!"
