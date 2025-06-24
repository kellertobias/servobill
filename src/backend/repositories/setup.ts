// This import must come first before any other imports
import 'reflect-metadata';

import '@/backend/services/eventbus.service';
import '@/backend/services/relationaldb.service';
import '@/backend/services/dynamodb.service';

// Import all repositories
import './customer';
import './email';
import './expense';
import './invoice';
import './product';
import './session';
import './settings';
import './attachment';
import './inventory-item';
import './inventory-location';
import './inventory-type';
