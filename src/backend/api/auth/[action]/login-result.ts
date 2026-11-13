import type { APIGatewayProxyEventV2 } from 'aws-lambda';
import type { UserEntity } from '@/backend/entities/user.entity';
import { UserDirectoryService } from '@/backend/services/user-directory.service';
import { DefaultContainer } from '@/common/di';
import { getSiteUrl } from '../../helpers';
import { AuthenticationService } from '../authentication';
import { storeProfilePicture } from './profile-picture';

export const loginErrorRedirect = (
	evt: APIGatewayProxyEventV2,
	message: string,
	extraCookies: string[] = [],
) => {
	const auth = DefaultContainer.get(AuthenticationService);
	const { siteUrl } = getSiteUrl(evt);
	const response = auth.generateResponse({
		statusCode: 401,
		forwardUrl: `${siteUrl}/login?error=${encodeURIComponent(message)}`,
	});
	response.cookies = [...(response.cookies || []), ...extraCookies];
	return response;
};

/**
 * Finishes an external (SSO) login: stores the profile picture and starts the
 * session, then forwards the browser back to the app.
 */
export const finishExternalLogin = async (
	evt: APIGatewayProxyEventV2,
	user: UserEntity,
	pictureUrl: string | undefined,
	extraCookies: string[] = [],
) => {
	const auth = DefaultContainer.get(AuthenticationService);
	const { siteUrl } = getSiteUrl(evt);
	const storedPicture = await storeProfilePicture(pictureUrl, user.id);
	if (storedPicture && storedPicture !== user.profilePictureUrl) {
		await DefaultContainer.get(UserDirectoryService).setProfilePicture(
			user,
			storedPicture,
		);
	}
	const response = await auth.startSession(evt, {
		user,
		forwardUrl: `${siteUrl}/login?success=true`,
	});
	response.cookies = [...(response.cookies || []), ...extraCookies];
	return response;
};
