import { Anchor, Box, Button, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core"
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node"
import { Form, json, Link, useActionData, useNavigation } from "@remix-run/react"
import { accessTokenStorage, refreshTokenStorage } from "~/sessions.server"
import { loginUser } from "~/utils/directus.server"

export const loader:LoaderFunction = async ({request}) => {
    const cookie = request.headers.get('Cookie')

    const session = await accessTokenStorage.getSession(cookie)
    const token = session.get("access_token")
    if(token) return redirect('/')

    return json({})
}

export default function Login(){
    const actionData = useActionData<typeof action>()
    const navigation = useNavigation()

    const isSubmitting = navigation.state === 'submitting'
    console.log(actionData)

    return (
        <Box maw={400} mx="auto" mt="xl">
            <Paper shadow="md" p="xl" radius="md" withBorder>
                <Title order={3} mb="md" align="center">
                Login
                </Title>

                <Form method="post">
                <Stack spacing="md">
                    <TextInput
                    name="email"
                    label="Email"
                    placeholder="Enter your email"
                    type="email"
                    required
                    />

                    <PasswordInput
                    name="password"
                    label="Password"
                    placeholder="Enter your password"
                    required
                    />

                    <Button
                    type="submit"
                    color="blue"
                    fullWidth
                    loading={isSubmitting}
                    >
                    {isSubmitting ? 'Logging in...' : 'Login'}
                    </Button>
                </Stack>
                <Text size="sm" align="center" mt="md">
                    Don't have an account?{' '}
                    <Anchor component={Link} to="/register" size="sm" color="blue">
                        Register
                    </Anchor>
                </Text>
                </Form>

                {actionData && !actionData.success && (
                <Text color="red" size="sm" mt="md" align="center">
                    {actionData.message}
                </Text>
                )}
            </Paper>
            </Box>
    )
}

export const action:ActionFunction = async ({request}) => {
    const formData = await request.formData()

    const email = formData.get("email") as string
    const password = formData.get("password") as string

    const {success, data, message} = await loginUser(email, password)

    if(success){
        const session = await accessTokenStorage.getSession(request.headers.get('Cookie'))
        const refreshSession = await refreshTokenStorage.getSession(request.headers.get('Cookie'))

        session.set('access_token', data.access_token)
        refreshSession.set("refresh_token", data.refresh_token)

        const headers = new Headers()

        headers.append("Set-Cookie", await accessTokenStorage.commitSession(session))
        headers.append("Set-Cookie", await refreshTokenStorage.commitSession(refreshSession))

        return redirect('/', {
            headers
        })
    }

    return json({success, data, message}, {status: 401})
}
