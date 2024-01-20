![Servobill](/docs/github-header.png)

# Servobill

Servobill is a simple, open-source invoicing app built with Next.js, Tailwind CSS, and TypeScript on top of AWS Serverless technologies. It is extremely cheap to maintain and can be deployed to your own AWS account in minutes.

## Features

We feature a simple, easy-to-use interface for creating and managing invoices. You can create an invoice, generate a PDF from it and send it to your client, and get paid all in one place. You can also manage your expenses and build simple reports to see how your business is doing and of course for tax purposes.

- Modern and simple UI
- Create and manage invoices
- Generate PDFs from invoices
- Send invoices to clients
- Manage expenses
- Simple reports
- Manage clients & products
- OpenTelemetry Traces & Logs Support
- Developer Experience:
    - Dependencies in Docker Compose for local development
    - Modern decorator based codebase
    - Dependency Injection
    - Event driven Design
    - Automatic API Type generation
    - Automatic adding of new endpoints to infrastructure definition
    - CQRS (Bus implemented and some commands present)
    - Entity based approach (vs. database centric)
    - JWT based authentication workflow with refresh tokens

<img src="/docs/screenshot-1.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-2.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-3.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-4.jpeg" alt="Servobill" width="200"/>


## Deploying

### On your AWS account

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

### Via Docker Compose

At the moment we do not have a docker image for servobill yet as it is heavily built on top of the serverless mindset. If you want to help us with that, please open an issue or a pull request

We already have outlined the steps required for adapting the codebase to also work on-premise. See https://trello.com/c/KOAbgN5q 


## Architecture

Servobill is built with a serverless architecture in mind. It uses AWS Lambda functions to handle the API requests, AWS DynamoDB to store the data, and AWS S3 to store the PDFs. It also uses AWS SES to send the emails. The frontend is built with Next.js and Tailwind CSS and is deployed to AWS S3 and CloudFront.

![Servobill](/docs/aws-architecture.png)


## Developing

If you want to develop Servobill, you can do so by cloning this repository, installing the dependencis (`npm install`), starting the complimentary background services (`docker-compose up -d`), and running `npm run dev` in the root directory.

You might need to setup a `secret-local-env.sh` file in the root directory with the following contents:

```bash
export ALLOWED_EMAILS="<your gmail address>"
export OAUTH_CLIENT_ID="<your google oauth client id>"
```

Open [http://localhost:3000](http://localhost:3000) with your browser for local development.

## Contributing

If you want to contribute to Servobill, you can do so by forking this repository, making your changes, and opening a pull request. Please test your changes before opening a pull request.

We have a list of features that we want to implement in the future, so if you want to contribute, please check out the [trello board](https://trello.com/b/5Isd3Nwk) and pick a feature to implement.

We also plan on adding automated tests in the future, feel free to contribute to that as well.

## Building your Invoice Template

Servobill uses [Handlebars](https://handlebarsjs.com/) to generate the invoice PDFs. You can change your template directly in the app, however if you want a more convenient way to do so, you can use the template builder. For that you install the dependencies as described above, and then run `npm run template` in the root directory. This will start a local server on port 2998. You can then open [http://localhost:2998](http://localhost:2998) with your browser and see your template. You can edit the template in the `templates/` folder and once you save the file, the page will automatically reload.

If you are done, you can copy the template to the settings in the app.

## License

We are currently working with our legal team to pick the right license for this project. Until then, please do not use this project for commercial purposes other than for invoicing your own clients.

The project probably will be licensed under the following modified MIT license:

### Modified MIT License (Planned License)

Permission is hereby granted, free of charge, to any person or organization obtaining a copy of this software, code, and associated documentation files (the "Software"), to use the Software for commercial purposes, including the right to use and modify the Software, subject to the following conditions and restrictions:

1. You may not sell the Software or any derivative works based on the Software.

2. You may not provide the use of the software as a service (Software-as-a-Service).

3. The above restrictions do not apply to the original maintainer or copyright holder of the Software, who may engage in the sale of the Software and provision of related services.

4. If a person or organization adds functionality to the software, they grant the original maintainer a non-exclusive, royalty-free, perpetual, irrevocable license to use, reproduce, modify, sublicense, distribute, and otherwise exploit the added functionality.

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

This license is meant to allow everyone get started with Servobill and use it for their own business. However, we want to make sure that no one can take this project and sell it as their own or use it to build a competing product.

For any questions or further permissions, please contact the original maintainer of the Software.
