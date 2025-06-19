import { authentication, createDirectus, login, refresh, registerUser, rest } from "@directus/sdk";
import { json, redirect } from "@remix-run/node";
import { accessTokenStorage, refreshTokenStorage } from "~/sessions.server";


export const directus = createDirectus(process.env.DIRECTUS_URL!).with(authentication("json")).with(rest())

export const getDirectusClient = async (request: Request) => {
  const cookieHeader = request.headers.get("Cookie")

  const session = await accessTokenStorage.getSession(cookieHeader)
  const refreshSession = await refreshTokenStorage.getSession(cookieHeader)

  let sessionUpdated = false
  let accessToken = session.get("access_token")


  if (!accessToken) {
    const refreshToken = refreshSession.get("refresh_token")

    if (!refreshToken) {
        throw redirect("/login")
    }

    const { refresh_token: newRefreshToken, access_token: newAccessToken } = await refreshDirectusToken(refreshToken)

    session.set("access_token", newAccessToken)
    refreshSession.set("refresh_token", newRefreshToken)
    accessToken = newAccessToken

    sessionUpdated = true

  }

  directus.setToken(accessToken)

  return {
    directus,
    accessTokenSession: session,
    refreshTokenSession: refreshSession,
    sessionUpdated
  };
};


const refreshDirectusToken = async (refreshToken: string) => {
  try {
        const { access_token, refresh_token } = await directus.request(refresh("json", refreshToken))

        if (!access_token || !refresh_token) {
            throw redirect("/login")
        }

        console.log("Token refreshed")

        return {access_token, refresh_token}
    } catch (err) {

        console.error("Failed to refresh token", err)
        throw redirect("/login")
    }

}

type LoginSuccess = {
  success: true;
  data: {
    access_token: string;
    refresh_token: string;
  };
  message: string;
};

type LoginError = {
  success: false;
  data: unknown;
  message: string;
};

export const loginUser = async (email: string, password:string):Promise<LoginSuccess | LoginError> => {
  try {

    const {access_token, refresh_token} = await directus.login(email, password)
    directus.setToken(access_token)

    if(!access_token || !refresh_token){
      return {success: false, data: '', message: 'Unbale to generate tokens'}
    }

    return {success: true, data: {access_token, refresh_token}, message: 'user found successfully'}
  } catch (error) {
    const typedError = error as { errors: { message: string }[] };
    const errorMessage = typedError?.errors?.[0].message || 'something went wrong during login'
    return {success: false, data: error, message: errorMessage}
  }
}

type RegisterSuccess = Awaited<ReturnType<typeof loginUser>>;

type RegisterError = {
  success: false;
  data: unknown;
  message: string;
};

export const RegisterUser = async (first_name:string, last_name:string, email:string, password:string):Promise<RegisterSuccess | RegisterError> => {
  try {
    await directus.request(registerUser(email, password, {first_name, last_name}))

    return await loginUser(email, password)
  } catch (error) {
    const typedError = error as { errors: { message: string }[] };
    const errorMessage = typedError?.errors?.[0].message || 'something went wrong during register'
    return {success: false, data: error, message: errorMessage}
  }
}
