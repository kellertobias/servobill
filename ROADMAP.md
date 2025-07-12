# Roadmap

This roadmap is not a commitment to deliver these features by a certain date, but rather a guide to what we are working on and what we plan to work on.

We will update this roadmap as we progress with the development of Servobill.

## Planned until end of 2024:
- [X] ... basic application: customers, products, invoices, expenses, reports, etc.

## Planned until end of May 2025:
- [X] Add support for on-premise database types (postgres)
- [X] Add support for attachments for invoices, expenses and emails
- [X] Add categorization of expenses
- [X] Add support for auto-generated expenses (e.g. travel expenses)
- [X] Update to SST v3

## Milestone "Dockerized" (June 2025):
- [X] Add support for SMTP mail sending (instead of only allowing SES)
- [X] Add support for dockerized deployments

## Milestone "Inventory Management" (planned till end of June 2025):
- [X] Create, edit and delete inventory items
- [X] Add history/ notes on inventory items (e.g. when serviced, etc.)
- [X] Add simple Barcode scanner for inventory items (e.g. for QR codes)

## Milestone "Auto-Generate expenses" (based on incoming invoices) (planned till end of July 2025):
- [X] Add AI Upload of invoices (e.g. from PDF) to automatically create expenses and inventory items
- [ ] Add support for incoming invoice emails (either parse digital invoice or use AI to parse)


## Milestone "Digital outgoing invoices" (planned till end of July 2025):
- [X] Add basic support for sending e-invoices (e.g. X-Rechnung)
- [X] Add basic support for sending e-invoices (e.g. ZugFeRD)
- [ ] Support VAT types (e.g. VAT_DISABLED_KLEINUNTERNEHMER)
- [ ] Support discounts on e-invoices

## Milestone "Incoming e-invoices" (planned till end of July 2025):
- [ ] Add support for incoming digital invoices (e.g. X-Rechnung/ ZugFeRD)


## Milestone "Full Standalone" (planned till end of September 2025):
- [ ] Add automatic backups of data (e.g. via email or to S3)
- [ ] Add local user management (e.g. for self-hosted deployments)

## Long term (MRs welcome after PRD and TDD discussions):
- [ ] Add support for automatically sending invoices at a given date
- [ ] Add "Projects" assign inventory items to projects (e.g. for packing lists, etc.)
- [ ] Add S3 lifecycle rules to automatically archive old data (e.g. glacier to save on storage)
- [ ] Add pagination to all lists
- [ ] PDF export of reports (JSON & CSV export already present)
- [ ] FinTS support for checking for payments (see https://www.fints.org/de/startseite)