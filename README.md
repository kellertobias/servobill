![Servobill](/docs/github-header.png)

# Servobill

Servobill is a simple, open-source invoicing app built with Next.js, Tailwind CSS, and TypeScript on top of AWS Serverless technologies. It is extremely cheap to maintain and can be deployed to your own AWS account in minutes. We now also support a dockerized deployment on your own hardware.

## Features

We feature a simple, easy-to-use interface for creating and managing invoices. You can create an invoice, generate a PDF from it and send it to your client, and get paid all in one place. You can also manage your expenses and build simple reports to see how your business is doing and of course for tax purposes.

- Modern and simple UI (in-place editing, mobile friendly)
- Create and manage invoices/ offers & send them to clients via PDF
- Manage expenses with attachments and expenses categories & automatically create expenses when e.g. adding travel to an invoice
- Generate reports with all income & expenses in JSON & CSV format
- Customizable - from templates to invoice number formats
- Modern Software Architecture: Modern Decorator based Typescript codebase, Serverless, Repository & Adapter Pattern for multiple database types, Folder based API structure (like NextJS), React/ NextJS based frontend, GraphQL based API, JWT based authentication workflow with refresh tokens and more.

<img src="/docs/screenshot-1.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-2.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-3.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-4.jpeg" alt="Servobill" width="200"/>

## Roadmap

Planned until end of 2024:
- [X] ... basic application: customers, products, invoices, expenses, reports, etc.

Planned until end of May 2025:
- [X] Add support for on-premise database types (postgres)
- [X] Add support for attachments for invoices, expenses and emails
- [X] Add categorization of expenses
- [X] Add support for auto-generated expenses (e.g. travel expenses)
- [X] Update to SST v3

Planned until end of June 2025:
- [ ] Fix bug where settings cannot be saved (Known bug, will be fixed in release that includes dockerized deployment)
- [ ] Add support for dockerized deployments (WIP, mainly needs testing)
- [ ] Add support for SMTP mail sending (instead of only allowing SES)
- [ ] Add support for simple inventory management (expense can create inventory items, history on inventory items, etc.)

Planned until end of July 2025:
- [ ] Add support for incoming digital invoices (e.g. X-Rechnung/ ZugFeRD)
- [ ] Add AI Upload of invoices (e.g. from PDF) to automatically create expenses and inventory items
- [ ] Add support for incoming invoice emails (either parse digital invoice or use AI to parse)
- [ ] Add support for sending digital invoices (e.g. X-Rechnung/ ZugFeRD)

Planned until end of August 2025:
- [ ] Add local user management (e.g. for self-hosted deployments)
- [ ] Add "Projects" assign inventory items to projects
- [ ] Add automatic backups of data (e.g. via email or to S3)

Long term:
- [ ] Add "Time Tracking" to Projects
- [ ] Add offline mode for: time tracking, inventory items
- [ ] Add S3 lifecycle rules to automatically archive old data (e.g. glacier to save on storage)
- [ ] Add pagination to all lists
- [ ] PDF export of reports (JSON & CSV export already present)
- [ ] FinTS support for checking for payments (see https://www.fints.org/de/startseite)

## Deploying

We offer two production ready deployment options and a development setup:

- [Serverless on your AWS account](deploy/serverless/README.md)
- [Dockerized on your own hardware](deploy/dockerized/README.md) (Not yet complete, missing background jobs such as sending emails and generating PDFs)
- [Development setup](README.md#developing)


## Architecture

Servobill is built with a serverless architecture in mind. It uses AWS Lambda functions to handle the API requests, AWS DynamoDB to store the data, and AWS S3 to store the PDFs. It also uses AWS SES to send the emails. The frontend is built with Next.js and Tailwind CSS and is deployed to AWS S3 and CloudFront.

![Servobill](/docs/aws-architecture.png)

For the dockerized deployment, the nextjs app in one docker container also handles the API requests while another container handles the queue workers. For dockerized deployments, we use a minio instance for S3 storage and postgres rather than dynamoDB. For this we have database adapters in our repository layer for both postgres and dynamoDB.

In theory we also support sqlite or any other database that is supported by typeOrm, you however need to build the configuration for that yourself.

## Developing

If you want to develop Servobill, you can do so by cloning this repository, installing the dependencis (`npm install`), starting the complimentary background services (`docker-compose up -d`), and running `npm run dev` in the root directory.

You might need to setup a `secret-local-env.sh` file in the root directory with the following contents:

```bash
export ALLOWED_EMAILS="<your gmail address>"
export OAUTH_CLIENT_ID="<your google oauth client id>"
```

### Environment overrides with `.env.dev`

For local development, you can create a `.env.dev` file in the project root. Any variables in `.env.dev` will override those in `.env` when running locally. This is useful for developer-specific or temporary overrides. The `.env.dev` file is ignored by version control and will not be included in builds or deployments.

Open [http://localhost:3000](http://localhost:3000) with your browser for local development.

## Building your Invoice Template

Servobill uses [Handlebars](https://handlebarsjs.com/) to generate the invoice PDFs. You can change your template directly in the app, however if you want a more convenient way to do so, you can use the template builder. For that you install the dependencies as described above, and then run `npm run template` in the root directory. This will start a local server on port 2998. You can then open [http://localhost:2998](http://localhost:2998) with your browser and see your template. You can edit the template in the `templates/` folder and once you save the file, the page will automatically reload.

If you are done, you can copy the template to the settings in the app.

## License

This software is licensed under a modified MIT license that does not allow you to sell the software or host it as a software as a service.

See [LICENSE.md](LICENSE.md) for the full license text.
