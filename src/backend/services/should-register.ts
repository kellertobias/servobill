import type { ConfigService } from '@/backend/services/config.service';
import type { DatabaseType } from '@/backend/services/constants';
import { DefaultContainer } from '@/common/di';
import { CONFIG_SERVICE } from './di-tokens';

export function shouldRegister(type: DatabaseType | DatabaseType[]) {
	return {
		shouldRegister: () => {
			const configService = DefaultContainer.get<ConfigService>(CONFIG_SERVICE);
			if (Array.isArray(type)) {
				return type.includes(configService.tables.databaseType);
			}
			return configService.tables.databaseType === type;
		},
	};
}
