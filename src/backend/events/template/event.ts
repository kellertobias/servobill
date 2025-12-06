import { IsBoolean, IsString } from 'class-validator';

class TemplateDataCompanyBank {
	@IsString()
	accountHolder!: string;

	@IsString()
	iban!: string;

	@IsString()
	bic!: string;
}

class TemplateDataCompany {
	@IsString()
	name!: string;

	@IsString()
	street!: string;

	@IsString()
	zip!: string;

	@IsString()
	city!: string;

	@IsString()
	phone!: string;

	@IsString()
	email!: string;

	@IsString()
	web!: string;

	@IsString()
	vatId!: string;

	@IsString()
	taxId!: string;

	bank!: TemplateDataCompanyBank;
}

class TemplateData {
	company!: TemplateDataCompany;

	@IsString()
	invoiceNumber!: string;

	@IsString()
	offerNumber!: string;

	@IsString()
	customerNumber!: string;

	@IsString()
	logo!: string;
}

export class GenerateTemplatePreviewEvent {
	@IsBoolean()
	pdf!: boolean;

	@IsString()
	template!: string;

	@IsString()
	styles!: string;

	@IsString()
	key!: string;

	data!: TemplateData;

	constructor(props?: GenerateTemplatePreviewEvent) {
		if (props) {
			Object.assign(this, props);
		}
	}
}
