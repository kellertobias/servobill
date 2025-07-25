## [1.13.0](https://github.com/kellertobias/servobill/compare/v1.12.0...v1.13.0) (2025-07-14)


### ✨ Features

* basic e-invoice extraction ([a98b340](https://github.com/kellertobias/servobill/commit/a98b3403d318f1486eaf7ae9f20a8ace85b981e9))
* implement PDF XML extraction functionality ([f1bb845](https://github.com/kellertobias/servobill/commit/f1bb845a09abed1e656a78e2d68e164dedc62cd8))


### 🐛 Bug Fixes

* cast countryCode to CustomerEntity type in CustomerDynamodbRepository ([7b6fe61](https://github.com/kellertobias/servobill/commit/7b6fe61769768971a6a070bc89391f2e59c3fef6))
* customer dynamodb ([d8facc9](https://github.com/kellertobias/servobill/commit/d8facc9109c2d8d9129c59dcda8bb83c491538af))
* remove unnecessary/ old debug console logs ([bf371e0](https://github.com/kellertobias/servobill/commit/bf371e0ec4d62c2bac117d2197350f19342fbaca))


### 🔧 Chores

* update docs & readme ([56d3400](https://github.com/kellertobias/servobill/commit/56d3400911501bf9f4429abe0200cd69dc58e437))
* update readme ([86faad2](https://github.com/kellertobias/servobill/commit/86faad2df46a944446bcb9488f948efef443e939))

## [1.12.0](https://github.com/kellertobias/servobill/compare/v1.11.0...v1.12.0) (2025-07-13)


### ✨ Features

* allow sending an invoice at a later date (api) ([2fd54f9](https://github.com/kellertobias/servobill/commit/2fd54f982027f1acd12f87bf2edccd4efa0d6c13))
* cron engine ([d4dd9f1](https://github.com/kellertobias/servobill/commit/d4dd9f1ecf38e96f1116b769b2e90edffab60589))
* send later and abort sending later (ui) ([42b07c4](https://github.com/kellertobias/servobill/commit/42b07c42b8bc599ff54c94785738d617e0e2d358))
* send later function ([bcf3612](https://github.com/kellertobias/servobill/commit/bcf361282e142f668af8ffe715b3d0f8fe837161))


### 🐛 Bug Fixes

* send later job should work now ([8a72281](https://github.com/kellertobias/servobill/commit/8a72281f83e3fbff0f51527bc1ab9461bf1236b0))


### 📚 Documentation

* update README to reflect changes in digital outgoing invoices and add new features for scheduled invoice sending and email forwarding ([cb09168](https://github.com/kellertobias/servobill/commit/cb0916833578aacc8bf6b9054a1fa70e7b677e68))

## [1.11.0](https://github.com/kellertobias/servobill/compare/v1.10.0...v1.11.0) (2025-07-13)


### ✨ Features

* allow re-generation of digital e-invoices - only PDF will be cached ([7a1bd6c](https://github.com/kellertobias/servobill/commit/7a1bd6cd12d2003c849df3fec7d110546234971d))
* preparation for "send invoice later" ([fa69672](https://github.com/kellertobias/servobill/commit/fa6967210508764a46250a388f32c48d0a150388))


### 🐛 Bug Fixes

* add proper validation to the e-invoices tests ([c382cfa](https://github.com/kellertobias/servobill/commit/c382cfaff12f271d2591acf895ad667a4ff775ce))
* add testcases for e-invoicing - discounts currently do not work ([b9d0c61](https://github.com/kellertobias/servobill/commit/b9d0c61e1c47d24b991547b11b1dbf7bad514bb9))
* e-invoices now have proper mapping for VAT examption ([83a3c44](https://github.com/kellertobias/servobill/commit/83a3c440cf695d051a7a327c968b0991b7181757))
* enable xrecehnung discount tests since here the implementation works ([b388055](https://github.com/kellertobias/servobill/commit/b3880559a3949202de19583ddcadfc7ac7df5450))
* finalize x-rechnung with discount functionality ([8818905](https://github.com/kellertobias/servobill/commit/8818905e33b50a79c85378e770a5a280c3a82660))
* tests for timebased job ([7eb2f9e](https://github.com/kellertobias/servobill/commit/7eb2f9e4b40ca8252b506993e7ad1bf15820205d))


### ✅ Tests

* prepare for testing e-invoice generation ([b271ff7](https://github.com/kellertobias/servobill/commit/b271ff777e689dc04d3c167833fc0c59e550aee5))

## [1.10.0](https://github.com/kellertobias/servobill/compare/v1.9.0...v1.10.0) (2025-07-12)


### ✨ Features

* initial implementation for structured e-invoices (ZUGFeRD) ([1dc4d12](https://github.com/kellertobias/servobill/commit/1dc4d122cef64fe5c6f690580cdd40947f0c5334))


### 🐛 Bug Fixes

* add basic support for writing (currently not yet valid) XRechnung format ([46b51d1](https://github.com/kellertobias/servobill/commit/46b51d18a53d517b5e98f927c5748c0b02dc96ec))
* alpha version of XRechnung support (code needs to be cleaned up) ([280779c](https://github.com/kellertobias/servobill/commit/280779ce9e78ab72bc116caee16635233a5335fc))
* invoice total cents default to NaN ([7c9e5eb](https://github.com/kellertobias/servobill/commit/7c9e5ebde980ac56fffb7551458117d6f932ee32))
* second iteration of ZUGFeRD invoices ([9b25052](https://github.com/kellertobias/servobill/commit/9b2505255e116f04c02ff9f4919606697b66a8b4))
* ZUGFeRD invoice generation works now ([1ca4e98](https://github.com/kellertobias/servobill/commit/1ca4e98fd7200b02f2f766ce6a20806db5213375))

## [1.9.0](https://github.com/kellertobias/servobill/compare/v1.8.0...v1.9.0) (2025-07-06)


### ✨ Features

* add inventory type & location import ([c8a7320](https://github.com/kellertobias/servobill/commit/c8a7320ffda02b1b1c1633537f69bbb0199e463d))
* allow AI receipt extraction to know about currencies ([0e3cb00](https://github.com/kellertobias/servobill/commit/0e3cb002c2ea2320e8111b6c1d03a7facd1143f5))
* code scanner for inventory ([a33ae9f](https://github.com/kellertobias/servobill/commit/a33ae9f9d425c6e0cca45a335dc379b9c64dfd62))
* import inventory from csv ([59da7b1](https://github.com/kellertobias/servobill/commit/59da7b1f0660af20f08bea5a59466d11afc49187))
* keyboard/ handscanner code entry for inventory scan search ([754b9ea](https://github.com/kellertobias/servobill/commit/754b9ead86866a549d264745355889a58d2a211b))
* scanner only interface for faster stocktaking and item maintenance tracking ([f6ada0a](https://github.com/kellertobias/servobill/commit/f6ada0a667c0ce04eb0eb3c47d86d94ee0cf8288))


### 🐛 Bug Fixes

* add missing packet ([9aa31fd](https://github.com/kellertobias/servobill/commit/9aa31fd5e7467d56d2e6b75fc8c17e5669add872))
* do not reset full form on "save & next" to speed up rapid item creation ([ebc083a](https://github.com/kellertobias/servobill/commit/ebc083a57467f1e95db3f66be2ccb9cfa86c11d9))
* improve readability and debug items not reloading after save ([3ef2e81](https://github.com/kellertobias/servobill/commit/3ef2e81c6382d5d36276e0d5274c75ffbd6c331f))
* improve validation for checkInterval and checkType in InventoryTypeEntity ([d09cb39](https://github.com/kellertobias/servobill/commit/d09cb392ac1758aa0d5f54ee0778735369330ea7))
* limit results to 50 ([eb0ba1f](https://github.com/kellertobias/servobill/commit/eb0ba1fb4d46a07257e3ac4b9062d712d55ec4c6))
* linter suggests spread over concat ([d7fb52d](https://github.com/kellertobias/servobill/commit/d7fb52d79c2992ee56c886f56871780007216512))
* remove unused variables ([04ee2f2](https://github.com/kellertobias/servobill/commit/04ee2f2a7e7f484157b3868c00673f2523b1af5f))
* update checkInterval handling in inventory type drawer ([97e3022](https://github.com/kellertobias/servobill/commit/97e30223adcd95038e244013138fbfa2c7a1ac07))


### ♻️ Code Refactoring

* implement consistent error formatting for GraphQL server ([eca6cc4](https://github.com/kellertobias/servobill/commit/eca6cc4f013e29c4e39b501be84f07ea91e3da79))

## [1.8.0](https://github.com/kellertobias/servobill/compare/v1.7.0...v1.8.0) (2025-07-06)


### ✨ Features

* enhance inventory item creation with new actions and UI updates ([225d42f](https://github.com/kellertobias/servobill/commit/225d42fdff0dd2e17028d3212de81075566a075f))


### 🐛 Bug Fixes

* dynamodb inventory creation ([d337e90](https://github.com/kellertobias/servobill/commit/d337e9007f5bcf97034e84de105918d0908e6cdf))

## [1.7.0](https://github.com/kellertobias/servobill/compare/v1.6.0...v1.7.0) (2025-07-06)


### ✨ Features

* add UPDATE type to inventory history and enhance activity feed ([a55d014](https://github.com/kellertobias/servobill/commit/a55d014b1e3aa9f3fb3c06a909c0a316666a334d))
* enhance inventory list data loading with search functionality ([944c0a4](https://github.com/kellertobias/servobill/commit/944c0a42e978f0c4897c93aa7393f3847afcc7e2))
* finalize inventory MVP with item search ([b1bfe85](https://github.com/kellertobias/servobill/commit/b1bfe857fd29230d19ede57f488b555257e45cf2))
* implement inventory activity feed and form components with history management ([2bf0268](https://github.com/kellertobias/servobill/commit/2bf0268003154f16c0a328908cbadd09da7c7e37))


### 🐛 Bug Fixes

* prevent unnecessary status updates in inventory item detail page ([a13c300](https://github.com/kellertobias/servobill/commit/a13c300b67c9eb159c54ef15e6bf182d190f00ef))

## [1.6.0](https://github.com/kellertobias/servobill/compare/v1.5.0...v1.6.0) (2025-07-03)


### ✨ Features

* enhance inventory item detail page with new components and layout ([e76839c](https://github.com/kellertobias/servobill/commit/e76839cc940dadbe368afb7fe18c4e438820638e))
* enhance inventory type selection and item details with type name support ([634e907](https://github.com/kellertobias/servobill/commit/634e907adffdac913c1c83174235c24d7d35d2c0))
* refactor inventory item detail page with new components and improved functionality ([7d656ea](https://github.com/kellertobias/servobill/commit/7d656ea912e20eb7aa54b0fc2d602299c5833b16))

## [1.5.0](https://github.com/kellertobias/servobill/compare/v1.4.3...v1.5.0) (2025-06-30)


### ✨ Features

* add development utilities for demo inventory data ([9bb543c](https://github.com/kellertobias/servobill/commit/9bb543c29b47966a7de88fe3b8111699447227ca))
* add item management functionality to inventory node page ([93e0bf5](https://github.com/kellertobias/servobill/commit/93e0bf52b29ec7254ad8c1bcb901e1a461051160))
* enhance inventory management with parent-child relationships ([0fc6d62](https://github.com/kellertobias/servobill/commit/0fc6d620bd60ddbc9396d7ef9a9debc976b68bdd))
* enhance inventory node page with back navigation support ([7bf88f7](https://github.com/kellertobias/servobill/commit/7bf88f70728cece92c66c8ef8735f090e0e0f465))
* enhance inventory node page with edit drawers and refactor ([63787ea](https://github.com/kellertobias/servobill/commit/63787eaa0a81670e3e196c5b01482df38569fb9f))
* inventory prototype done ([1298283](https://github.com/kellertobias/servobill/commit/12982833b153783ef26b84509679f6c27172e9b4))
* refactor inventory edit drawers to use new select components ([8ca7035](https://github.com/kellertobias/servobill/commit/8ca70355ddaca1bda30e58dfbac87b5528a72f41))
* refactor inventory input types and enhance inventory management ([2fec1ec](https://github.com/kellertobias/servobill/commit/2fec1ec5948bc84a2f760897bf6373f2638870be))
* unify code for inventory types and locations ([8715712](https://github.com/kellertobias/servobill/commit/87157120e6fe328db832ccaa07d0363bfcfc038e))


### 🐛 Bug Fixes

* update GraphQL mutations to use 'data' argument for inventory items, locations, and types ([ece1412](https://github.com/kellertobias/servobill/commit/ece1412933c4967024af4626273049f40b9ba953))


### ✅ Tests

* add some real world like test data ([967a1aa](https://github.com/kellertobias/servobill/commit/967a1aa809521719ad12677ac364d75c6b40962d))

## [1.4.3](https://github.com/kellertobias/servobill/compare/v1.4.2...v1.4.3) (2025-06-26)


### 🐛 Bug Fixes

* enhance integration tests for SystemResolver ([8cc4a93](https://github.com/kellertobias/servobill/commit/8cc4a932167e0ff99caa10fd5028fcf325541c0d))

## [1.4.2](https://github.com/kellertobias/servobill/compare/v1.4.1...v1.4.2) (2025-06-25)


### 🐛 Bug Fixes

* add missing validations ([e48cf20](https://github.com/kellertobias/servobill/commit/e48cf2007c23e764ca234eb8b720da9db8285f31))
* deletion should not crash if file already deleted ([9ec34c0](https://github.com/kellertobias/servobill/commit/9ec34c0f1a80752bde28281db1c197d59771e5b5))


### ✅ Tests

* add integration tests for InventoryLocationResolver ([481e2c3](https://github.com/kellertobias/servobill/commit/481e2c3f63a291ae607ff9242ab2ed3da53c4130))
* add integration tests for InventoryResolver ([75a074b](https://github.com/kellertobias/servobill/commit/75a074b99fd38ca9245118423cc4b8b098537153))
* add integration tests for InventoryTypeResolver ([51c57eb](https://github.com/kellertobias/servobill/commit/51c57eb84638241873393f47079433c14775761d))
* enhance integration tests for InvoiceLifecycleResolver ([c71b991](https://github.com/kellertobias/servobill/commit/c71b99192b409c912f59fc622e8571d8e7787563))
* expand integration tests for AttachmentResolver ([02d8056](https://github.com/kellertobias/servobill/commit/02d8056d83fc57736c4e4a354e379975ddcfa451))

## [1.4.1](https://github.com/kellertobias/servobill/compare/v1.4.0...v1.4.1) (2025-06-25)


### 🐛 Bug Fixes

* update changelog extraction in release workflow ([0578739](https://github.com/kellertobias/servobill/commit/0578739da55fbda411cccd94afc8357646788821))


### 📚 Documentation

* update deployment instructions in release workflow ([65dd745](https://github.com/kellertobias/servobill/commit/65dd745cad7c2c43bea1a2704cadd857ae4679ef))


### ✅ Tests

* add integration tests for AttachmentResolver ([ff1a82a](https://github.com/kellertobias/servobill/commit/ff1a82a0129327019328ee4fb6a3b5e98b066519))
* add integration tests for AuthResolver ([f69f3ca](https://github.com/kellertobias/servobill/commit/f69f3ca9d8dee9138d3857bcd7d2673fd40caad5))
* add integration tests for CustomerResolver ([1cd7ef2](https://github.com/kellertobias/servobill/commit/1cd7ef250cc26f6a9a5c4ba56ea5061d020faa1d))
* add integration tests for ExpenseResolver ([52e159b](https://github.com/kellertobias/servobill/commit/52e159b71dc6ec68c0bef96d2aef0743daeb035c))
* add integration tests for InvoiceLifecycleResolver ([c9ba5a5](https://github.com/kellertobias/servobill/commit/c9ba5a5db6dc049285738cbcbea1e9546db65323))
* add integration tests for InvoiceResolver ([db7a8dd](https://github.com/kellertobias/servobill/commit/db7a8dd63509e14223d77857f6ed24c7db08eb92))
* add integration tests for ProductResolver and ReportsResolver ([8f2b791](https://github.com/kellertobias/servobill/commit/8f2b791f67d18070f5a2596a8b94db08e2b0091f))

## [1.4.0](https://github.com/kellertobias/servobill/compare/v1.3.0...v1.4.0) (2025-06-25)


### ✨ Features

* enhance release workflow with changelog extraction and upload ([357181d](https://github.com/kellertobias/servobill/commit/357181db478d5185f54f96ea769256a7bdcf5a69))

## [1.3.0](https://github.com/kellertobias/servobill/compare/v1.2.6...v1.3.0) (2025-06-25)


### ✨ Features

* add integration tests for session management and enhance Docker image publishing ([2898e90](https://github.com/kellertobias/servobill/commit/2898e90e79049a23e75666524f3a836086e6db6a))


### 🔧 Chores

* remove unused plugins from release workflow ([ae201e3](https://github.com/kellertobias/servobill/commit/ae201e3f847a8b66cc4be9bfa97dc988f79d527a))

## [1.2.6](https://github.com/kellertobias/servobill/compare/v1.2.5...v1.2.6) (2025-06-24)


### ✅ Tests

* add integration tests for ReceiptResolver's extractReceipt mutation ([f12551a](https://github.com/kellertobias/servobill/commit/f12551a75beb18a886eeaac62b45a40d435ec3ad))
* add unit tests for DeferredPromise and money utility functions ([86dbf9e](https://github.com/kellertobias/servobill/commit/86dbf9edf6f3e4ecc6b9a6537eff8d235a1852a3))
* add unit tests for LLMService with mocked dependencies ([cca4bae](https://github.com/kellertobias/servobill/commit/cca4bae3a7655292b9502b4256a832a1af871e7f))
* enhance Numbering utility tests with comprehensive cases ([83e35f7](https://github.com/kellertobias/servobill/commit/83e35f7f5b4a388d3e0c2cc4d52e71119985acab))
* enhance SystemResolver e2e tests with additional mutation coverage ([c464966](https://github.com/kellertobias/servobill/commit/c4649664eeee39dfbc32858f65e864729accb684))
* integrate S3 service and enhance file storage functionality ([96633d5](https://github.com/kellertobias/servobill/commit/96633d5dabedd80e399bc0ce8981653a1195884a))


### 🔧 Chores

* enhance CI/CD workflows with testing and Docker build updates ([f7d5dae](https://github.com/kellertobias/servobill/commit/f7d5dae03179be1c9e7f3a49f163175e6e07e868))
* enhance release workflow with major version output ([bb54ff0](https://github.com/kellertobias/servobill/commit/bb54ff0fe6d2c7cb9ebb435844cf6e834eab2048))
* simplify test command in release workflow ([ae149d7](https://github.com/kellertobias/servobill/commit/ae149d7a535d0eac3ed2c3355b8ab4868d7c324e))
* update package-lock and package.json for coverage tools ([716d5df](https://github.com/kellertobias/servobill/commit/716d5df69171fcd170e798b5a1be2f1b6096c551))
* update package-lock and package.json for Vitest coverage ([4d8e1bd](https://github.com/kellertobias/servobill/commit/4d8e1bdeb3b5a67003944f91f468851ad80bf04e))
* update package.json and package-lock.json for Jest types and testing utilities ([9a29995](https://github.com/kellertobias/servobill/commit/9a29995d18a061439cda7796e3868c0894939e8c))
* update release workflow to run PostgreSQL tests only ([3443c61](https://github.com/kellertobias/servobill/commit/3443c61c76852a7badeab3b8f0d77e108ef8b825))
* update vitest.config.ts to refine coverage exclusions ([d29dc4f](https://github.com/kellertobias/servobill/commit/d29dc4fe543044d2777c86ee684c87995bd1e19d))

## [1.2.5](https://github.com/kellertobias/servobill/compare/v1.2.4...v1.2.5) (2025-06-24)


### 🔧 Chores

* fix remaining typos ([c2e0dd4](https://github.com/kellertobias/servobill/commit/c2e0dd49e5df358e0d229dc54bd973d310e21a84))
* fix typos in readme ([97fcdad](https://github.com/kellertobias/servobill/commit/97fcdad3677dc282d0ec8275175f3f084a91473f))
* update ROADMAP and VSCode settings ([f98f12f](https://github.com/kellertobias/servobill/commit/f98f12fd9eb1a9c0671f35015d37ab6bec2e75a2))

## [1.2.4](https://github.com/kellertobias/servobill/compare/v1.2.3...v1.2.4) (2025-06-24)


### 🐛 Bug Fixes

* graphql test setup and first test case now works ([ce6b299](https://github.com/kellertobias/servobill/commit/ce6b299601ec926b1c93447dc93333b127e4c458))

## [1.2.3](https://github.com/kellertobias/servobill/compare/v1.2.2...v1.2.3) (2025-06-24)


### 🐛 Bug Fixes

* significantly improve test speed ([e3539e9](https://github.com/kellertobias/servobill/commit/e3539e939c31d26eac69f7c01d854c176d7faafa))


### ♻️ Code Refactoring

* enhance GraphQL resolvers and add test set integration ([b9490ff](https://github.com/kellertobias/servobill/commit/b9490ff946a5cae9b8e309a66010432b00213748))


### ✅ Tests

* add end-to-end tests for SystemResolver and enhance DynamoDB repository integration ([c5c2bb6](https://github.com/kellertobias/servobill/commit/c5c2bb68951046a7de93748081b16a4921a0e2ef))

## [1.2.2](https://github.com/kellertobias/servobill/compare/v1.2.1...v1.2.2) (2025-06-23)


### ♻️ Code Refactoring

* update attachment handling to support multiple expense IDs ([cbf73b1](https://github.com/kellertobias/servobill/commit/cbf73b1f0dec04be3341d5cfae26cea2eef3c909))

## [1.2.1](https://github.com/kellertobias/servobill/compare/v1.2.0...v1.2.1) (2025-06-22)


### 🐛 Bug Fixes

* add new 512x512 PNG image and update manifest references ([880863c](https://github.com/kellertobias/servobill/commit/880863c70d591bb5efcb3cc39326b667dd8372b5))

## [1.2.0](https://github.com/kellertobias/servobill/compare/v1.1.0...v1.2.0) (2025-06-22)


### ✨ Features

* enhance receipt extraction functionality in GraphQL API ([588e8be](https://github.com/kellertobias/servobill/commit/588e8bed424cf7d21b6c714ede45eeb2e152b56f))


### 🐛 Bug Fixes

* add validation decorators to extract receipt input ([32dbdba](https://github.com/kellertobias/servobill/commit/32dbdba7e16bad9f9caa1a68699eda6a3b320b15))
* implement ExtractReceiptInput for enhanced receipt extraction ([e3f181e](https://github.com/kellertobias/servobill/commit/e3f181e11dfe503f548fdd72045b097bc79f52d9))


### 📚 Documentation

* update README and manifest for enhanced features ([4afd59f](https://github.com/kellertobias/servobill/commit/4afd59f259445ab5ff335887f637fdc4f9f1f1a0))
* update README to clarify AI auto-import feature ([198bab7](https://github.com/kellertobias/servobill/commit/198bab7bfa6e8a5886166ffe8ac800400e379f5a))

## [1.1.0](https://github.com/kellertobias/servobill/compare/v1.0.2...v1.1.0) (2025-06-22)


### ✨ Features

* add AI configuration and conditional rendering for AI upload button ([2844cab](https://github.com/kellertobias/servobill/commit/2844cab707a2a586b4f68a7a1ba08c04c259257f))

## [1.0.2](https://github.com/kellertobias/servobill/compare/v1.0.1...v1.0.2) (2025-06-22)


### ♻️ Code Refactoring

* restructure inventory page components and types ([01ac6cd](https://github.com/kellertobias/servobill/commit/01ac6cd1de1d4ef58f929b80ead72bb55c9c6b2c))


### 🔧 Chores

* update CI workflows for linting and release processes ([8157378](https://github.com/kellertobias/servobill/commit/8157378698c5a7089c9f6830f9bcb8e5e7da5e97))

## [1.0.1](https://github.com/kellertobias/servobill/compare/v1.0.0...v1.0.1) (2025-06-22)


### 🐛 Bug Fixes

* add OrmEntity decorator to inventory ORM entities ([667a74e](https://github.com/kellertobias/servobill/commit/667a74e2610afb7a8023ee76aeefcccba16b4168))

## 1.0.0 (2025-06-22)


### ✨ Features

* add API upload and download endpoints with configuration support ([6f8531f](https://github.com/kellertobias/servobill/commit/6f8531fa7bfa974caef17ae13bd1ef4d770da4c9))
* add attachment support to invoice activity ([da0f959](https://github.com/kellertobias/servobill/commit/da0f9592a237511f88947b739669a4daba2bcd1a))
* add authentication for local/ dockerized upload and download endpoints ([b82f099](https://github.com/kellertobias/servobill/commit/b82f0999ff9162bf00b78da35f80fb78acfcf902))
* add category management to settings ([3ef59c6](https://github.com/kellertobias/servobill/commit/3ef59c61cac1d1ff639bbefe9612e07dbf60ca99))
* add category support to expenses and reports ([7267ec9](https://github.com/kellertobias/servobill/commit/7267ec9d5bfb86dd8e7f0e2041b9a8a5ff6795da))
* add config service import to invoice send handler ([ed9d39a](https://github.com/kellertobias/servobill/commit/ed9d39aaee3c0cc2cb9dd24a67cf5cfa2262637f))
* add console log to CompanyDataSetting constructor for debugging ([d40a95a](https://github.com/kellertobias/servobill/commit/d40a95a99047518e1bfefab6cb1eb57f7e0c97f5))
* add dockerized deployment support with Postgres and MinIO ([e5b242b](https://github.com/kellertobias/servobill/commit/e5b242b12e110abc0996b4306324bd4e8c4ddaa2))
* add expense management to product schema and UI ([8deea43](https://github.com/kellertobias/servobill/commit/8deea43086ef78a9bc4c5b0aa6fa2bbd1c8c4cb0))
* add expense settings update functionality and enhance schema ([53a82ff](https://github.com/kellertobias/servobill/commit/53a82ff1144be88ee8b40536ace82aa862a7cd54))
* add InventoryItem, InventoryLocation, and InventoryType entities ([ee48152](https://github.com/kellertobias/servobill/commit/ee4815260f23cd49c45345e971e4341d67098022))
* add LLM service for interfacing with large language models ([a96b774](https://github.com/kellertobias/servobill/commit/a96b774cd7c9f85e6a08a93f05a059879162ad30))
* add OrmEntity decorator to relational ORM entities ([0a8287d](https://github.com/kellertobias/servobill/commit/0a8287d4f9a8df0cb26cc3eef8f71d6bc977a1cc))
* add receipt extraction functionality to GraphQL API ([acf1ca9](https://github.com/kellertobias/servobill/commit/acf1ca93b5601f32f37ee331e84926c790f31a1e))
* add repository structure and UI component design guidelines ([9a31f5d](https://github.com/kellertobias/servobill/commit/9a31f5d1544bb1444fb83ff585caee9f639039e7))
* add SMTP support ([970c4b4](https://github.com/kellertobias/servobill/commit/970c4b4dc6062b9331595deb07d7477b5c98ff94))
* AI extraction of expenses ([fd1c87e](https://github.com/kellertobias/servobill/commit/fd1c87e0438db51e7614db17233d9eb0a2ad214f))
* comprehensive update of event handler system and dependencies ([f0de597](https://github.com/kellertobias/servobill/commit/f0de5979148b0c3e1c302290b13dc802b52f9b35))
* configure servobill-dynamodb service in docker-compose and update invoice schema ([587d9c0](https://github.com/kellertobias/servobill/commit/587d9c0df4f9b8f898a0df2899d5e03bf6f0845e))
* enhance attachment upload functionality and component structure ([2e7a5cc](https://github.com/kellertobias/servobill/commit/2e7a5cce04de91b09d6f06d9db7e253480c34da6))
* enhance CORS configuration and improve Span decorator handling ([2d589e4](https://github.com/kellertobias/servobill/commit/2d589e45224dfc76e6617885c4f2f659593f5772))
* enhance deployment script and update dependency removal process ([fa60421](https://github.com/kellertobias/servobill/commit/fa60421508dece1a0db3542c938a973c4ad2d155))
* enhance event processing logic in HandlerExecution ([6516189](https://github.com/kellertobias/servobill/commit/6516189708966df9ff78466e8a797bc9e82a9d5c))
* enhance Expense and Attachment management with new fields and updates ([43b9853](https://github.com/kellertobias/servobill/commit/43b98539a6e340243f00bb22de9b6d2b4d82e702))
* enhance expense category rendering and attachment deletion process ([35cbf88](https://github.com/kellertobias/servobill/commit/35cbf8830f838f411006fe95b51830180288b321))
* enhance expense overlay with category selection and input improvements ([a9ab171](https://github.com/kellertobias/servobill/commit/a9ab1715fcaa2f1182bdc5d9d7fe287d87cf3f66))
* enhance expense settings update functionality ([77d847b](https://github.com/kellertobias/servobill/commit/77d847bd4e276bcbced018c7ddf93dedae2f2592))
* enhance ExpenseOverlay with category selection and user guidance ([773fb17](https://github.com/kellertobias/servobill/commit/773fb17eaa08dbfd20431a33d129367ac6e9a9dd))
* enhance function configuration and add random delay in event execution ([8ccf813](https://github.com/kellertobias/servobill/commit/8ccf81338bde6f1634ada7800628ec61829a87dd))
* enhance GraphQL authorization and update Docker configuration ([f31ea2e](https://github.com/kellertobias/servobill/commit/f31ea2eec99c747f02849ed660b8f68e7aded0b6))
* enhance InventoryItem repository to support null typeId filtering ([7fbf2df](https://github.com/kellertobias/servobill/commit/7fbf2df0e91e9af11b4aeb94ec83dd6e60740344))
* enhance invoice activity management with attachment support ([597fbf2](https://github.com/kellertobias/servobill/commit/597fbf2dedc478157005a51898634b792f4e7c8f))
* enhance invoice comment functionality with email attachment option ([e63cc30](https://github.com/kellertobias/servobill/commit/e63cc300673210d2c473ab738245b694f888b471))
* enhance invoice item management with linked expenses ([90f772f](https://github.com/kellertobias/servobill/commit/90f772f340c36cd807d081e2fe5745cef7b5ea9e))
* enhance logging configuration in SST setup ([92b6c3c](https://github.com/kellertobias/servobill/commit/92b6c3c2d858c00e2bf888c2f3cbacc5e4babdbc))
* enhance logging configuration with new log group transformations ([a84b27d](https://github.com/kellertobias/servobill/commit/a84b27d736c03b72dd6e45aaa12ad1ad9742f368))
* enhance SelectInput and ExpenseOverlay components with color support ([d95074b](https://github.com/kellertobias/servobill/commit/d95074bcec45f1adffa0ac15b5bbc5d103a17c99))
* enhance SelectInput component with improved functionality and styling ([5174874](https://github.com/kellertobias/servobill/commit/51748742809da2ed2fdc05792dbebdbd1cccc1dd))
* enhance TypeScript configuration and Next.js settings ([7c56c55](https://github.com/kellertobias/servobill/commit/7c56c555ba643be59275c43454a86bb998bba9e2))
* expand inventory management schema with new types and mutations ([8a1e962](https://github.com/kellertobias/servobill/commit/8a1e962b11e9ac826e885fc2ba7f3606749f4080))
* expense categories and automated expenses ([5fdb0f0](https://github.com/kellertobias/servobill/commit/5fdb0f052a874055babec53c8f10a50e56b25dd2))
* implement AI-powered expense extraction modal and update GraphQL API ([97146df](https://github.com/kellertobias/servobill/commit/97146df8ad47a1333b0bfa3eec95976c9a0ab1a8))
* implement attachment management in ExpenseOverlay and create AttachmentDropzone component ([7992c6f](https://github.com/kellertobias/servobill/commit/7992c6f6ac081291bca13fcf5cb39781ab3a83b0))
* implement attachment management in GraphQL - actual uploading still missing ([ef1b61c](https://github.com/kellertobias/servobill/commit/ef1b61caf5d464495214fe11aafcb3c59c9fd8cf))
* implement attachment management with DynamoDB and relational support ([7ccfbdf](https://github.com/kellertobias/servobill/commit/7ccfbdf252d6bb646e68d802b619d405d6c23a8c))
* implement DeferredPromise for improved import handling in multiple modules ([fc0147c](https://github.com/kellertobias/servobill/commit/fc0147c53e00a767d4c50b8bf698e57534d2abc8))
* implement InventoryItem repository with DynamoDB and relational database support ([d320a9f](https://github.com/kellertobias/servobill/commit/d320a9f84a33c0eb172fbeb2f5650fe1ef70ff17))
* implement InventoryLocation repository with DynamoDB and relational database support ([0e8ddb4](https://github.com/kellertobias/servobill/commit/0e8ddb48d67a4045f5cc60d2ac213a75499cccf9))
* implement InventoryType repository with DynamoDB and relational database support ([64cc34f](https://github.com/kellertobias/servobill/commit/64cc34fbed1cc9483217b403a90a2c5d1fd2a376))
* implement invoice activity form and attachment handling ([de771b2](https://github.com/kellertobias/servobill/commit/de771b22d796a49777cdb792ffeb90c6b9c44244))
* implement receipt event handling and processing via llm ([96ec53e](https://github.com/kellertobias/servobill/commit/96ec53e8027c4343ef62f1a55e9f10977cb66642))
* implement semantic versioning and automated release process ([702bf86](https://github.com/kellertobias/servobill/commit/702bf86c44d8734e6606cd0496c733204128532a))
* integrate file storage service for user profile picture handling ([721f491](https://github.com/kellertobias/servobill/commit/721f4911944cb660854843ae4a32f699b5fa3285))
* integrate SQLite for event job management ([5a2d876](https://github.com/kellertobias/servobill/commit/5a2d87662d1110d63d998fe88ba5ef6066ce65d4))
* inventory prototype ([e56d99a](https://github.com/kellertobias/servobill/commit/e56d99a30ff850af4f5b400748838cfc4089e400))
* local dev environment variables ([c7b0660](https://github.com/kellertobias/servobill/commit/c7b06604b95feb8240f2cc425cfe5f310be8dfe4))
* make sure to not handle invoice sends twice ([d8f988e](https://github.com/kellertobias/servobill/commit/d8f988e8e18b77cb12e5d9272ae6c94883317bbf))
* refactor logging configuration to use dynamic log group names ([8c497d6](https://github.com/kellertobias/servobill/commit/8c497d6da6e08183d53c1328026fb81f9b1c87bd))
* running version with separate database ([5725c7b](https://github.com/kellertobias/servobill/commit/5725c7b58f0db45f5ff52806ff43a7dc2b571fdd))
* SMTP based email sending and local file generation for dockerized environment ([67babcb](https://github.com/kellertobias/servobill/commit/67babcb52497669d6e5580181e21a3487ae85ba7))
* update .env.example and README for enhanced email configuration ([f851d61](https://github.com/kellertobias/servobill/commit/f851d613cf896792357e2dba2408d28f90267316))
* update .gitignore and add script for removing extra dependencies ([6cc38d7](https://github.com/kellertobias/servobill/commit/6cc38d798408248cbeddc48fcc492bbc1ce31f1a))
* update sst from v2 to v3 and re-do deployment ([c7a32f8](https://github.com/kellertobias/servobill/commit/c7a32f8ab7d61ae8a6f67b72a983d95268de2ffe))
* validate environment variables and enhance configuration management ([5c7a939](https://github.com/kellertobias/servobill/commit/5c7a9391afd11dc66c4ed9b48be638e66b1aad06))


### 🐛 Bug Fixes

* add ALLOWED_EMAILS environment variable to SST configuration ([74574d7](https://github.com/kellertobias/servobill/commit/74574d775e4c6472ff02c2d9dc121f990cd3c977))
* add console logs for customer import tracking ([3eece22](https://github.com/kellertobias/servobill/commit/3eece222c161d2e7ee6425986ca13beb39af7630))
* avoid sending out events twice ([366586b](https://github.com/kellertobias/servobill/commit/366586bb83642153fc7ad3231e125d7d112b35cd))
* cleanup of file storage service for local file storage of dockerized deployment ([96e46bd](https://github.com/kellertobias/servobill/commit/96e46bdccdc867ced54f7715d44296aa01859b4f))
* endless pages ([5f79a0d](https://github.com/kellertobias/servobill/commit/5f79a0d830e97709ce451bec981fc821baba22ba))
* enhance file request handling and error notifications ([b2284bf](https://github.com/kellertobias/servobill/commit/b2284bf112ab94c21261459fb49154ca871318bb))
* ensure imported invoice items have undefined IDs for data integrity ([d7b010c](https://github.com/kellertobias/servobill/commit/d7b010ce1a2cd7a0155d49c68586da4b1faa0648))
* ensure repository initialization before query execution for postgres version ([3cf005b](https://github.com/kellertobias/servobill/commit/3cf005b9bfef8b6264fbe7f294e0434f5c5a97cc))
* import and export invoice payment dates ([2c9f517](https://github.com/kellertobias/servobill/commit/2c9f5170362db8ebbdf35a3661ac50a2bd022592))
* improve file request error handling and logging ([573594f](https://github.com/kellertobias/servobill/commit/573594f0b953b5993341c68853175f76af56539f))
* improve invoice cancellation process and linked expenses handling ([0950949](https://github.com/kellertobias/servobill/commit/09509496934b3359a6f6d006d973ea35149539f5))
* improve logging ([f5ae1e9](https://github.com/kellertobias/servobill/commit/f5ae1e9e071a6b2b25e21d4b51b6770767512936))
* improve prompt ([8baab9f](https://github.com/kellertobias/servobill/commit/8baab9f13b22d45d2c8c2d7951a22152bce81a63))
* linter issues ([7c153a1](https://github.com/kellertobias/servobill/commit/7c153a17d44b68f5ca45d282adfef63343c88fbe))
* move JWT_SECRET validation to token generation functions ([c4d422d](https://github.com/kellertobias/servobill/commit/c4d422d850a5c9fd8682241c51785bc329607ea7))
* remove invoice ID before import to ensure data integrity ([271295b](https://github.com/kellertobias/servobill/commit/271295b04122d2770e8c02cc7a8075dd2e57f9e5))
* remove retries from event handler function configuration ([9933b4d](https://github.com/kellertobias/servobill/commit/9933b4df47d1efc461f194c073cd26deb7da97dc))
* **SBD-0001:** Show save button only if there are changes ([1fe2818](https://github.com/kellertobias/servobill/commit/1fe28183fec1cf08ea82c5f484c760700e3cbeb4))
* some linter issues ([98f6fcc](https://github.com/kellertobias/servobill/commit/98f6fccbec10174ed4770588a9824bf6fdae053d))
* streamline invoice data query logic ([f556427](https://github.com/kellertobias/servobill/commit/f5564270ea203d7d0f23a41e722e20369e004ea2))
* update AWS profile environment variable in SST configuration ([de59b98](https://github.com/kellertobias/servobill/commit/de59b98ddc8f438f3c0c3673812476b1364cb600))
* update CORS configuration to use HTTPS for site and API domains ([35b6f40](https://github.com/kellertobias/servobill/commit/35b6f40ca462acf6dc539176d33b62258e47cc94))
* update deployment script to prompt for clean repository before deployment ([42853c2](https://github.com/kellertobias/servobill/commit/42853c2d2eefb18de15343074a1e9a3e26670b81))
* update NODE_OPTIONS in SST configuration for reflect-metadata support ([c2c1587](https://github.com/kellertobias/servobill/commit/c2c15874d236d9bc12359a66c4a1c3ad14acbdbe))
* update Node.js runtime version in SST configuration ([3dc8d99](https://github.com/kellertobias/servobill/commit/3dc8d99a703a0ae49bfd700b4643ac80d2629815))
* update npm installation options in SST configuration to include reflect-metadata ([77610e3](https://github.com/kellertobias/servobill/commit/77610e342b2ca0c9b7af072796b65bdc7e143763))
* update permissions for remove-extra-deps.sh script ([58b53f5](https://github.com/kellertobias/servobill/commit/58b53f5e4de12ed00b0ec87b2f69c825cd34d8fd))
* update settings handling to use CompanyDataSetting ([89a5caf](https://github.com/kellertobias/servobill/commit/89a5caf7609dee1c75eae2dc4812f6833683150e))
* update Span decorator error handling to improve debugging ([bb5b168](https://github.com/kellertobias/servobill/commit/bb5b168557cdf651199fb5afa85a54571a4ac6e0))
* update TypeScript configuration file reference and enhance build preparation logic ([b3e227b](https://github.com/kellertobias/servobill/commit/b3e227b0e0d94cc3db11316855c19878eedd1289))


### 📚 Documentation

* update guidelines for receipt extraction prompt ([ef0811a](https://github.com/kellertobias/servobill/commit/ef0811a226b1f51bf9b121960f51e6eadf408b8b))
* update README and add ROADMAP for project planning ([a6157cd](https://github.com/kellertobias/servobill/commit/a6157cd7e152cf5d1f600f5a6a1bd05827c3edd0))
* update README for dockerized deployment ([de21558](https://github.com/kellertobias/servobill/commit/de21558a3b01bbea0464ec50e0c7f944330d561a))
* update README to include SMTP mail sending support in future plans ([ea0902c](https://github.com/kellertobias/servobill/commit/ea0902c8510963ba54b2a9d13427672071da5fbe))
* update README to reflect enhanced features and architecture ([6726de5](https://github.com/kellertobias/servobill/commit/6726de526e5b2070a0910405ced5a487da717edb))
* update README to reflect known bugs ([52b382c](https://github.com/kellertobias/servobill/commit/52b382c86d086095e66d2d55700881900fece1a8))


### ♻️ Code Refactoring

* centralize attachment handling and improve code clarity ([cb91bb1](https://github.com/kellertobias/servobill/commit/cb91bb1e09759eef31b53554d7fb794c0720d6ab))
* clean up invoice activity form and invoice list hook ([e3964f3](https://github.com/kellertobias/servobill/commit/e3964f318fdf08a60fe14e92150b5f00897284fb))
* enhance attachment repository with linkedId management and improved comments ([cdd34de](https://github.com/kellertobias/servobill/commit/cdd34de92c4de98016bb3efedf530ed7e04758f7))
* enhance build preparation script for improved clarity and structure ([74aab38](https://github.com/kellertobias/servobill/commit/74aab38c1afbd3e03cd26a6a5b7ef71d4d302c1a))
* enhance build preparation script with wait function for improved user feedback ([f51cc9b](https://github.com/kellertobias/servobill/commit/f51cc9b986259dfd5df37f3beb8fbd28b7a7fae5))
* enhance CompanyDataSetting initialization with parameter handling ([04763dc](https://github.com/kellertobias/servobill/commit/04763dc950a8bc2a18bfd099645f5a064e29928a))
* enhance deployment script for improved cleanup and clarity ([d23bdc7](https://github.com/kellertobias/servobill/commit/d23bdc78caa107190c4dba35e6519ae2ea502ab2))
* export functionality to use centralized Exporters class ([7330b00](https://github.com/kellertobias/servobill/commit/7330b00dfa5de7c9ed57b8f8b75aa726606b4cad))
* improve deployment script and update attachment import ([f8b6f72](https://github.com/kellertobias/servobill/commit/f8b6f72f1bcd1a4cd9ae9e6412a66c3dd6be3238))
* improve file URL handling in storage services ([94d32ff](https://github.com/kellertobias/servobill/commit/94d32ff4886492cb13a82f85116c790d911e4ac0))
* improve output formatting in build preparation script ([69188cb](https://github.com/kellertobias/servobill/commit/69188cb5afe4bd7471c6916692a21bf00e05d920))
* improve PDF generation logic in CreateInvoicePdfHandler ([f598d1e](https://github.com/kellertobias/servobill/commit/f598d1e075ba8100bb25153e8befaaf3a8814b41))
* improve settings import structure and variable handling ([c27d764](https://github.com/kellertobias/servobill/commit/c27d764e9e72b42c51c2f698f746700b8c3d793d))
* remove console log statements for cleaner code ([3b6a4c1](https://github.com/kellertobias/servobill/commit/3b6a4c16266ff030412b7d1f44124798d8cd41dd))
* remove unnecessary Span decorators from handlers ([aea956b](https://github.com/kellertobias/servobill/commit/aea956b13b3ce56a7febe85da0ba2f4d5defe863))
* remove unused log group transformation settings from SST configuration ([0847bfe](https://github.com/kellertobias/servobill/commit/0847bfe5e0108640559c88dd44f11c3d39ca0813))
* reorganize repository imports for improved clarity and structure ([8da90f8](https://github.com/kellertobias/servobill/commit/8da90f83485dce9dd8e69a7d148e9983d54884b7))
* replace logger with console.log for event processing ([8aaade4](https://github.com/kellertobias/servobill/commit/8aaade42311d1d1ee6c80996620c67b8b2872984))
* simplify customer import logic and enhance invoice handling ([644f9f8](https://github.com/kellertobias/servobill/commit/644f9f817670f29ade61d90d9a47575200737abf))
* streamline build preparation script output for clarity ([2bae48c](https://github.com/kellertobias/servobill/commit/2bae48c1d7c44a3ded6ca29df1698580c3b17561))
* streamline event processing in HandlerExecution ([72e5417](https://github.com/kellertobias/servobill/commit/72e5417b0bd09568cee3f554ec7061b8bba7c7b0))
* streamline invoice data handling in import process ([4299b04](https://github.com/kellertobias/servobill/commit/4299b04322ab9a9ae51ed9018e338e6fb18b0a28))
* streamline invoice settings mapping in SystemResolver ([d70de6e](https://github.com/kellertobias/servobill/commit/d70de6ecb58adc032298e426c180f8bcde3349c0))
* update docker-compose configurations and repository registration ([7771dff](https://github.com/kellertobias/servobill/commit/7771dffdb52bdd2c9909dae019265045d6f7bfaf))
* update ExpenseOverlay and attachment components for improved functionality ([e7bd227](https://github.com/kellertobias/servobill/commit/e7bd227b0d95a3b33ed064133dcb5beed55ac3cc))
* update GraphQL argument decorators for improved type safety ([d60c539](https://github.com/kellertobias/servobill/commit/d60c5399d5887b466e49130354f8296dc32363bc))
* update GraphQL argument decorators for type safety in InvoiceResolver ([1e9d9c3](https://github.com/kellertobias/servobill/commit/1e9d9c3133576b6db5110dbf00970a339f9f20af))
* update package dependencies and enhance documentation ([65dbc25](https://github.com/kellertobias/servobill/commit/65dbc25d00a8d4a051f6cd308a35880600775428))
* update PdfTemplateSetting usage in settings repository tests ([479a76d](https://github.com/kellertobias/servobill/commit/479a76ddca0e93c264973cb1c95f1515aad7f45b))
* update sst.config and clean up settings entity ([1dec3cd](https://github.com/kellertobias/servobill/commit/1dec3cde98bd203c234fe704fe27b8819042c7b9))
* update TypeScript configuration exclusions and clean up build preparation logic ([d0ed0f7](https://github.com/kellertobias/servobill/commit/d0ed0f77fe254e1366260088db23ff582c5ddbd5))
* update TypeScript configuration to exclude test files ([8455ade](https://github.com/kellertobias/servobill/commit/8455ade6bc6873dfb8db4fa42dd423e7b56ea42f))


### 👷 CI/CD

* docker container for app works ([43bcbbb](https://github.com/kellertobias/servobill/commit/43bcbbbe4f8928f9b3f22d2cbcf0dc25d7f2ae5d))
* fix package lock ([7635be1](https://github.com/kellertobias/servobill/commit/7635be1786edcd30fa7d4406b01b9fc3e1faf155))
* fix semantic release packages ([086488a](https://github.com/kellertobias/servobill/commit/086488a0d3373bfde41f396307c968c900429338))
* semantic release ([f9b0eb6](https://github.com/kellertobias/servobill/commit/f9b0eb68e8403236003b7ec6a51bce47573867a8))
* semver ([a6e0615](https://github.com/kellertobias/servobill/commit/a6e061596b1eb0ea9902664f4cc159c77546be1b))
* tests do not work yet on CI ([bcd7bcc](https://github.com/kellertobias/servobill/commit/bcd7bcc7c30db6f7ea28a5468016280be31941ef))


### 🔧 Chores

* add console logs for settings update tracking ([cdf7716](https://github.com/kellertobias/servobill/commit/cdf7716b891688fca2ec89da68548a673e3bccbd))
* remove outdated AWS deployment workflow ([5cc0a5c](https://github.com/kellertobias/servobill/commit/5cc0a5c7f532b1782c23af3224f016a150a3ed25))
* update .gitignore to include additional environment files ([334300d](https://github.com/kellertobias/servobill/commit/334300d8236741e6a33bb325fa85bc0335874592))
* update ESLint configuration and dependencies for improved type safety ([709142b](https://github.com/kellertobias/servobill/commit/709142bb856ffcee503bc300ef846a6deeb2af40))
* update package dependencies and improve deployment script ([bf2c9ff](https://github.com/kellertobias/servobill/commit/bf2c9ff5fe46254632b0ad26a9d3e59f23cbf531))
* update README and enhance settings logging ([bd1ff5a](https://github.com/kellertobias/servobill/commit/bd1ff5a6b4c03e5ae380a72146b66db232d7274b))
* update README and sst.config for upcoming features ([cd10bb0](https://github.com/kellertobias/servobill/commit/cd10bb007b694bebb39081c9a55bcd2e43127788))
* update README roadmap and feature planning ([1483908](https://github.com/kellertobias/servobill/commit/1483908832245e2df0ad1a1c848d702bfbcfc8af))

# Changelog
