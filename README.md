![Servobill](/docs/github-header.png)

# Servobill - Open Source Serverless Invoicing App

Servobill is a simple, open-source invoicing app built with Next.js, Tailwind CSS, and TypeScript on top of AWS Serverless technologies. It is extremely cheap to maintain and can be deployed to your own AWS account in minutes. We now also support a dockerized deployment on your own hardware.

## Features

We feature a simple, easy-to-use interface for creating and managing invoices. You can create an invoice, generate a PDF from it and send it to your client, and get paid all in one place. You can also manage your expenses and build simple reports to see how your business is doing and of course for tax purposes.

- Modern and simple UI (in-place editing, mobile friendly)
- Create and manage invoices/ offers & send them to clients via PDF, ZUGFeRD or X-Rechnung
- Manage expenses with attachments and expense categories & automatically create expenses when e.g. adding travel to an invoice
- Auto-Import expenses from incoming invoices with AI (with gpt-4.1 one PDF invoice roughly costs 0.005€)
- Generate reports with all income & expenses in JSON & CSV format for the tax authorities
- Customizable - from email and invoice templates to invoice number formats
- Modern Software Architecture: Modern Decorator based Typescript codebase, Serverless, Repository & Adapter Pattern for multiple database types, Folder based API structure (like Next.JS), React/ Next.JS based frontend, GraphQL based API, JWT based authentication workflow with refresh tokens and more.

<img src="/docs/screenshot-1.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-2.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-3.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-4.jpeg" alt="Servobill" width="200"/>

### Roadmap [(To full roadmap)](ROADMAP.md)

These are the high level next steps:

- [X] Attachments to invoices & expenses
- [X] Dockerized deployment
- [X] SMTP Mail sending (rather than only SES)
- [X] Local file storage (rather than S3)
- [X] Semantic versioning and automated releases
- [X] Auto-Generate expenses (based on incoming invoices with AI)
- [X] Inventory Management
- [X] Digital outgoing invoices (ZUGFeRD & XRechnung)
- [X] Scheduled invoice sending
- [X] Auto-Generate expenses (based on incoming structured invoices, e.g. ZUGFeRD/ X-Rechnung)
- [ ] Forward incoming invoice email to servobill
- [ ] Full Standalone (Local User Management, Multi-user support, automatic backups, etc.)

## Developing & Deploying

We offer two production ready deployment options and a development setup:

- [⚡ Serverless on your AWS account](deploy/serverless/README.md)
- [🐳 Dockerized on your own hardware](deploy/dockerized/README.md)
- [💻 Development setup](README.md#developing)

If you have no experience with AWS, we recommend the dockerized deployment, however all ways of deploying Servobill require some level of technical knowledge to deploy it securely.

### Deployment Considerations

Serverless hosting works great for freelancers with around 100-1000 invoices & expenses a year, and a total of around 50-100 customers & products as well as 2000-5000 items in the inventory shared across in 50-500 inventory types.

Since the pricing of DynamoDB is based on the amount of reads and writes, the cost of storing and retrieving larger amounts of data or having frequent requests to DynamoDB can become unpredictable. In these cases we recommend using the dockerized deployment or at least using a relational database rather than DynamoDB in the serverless deployment.


### Architecture

Servobill is built with a serverless architecture in mind. It uses AWS Lambda functions to handle the API requests, AWS DynamoDB to store the data, and AWS S3 to store the PDFs. It also uses AWS SES to send the emails. The frontend is built with Next.js and Tailwind CSS and is deployed to AWS S3 and CloudFront.

#### Serverless Architecture

![Servobill](/docs/aws-architecture.png)

In the serverless deployment, we use SST to deploy the application to AWS. For the frontend, we use CloudFront and for the APIs we use the AWS API Gateway. Data is stored in AWS DynamoDB and long-running processes are decoupled from the API requests by using AWS EventBridge to trigger Lambda functions.

#### Dockerized Architecture
For the dockerized deployment, the Next.js app in one docker container also handles the API requests while another container handles the queue workers. For dockerized deployments, we use Postgres rather than DynamoDB for structured data storage.

For storing assets (such as generated invoices or attachments), you can choose if you want to set up and maintain a minio instance (which is basically a self-hostable S3-Clone) or if you want to use an extremely simple local data storage where you just need to provide a folder to store the data in.

From a code perspective, all these options are implemented transparently with an adapter pattern.


#### Authentication

In all deployment types, we use Google OAuth/ OpenID to authenticate users. This is the only supported authentication method for now. 

You can allow a given set of email addresses to access the application by setting the `ALLOWED_EMAILS` environment variable. Email addresses not in this list will be denied access.

Once authenticated, you get two JWT tokens in your cookies, one short-lived session token and one long-lived refresh token. The session token is used to authenticate your requests to the API and the refresh token is used to refresh the session token when it expires. When using the refresh token, we also check if the user is still allowed to access the application against the database.

### Development Setup

If you want to develop Servobill, you can do so by following these steps to get you up and running:

- Clone this repository
- Install the dependencies (`npm install`)
- Start the complimentary background services (`docker-compose up -d`)
- Copy and adapt the env files: `.env.example` → `.env` & `.env.dev.example` → `.env.dev`
- Run `npm run dev` in the root directory.
- Setup a Google OAuth client ID and secret and add them to the env files
- Open [http://localhost:3000](http://localhost:3000) with your browser for local development.


### Environment overrides with `.env.dev`

For local development, you can create a `.env.dev` file in the project root. Any variables in `.env.dev` will override those in `.env` when running locally. This is useful for developer-specific or temporary overrides. The `.env.dev` file is ignored by version control and will not be included in builds or deployments.

See the `.env.example` and `.env.dev.example` files for the available variables.

### Extra Tools

We have added some extra tools to the development setup for you to help you with your development.

Use the following web interfaces to help you with your development:

- S3 Simulation (Minio): [minio](http://localhost:9320)
- SMTP Simulation (Fake SMTP Server): [http://localhost:1025](http://localhost:1025)

We also have added tools that do not have web interfaces, but are set up when running the docker-compose file from the servobill-init container.

- DynamoDB Simulation (`dynamodb-local`)
- SES Simulation (`aws-ses-local`)
- Postgres

For validating the generated invoices, you can use the following tools:

- [eRechnung Validator (Good for ZUGFeRD)](https://erechnungs-validator.de)
- [XRechnung Validator (Good for XRechnung)](https://erechnungsvalidator.service-bw.de)

### Building your Invoice Template

Servobill uses [Handlebars](https://handlebarsjs.com/) to generate the invoice PDFs. You can change your template directly in the app, however if you want a more convenient way to do so, you can use the template builder. For that you install the dependencies as described above, and then run `npm run template` in the root directory. This will start a local server on port 2998. You can then open [http://localhost:2998](http://localhost:2998) with your browser and see your template. You can edit the template in the `templates/` folder and once you save the file, the page will automatically reload.

If you are done, you can copy the template to the settings in the app.

## License

This software is licensed under a modified MIT license that does not allow you to sell the software or host it as a software as a service.

See [LICENSE.md](LICENSE.md) for the full license text.
