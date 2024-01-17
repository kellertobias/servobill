import { StackContext } from 'sst/constructs';
import { HostedZone } from 'aws-cdk-lib/aws-route53';

export const getDomainConfig = ({ stack }: StackContext) => {
	const hostedZone = HostedZone.fromLookup(stack, 'HostedZone', {
		domainName: process.env.HOSTED_ZONE_DOMAIN_NAME!,
	});

	return {
		hostedZone,
		siteCustomDomain: {
			domainName: process.env.SITE_DOMAIN!,
			cdk: {
				hostedZone,
			},
		},
		apiCustomDomain: {
			domainName: `api.${process.env.SITE_DOMAIN!}`,
			cdk: {
				hostedZone,
			},
		},
		publicApiUrl: `https://api.${process.env.SITE_DOMAIN!}`,
		siteDomain: process.env.SITE_DOMAIN!,
	};
};
