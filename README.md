![Servobill](/docs/github-header.png)

# Servobill

Servobill is a simple, open-source invoicing app built with Next.js, Tailwind CSS, and TypeScript on top of AWS Serverless technologies. It is extremely cheap to maintain and can be deployed to your own AWS account in minutes. We now also support a dockerized deployment on your own hardware.

## Features

We feature a simple, easy-to-use interface for creating and managing invoices. You can create an invoice, generate a PDF from it and send it to your client, and get paid all in one place. You can also manage your expenses and build simple reports to see how your business is doing and of course for tax purposes.

- Modern and simple UI
- Create and manage invoices
- Generate PDFs from invoices
- Send invoices to clients
- Manage expenses with attachments and expenses categories
- Automatically create expenses when e.g. adding travel to an invoice
- Simple reports
- Manage clients & products
- Developer Experience:
    - Dependencies in Docker Compose for local development
    - Modern decorator based codebase
    - Dependency Injection
    - Event driven Design
    - OpenTelemetry Support for Traces & Logs
    - Automatic API Type generation
    - Automatic adding of new endpoints to infrastructure definition
    - CQRS (Bus implemented and some commands present)
    - Entity based approach (vs. database centric)
    - JWT based authentication workflow with refresh tokens

<img src="/docs/screenshot-1.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-2.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-3.jpeg" alt="Servobill" width="200"/> <img src="/docs/screenshot-4.jpeg" alt="Servobill" width="200"/>


## Deploying

We offer two production ready deployment options and a development setup:

- [Serverless on your AWS account](deploy/serverless/README.md)
- [Dockerized on your own hardware](deploy/dockerized/README.md)
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

Open [http://localhost:3000](http://localhost:3000) with your browser for local development.

## Contributing

If you want to contribute to Servobill, you can do so by forking this repository, making your changes, and opening a pull request. Please test your changes before opening a pull request.

We have a list of features that we want to implement in the future, so if you want to contribute, please check out the [trello board](https://trello.com/b/5Isd3Nwk) and pick a feature to implement.

We also plan on adding automated tests in the future, feel free to contribute to that as well.

## Building your Invoice Template

Servobill uses [Handlebars](https://handlebarsjs.com/) to generate the invoice PDFs. You can change your template directly in the app, however if you want a more convenient way to do so, you can use the template builder. For that you install the dependencies as described above, and then run `npm run template` in the root directory. This will start a local server on port 2998. You can then open [http://localhost:2998](http://localhost:2998) with your browser and see your template. You can edit the template in the `templates/` folder and once you save the file, the page will automatically reload.

If you are done, you can copy the template to the settings in the app.

## License

This software is licensed under a modified MIT license that does not allow you to sell the software or host it as a service for others.

See LICENSE.md for the full license text.
