#!/bin/bash
export LC_CTYPE=C

if [ -z "${application_name}" ]; then
    echo "Error: application_name is not set."
    echo "Usage: application_name=your_app_name ./first-run.sh"
    exit 1
fi

APP_NAME="${application_name}"

SEARCH_DIR="."

EXCLUDE_DIRS="! -path ./.git"
EXCLUDE_FILES="! -name go.mod ! -name go.sum ! -name first-run.sh"

find "$SEARCH_DIR" -type f \
${EXCLUDE_DIRS} ${EXCLUDE_FILES} \
-exec sed -i '' "s/\${{ application_name }}/$APP_NAME/g" {} \; 