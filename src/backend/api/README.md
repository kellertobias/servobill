# API Folder

This folder contains the API handlers for the backend. The API handlers are
responsible for handling the requests from the frontend and returning the
appropriate responses.

In the development environment, they are served by NextJS, (see the src/app/api folder for that).
We basically forward all requests that are coming in for api/ from nextjs to this folder structure.

To update the list of available API handlers, just restart the development envrioment or run
`npx tsx stack/build-api-index.ts` to update the index file.

For production, we use the same folder structure to deliver the API handlers as serverless functions.

For that, each file that should be a serverless function needs to export a variable called method which
is a string containing the HTTP verb that should be used for the function (or ANY).
It also needs to either export a function called handler or a variable called handlerName which is a string
containing the name of the function that should be used as the handler. The handler needs to be an unnamed
function (e.g. export const handler: APIHandler = async (req, res) => {...}).