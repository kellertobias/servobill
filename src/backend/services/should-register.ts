import { ConfigService, DatabaseType } from '@/backend/services/config.service';
import { DefaultContainer } from '@/common/di';

export function shouldRegister(type: DatabaseType | DatabaseType[]) {
	return {
		shouldRegister: () => {
			const configService = DefaultContainer.get(ConfigService);
			if (Array.isArray(type)) {
				return type.includes(configService.tables.databaseType);
			}
			return configService.tables.databaseType === type;
		},
	};
}
