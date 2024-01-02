![Servobill](/public/github-header.png)

# Servobill

Servobill is a simple, open-source invoicing app built with Next.js, Tailwind CSS, and TypeScript on top of AWS Serverless technologies. It is extremely cheap to maintain and can be deployed to your own AWS account in minutes.

## Features

We feature a simple, easy-to-use interface for creating and managing invoices. You can create an invoice, generate a PDF from it and send it to your client, and get paid all in one place. You can also manage your expenses and build simple reports to see how your business is doing and of course for tax purposes.

- Create and manage invoices
- Generate PDFs from invoices
- Send invoices to clients
- Manage expenses
- Simple reports
- Manage clients & products

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

## Deploying

This section is currently being written
