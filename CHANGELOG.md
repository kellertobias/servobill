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
