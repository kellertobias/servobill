import { config } from 'dotenv';

// Explicitly not loading .env.dev here, as we want to use the .env file for deployment
config();
