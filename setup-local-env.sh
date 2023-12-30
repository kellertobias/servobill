#/!bin/bash

# These credentials are for local development only.
# They are not valid AWS credentials.
export FAKE_AWS_ACCESS_KEY_ID="AKIAIOSFODNN7EXAMPLE"
export FAKE_AWS_SECRET_ACCESS_KEY="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
# export ENDPOINT_SES="http://localhost:9330"
export ENDPOINT_S3="http://localhost:9000"
export ENDPOINT_SQS="http://localhost:9324"
export ENDPOINT_DYNAMODB="http://localhost:9321"
export ENDPOINT_EVENTBRIDGE="http://localhost:9326"
export NEXT_PUBLIC_API_URL="http://localhost:3000"
export TABLE_ELECTRODB="electrodb"
export BUCKET_FILES="invoice-data"
export IS_OFFLINE="true"
export JWT_SECRET="THIS_WOULD_BE_A_SECRET_IN_PRODUCTION"
export CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
source ./secret-local-env.sh