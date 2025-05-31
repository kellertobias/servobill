# Serverless Deployment

This section is currently being written. Basic Steps:
- Setup your AWS account if you don't have one
- Setup a Hosted zone in Route53 (or use an existing one)
- If you have a CAA record, make sure that it allows Amazon to issue certificates for your domain
- Setup an identity in SES and request production access (or use an existing one)
- Setup a Google OAuth Client ID (or use an existing one)
- Generate a random string for the JWT secret (e.g. with `openssl rand -base64 32`)
- Create your .env file (see .env.example)
- Run `npm run deploy` in the root directory

If the deployment fails, you need to delete a few resources manually, especially the CloudWatch Log Groups, because we used fixed names for those.